"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, List, Typography, Space, Tag, Modal, Descriptions, message, Spin, Progress, Avatar, Form, Input, Switch, Upload, Row, Col, Divider, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, EyeOutlined, LoadingOutlined, PlayCircleOutlined, ClockCircleOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import { SSEClient } from '@/utils/sseClient';
import type { UploadFile } from 'antd/es/upload/interface';
import { JsonEditor } from 'json-edit-react';

const { Title, Text } = Typography;

interface TaskStep {
  id: string;
  step: number;
  title: string;
  description: string;
  completed: boolean;
  executing: boolean;
  result?: any;
  resultType?: 'data' | 'file';
  fileName?: string;
  fileUrl?: string;
  downloadBaseUrl?: string;
  hasFile?: boolean;  // 标识是否包含文件，用于同时显示数据和文件操作
}

interface ApiParam {
  key: string;
  value: string;
}

interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
}

interface TableRow {
  key: string;
  [key: string]: any;
}

interface ApiParamOption {
  label: string;
  value: string;
}

interface ApiParamConfig {
  type?: 'text' | 'select';
  label?: string;
  options?: ApiParamOption[];
  defaultValue?: string;
  value?: string;
}

interface TodoComponentProps {
  apiEndpoint: string;
  apiParams?: Record<string, string | ApiParamConfig>;
  title?: string;
  enableFileUpload?: boolean;
  enableApiParams?: boolean;
  columnNames?: string[];
  downloadBaseUrl?: string;
}

