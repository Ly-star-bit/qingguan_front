"use client";

import React, { useState, useEffect } from 'react';
import { Upload, Button, message, Typography, Input, Table, Form } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';

const { Title, Text } = Typography;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const UpsRemoteAddressChecker: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [form] = Form.useForm();
    const [searchLoading, setSearchLoading] = useState(false);

    const columns = [
        {
            title: '邮编',
            dataIndex: 'zip_code',
            key: 'zip_code',
        },
        {
            title: '城市名称',
            dataIndex: 'city',
            key: 'city',
        },
        {
            title: '所在州名称',
            dataIndex: 'state',
            key: 'state',
        },
        {
            title: '地址属性',
            dataIndex: 'property',
            key: 'property',
            render: (text: string, record: any) => (
                <span>{record.type} {text}</span>
            )
        },
        {
            title: '地址描述',
            dataIndex: 'address_description',
            key: 'address_description',
        },
        {
            title: '费用',
            dataIndex: 'cost',
            key: 'cost',
        }
    ];

    useEffect(() => {
        const fetchEffectiveDate = async () => {
            try {
                const response = await axiosInstance.get(`${server_url}/qingguan/get_ups_remoteaddresscheck_effective_date`);
                setEffectiveDate(response.data.effective_date);
            } catch (error) {
                console.error('获取生效日期失败:', error);
                message.error('获取生效日期失败');
            }
        };

        fetchEffectiveDate();
    }, []);

    const handleSearch = async (values: any) => {
        if (!values.zipcode) {
            message.error('请输入邮编');
            return;
        }
        
        setSearchLoading(true);
        setSearchResults([]); // 清空之前的搜索结果
        
        try {
            const formData = new FormData();
            formData.append('zip_code_str', values.zipcode);
            
            const response = await axiosInstance.post(`${server_url}/qingguan/all_remoteaddresscheck_process`, formData);
            const data = Array.isArray(response.data) ? response.data : [];
            setSearchResults(data);
        } catch (error) {
            console.error('查询失败:', error);
            message.error('查询失败');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleFileChange = (info: any) => {
        const selectedFile = info.fileList[0]?.originFileObj as File | undefined;
        if (selectedFile) {
            setFile(selectedFile);
            setFileList(info.fileList);
            message.success(`已选择文件: ${selectedFile.name}`);
        } else {
            message.error('文件选择失败，请重试');
        }
    };

    const handleRemove = () => {
        setFile(null);
        setFileList([]);
    };

    const handleUpload = async () => {
        if (!file) {
            message.error('请先选择文件！');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post(`${server_url}/qingguan/ups_remoteaddresscheck`, formData, {
                responseType: 'arraybuffer'
            });

            if (!response.data || response.data.byteLength === 0) {
                throw new Error('接收到的文件为空或已损坏');
            }

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'processed_output.xlsx');
            document.body.appendChild(link);
            link.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            message.success('文件处理并下载成功！');
            handleRemove();
        } catch (error: any) {
            console.error('文件上传错误:', error);
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    message.error('请求参数错误：' + (error.response.data.message || ''));
                } else if (status === 500) {
                    message.error('服务器内部错误：' + (error.response.data.message || ''));
                } else {
                    message.error('文件处理失败：' + (error.response.data.message || ''));
                }
            } else if (error.request) {
                message.error('服务器无响应，请检查网络连接');
            } else {
                message.error('文件处理失败：' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <h1 style={{ textAlign: 'center', flexGrow: 1 }}>UPS偏远地址判断</h1>
            </div>
            {effectiveDate && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Text type="danger">生效日期: {effectiveDate}</Text>
                </div>
            )}

            <div style={{ marginBottom: 20 }}>
                <Form form={form} onFinish={handleSearch} layout="inline" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Form.Item name="zipcode" style={{ flex: 1, marginRight: 16 }}>
                        <Input placeholder="请输入邮编" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            查询
                        </Button>
                    </Form.Item>
                    <Form.Item>
                        <Upload 
                            beforeUpload={() => false}
                            onChange={handleFileChange}
                            onRemove={handleRemove}
                            fileList={fileList}
                            accept=".xlsx, .xls"
                            disabled={loading}
                        >
                            <Button icon={<UploadOutlined />} disabled={loading}>
                                选择文件
                            </Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item>
                        <Button 
                            type="primary" 
                            onClick={handleUpload} 
                            disabled={!file || loading}
                            loading={loading}
                        >
                            上传处理
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            {searchResults.length > 0 && (
                <Table 
                    columns={columns}
                    dataSource={searchResults}
                    rowKey="zipcode"
                    pagination={false}
                />
            )}
        </div>
    );
};

export default UpsRemoteAddressChecker;
