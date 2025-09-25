import React, { useState, useEffect, useRef } from 'react';
import { ActionType, EditableProTable, ProColumns } from '@ant-design/pro-components';
import { Button, Input, Modal, DatePicker, message, Space, Tooltip, Select, Dropdown, Card, Row, Col, Typography, Form, Upload, List } from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'; // 设置中文语言
import { DownOutlined, EyeOutlined, SearchOutlined, FilterOutlined, ExportOutlined, ReloadOutlined, LockOutlined, UnlockOutlined, FileTextOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import { jwtDecode } from "jwt-decode";
import { PDFElement } from '@/components/PDF';
import { type IPdfElement } from '@chainlit/react-client';
import {
  UniversalFilePreviewModal,
  type UniversalPreviewData
} from '@/components/PreviewModals';
import { detectFileType } from '@/utils/fileTypeUtils';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Title } = Typography;

interface CustomsClearSummaryLog {
  id: string;
  filename: string;
  port:string;
  packing_type:string;
  gross_weight_kg:number;
  total_price_sum:number;
  generation_time: Date;
  estimated_tax_amount: number;
  estimated_tax_rate_cny_per_kg: number;
  remarks: string;
  abnormal: string;
  latest_update_time: Date;
  shenhe_excel_path: string;
  user_id: string;
  lock?: boolean;
  reviewer?: string;
  consignee?: number;
  shipper?: number;
  total_boxes?: number;
  shuidan?: { type: string; file_path: string, filename: string }[];
  chinese_product_name?: string;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const PdfViewDownload = () => {
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const actionRef = useRef<ActionType>();
  const tableRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [kalittaModalVisible, setKalittaModalVisible] = useState(false);
  const [currentAwbNumber, setCurrentAwbNumber] = useState('');
  const [currentTransportType, setCurrentTransportType] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchRemarks, setsearchRemarks] = useState<string>('');
  const [searchAbnormal, setsearchAbnormal] = useState<string>('');
  const [searchConveyType, setsearchConveyType] = useState<string>('');
  const [searchPort, setSearchPort] = useState<string[]>([]);
  const [searchCreator, setSearchCreator] = useState<string>('');
  const [searchReviewer, setSearchReviewer] = useState<string>('');
  const [searchLock, setSearchLock] = useState<string | undefined>(undefined);
  const [searchAbnormalType, setSearchAbnormalType] = useState<string>('contains');
  const [searchChineseProductName, setSearchChineseProductName] = useState<string>('');

  const [exportLoading, setExportLoading] = useState(false);
  const [datesfilter, setDatesfilter] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [dataSource, setDataSource] = useState<CustomsClearSummaryLog[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewElement, setPreviewElement] = useState<IPdfElement | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<ArrayBuffer | null>(null);
  const [excelPreviewVisible, setExcelPreviewVisible] = useState(false);
  const [currentPreviewFile, setCurrentPreviewFile] = useState<string>('');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [useIframe, setUseIframe] = useState<boolean>(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<CustomsClearSummaryLog | null>(null);
  const [form] = Form.useForm();
  const [fileToUpload, setFileToUpload] = useState<UploadFile[]>([]);
  const [fileType, setFileType] = useState<'normal' | 'abnormal'>('normal');
  const [shuidanModalVisible, setShuidanModalVisible] = useState(false);
  const [currentShuidanList, setCurrentShuidanList] = useState<{ type: string; file_path: string, filename: string }[]>([]);
  // Removed taxDocPreviewVisible and taxDocPreviewElement - using universal preview instead

  // Add state for universal preview
  const [universalPreviewVisible, setUniversalPreviewVisible] = useState(false);
  const [universalPreviewData, setUniversalPreviewData] = useState<UniversalPreviewData | null>(null);
  const [consignees, setConsignees] = useState<any[]>([]);

  useEffect(() => {
    // 检查用户是否为admin
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAdmin(parsedUser.username === 'admin');
    }
    // 获取所有consignee数据
    axiosInstance.get(`${server_url}/qingguan/consignee/`).then(res => {
      setConsignees(res.data.items || []);
    });
  }, []);

  // 根据后端API参数调整，summary_id为id列表，lock为布尔值
  const handleLockToggle = async (ids: React.Key[], lockStatus: boolean) => {
    try {
      const response = await axiosInstance.post(`${server_url}/qingguan/lock_cumstom_clear_history_summary_remarks/`, {
        summary_id: ids,
        lock: lockStatus,
      });

      // 可根据后端返回的详细结果进行提示
      if (response.data && response.data.modified_count > 0) {
        message.success(lockStatus ? '锁定成功' : '解锁成功');
      } else {
        message.warning('未有记录被修改');
      }
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Failed to update lock status:', error);
      message.error('操作失败，请重试');
    }
  };

