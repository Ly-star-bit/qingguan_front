import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, message, Popconfirm, Tag, Space, Tooltip, Typography, Select, Upload, Dropdown, Menu } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { InputRef, UploadProps } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import { CopyOutlined, FormOutlined, CloseOutlined, UploadOutlined, DownOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
// 定义数据模型
interface TrackingNumberData {
    id: number;
    work_num?: string;
    tracking_num?: string;
    print_type?: string;
    route_content?: string;
    status?: number;
    all_received?: boolean;
    create_time?: string;
    update_time?: string;
}

interface SearchParams {
    work_num?: string;
    print_type?: string;
    status?: number;
    all_received?: boolean;
}

// API 基础路径
const API_URL = '/17track/tracking_data';

const TrackingNumber17Page: React.FC = () => {
    const [data, setData] = useState<TrackingNumberData[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
    });
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingData, setEditingData] = useState<Partial<TrackingNumberData> | null>(null);
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const [isWorkNumModalVisible, setIsWorkNumModalVisible] = useState(false);
    const [workNumLines, setWorkNumLines] = useState<string[]>(['']);
    const lineInputRefs = useRef<(InputRef | null)[]>([]);

    const [form] = Form.useForm();

    const fetchData = useCallback(async (page: number, size: number, params: SearchParams) => {
        setLoading(true);
        try {
            const queryParams: Record<string, any> = {
                page: String(page),
                size: String(size),
                ...params
            };

            // 过滤掉值为 undefined, null 或空字符串的参数
            Object.keys(queryParams).forEach(key => {
                if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
                    delete queryParams[key];
                }
            });

            if (queryParams.work_num && typeof queryParams.work_num === 'string') {
                const normalizedValue = queryParams.work_num.replace(/[，\s]+/g, ',').replace(/,+/g, ',').trim();
                queryParams.work_num = normalizedValue;
            }

            const url = `${API_URL}?${new URLSearchParams(queryParams).toString()}`;
            const response = await axiosInstance.get(url);
            if (response.status !== 200) {
                throw new Error('网络响应错误');
            }
            const result = response.data;
            setData(result.items);
            setPagination(prev => ({ 
                ...prev, 
                current: result.page, 
                pageSize: result.size, 
                total: result.total 
            }));
        } catch (error) {
            message.error('获取数据失败');
            console.error('获取数据失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (pagination.current && pagination.pageSize) {
            fetchData(pagination.current, pagination.pageSize, searchParams);
        }
    }, [fetchData, pagination.current, pagination.pageSize, searchParams]);

    useEffect(() => {
        if (isWorkNumModalVisible) {
            const lastInput = lineInputRefs.current[workNumLines.length - 1];
            if (lastInput) {
                lastInput.focus();
            }
        }
    }, [workNumLines.length, isWorkNumModalVisible]);

    const handleTableChange = (newPagination: TablePaginationConfig) => {
        // 分页、排序、筛选变化时触发
        // 注意：这里我们只处理分页变化，搜索是独立的
        setPagination(prev => ({...prev, ...newPagination}));
    };

    const handleFilterChange = (changedFilters: Partial<SearchParams>) => {
        setPagination(prev => ({ ...prev, current: 1 })); // 搜索后回到第一页
        setSearchParams(prev => ({
            ...prev,
            ...changedFilters,
        }));
    };

    const handleReset = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        setSearchParams({});
    };

    const showModal = (record: Partial<TrackingNumberData> | null = null) => {
        setEditingData(record);
        if (record) {
            form.setFieldsValue({
                ...record,
                // 布尔值需要特殊处理
                all_received: record.all_received || false,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 0, all_received: false });
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingData(null);
        form.resetFields();
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const url = editingData?.id ? `${API_URL}/${editingData.id}` : API_URL;
            const method = editingData?.id ? 'PUT' : 'POST';

            const response = await axiosInstance.request({
                url: url,
                method: method,
                data: values,
            });

            if (response.status !== 200) {
                const errorData = response.data;
                throw new Error(errorData.detail || '操作失败');
            }

            message.success(editingData?.id ? '更新成功' : '创建成功');
            handleCancel();
            if (pagination.current && pagination.pageSize) {
                fetchData(pagination.current, pagination.pageSize, searchParams);
            }
        } catch (error) {
            if (error instanceof Error) {
                message.error(`操作失败: ${error.message}`);
            } else {
                message.error('验证失败或发生未知错误');
            }
        }
    };
    
    const handleDelete = async (id: number) => {
        try {
            const response = await axiosInstance.delete(`${API_URL}/${id}`);

            if (response.status !== 200) {
                const errorData = response.data;
                throw new Error(errorData.detail || '删除失败');
            }
            message.success('删除成功');
            if (pagination.current && pagination.pageSize) {
                fetchData(pagination.current, pagination.pageSize, searchParams);
            }
        } catch (error) {
            if (error instanceof Error) {
                message.error(`删除失败: ${error.message}`);
            } else {
                 message.error('删除失败');
            }
        }
    };

    const showWorkNumModal = () => {
        const currentWorkNumValue = searchParams.work_num || '';
        const lines = currentWorkNumValue
          ? String(currentWorkNumValue)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
          
        setWorkNumLines(lines.length > 0 ? lines : ['']);
        setIsWorkNumModalVisible(true);
    };
    
    const handleWorkNumModalOk = () => {
        const commaSeparatedString = workNumLines.map((line) => line.trim()).filter(Boolean).join(',');
        handleFilterChange({ work_num: commaSeparatedString });
        setIsWorkNumModalVisible(false);
    };

    const handleWorkNumModalCancel = () => {
        setIsWorkNumModalVisible(false);
    };

    const handleWorkNumLineChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const newLines = [...workNumLines];
        newLines[index] = e.target.value;
        setWorkNumLines(newLines);
    };
    
    const handleDeleteWorkNumLine = (index: number) => {
        const newLines = workNumLines.filter((_, i) => i !== index);
        if (newLines.length === 0) {
            setWorkNumLines(['']);
        } else {
            setWorkNumLines(newLines);
        }
    };
      
    const handleWorkNumClearAll = () => {
        setWorkNumLines(['']);
    };
    
    const handleWorkNumKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newLines = [...workNumLines];
            newLines.splice(index + 1, 0, '');
            setWorkNumLines(newLines);
        }
    };
    
    const handleWorkNumContainerPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const newPastedLines = pastedText
          .replace(/[，, \s\t\r]+/g, '\n')
          .split('\n')
          .filter((line) => line.trim() !== '');
    
        if (newPastedLines.length > 0) {
            setWorkNumLines((prevLines) => {
                const existingLines = prevLines.length === 1 && prevLines[0].trim() === ''
                  ? []
                  : prevLines;
                return [...existingLines, ...newPastedLines];
            });
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        customRequest: async (options) => {
            const { onSuccess, onError, file } = options;
            const formData = new FormData();
            formData.append('file', file as Blob);

            try {
                const response = await axiosInstance.post(`${API_URL}/upload`, formData);
                
                if (response.status === 200 && response.data.status === 'success') {
                    const { message: successMessage, errors } = response.data;
                    message.success(successMessage);
                    
                    if (errors && errors.length > 0) {
                        const errorDetails = errors.map((e: any) => `行 ${e.row}: ${e.error}`).join('\n');
                        console.error('上传部分失败详情:\n', errorDetails);
                        Modal.warning({
                            title: '部分数据导入失败',
                            content: <pre style={{ maxHeight: 200, overflow: 'auto' }}>{errorDetails}</pre>,
                            width: 600,
                        });
                    }
                    
                    onSuccess?.(response.data);
                    if (pagination.current && pagination.pageSize) {
                        fetchData(pagination.current, pagination.pageSize, searchParams);
                    }
                } else {
                    const errorMsg = response.data?.detail || '上传失败';
                    message.error(errorMsg);
                    onError?.(new Error(errorMsg));
                }
            } catch (error: any) {
                console.error('上传失败:', error);
                const errorMsg = error.response?.data?.detail || '文件处理失败，请检查文件内容。';
                message.error(errorMsg);
                onError?.(error);
            }
        },
        beforeUpload: (file) => {
            const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
            if (!isExcel) {
                message.error('只能上传 .xls 或 .xlsx 格式的Excel文件!');
            }
            return isExcel || Upload.LIST_IGNORE;
        },
        showUploadList: false,
    };

    const queryByExcelProps: UploadProps = {
        name: 'file',
        customRequest: async (options) => {
            const { onSuccess, onError, file } = options;
            const formData = new FormData();
            formData.append('file', file as Blob);

            setLoading(true);
            try {
                const response = await axiosInstance.post(`${API_URL}/query-by-excel`, formData, {
                    responseType: 'blob'  // 设置响应类型为blob
                });
                
                if (response.status === 200) {
                    // 从响应头中获取文件名
                    const contentDisposition = response.headers['content-disposition'];
                    let filename = 'tracking_data.xlsx';
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (filenameMatch && filenameMatch[1]) {
                            filename = filenameMatch[1].replace(/['"]/g, '');
                        }
                    }

                    // 创建下载链接
                    const blob = new Blob([response.data], { 
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    });
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);

                    message.success("查询成功，文件已开始下载");
                    onSuccess?.(response.data);
                } else {
                    const errorMsg = '查询失败';
                    message.error(errorMsg);
                    onError?.(new Error(errorMsg));
                }
            } catch (error: any) {
                console.error('查询失败:', error);
                // 尝试读取错误信息
                if (error.response?.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const errorData = JSON.parse(text);
                        message.error(errorData.detail || '文件处理失败，请检查文件内容。');
                    } catch (e) {
                        message.error('文件处理失败，请检查文件内容。');
                    }
                } else {
                    message.error(error.response?.data?.detail || '文件处理失败，请检查文件内容。');
                }
                onError?.(error);
            } finally {
                setLoading(false);
            }
        },
        beforeUpload: (file) => {
            const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
            if (!isExcel) {
                message.error('只能上传 .xls 或 .xlsx 格式的Excel文件!');
            }
            return isExcel || Upload.LIST_IGNORE;
        },
        showUploadList: false,
    };

    const financeUploadProps: UploadProps = {
        name: 'file',
        customRequest: async (options) => {
            const { onSuccess, onError, file } = options;
            const formData = new FormData();
            formData.append('file', file as Blob);

            setLoading(true);
            try {
                const response = await axiosInstance.post(`${API_URL}/finance_upload`, formData, {
                    responseType: 'blob'
                });
                
                if (response.status === 200) {
                    const contentDisposition = response.headers['content-disposition'];
                    let filename = 'finance_output.xlsx';
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (filenameMatch && filenameMatch[1]) {
                            filename = filenameMatch[1].replace(/['"]/g, '');
                        }
                    }

                    const blob = new Blob([response.data], { 
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    });
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);

                    message.success("处理成功，文件已开始下载");
                    onSuccess?.(response.data);
                } else {
                    const errorMsg = '处理失败';
                    message.error(errorMsg);
                    onError?.(new Error(errorMsg));
                }
            } catch (error: any) {
                console.error('处理失败:', error);
                if (error.response?.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const errorData = JSON.parse(text);
                        message.error(errorData.detail || '文件处理失败，请检查文件内容。');
                    } catch (e) {
                        message.error('文件处理失败，请检查文件内容。');
                    }
                } else {
                    message.error(error.response?.data?.detail || '文件处理失败，请检查文件内容。');
                }
                onError?.(error);
            } finally {
                setLoading(false);
            }
        },
        beforeUpload: (file) => {
            const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
            if (!isExcel) {
                message.error('只能上传 .xls 或 .xlsx 格式的Excel文件!');
            }
            return isExcel || Upload.LIST_IGNORE;
        },
        showUploadList: false,
    };

    const handleExportExcel = () => {
        try {
            // 准备导出数据
            const exportData = data.map(item => ({
                'ID': item.id,
                '工作单号': item.work_num || '',
                '追踪号码': item.tracking_num || '',
                '打印类型': item.print_type || '',
                '路由内容': item.route_content || '',
                '状态': item.status === 1 ? '已订阅' : (item.status === 3 ? '已取消' : (item.status === 2 ? '异常' : '未订阅')),
                '全部收到': item.all_received ? '是' : '否',
                '创建时间': item.create_time ? new Date(item.create_time).toLocaleString() : '',
                '更新时间': item.update_time ? new Date(item.update_time).toLocaleString() : ''
            }));

            // 创建工作簿
            const wb = XLSX.utils.book_new();
            // 创建工作表
            const ws = XLSX.utils.json_to_sheet(exportData);

            // 设置列宽
            const colWidths = [
                { wch: 8 },  // ID
                { wch: 15 }, // 工作单号
                { wch: 20 }, // 追踪号码
                { wch: 10 }, // 打印类型
                { wch: 30 }, // 路由内容
                { wch: 10 }, // 状态
                { wch: 10 }, // 全部收到
                { wch: 20 }, // 创建时间
                { wch: 20 }  // 更新时间
            ];
            ws['!cols'] = colWidths;

            // 将工作表添加到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '追踪数据');

            // 生成Excel文件并下载
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            XLSX.writeFile(wb, `tracking_data_${timestamp}.xlsx`);

            message.success('导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败，请稍后重试');
        }
    };

    const columns: ColumnsType<TrackingNumberData> = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: 80 },
        { title: '工作单号', dataIndex: 'work_num', key: 'work_num', width: 150 },
        { 
            title: '追踪号码', 
            dataIndex: 'tracking_num', 
            key: 'tracking_num',
            width: 200, // 添加固定宽度
            ellipsis: true, // 启用单元格省略
            render: (text: string) => {
                if (!text) return '-';

                const trackingNumbers = text.split('\n').map(s => s.trim()).filter(Boolean);

                if (trackingNumbers.length === 0) {
                    return '-';
                }

                return (
                    <div style={{ width: '100%', overflow: 'hidden' }}>
                        {trackingNumbers.map((num, index) => (
                            <Typography.Text 
                                key={index} 
                                style={{ 
                                    display: 'block',
                                    width: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }} 
                                ellipsis={{ tooltip: num.split(',').join('\n') }}
                                copyable={{ text: num }}
                            >
                                {num}
                            </Typography.Text>
                        ))}
                    </div>
                );
            }
        },
        { 
            title: '打印类型', 
            dataIndex: 'print_type', 
            key: 'print_type', 
            width: 100,
            render: (text: string, record: TrackingNumberData) => {
                if (!text) return '-';

                let firstTrackingNum = '';
                if (text === 'UPS') {
                    // UPS用逗号分隔并取第一个
                    firstTrackingNum = record.tracking_num?.split(',')[0]?.trim() || '';
                } else {
                    // 其他类型用换行符分隔
                    const trackingNumbers = record.tracking_num?.split('\n').map(s => s.trim()).filter(Boolean) || [];
                    firstTrackingNum = trackingNumbers[0];
                }

                if (!firstTrackingNum) {
                    return text;
                }

                let url = '';
                if (text === 'FedEx') {
                    url = `https://www.fedex.com/fedextrack/summary?trknbr=${firstTrackingNum}`;
                } else if (text === 'UPS') {
                    url = `https://www.ups.com/track?loc=en_US&tracknum=${firstTrackingNum}`;
                }

                if (url) {
                    return (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            {text}
                        </a>
                    );
                }

                return text;
            }
        },
        { 
            title: '路由内容', 
            dataIndex: 'route_content', 
            key: 'route_content',
            render: (text: string) => {
                if (!text) return '-';
                const [trackingNum, status] = text.split(/(?=已签收)/);
                return (
                    <div>
                        <div>{trackingNum}</div>
                        <div>{status}</div>
                    </div>
                );
            }
        },
        {
            title: '状态',
            dataIndex: 'status', 
            key: 'status',
            width: 80,
            render: (status) => {
                if (status === 3) {
                    return <Tag color="error">已取消</Tag>;
                }
                if (status === 2) {
                    return <Tag color="error">异常</Tag>;
                }
                return (
                    <Tag color={status === 1 ? 'success' : 'default'}>
                        {status === 1 ? '已订阅' : '未订阅'}
                    </Tag>
                );
            },
        },
        {
            title: '全部收到',
            dataIndex: 'all_received',
            key: 'all_received',
            width: 100,
            render: (allReceived) => (allReceived ? <Tag color="success">是</Tag> : <Tag color="default">否</Tag>),
        },
        { title: '创建时间', dataIndex: 'create_time', key: 'create_time', render: (text) => text ? new Date(text).toLocaleString() : '' },
        { title: '更新时间', dataIndex: 'update_time', key: 'update_time', render: (text) => text ? new Date(text).toLocaleString() : '' },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" onClick={() => showModal(record)} style={{padding: 0}}>编辑</Button>
                    <Popconfirm
                        title="确定删除这条数据吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button type="link" danger style={{padding: 0}}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const uploadMenu = (
        <Menu>
            <Menu.Item key="1">
                <Upload {...queryByExcelProps} style={{ display: 'block' }}>
                    <Button type="text" block>客服上传</Button>
                </Upload>
            </Menu.Item>
            <Menu.Item key="2">
                <Upload {...financeUploadProps} style={{ display: 'block' }}>
                    <Button type="text" block>财务上传</Button>
                </Upload>
            </Menu.Item>
        </Menu>
    );

    return (
        <div style={{ padding: 24 }}>
            <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <Input
                    placeholder="输入工单号查询,点右侧批量"
                    onPressEnter={(e) => handleFilterChange({ work_num: e.currentTarget.value })}
                    onChange={(e) => {
                        const { value } = e.target;
                        setSearchParams(prev => ({ ...prev, work_num: value }));
                        if (value === '') {
                            handleFilterChange({ work_num: '' });
                        }
                    }}
                    value={searchParams.work_num}
                    style={{ width: 260 }}
                    allowClear
                    addonAfter={<FormOutlined onClick={showWorkNumModal} style={{ cursor: 'pointer' }} />}
                />
                <Select
                    placeholder="打印类型"
                    style={{ width: 120 }}
                    onChange={(value) => handleFilterChange({ print_type: value })}
                    value={searchParams.print_type}
                    allowClear
                >
                    <Select.Option value="FedEx">FedEx</Select.Option>
                    <Select.Option value="UPS">UPS</Select.Option>
                </Select>
                <Select
                    placeholder="状态"
                    style={{ width: 120 }}
                    onChange={(value) => handleFilterChange({ status: value })}
                    value={searchParams.status}
                    allowClear
                >
                    <Select.Option value={1}>已订阅</Select.Option>
                    <Select.Option value={0}>未订阅</Select.Option>
                    <Select.Option value={2}>异常</Select.Option>
                    <Select.Option value={3}>已取消</Select.Option>
                </Select>
                <Select
                    placeholder="全部收到"
                    style={{ width: 120 }}
                    onChange={(value) => handleFilterChange({ all_received: value })}
                    value={searchParams.all_received}
                    allowClear
                >
                    <Select.Option value={true}>是</Select.Option>
                    <Select.Option value={false}>否</Select.Option>
                </Select>
                <Button onClick={handleReset}>重置</Button>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>批量上传</Button>
                </Upload>
                <Dropdown overlay={uploadMenu}>
                    <Button>
                        Excel上传查询 <DownOutlined />
                    </Button>
                </Dropdown>
                <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
                    导出Excel
                </Button>
                <Button type="primary" onClick={() => showModal()}>
                    新建追踪数据
                </Button>
            </Space>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1500 }}
            />
            <Modal
                title="批量输入工单号"
                open={isWorkNumModalVisible}
                onOk={handleWorkNumModalOk}
                onCancel={handleWorkNumModalCancel}
                destroyOnClose
                width={600}
                footer={[
                    <Button key="clear" onClick={handleWorkNumClearAll} danger style={{ float: 'left' }}>
                      清空
                    </Button>,
                    <Button key="back" onClick={handleWorkNumModalCancel}>
                      取消
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleWorkNumModalOk}>
                      确定
                    </Button>,
                ]}
              >
                <p>支持从Excel/Txt直接粘贴，回车可换行。</p>
                <div
                  onPaste={handleWorkNumContainerPaste}
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '8px',
                    height: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {workNumLines.map((line, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ marginRight: '8px', color: '#999', userSelect: 'none', width: '30px' }}>
                        {index + 1}.
                      </span>
                      <Input
                        ref={(el) => {
                          lineInputRefs.current[index] = el;
                        }}
                        value={line}
                        onChange={(e) => handleWorkNumLineChange(e, index)}
                        onKeyDown={(e) => handleWorkNumKeyDown(e, index)}
                        placeholder="请输入工单号"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => handleDeleteWorkNumLine(index)}
                        danger
                        style={{ marginLeft: '4px' }}
                      />
                    </div>
                  ))}
                </div>
            </Modal>
            <Modal
                title={editingData?.id ? '编辑追踪数据' : '新建追踪数据'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                destroyOnClose
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical" name="tracking_data_form" initialValues={{ status: 0, all_received: false }}>
                    <Form.Item name="work_num" label="工单号" rules={[{ required: false, message: '请输入工单号' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tracking_num" label="追踪号码 (多个号码请用换行分隔)">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="print_type" label="打印类型">
                        <Input />
                    </Form.Item>
                    <Form.Item name="route_content" label="路由内容">
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="状态" rules={[{ required: true, message: '请输入状态' }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="all_received" valuePropName="checked">
                        <Checkbox>全部收到</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TrackingNumber17Page;