const TodoComponent: React.FC<TodoComponentProps> = ({
  apiEndpoint,
  apiParams = {},
  title = "任务执行组件",
  enableFileUpload = false,
  enableApiParams = false,
  columnNames = '',
  downloadBaseUrl = '/api/download'
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [currentResultType, setCurrentResultType] = useState<'data' | 'file' | null>(null);
  const eventSourceRef = useRef<SSEClient | null>(null);
  
  // 新增状态
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState<UploadFile | null>(null);
  const [dynamicApiParams, setDynamicApiParams] = useState<ApiParam[]>([]);
  const [configuredParams, setConfiguredParams] = useState<Record<string, string>>({});
  const [isJsonModalVisible, setIsJsonModalVisible] = useState(false);
  const [jsonParams, setJsonParams] = useState<Record<string, any>>({});
  const [form] = Form.useForm();
  
  // 表格相关状态
  const [tableColumnNames, setTableColumnNames] = useState<string>('');
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [tableForm] = Form.useForm();

  // 初始化配置参数的默认值和表格列
  useEffect(() => {
    if (apiParams) {
      const initialParams: Record<string, string> = {};
      Object.entries(apiParams).forEach(([key, config]) => {
        if (typeof config === 'object' && config.defaultValue !== undefined) {
          initialParams[key] = config.defaultValue;
        } else if (typeof config === 'string') {
          initialParams[key] = config;
        }
      });
      setConfiguredParams(initialParams);
    }
    
    // 初始化表格列（如果提供了列名）
    if (columnNames && Array.isArray(columnNames) && columnNames.length > 0) {
      const columnNamesString = columnNames.join(',');
      setTableColumnNames(columnNamesString);
      const cols: TableColumn[] = columnNames.map((name, index) => ({
        title: name,
        dataIndex: name,
        key: name
      }));
      setTableColumns(cols);
    }
  }, [apiParams, columnNames]);

  // Clean up EventSource connection on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.disconnect();
      }
    };
  }, []);


  const handleExecute = () => {
    // 如果启用了配置选项，先显示配置弹窗
    if (enableFileUpload || enableApiParams || (columnNames && Array.isArray(columnNames) && columnNames.length > 0)) {
      setIsConfigModalVisible(true);
      return;
    }
    
    // 直接执行任务
    executeTask();
  };

  const executeTask = () => {
    // Close config modal if open
    setIsConfigModalVisible(false);
    
    // Open the task modal
    setIsTaskModalVisible(true);
    
    // Initialize with empty steps - they will be populated from the API
    setSteps([]);
    setIsExecuting(true);
    
    // Connect to backend SSE endpoint
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.disconnect();
    }
    
    // Create new SSE connection
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8085';
    
    // 合并默认参数和动态参数
    const mergedParams: Record<string, any> = {};
    
    // 处理配置的参数（包括 select 和固定值）
    if (apiParams) {
      Object.entries(apiParams).forEach(([key, config]) => {
        if (typeof config === 'object') {
          // 使用用户配置的值或默认值
          mergedParams[key] = configuredParams[key] || config.defaultValue || config.value;
        } else {
          // 简单的字符串值
          mergedParams[key] = config;
        }
      });
    }
    
    // 添加动态API参数
    if (enableApiParams && dynamicApiParams.length > 0) {
      dynamicApiParams.forEach(param => {
        if (param.key && param.value) {
          mergedParams[param.key] = param.value;
        }
      });
    }
    
    // 添加表格数据（如果有）
    if (tableData.length > 0) {
      mergedParams['table_data'] = JSON.stringify(tableData);
      mergedParams['table_columns'] = JSON.stringify(tableColumns.map(col => col.title));
    }
    
    // Build URL
    let url = `${backendUrl}${apiEndpoint}`;
    
    // 判断是否需要使用 POST 请求（文件上传）
    if (enableFileUpload && uploadFile) {
      // 使用 FormData 处理文件上传
      const formData = new FormData();
      if (uploadFile.originFileObj) {
        formData.append('file', uploadFile.originFileObj);
      }
      
      // 添加其他参数到 FormData
      Object.entries(mergedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // 使用 POST 请求连接 SSE
      eventSourceRef.current = new SSEClient(url);
      eventSourceRef.current.connectWithPost(formData);
    } else {
      // 普通 GET 请求方式（带查询参数）
      if (Object.keys(mergedParams).length > 0) {
        const queryParams = new URLSearchParams();
        Object.entries(mergedParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        url += `?${queryParams.toString()}`;
      }
      
      eventSourceRef.current = new SSEClient(url);
      eventSourceRef.current.connect();
    }
    
    let taskMap: Record<string, number> = {}; // Map task ID to step index
    
    // Handle step information events (these come without an event type)
    const handleMessage = (event: any) => {
      try {
        // Handle both string and object data
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Handle step information from the API
        if (data.id && data.step && data.task_name) {
          // This is step information from the API
          const newStep: TaskStep = {
            id: data.id,
            step: data.step,
            title: data.task_name,
            description: "准备执行...",
            completed: false,
            executing: false,
            result: null,
            resultType: 'data'
          };
          
          // Add the new step to our state
          setSteps(prevSteps => {
            const newSteps = [...prevSteps, newStep];
            taskMap[data.id] = newSteps.length - 1;
            return newSteps;
          });
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };
    
    // Handle status events
    const handleStatus = (event: any) => {
      try {
        // Handle both string and object data
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Find the step by task ID
        const stepIndex = taskMap[data.task];
        setSteps(prevSteps => {
          if (stepIndex !== undefined && stepIndex < prevSteps.length) {
            const newSteps = [...prevSteps];
            newSteps[stepIndex] = {
              ...newSteps[stepIndex],
              executing: data.status === 'running' || data.status === 'processing',
              description: data.message
            };
            return newSteps;
          } else {
            console.warn('Step not found for task:', data.task);
            return prevSteps;
          }
        });
      } catch (error) {
        console.error('Error parsing status event:', error);
      }
    };
    
    // Handle result events
    const handleResult = (event: any) => {
      try {
        // Handle both string and object data
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Find the step by task ID
        const stepIndex = taskMap[data.task];
        setSteps(prevSteps => {
          if (stepIndex !== undefined && stepIndex < prevSteps.length) {
            const newSteps = [...prevSteps];
            
            // 检查结果是否包含文件信息
            let resultType: 'data' | 'file' = 'data';  // 默认为数据类型
            let fileName: string | undefined;
            let fileUrl: string | undefined;
            let hasFile = false;  // 标识是否包含文件
            
            // 检查结果中是否有文件信息
            if (data.result && typeof data.result === 'object') {
              // 检查多种可能的文件字段名
              const fileFields = ['file_name', 'fileName', 'filename', 'file'];
              const urlFields = ['file_url', 'fileUrl', 'document_url', 'documentUrl', 'url'];
              
              // 首先检查文件名字段
              for (const field of fileFields) {
                if (data.result[field]) {
                  hasFile = true;
                  fileName = data.result[field];
                  // 生成下载URL
                  fileUrl = `${downloadBaseUrl}/${fileName}`;
                  break;
                }
              }
              
              // 如果没找到文件名，检查URL字段
              if (!hasFile) {
                for (const field of urlFields) {
                  if (data.result[field]) {
                    hasFile = true;
                    const urlValue = data.result[field];
                    // 从URL中提取文件名
                    fileName = urlValue.split('/').pop() || 'download';
                    // 如果是相对路径，拼接基础URL；如果是完整URL，直接使用
                    if (urlValue.startsWith('http://') || urlValue.startsWith('https://')) {
                      fileUrl = urlValue;
                    } else {
                      // 相对路径，需要拼接基础URL
                      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8085';
                      fileUrl = urlValue.startsWith('/') ? `${backendUrl}${urlValue}` : `${backendUrl}/${urlValue}`;
                    }
                    break;
                  }
                }
              }
            } else if (typeof data.result === 'string' && data.result.includes('.')) {
              // 如果result直接是文件名，这种情况下只有文件没有其他数据
              resultType = 'file';
              hasFile = true;
              fileName = data.result;
              fileUrl = `${downloadBaseUrl}/${fileName}`;
            }
            
            newSteps[stepIndex] = {
              ...newSteps[stepIndex],
              executing: false,
              completed: true,
              result: data.result,
              resultType,
              fileName,
              fileUrl,
              downloadBaseUrl,
              hasFile,
              description: data.message
            };
            
            // Check if all steps are completed
            const allCompleted = newSteps.every(step => step.completed);
            if (allCompleted) {
              if (eventSourceRef.current) {
                eventSourceRef.current.disconnect();
                setIsExecuting(false);
              }
            }
            
            return newSteps;
          } else {
            console.warn('Step not found for task:', data.task);
            return prevSteps;
          }
        });
      } catch (error) {
        console.error('Error parsing result event:', error);
      }
    };
    
    // Set up event listeners
    eventSourceRef.current.on('message', handleMessage);
    eventSourceRef.current.on('status', handleStatus);
    eventSourceRef.current.on('result', handleResult);
    
    // Handle connection errors
    const handleError = (event: any) => {
      console.error('SSE connection error:', event.data);
      // Check if all steps are completed before showing an error
      // We need to check the current state, not the captured closure
      // Since we can't access the current state directly here, we'll just disconnect
      // The UI will update based on the current state
      // Handle both string and object data
      const errorMessage = typeof event.data === 'string' ? event.data : (event.data.message || '未知错误');
      message.error('与服务器的连接出现错误: ' + errorMessage);
      // Disconnect and stop execution
      if (eventSourceRef.current) {
        eventSourceRef.current.disconnect();
      }
      setIsExecuting(false);
    };
    
    eventSourceRef.current.on('error', handleError);
  };

  // 处理文件上传
  const handleFileChange = (info: any) => {
    const { fileList } = info;
    if (fileList.length > 0) {
      setUploadFile(fileList[fileList.length - 1]);
    } else {
      setUploadFile(null);
    }
  };

  // 添加动态参数
  const addApiParam = () => {
    setDynamicApiParams([...dynamicApiParams, { key: '', value: '' }]);
  };

  // 删除动态参数
  const removeApiParam = (index: number) => {
    const newParams = dynamicApiParams.filter((_, i) => i !== index);
    setDynamicApiParams(newParams);
  };

  // 更新动态参数
  const updateApiParam = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...dynamicApiParams];
    newParams[index][field] = value;
    setDynamicApiParams(newParams);
  };

  // 重置配置
  const resetConfig = () => {
    setUploadFile(null);
    setDynamicApiParams([]);
    setJsonParams({});
    // 重置为默认值
    if (apiParams) {
      const initialParams: Record<string, string> = {};
      Object.entries(apiParams).forEach(([key, config]) => {
        if (typeof config === 'object' && config.defaultValue !== undefined) {
          initialParams[key] = config.defaultValue;
        } else if (typeof config === 'string') {
          initialParams[key] = config;
        }
      });
      setConfiguredParams(initialParams);
    }
    form.resetFields();
  };

  // 打开JSON参数编辑弹窗
  const openJsonModal = () => {
    try {
      // 将现有的动态参数转换为对象
      const paramsObj: Record<string, string> = {};
      dynamicApiParams.forEach(param => {
        if (param.key && param.value) {
          paramsObj[param.key] = param.value;
        }
      });
      setJsonParams(paramsObj);
    } catch (error) {
      console.error('Error converting params to JSON:', error);
      setJsonParams({});
    }
    setIsJsonModalVisible(true);
  };

  // 保存JSON参数
  const saveJsonParams = () => {
    try {
      // JsonEditor 直接返回对象
      if (typeof jsonParams === 'object' && jsonParams !== null && !Array.isArray(jsonParams)) {
        const newParams: ApiParam[] = Object.entries(jsonParams).map(([key, value]) => ({
          key: key,
          value: String(value)
        }));
        setDynamicApiParams(newParams);
        setIsJsonModalVisible(false);
        message.success('JSON参数已保存');
      } else {
        message.error('JSON格式不正确，请确保顶层是一个对象');
      }
    } catch (error) {
      console.error('Error processing JSON:', error);
      message.error('JSON格式不正确');
    }
  };

  // 更新配置参数
  const updateConfiguredParam = (key: string, value: string) => {
    setConfiguredParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 处理列名变化 - 仅在 columnNames 未通过 props 提供时使用
  const handleColumnNamesChange = (value: string) => {
    setTableColumnNames(value);
    if (value.trim()) {
      const names = value.split(',').map(name => name.trim()).filter(name => name);
      const cols: TableColumn[] = names.map((name, index) => ({
        title: name,
        dataIndex: name,
        key: name
      }));
      setTableColumns(cols);
      setTableData([]);
    } else {
      setTableColumns([]);
      setTableData([]);
    }
  };

  // 打开表格编辑弹窗
  const openTableModal = () => {
    if ((!tableColumnNames.trim() && !(columnNames && Array.isArray(columnNames) && columnNames.length > 0)) || tableColumns.length === 0) {
      message.warning('请先设置列名');
      return;
    }
    setIsTableModalVisible(true);
  };

  // 添加表格行
  const addTableRow = () => {
    const newRow: TableRow = {
      key: `row_${Date.now()}`
    };
    tableColumns.forEach(col => {
      newRow[col.dataIndex] = '';
    });
    setTableData([...tableData, newRow]);
  };

  // 删除表格行
  const deleteTableRow = (key: string) => {
    setTableData(tableData.filter(row => row.key !== key));
  };

  // 更新表格单元格数据
  const updateTableCell = (rowKey: string, columnKey: string, value: any) => {
    setTableData(prev => prev.map(row => {
      if (row.key === rowKey) {
        return { ...row, [columnKey]: value };
      }
      return row;
    }));
  };

  // 保存表格数据
  const saveTableData = () => {
    setIsTableModalVisible(false);
    message.success('表格数据已保存');
  };

  const viewResult = (step: TaskStep) => {
    // 只处理数据查看
    setCurrentResult(step.result);
    setCurrentResultType('data');
    setIsResultModalVisible(true);
  };

  const downloadFile = async (step: TaskStep) => {
    // 单独处理文件下载
    console.log(step)
    if (step.fileUrl && step.fileName) {
      try {
        // 提取文件名部分作为相对于 ./file/ 目录的路径
        // 从 fileUrl 中提取文件名，如果 fileUrl 是完整URL则从路径部分提取
        let filePath = step.fileUrl; // 默认使用 fileName
        
        // 如果 fileUrl 包含完整的路径信息，提取文件名部分
        // if (step.fileUrl) {
        //   // 如果是完整URL，则从中提取文件名
        //   if (step.fileUrl.startsWith('http://') || step.fileUrl.startsWith('https://')) {
        //     const url = new URL(step.fileUrl);
        //     filePath = url.pathname.split('/').pop() || step.fileName || 'download';
        //   } else {
        //     // 如果是相对路径，提取文件名
        //     filePath = step.fileUrl.split('/').pop() || step.fileName || 'download';
        //   }
        // }

        // 使用 axiosInstance 调用后端下载接口
        const response = await axiosInstance.get('/fentan/download', {
          params: {
            file_path: filePath // 根据后端接口，传入相对于 ./file/ 目录的文件路径
          },
          responseType: 'blob' // 指定响应类型为 blob，用于文件下载
        });

        // 创建 Blob URL 并下载文件
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = step.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // 释放内存
        
        message.success(`正在下载文件: ${step.fileName}`);
      } catch (error) {
        console.error('下载文件失败:', error);
        message.error('文件下载失败，请重试');
      }
    } else {
      message.error('文件信息不完整，无法下载');
    }
  };

  const renderResultData = () => {
    if (!currentResult) return null;

    if (typeof currentResult === 'object') {
      return (
        <Descriptions bordered column={1}>
          {Object.entries(currentResult).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    }

    return <Text>{String(currentResult)}</Text>;
  };

  // 计算进度
  const getProgress = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const getStatusColor = () => {
    if (isExecuting) return '#1890ff';
    if (steps.length > 0 && steps.every(step => step.completed)) return '#52c41a';
    return '#d9d9d9';
  };

  return (
    <>
      <Card
        className="todo-card"
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '8px',
            minHeight: '32px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flex: '1 1 auto',
              minWidth: '0'
            }}>
              <Avatar 
                size={24} 
                icon={isExecuting ? <LoadingOutlined /> : <PlayCircleOutlined />} 
                style={{ backgroundColor: getStatusColor(), flexShrink: 0 }}
              />
              <Title 
                level={5} 
                style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#262626',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.4'
                }}
                title={title}
              >
                {title}
              </Title>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '6px',
              flexShrink: 0,
              flexWrap: 'wrap'
            }}>
              {(enableFileUpload || enableApiParams) && (
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setIsConfigModalVisible(true)}
                  size="small"
                  style={{
                    borderRadius: '6px',
                    minWidth: 'auto',
                    padding: '4px 8px'
                  }}
                  title="配置"
                >
                  配置
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleExecute}
                loading={isExecuting}
                disabled={isExecuting}
                size="small"
                style={{
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)',
                  minWidth: 'auto',
                  padding: '4px 12px'
                }}
                title={isExecuting ? '执行中' : '开始执行'}
              >
                <span style={{ 
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}>
                  {isExecuting ? '执行中' : '开始执行'}
                </span>
              </Button>
            </div>
          </div>
        }
        style={{
          height: '100%',
          minHeight: '200px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)'
        }}
        bodyStyle={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1
        }}
      >
        <div style={{ marginBottom: 8, flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
            <ClockCircleOutlined style={{ color: '#1890ff', flexShrink: 0 }} />
            <Text style={{ 
              fontSize: '12px', 
              color: '#666',
              lineHeight: '1.4',
              flex: 1
            }}>
              点击"开始执行"按钮来启动任务流程
            </Text>
          </div>
          
          {steps.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '6px',
                flexWrap: 'wrap'
              }}>
                <Text style={{ fontSize: '11px', color: '#666', flexShrink: 0 }}>执行进度:</Text>
                <Text style={{ 
                  fontSize: '11px', 
                  fontWeight: '500', 
                  color: getStatusColor(),
                  whiteSpace: 'nowrap'
                }}>
                  {steps.filter(s => s.completed).length} / {steps.length} 步骤完成
                </Text>
              </div>
              <Progress 
                percent={getProgress()} 
                size="small"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                trailColor="#f5f5f5"
                style={{ marginBottom: '6px' }}
                showInfo={false}
              />
            </div>
          )}
        </div>
        
        {/* 显示已完成任务的查看结果按钮 */}
        {steps.length > 0 && steps.every(s => s.completed) && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => setIsTaskModalVisible(true)}
              style={{ 
                color: '#1890ff',
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                margin: 0
              }}
            >
              查看结果
            </Button>
          </div>
        )}
      </Card>

      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '8px 0'
          }}>
            <Avatar 
              size={32} 
              icon={isExecuting ? <LoadingOutlined /> : <PlayCircleOutlined />} 
              style={{ backgroundColor: getStatusColor() }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#262626' }}>{title}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                {isExecuting ? '正在执行任务...' : steps.every(s => s.completed) && steps.length > 0 ? '所有任务已完成' : '准备执行任务'}
              </div>
            </div>
          </div>
        }
        visible={isTaskModalVisible}
        onCancel={() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.disconnect();
          }
          setIsTaskModalVisible(false);
          // 注意：这里不设置 setIsExecuting(false)，以便用户在任务完成后仍能看到结果
          if (isExecuting) {
            setIsExecuting(false);
          }
        }}
        footer={[
          <Button key="close" onClick={() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.disconnect();
            }
            setIsTaskModalVisible(false);
            // 注意：这里不设置 setIsExecuting(false)，以便用户在任务完成后仍能看到结果
            if (isExecuting) {
              setIsExecuting(false);
            }
          }}>
            关闭
          </Button>,
          <Button
            key="execute"
            type="primary"
            onClick={handleExecute}
            loading={isExecuting}
            disabled={isExecuting}
            style={{
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)'
            }}
          >
            {isExecuting ? '执行中...' : '重新执行'}
          </Button>
        ]}
        width={900}
        destroyOnClose={true}
        style={{ top: 20 }}
      >
        <div style={{ padding: '0' }}>
          {/* 进度概览 */}
          {steps.length > 0 && (
            <Card
              style={{ 
                marginBottom: '16px', 
                borderRadius: '8px', 
                background: 'linear-gradient(135deg, #e6f7ff 0%, #f6ffed 100%)',
                border: '1px solid #d9f7be'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar 
                    size={40} 
                    icon={isExecuting ? <LoadingOutlined /> : <CheckCircleOutlined />} 
                    style={{ backgroundColor: getStatusColor() }}
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>
                      任务进度: {steps.filter(s => s.completed).length} / {steps.length}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                      {isExecuting ? '正在执行中，请稍候...' : steps.every(s => s.completed) ? '🎉 所有任务已成功完成!' : '等待开始执行'}
                    </div>
                  </div>
                </div>
                <div style={{ minWidth: '120px' }}>
                  <Progress 
                    type="circle" 
                    percent={getProgress()} 
                    size={60}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* 任务步骤列表 */}
          {steps.length > 0 && (
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar size={24} icon={<CheckCircleOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  <Title level={5} style={{ color: '#1890ff', margin: 0, fontSize: '16px' }}>任务执行详情</Title>
                </div>
              }
              style={{ 
                marginBottom: 0,
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <List
                itemLayout="horizontal"
                dataSource={steps}
                renderItem={(step, index) => (
                  <List.Item
                    actions={[
                      // 如果有结果数据，显示查看结果按钮
                      step.completed && step.result ? (
                        <Button
                          icon={<EyeOutlined />}
                          onClick={() => viewResult(step)}
                          size="small"
                          type="link"
                          style={{ 
                            fontSize: '12px',
                            color: '#1890ff',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          查看结果
                        </Button>
                      ) : null,
                      // 如果有文件，显示下载按钮
                      step.completed && step.hasFile && step.fileUrl ? (
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => downloadFile(step)}
                          size="small"
                          type="link"
                          style={{ 
                            fontSize: '12px',
                            color: '#52c41a',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          下载文件
                        </Button>
                      ) : null
                    ].filter(Boolean)}  // 过滤掉null值
                    style={{
                      padding: '16px 0',
                      borderBottom: index === steps.length - 1 ? 'none' : '1px solid #f0f0f0',
                      background: step.executing ? 'rgba(24, 144, 255, 0.02)' : 'transparent',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      paddingLeft: '8px',
                      paddingRight: '8px'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: step.executing ? '#1890ff' : step.completed ? '#52c41a' : '#d9d9d9',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {step.executing ? (
                              <LoadingOutlined style={{ fontSize: '12px' }} />
                            ) : step.completed ? (
                              <CheckCircleOutlined style={{ fontSize: '12px' }} />
                            ) : (
                              step.step
                            )}
                          </div>
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: '14px', color: '#262626' }}>
                            第 {step.step} 步: {step.title}
                          </Text>
                          {step.executing ? (
                            <Tag color="processing" style={{ fontSize: '11px', borderRadius: '12px' }}>
                              <LoadingOutlined style={{ marginRight: '4px' }} />执行中
                            </Tag>
                          ) : step.completed ? (
                            <Tag color="success" style={{ fontSize: '11px', borderRadius: '12px' }}>
                              ✓ 已完成
                            </Tag>
                          ) : (
                            <Tag color="default" style={{ fontSize: '11px', borderRadius: '12px' }}>
                              ⏳ 待执行
                            </Tag>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                            {step.description}
                          </Text>
                          {step.completed && step.fileName && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '6px 8px', 
                              background: '#f6ffed', 
                              borderRadius: '4px',
                              border: '1px solid #d9f7be'
                            }}>
                              <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                                📄 生成文件: {step.fileName}
                              </Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>
      </Modal>

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size={24} icon={<EyeOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>结果详情</span>
            </div>
          }
          visible={isResultModalVisible}
          onCancel={() => setIsResultModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsResultModalVisible(false)}>
              关闭
            </Button>
          ]}
          width={700}
          style={{ top: 20 }}
          zIndex={9999}
        >
          <div style={{ padding: '16px 0' }}>
            {currentResultType === 'data' && renderResultData()}
          </div>
        </Modal>

        {/* 配置模态框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size={24} icon={<SettingOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>任务配置</span>
            </div>
          }
          visible={isConfigModalVisible}
          onCancel={() => setIsConfigModalVisible(false)}
          footer={[
            <Button key="reset" onClick={resetConfig}>
              重置
            </Button>,
            <Button key="cancel" onClick={() => setIsConfigModalVisible(false)}>
              取消
            </Button>,
            <Button key="execute" type="primary" onClick={executeTask}>
              执行任务
            </Button>
          ]}
          width={700}
          destroyOnClose={false}
          style={{ top: 20 }}
        >
          <Form form={form} layout="vertical" style={{ padding: '16px 0' }}>
            {/* 任务参数配置 */}
            {Object.keys(apiParams).length > 0 && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <SettingOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                    <span style={{ fontWeight: '600', color: '#262626', fontSize: '15px' }}>任务参数</span>
                  </div>
                </div>
                {Object.entries(apiParams).map(([key, config]) => {
                  // 解析配置
                  const isObject = typeof config === 'object';
                  const paramType = isObject ? (config.type || 'text') : 'text';
                  const paramLabel = isObject ? (config.label || key) : key;
                  const paramOptions = isObject && config.options ? config.options : [];
                  const currentValue = configuredParams[key] || '';
                  
                  return (
                    <Form.Item
                      key={key}
                      label={<span style={{ fontWeight: '500' }}>{paramLabel}</span>}
                      style={{ marginBottom: '16px' }}
                    >
                      {paramType === 'select' ? (
                        <Select
                          value={currentValue}
                          onChange={(value) => updateConfiguredParam(key, value)}
                          placeholder={`请选择${paramLabel}`}
                          style={{ width: '100%' }}
                          options={paramOptions}
                        />
                      ) : (
                        <Input
                          value={currentValue}
                          onChange={(e) => updateConfiguredParam(key, e.target.value)}
                          placeholder={`请输入${paramLabel}`}
                          disabled={!isObject}
                        />
                      )}
                    </Form.Item>
                  );
                })}
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}
            
            {/* 文件上传 */}
            {enableFileUpload && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <UploadOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                    <span style={{ fontWeight: '600', color: '#262626', fontSize: '15px' }}>文件上传</span>
                  </div>
                </div>
                <Form.Item
                  label={<span style={{ fontWeight: '500' }}>选择文件</span>}
                  name="file"
                >
                  <Upload
                    fileList={uploadFile ? [uploadFile] : []}
                    onChange={handleFileChange}
                    beforeUpload={() => false}
                    maxCount={1}
                    accept=".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx"
                  >
                    <Button icon={<UploadOutlined />}>点击选择文件</Button>
                  </Upload>
                </Form.Item>
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}
            
            {/* 动态API参数 */}
            {enableApiParams && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlusOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                      <span style={{ fontWeight: '600', color: '#262626', fontSize: '15px' }}>动态参数</span>
                    </div>
                    <Button
                      type="dashed"
                      icon={<SettingOutlined />}
                      onClick={openJsonModal}
                      size="small"
                    >
                      JSON编辑
                    </Button>
                  </div>
                </div>
                
               
              </>
            )}

            {/* 表格数据输入 */}
            {columnNames && Array.isArray(columnNames) && columnNames.length > 0 && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlusOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                      <span style={{ fontWeight: '600', color: '#262626', fontSize: '15px' }}>表格数据</span>
                    </div>
                    <Space>
                      <Button
                        type="dashed"
                        icon={<SettingOutlined />}
                        onClick={() => openTableModal()}
                        size="small"
                      >
                        编辑表格
                      </Button>
                    </Space>
                  </div>
                </div>
                
                
                
               
              </>
            )}
          </Form>
        </Modal>
        {/* 表格编辑模态框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size={24} icon={<SettingOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>表格数据编辑</span>
            </div>
          }
          visible={isTableModalVisible}
          onCancel={() => setIsTableModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsTableModalVisible(false)}>
              取消
            </Button>,
            <Button key="addRow" onClick={addTableRow}>
              添加行
            </Button>,
            <Button key="save" type="primary" onClick={saveTableData}>
              保存数据
            </Button>
          ]}
          width={900}
          style={{ top: 20 }}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ 
                    padding: '12px',
                    borderBottom: '1px solid #d9d9d9',
                    borderRight: '1px solid #d9d9d9',
                    fontWeight: '600',
                    color: '#262626',
                    textAlign: 'left'
                  }}>操作</th>
                  {tableColumns.map((col, index) => (
                    <th 
                      key={col.key} 
                      style={{ 
                        padding: '12px',
                        borderBottom: '1px solid #d9d9d9',
                        borderRight: index < tableColumns.length - 1 ? '1px solid #d9d9d9' : 'none',
                        fontWeight: '600',
                        color: '#262626',
                        textAlign: 'left'
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={row.key} style={{ background: rowIndex % 2 === 0 ? '#fafafa' : 'white' }}>
                    <td style={{ 
                      padding: '8px',
                      borderBottom: '1px solid #d9d9d9',
                      borderRight: '1px solid #d9d9d9'
                    }}>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => deleteTableRow(row.key)}
                        danger
                        size="small"
                      />
                    </td>
                    {tableColumns.map((col, colIndex) => (
                      <td 
                        key={`${row.key}-${col.key}`} 
                        style={{ 
                          padding: '8px',
                          borderBottom: '1px solid #d9d9d9',
                          borderRight: colIndex < tableColumns.length - 1 ? '1px solid #d9d9d9' : 'none'
                        }}
                      >
                        <Input
                          value={row[col.dataIndex] || ''}
                          onChange={(e) => updateTableCell(row.key, col.dataIndex, e.target.value)}
                          placeholder={`输入${col.title}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {tableData.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#8c8c8c', 
                padding: '40px',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                background: '#fafafa',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无数据</div>
                <div style={{ fontSize: '14px' }}>点击"添加行"按钮添加数据</div>
              </div>
            )}
          </div>
        </Modal>
        
        {/* JSON参数编辑模态框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size={24} icon={<SettingOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>JSON参数编辑</span>
            </div>
          }
          visible={isJsonModalVisible}
          onCancel={() => setIsJsonModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsJsonModalVisible(false)}>
              取消
            </Button>,
            <Button key="save" type="primary" onClick={saveJsonParams}>
              保存参数
            </Button>
          ]}
          width={800}
          style={{ top: 20 }}
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: '500', color: '#262626' }}>参数编辑器</span>
            </div>
            <div style={{ 
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '12px',
              background: '#fafafa'
            }}>
              <JsonEditor
                data={jsonParams}
                setData={(data) => {
                  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                    setJsonParams(data as Record<string, any>);
                  }
                }}
                rootName="data"
              />
            </div>
          </div>
        </Modal>
      </>
    );
  
};

export default TodoComponent;