  const handlePreview = async (fileName: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/download/${fileName}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewElement({
        id: fileName,
        name: fileName,
        type: 'pdf',
        url: url,
        display: 'inline',
        page: 1,
        forId: ''
      });
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('预览失败，请重试');
    }
  };

  const handlePreviewClose = () => {
    setPreviewVisible(false);
    if (previewElement?.url) {
      window.URL.revokeObjectURL(previewElement.url);
    }
    setPreviewElement(null);
  };

  const handleExcelPreview = async (fileName: string) => {
    try {
      setCurrentPreviewFile(fileName);
      const response = await axiosInstance.get(`${server_url}/qingguan/download/${fileName}`, {
        responseType: 'arraybuffer',
      });
      setExcelPreviewData(response.data);
      setExcelPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing Excel file:', error);
      message.error('预览失败，请重试');
    }
  };

  useEffect(() => {
    if (excelPreviewVisible && excelPreviewData && iframeLoaded) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'loadExcel',
            fileData: excelPreviewData,
            fileName: currentPreviewFile
          }, '*');
        }, 100);
      }
    }
    return () => {
      setIframeLoaded(false);
    };
  }, [excelPreviewVisible, excelPreviewData, currentPreviewFile, iframeLoaded]);

  const handleExcelPreviewClose = () => {
    setExcelPreviewVisible(false);
    setExcelPreviewData(null);
    setCurrentPreviewFile('');
    setIframeLoaded(false);
  };

  // 添加查询追踪信息的函数
  const queryTracking = async (mawbNo: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/query_tracking`, {
        params: { mawb_no: mawbNo }
      });
      
      if (response.data.code === 200 && response.data.data) {
        window.open(response.data.data, '_blank');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error querying tracking:', error);
      return false;
    }
  };

  const handleEdit = (record: CustomsClearSummaryLog) => {
    setCurrentRecord(record);
    form.setFieldsValue({
      remarks: record.remarks,
      abnormal: record.abnormal,
    });
    setFileToUpload([]);
    setFileType('normal');
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (fileToUpload.length > 0 && currentRecord) {
        const file = fileToUpload[0];
        if (file.originFileObj) {
          const formData = new FormData();
          formData.append('file', file.originFileObj as RcFile);
          formData.append('id', currentRecord.id);
          formData.append('master_file_name', currentRecord.filename);
          formData.append('file_type', fileType);
          
          try {
            const uploadResponse = await axiosInstance.post(`${server_url}/qingguan/cumstom_clear_history_summary/upload_shuidan_file`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
    
            if (uploadResponse.data.message === 'success') {
              message.success('文件上传成功');
            } else {
              message.error(uploadResponse.data.detail || '文件上传失败');
              return;
            }
          } catch (error: any) {
            console.error('上传税单文件失败:', error);
            message.error(error.response?.data?.detail || '文件上传失败');
            return;
          }
        }
      }

      const response = await axiosInstance.post(`${server_url}/qingguan/update_cumstom_clear_history_summary_remarks/`, {
        id: currentRecord?.id,
        remarks: values.remarks,
        abnormal: values.abnormal,
      });
      
      if (response.data.code === 200) {
        if (fileToUpload.length === 0) {
            message.success('更新成功');
        }
        setEditModalVisible(false);
        actionRef.current?.reload();
      } else {
        message.error(response.data.msg || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update remarks:', error);
      message.error('更新失败，请重试');
    }
  };

  const columns: ProColumns<CustomsClearSummaryLog>[] = [
    {
      title: '🔒',
      dataIndex: 'lock',
      width: 60,
      align: 'center',
      readonly:true,
      render: (_, record) => (
        <span>
          {record.lock ? '🔒' : ''}
        </span>
      ),
    },
    {
      title: 'id',
      dataIndex: 'id', 
      key: 'id',
      readonly:true
    },
    {
      title: 'generation_time',
      dataIndex: 'generation_time',
      key: 'generation_time',
      sorter: true,
      render: (dom, entity) => {
        const text = entity.generation_time;
        return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
      },
      defaultSortOrder: 'descend',
      readonly:true,
    },
    {
      title: '最新更新时间',
      dataIndex: 'latest_update_time',
      key: 'latest_update_time',
      sorter: true,
      render: (dom, entity) => {
        const text = entity.generation_time;
        const text2 = entity.latest_update_time;
        if(text2){
          return dayjs(text2).format('YYYY-MM-DD HH:mm:ss');
        }else{
          return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
      },
      defaultSortOrder: 'descend',
      readonly:true,
    },
    {
      title: 'File Name',
      dataIndex: 'filename',
      key: 'filename',
      readonly: true,
      render: (dom, entity) => {
        const text = entity.filename.split("-").slice(1).join("-");
        const isAirTransport = entity.port || (entity.packing_type === '空运');
        
        if (isAirTransport) {
          const awbNumber = text.split('.')[0].split('CI&PL')[0];
          return (
            <a 
              onClick={async (e) => {
                e.preventDefault();
                const success = await queryTracking(awbNumber);
                if (!success) {
                  setCurrentAwbNumber(awbNumber);
                  setCurrentTransportType(entity.port ? '空运' : entity.packing_type || '');
                  setKalittaModalVisible(true);
                  setUseIframe(true);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {text}
            </a>
          );
        } else {
          // 非空运记录，使用 track-trace.com
          const bolNumber = text.split('.')[0].split('CI&PL')[0];
          return (
            <a 
              onClick={(e) => {
                e.preventDefault();
                // 创建一个临时表单并提交
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://www.track-trace.com/bol';
                form.target = '_blank';

                // 添加提单号输入
                const numberInput = document.createElement('input');
                numberInput.type = 'hidden';
                numberInput.name = 'number';
                numberInput.value = bolNumber;
                form.appendChild(numberInput);

                // 添加配置参数
                const configInput = document.createElement('input');
                configInput.type = 'hidden';
                configInput.name = 'config';
                configInput.value = '202400';
                form.appendChild(configInput);

                // 添加提交按钮参数
                const commitInput = document.createElement('input');
                commitInput.type = 'hidden';
                commitInput.name = 'commit';
                commitInput.value = 'Track with options';
                form.appendChild(commitInput);

                // 添加表单到文档并提交
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
              }}
              style={{ cursor: 'pointer' }}
            >
              {text}
            </a>
          );
        }
      }
    },
    {
      title: '港口',
      dataIndex: 'port',
      key: 'port',
      readonly:true,
    },
    {
      title: '运输方式',
      dataIndex: 'packing_type',
      key: 'packing_type',
      readonly:true,
      render: (dom, entity) => {
        if (entity.port) {
          return '空运';
        } else if (entity.packing_type) {
          return entity.packing_type;
        } else {
          return '其他';
        }
      }
    },
    {
      title: '详情',
      key: 'details',
      readonly: true,
      width: 120,
      align: 'center',
      render: (_, record) => {
        // 查找英文名（用id匹配）
        const consigneeObj = consignees.find(c => c.发货人 === record.consignee);
        const shipperObj = consignees.find(c => c.发货人 === record.shipper);
        const consigneeName = consigneeObj ? consigneeObj.中文 : '无';
        const shipperName = shipperObj ? shipperObj.中文 : '无';
        const totalBoxes = record.total_boxes != null ? record.total_boxes : '无';

        const tooltipContent = (
          <div>
            <div>发货人：{shipperName}</div>
            <div>收货人：{consigneeName}</div>
            <div>总箱数：{totalBoxes}</div>
          </div>
        );

        return (
          <Tooltip title={tooltipContent}>
            <div style={{lineHeight: '1.2'}}>
                <div>{shipperName} / {consigneeName} / {totalBoxes}</div>
              </div>
          </Tooltip>
        );
      }
    },
    {
      title: '类别',
      dataIndex: 'good_type',
      key: 'good_type',
      readonly:true,
      render: (text) => {
        return (
          <Tooltip title={text} placement="topLeft">
            <div style={{ 
              height: '50px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '25px'
            }}>
              {text}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '整票货值',
      dataIndex: 'total_price_sum',
      key: 'total_price_sum',
      readonly:true,
    },
    {
      title: '整票重量',
      dataIndex: 'gross_weight_kg',
      key: 'gross_weight_kg',
      readonly:true,
      render: (dom, entity) => {
        const text = entity.gross_weight_kg;
        return text.toFixed(2);
      }
    },
    {
      title: '货值/重量',
      dataIndex: 'total_price_sum',
      key: 'total_price_weight',
      readonly:true,
      render: (dom, entity) => {
        const totalPrice = entity.total_price_sum || 0;
        const grossWeight = entity.gross_weight_kg || 0;
        const result = grossWeight !== 0 ? totalPrice / grossWeight : 0;
        return result.toFixed(2);
      }
    },
    {
      title: '整票预估税金',
      dataIndex: 'estimated_tax_amount',
      key: 'estimated_tax_amount',
      readonly: true,
      render: (text, record) => {
        const normalFile = record.shuidan?.find(s => s.type === 'normal');
        const abnormalFile = record.shuidan?.find(s => s.type === 'abnormal');
        
        return (
          <Space>
            {normalFile ? (
              <a onClick={() => handleShuidanPreview(record.id, { filename: normalFile.filename })}>
                {text}
              </a>
            ) : (
              text
            )}
            {abnormalFile && (
              <Tooltip title="查看税单文件">
                <PaperClipOutlined
                  onClick={() => {
                    setCurrentShuidanList(record.shuidan || []);
                    setCurrentRecord(record);
                    setShuidanModalVisible(true);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    },
    {
      title: '预估整票税金CNY/Kg',
      dataIndex: 'estimated_tax_rate_cny_per_kg',
      key: 'estimated_tax_rate_cny_per_kg',
      readonly:true
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      readonly: true,
      render: (text) => {
        return (
          <Tooltip title={text} placement="topLeft">
            <div style={{ 
              height: '50px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '25px'
            }}>
              {text}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '异常',
      dataIndex: 'abnormal',
      key: 'abnormal',
      readonly: true,
      render: (text) => {
        return (
          <Tooltip title={text} placement="topLeft">
            <div style={{ 
              height: '50px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '25px'
            }}>
              {text}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Creator',
      dataIndex: 'user_id',
      key: 'user_id',
      readonly:true,
      render: (dom, entity) => {
        return entity.user_id || 'admin';
      }
    },
    {
      title: '审核人',
      dataIndex: 'reviewer',
      key: 'reviewer',
      readonly:true,
    },
    {
      title: 'Action',
      key: 'action',
      valueType: 'option',
      render: (text, record: CustomsClearSummaryLog, _, action) => {
        const downloadOptions = record.shenhe_excel_path ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'preview',
                  label: <a onClick={() => handlePreview(record.filename)}>预览PDF</a>
                },
                {
                  key: 'excel_preview',
                  label: <a onClick={() => handleExcelPreview(record.shenhe_excel_path)}>预览Excel</a>
                },
                {
                  key: 'pdf',
                  label: <a onClick={() => handleDownload(record.filename)}>下载PDF</a>
                },
              
                {
                  key: 'excel', 
                  label: <a onClick={() => handleDownload(record.shenhe_excel_path)}>下载审核Excel</a>
                },
                {
                  key: 'origin_excel', 
                  label: <a onClick={() => handleDownloadOriginExcel(record.filename.replace('.pdf', '.xlsx'))}>下载原始Excel</a>
                },
              ]
            }}
          >
            <a style={{ marginRight: 8 }}>
              操作 <DownOutlined />
            </a>
          </Dropdown>
        ) : (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'preview',
                  label: <a onClick={() => handlePreview(record.filename)}>预览PDF</a>
                },
                {
                  key: 'download',
                  label: <a onClick={() => handleDownload(record.filename)}>下载文件</a>
                },
              ]
            }}
          >
            <a style={{ marginRight: 8 }}>
              操作 <DownOutlined />
            </a>
          </Dropdown>
        );

        return [
          downloadOptions,
          !record.lock && (
            <a
              key="editable"
              onClick={() => handleEdit(record)}
            >
              编辑
            </a>
          )
        ];
      },
    },
  ];

  const handleDownload = async (fileName: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/download/${fileName}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.split("-").slice(1).join("-"));
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDownloadOriginExcel = async (fileName: string) => {
    try {
      const excelFileName = fileName.replace('.pdf', '.xlsx');
      const response = await axiosInstance.get(`${server_url}/qingguan/download_origin_excel/${excelFileName}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.split("-").slice(1).join("-"));
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };
      
  const handleExport = () => {
    if (!datesfilter[0] || !datesfilter[1]) {
      message.warning('请先选择日期范围');
      return;
    }

    const startDate = datesfilter[0].format('YYYY-MM-DD');
    const endDate = datesfilter[1].format('YYYY-MM-DD');
    
    setExportLoading(true);
    const formattedSearchTerm = searchTerm.replace(/,+/g, ',').replace(/(^,)|(,$)/g, '');
    axiosInstance.get(`${server_url}/qingguan/output_cumtoms_clear_log/`, {
      params: {
        start_time: startDate,
        end_time: endDate,
        file_name: formattedSearchTerm || undefined,
        convey_type: searchConveyType || undefined,
        remarks: searchRemarks || undefined,
        abnormal: searchAbnormal || undefined,
        port: searchPort.length > 0 ? searchPort.join(',') : undefined,
        user_id: searchCreator || undefined,
        reviewer: searchReviewer || undefined,
        lock: searchLock === undefined || searchLock === '' ? undefined : searchLock === 'true',
        chinese_product_name: searchChineseProductName || undefined,
      },
      responseType: 'blob'
    })
      .then((response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'custom_clear_history_log.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('导出成功');
      })
      .catch((error: any) => {
        console.error('Error exporting data:', error);
        message.error('导出失败，请重试');
      })
      .finally(() => {
        setExportLoading(false);
      });
  };

  const handleExportSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的数据');
      return;
    }

    // 获取选中行的数据
    const selectedData = dataSource.filter((item: CustomsClearSummaryLog) => selectedRowKeys.includes(item.id));
    
    // 获取选中数据中的最小和最大generation_time
    const generationTimes = selectedData.map((item: CustomsClearSummaryLog) => new Date(item.generation_time).getTime());
    const startDate = new Date(Math.min(...generationTimes));
    const endDate = new Date(Math.max(...generationTimes));

    setExportLoading(true);
    axiosInstance.post(`${server_url}/qingguan/output_selected_cumtoms_clear_log/`, {
      id_list: selectedRowKeys,
      start_time: dayjs(startDate).format('YYYY-MM-DD'),
      end_time: dayjs(endDate).add(1, 'day').format('YYYY-MM-DD')
    }, {
      responseType: 'blob'
    })
      .then((response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'custom_clear_history_log.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('导出成功');
      })
      .catch((error: any) => {
        console.error('Error exporting selected data:', error);
        message.error('导出失败，请重试');
      })
      .finally(() => {
        setExportLoading(false);
      });
  };

  const handleDateChangefilter = (values: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (values) {
      setDatesfilter(values);
    } else {
      setDatesfilter([null, null]);
    }
  };

  const requestData = async (params: any, sort: any) => {
    let generation_time_sort, latest_update_time_sort;
    if (sort) {
      if (sort.generation_time) {
        generation_time_sort = sort.generation_time === 'ascend' ? 'asc' : 'desc';
      }
      if (sort.latest_update_time) {
        latest_update_time_sort = sort.latest_update_time === 'ascend' ? 'asc' : 'desc';
      }
    }
    const formattedSearchTerm = searchTerm.replace(/,+/g, ',').replace(/(^,)|(,$)/g, '');
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_summary/`, {
        params: {
          enable_pagination: true,
          file_name: formattedSearchTerm,
          remarks: searchRemarks,
          abnormal: searchAbnormal,
          abnormal_type: searchAbnormalType === 'contains' ? undefined : searchAbnormalType,
          page: params.current,
          pageSize: params.pageSize || pageSize,
          convey_type: searchConveyType,
          port: searchPort.length > 0 ? searchPort.join(',') : undefined,
          start_time: datesfilter[0]?.format('YYYY-MM-DD'),
          end_time: datesfilter[1]?.format('YYYY-MM-DD'),
          generation_time_sort,
          latest_update_time_sort,
          user_id: searchCreator || undefined,
          reviewer: searchReviewer || undefined,
          lock: searchLock === undefined || searchLock === '' ? undefined : searchLock === 'true',
          chinese_product_name: searchChineseProductName || undefined,
        },
      });
  
      setDataSource(response.data.summaries);
      return {
        data: response.data.summaries,
        success: true,
        total: response.data.total,
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };
  

  // 添加自动提交表单的函数
  useEffect(() => {
    if (kalittaModalVisible && currentTransportType === '空运' && formRef.current) {
      formRef.current.submit();
    }
  }, [kalittaModalVisible, currentTransportType]);

  // 获取所有空运记录
  const getAirTransportRecords = () => {
    return dataSource.filter(record => record.port || record.packing_type === '空运');
  };

  // 处理切换到下一个记录
  const handleNextRecord = () => {
    const airRecords = getAirTransportRecords();
    if (airRecords.length === 0) return;

    const currentRecordIndex = airRecords.findIndex(record => 
      record.filename.split("-").slice(1).join("-").split('.')[0] === currentAwbNumber
    );

    const nextIndex = currentRecordIndex + 1;
    if (nextIndex < airRecords.length) {
      const nextRecord = airRecords[nextIndex];
      const nextAwbNumber = nextRecord.filename.split("-").slice(1).join("-").split('.')[0];
      setCurrentAwbNumber(nextAwbNumber);
      setCurrentTransportType(nextRecord.port ? '空运' : nextRecord.packing_type || '');
      if (formRef.current) {
        formRef.current.submit();
      }
    }
  };

  // 处理切换到上一个记录
  const handlePrevRecord = () => {
    const airRecords = getAirTransportRecords();
    if (airRecords.length === 0) return;

    const currentRecordIndex = airRecords.findIndex(record => 
      record.filename.split("-").slice(1).join("-").split('.')[0] === currentAwbNumber
    );

    const prevIndex = currentRecordIndex - 1;
    if (prevIndex >= 0) {
      const prevRecord = airRecords[prevIndex];
      const prevAwbNumber = prevRecord.filename.split("-").slice(1).join("-").split('.')[0];
      setCurrentAwbNumber(prevAwbNumber);
      setCurrentTransportType(prevRecord.port ? '空运' : prevRecord.packing_type || '');
      if (formRef.current) {
        formRef.current.submit();
      }
    }
  };

  const handleBatchHideTestData = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_summary/batch_hide_test_data`);
      if (response.data.message === 'success') {
        message.success('TEST数据处理成功');
        actionRef.current?.reload();
      } else {
        message.error('处理失败，请重试');
      }
    } catch (error) {
      console.error('Error processing TEST data:', error);
      message.error('处理失败，请重试');
    }
  };

  const showBatchHideConfirm = () => {
    Modal.confirm({
      title: '确认处理TEST数据',
      content: '此操作将把所有包含TEST的记录标记为"删除"，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: handleBatchHideTestData,
    });
  };

  const handleShuidanDownload = async (filename: string) => {
    if (!currentRecord) return;
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_summary/download_shuidan_file/${currentRecord.id}/${filename}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('下载失败，请重试');
    }
  };

  const handleShuidanPreview = async (recordId: string, shuidanFile: { filename: string }) => {
    try {
      // First determine the file type
      const fileType = detectFileType(shuidanFile.filename);
      
      // Set response type based on file type
      const responseType = fileType === 'excel' ? 'arraybuffer' : 'blob';
      
      const response = await axiosInstance.get(
        `${server_url}/qingguan/cumstom_clear_history_summary/download_shuidan_file/${recordId}/${shuidanFile.filename}`, 
        { responseType }
      );
      
      if (fileType === 'pdf') {
        // For PDF files
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPreviewElement({
          id: shuidanFile.filename,
          name: shuidanFile.filename,
          type: 'pdf',
          url: url,
          display: 'inline',
          page: 1,
          forId: ''
        });
        setPreviewVisible(true);
      } else if (fileType === 'excel') {
        // For Excel files - response.data is already ArrayBuffer
        setCurrentPreviewFile(shuidanFile.filename);
        setExcelPreviewData(response.data);
        setExcelPreviewVisible(true);
      } else {
        // For other file types
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        
        // Use universal preview for other file types
        setUniversalPreviewData({
          fileName: shuidanFile.filename,
          fileType: fileType,
          imageUrl: fileType === 'image' ? url : undefined,
          textContent: fileType === 'text' ? await blob.text() : undefined,
          downloadUrl: url
        });
        setUniversalPreviewVisible(true);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('预览失败，请重试');
    }
  };

  const handleUniversalPreviewClose = () => {
    setUniversalPreviewVisible(false);
    if (universalPreviewData?.pdfElement?.url) {
      window.URL.revokeObjectURL(universalPreviewData.pdfElement.url);
    }
    if (universalPreviewData?.imageUrl) {
      window.URL.revokeObjectURL(universalPreviewData.imageUrl);
    }
    if (universalPreviewData?.downloadUrl) {
      window.URL.revokeObjectURL(universalPreviewData.downloadUrl);
    }
    setUniversalPreviewData(null);
  };

  // Add a function to handle file deletion
  const handleShuidanDelete = async (filename: string) => {
    if (!currentRecord) return;
    try {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除文件 ${filename} 吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await axiosInstance.delete(
              `${server_url}/qingguan/cumstom_clear_history_summary/delete_shuidan_file/${currentRecord.id}/${filename}`
            );
            
            if (response.data.message === '文件删除成功') {
              message.success('文件删除成功');
              // 更新当前显示的文件列表
              setCurrentShuidanList(prev => prev.filter(item => item.filename !== filename));
              // 刷新表格数据
              actionRef.current?.reload();
            } else {
              message.error('删除失败，请重试');
            }
          } catch (error) {
            console.error('Error deleting file:', error);
            message.error('删除失败，请重试');
          }
        }
      });
    } catch (error) {
      console.error('Error showing delete confirmation:', error);
      message.error('操作失败，请重试');
    }
  };

  return (
    <div>
      <Card
        title={<Title level={4}><FilterOutlined /> 查询条件</Title>}
        bordered={false}
        style={{ marginBottom: 16 }}
      >
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={8}>
                <Typography.Text strong>文件名：</Typography.Text>
                <Search
                  placeholder="通过文件名查询，可用空格、中英文逗号分隔多个"
                  value={searchTerm}
                  onChange={e => {
                    const value = e.target.value;
                    const formattedValue = value.replace(/[\s，]/g, ',');
                    setSearchTerm(formattedValue);
                  }}
                  prefix={<SearchOutlined />}
                  allowClear
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={8}>
                <Typography.Text strong>中文品名：</Typography.Text>
                <Search
                  placeholder="通过中文品名查询"
                  onChange={e => setSearchChineseProductName(e.target.value)}
                  style={{ width: '100%', marginTop: 4 }}
                  allowClear
                />
              </Col>
             
              <Col span={8} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  onClick={() => {
                    actionRef.current?.reload();
                    setTimeout(() => {
                      tableRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  style={{ marginRight: 8 }}
                >
                  刷新
                </Button>
                <Button 
                  type="primary" 
                  icon={<ExportOutlined />} 
                  onClick={handleExport}
                  loading={exportLoading}
                >
                  导出文件
                </Button>
              </Col>
            </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Typography.Text strong>港口：</Typography.Text>
            <Select
              placeholder="选择港口"
              onChange={value => setSearchPort(value)}
              style={{ width: '100%', marginTop: 4 }}
              showSearch
              allowClear
              mode="multiple"
              options={[
                { value: 'LAX', label: 'LAX' },
                { value: 'DFW', label: 'DFW' },
                { value: 'SFO', label: 'SFO' },
                { value: 'ORD', label: 'ORD' },
                { value: 'JFK', label: 'JFK' },
                { value: 'LAX直飞', label: 'LAX直飞' },
                { value: 'LAX转飞', label: 'LAX转飞' }
              ]}
            />
          </Col>
          <Col span={8}>
            <Typography.Text strong>运输方式：</Typography.Text>
            <Select
              placeholder="选择或输入运输方式"
              onChange={value => setsearchConveyType(value)}
              style={{ width: '100%', marginTop: 4 }}
              showSearch
              allowClear
              options={[
                { value: '空运', label: '空运' },
                { value: '海运', label: '海运' }, 
                { value: '整柜', label: '整柜' },
                { value: '拼箱', label: '拼箱' }
              ]}
            />
          </Col>
          <Col span={8}>
            <Typography.Text strong>日期范围：</Typography.Text>
            <RangePicker
              format="YYYY-MM-DD"
              onChange={handleDateChangefilter}
              value={datesfilter}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Typography.Text strong>备注：</Typography.Text>
            <Search
              placeholder="通过备注查询"
              onChange={e => setsearchRemarks(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Typography.Text strong>异常：</Typography.Text>
            <div style={{ display: 'flex', gap: '8px', marginTop: 4 }}>
              <Select
                style={{ width: '150px' }}
                value={searchAbnormalType}
                onChange={value => setSearchAbnormalType(value)}
                options={[
                  { value: 'contains', label: '包含' },
                  { value: 'equals', label: '等于' },
                  { value: 'startswith', label: '开头是' },
                  { value: 'not_startswith', label: '开头不是' }
                ]}
              />
              <Search
                placeholder="通过异常查询"
                onChange={e => setsearchAbnormal(e.target.value)}
                style={{ flex: 1 }}
                allowClear
              />
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Typography.Text strong>Creator：</Typography.Text>
            <Search
              placeholder="通过 Creator 查询"
              onChange={e => setSearchCreator(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Typography.Text strong>审核人：</Typography.Text>
            <Search
              placeholder="通过审核人查询"
              onChange={e => setSearchReviewer(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Typography.Text strong>是否已锁定：</Typography.Text>
            <Select
              placeholder="全部"
              onChange={value => setSearchLock(value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
              value={searchLock}
              options={[
                { value: undefined, label: '全部' },
                { value: 'true', label: '已锁定' },
                { value: 'false', label: '未锁定' },
              ]}
            />
          </Col>
        </Row>
    
      </Card>

      <div ref={tableRef} style={{ scrollMarginTop: '20px' }}>
        <EditableProTable<CustomsClearSummaryLog>
          rowKey="id"
          columns={columns}
          request={requestData}
          actionRef={actionRef}
          pagination={{
            pageSize: pageSize,
            showQuickJumper: true,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            onChange: (page, newPageSize) => {
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
              }
            }
          }}
          recordCreatorProps={false}
          scroll={{
            x: 960,
            y: 500,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          headerTitle={
            <Space>
              <Title level={4}>清关历史记录</Title>
              {isAdmin && (
                <>
                  <Button 
                    type="primary" 
                    icon={<LockOutlined />}
                    onClick={() => handleLockToggle(selectedRowKeys, true)}
                    disabled={selectedRowKeys.length === 0}
                  >
                    锁定
                  </Button>
                  <Button
                    icon={<UnlockOutlined />}
                    onClick={() => handleLockToggle(selectedRowKeys, false)}
                    disabled={selectedRowKeys.length === 0}
                  >
                    解锁
                  </Button>
                  <Button
                    type="primary"
                    icon={<ExportOutlined />}
                    onClick={handleExportSelected}
                    disabled={selectedRowKeys.length === 0}
                    loading={exportLoading}
                  >
                    导出选中数据
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={showBatchHideConfirm}
                  >
                    处理TEST数据
                  </Button>
                </>
              )}
            </Space>
          }
          editable={{
            type: 'multiple',
            editableKeys: [],
          }}
        />
      </div>
      <Modal
        title="PDF预览" 
        open={previewVisible}
        onCancel={handlePreviewClose}
        width="90%"
        footer={null}
        style={{ top: 10 }}
        bodyStyle={{
          height: 'calc(100vh - 100px)',
          padding: 0,
          overflow: 'hidden'
        }}
        zIndex={2000}
      >
        {previewElement && (
          <div style={{ height: '100%', width: '100%' }}>
            <PDFElement
              element={previewElement}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="Excel预览"
        open={excelPreviewVisible}
        onCancel={handleExcelPreviewClose}
        width="90%"
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(90vh - 108px)', padding: 0, overflow: 'hidden' }}
        destroyOnClose={true}
        zIndex={1500} // Add higher z-index to ensure it's on top
      >
        {excelPreviewData && (
          <div style={{ width: '100%', height: '100%' }}>
            <iframe
              ref={iframeRef}
              key={currentPreviewFile}
              src={`${server_url}/qingguan/luckysheet-preview`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              onLoad={() => {
                setIframeLoaded(true);
              }}
            />
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>空运主运单追踪</span>
            <div>
              <Button 
                onClick={async () => {
                  const success = await queryTracking(currentAwbNumber);
                  if (!success) {
                    handlePrevRecord();
                  }
                }}
                style={{ marginRight: 8 }}
              >
                上一个
              </Button>
              <Button 
                onClick={async () => {
                  const success = await queryTracking(currentAwbNumber);
                  if (!success) {
                    handleNextRecord();
                  }
                }}
              >
                下一个
              </Button>
            </div>
          </div>
        }
        open={kalittaModalVisible && currentTransportType === '空运' && useIframe}
        onCancel={() => {
          setKalittaModalVisible(false);
          setCurrentTransportType('');
          setUseIframe(true);
        }}
        width="90%"
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(90vh - 108px)', padding: 0, overflow: 'hidden' }}
      >
        <form
          ref={formRef}
          action="https://www.mawb.cn/zh-CN/"
          method="get"
          target="mawbFrame"
          style={{ display: 'none' }}
        >
          <input type="text" name="MawbNo" value={currentAwbNumber} />
        </form>
        <iframe
          name="mawbFrame"
          src="https://www.mawb.cn/zh-CN/?tdsourcetag=s_pctim_aiomsg"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>编辑信息  <span style={{ color: 'red', fontSize: '14px' }}>
              Creator: {currentRecord?.user_id || 'admin'}
            </span></span>
           
          </div>
        }
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="remarks"
            label="备注"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入备注"
              maxLength={500}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="abnormal"
            label="异常"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入异常信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
          
     
         
          <Form.Item label={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>税单类型</span>
                {currentRecord?.shuidan && currentRecord.shuidan.length > 0 && (
                  <Tooltip title="查看税单文件">
                    <PaperClipOutlined
                      onClick={() => {
                        setCurrentShuidanList(currentRecord.shuidan || []);
                        setShuidanModalVisible(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                )}
              </div>
            }
            
          >
            <Select value={fileType} onChange={setFileType} style={{ width: 120 }}>
              <Select.Option value="normal">税单</Select.Option>
              <Select.Option value="abnormal">不正常</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="上传新税单 (上传会覆盖同类型的旧文件)">
            <Upload
              fileList={fileToUpload}
              onChange={({ fileList }) => {
                setFileToUpload(fileList.slice(-1));
              }}
              beforeUpload={() => false}
            >
              <Button>选择文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="税单文件列表"
        open={shuidanModalVisible}
        onCancel={() => {
          setShuidanModalVisible(false);
          setCurrentRecord(null);
        }}
        footer={[
          <Button key="back" onClick={() => {
            setShuidanModalVisible(false);
            setCurrentRecord(null);
          }}>
            关闭
          </Button>,
        ]}
        zIndex={1500} // Tax document list modal - lower than preview modal (2000)
        style={{ top: 20 }} // 添加top样式使其位置更合理
      >
        <List
          dataSource={currentShuidanList}
          renderItem={item => (
            <List.Item
              actions={[
                <a key="preview" onClick={() => handleShuidanPreview(currentRecord?.id || '', item)}>预览</a>,
                <a key="download" onClick={() => handleShuidanDownload(item.filename)}>下载</a>,
                <a key="delete" onClick={() => handleShuidanDelete(item.filename)}>删除</a>
              ]}
            >
              <List.Item.Meta
                title={item.filename}
                description={`类型: ${item.type === 'normal' ? '税单' : '不正常'}`}
              />
            </List.Item>
          )}
        />
      </Modal>
      {/* Add the UniversalFilePreviewModal component */}
      <UniversalFilePreviewModal
        visible={universalPreviewVisible}
        onClose={handleUniversalPreviewClose}
        data={universalPreviewData}
        title="税单文件预览"
      />
      {/* Removed PDFPreviewModal - using UniversalFilePreviewModal for all tax document previews */}
    </div>
  );
};

export default PdfViewDownload;





















