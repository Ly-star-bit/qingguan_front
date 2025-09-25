"use client";

import React, { useEffect, useState } from 'react';
import { Upload, Button, message, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const ExcelUploader: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [templateName, setTemplateName] = useState("");

    useEffect(()=>{
        fetchTemplate()
    },[])
    const fetchTemplate = async () => {
        try {
            const response = await fetch('/api/get_template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const Template_name = data.name;
            setTemplateName(Template_name);
        } catch (error: any) {
            console.error("Failed to fetch template:", error);
            message.error("Failed to fetch template. Please try again.");
        }
    };

    const handleFileChange = (info: any) => {
        const selectedFile = info.fileList[0]?.originFileObj as File | undefined;
        if (selectedFile) {
            setFile(selectedFile);
            setFileList(info.fileList);
            message.success(`${selectedFile.name} file selected.`);
        } else {
            message.error('Failed to select file. Please try again.');
        }
    };

    const handleRemove = () => {
        setFile(null);
        setFileList([]);
    };

    const handleUpload = async () => {
        if (!file) {
            message.error('Please select a file first!');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${server_url}/process_excel_usp_data`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 确保以二进制格式接收响应
            const buffer = await response.arrayBuffer();

            // 验证文件完整性
            if (!buffer || buffer.byteLength === 0) {
                throw new Error('接收到的文件为空或已损坏');
            }

            // 处理文件下载
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'processed_output.xlsx');
            document.body.appendChild(link);
            link.click();
            
            // 清理
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            message.success('文件处理并下载成功！');
            handleRemove(); // 成功上传后清除已选文件
        } catch (error: any) {
            console.error('文件上传错误:', error);
            message.error('文件处理失败：' + error.message);
        } finally {
            setLoading(false);
        }
    };
    const downloadTemplate = async () => {
        try {
            const response = await fetch('/api/get_template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
    
            if (data.error) {
                console.error(data.error);
                return;
            }
    
            const link = document.createElement('a');
            link.href = data.path;
            link.download = data.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
            console.error("Failed to download template:", error);
            message.error("Failed to download template. Please try again.");
        }
    };
    
    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1  style={{ textAlign: 'center', flexGrow: 1 }}>货运订单</h1>
                <Button type="primary" onClick={downloadTemplate}>{templateName.split('-')[5]}</Button>
            </div>
            <Title level={2}>Excel File Uploader</Title>
            <Text>Select an Excel file to upload and process.</Text>
            <Upload 
                beforeUpload={() => false} 
                onChange={handleFileChange} 
                onRemove={handleRemove}
                fileList={fileList}
                accept=".xlsx, .xls"
                style={{ marginTop: '20px' }}
                disabled={loading} // 禁用选择文件功能
            >
                <Button icon={<UploadOutlined />} style={{ marginBottom: '20px' }} disabled={loading}>
                    Select File
                </Button>
            </Upload>
            <Button 
                type="primary" 
                onClick={handleUpload} 
                disabled={!file || loading} 
                style={{ marginTop: '16px' }}
                loading={loading} // 按钮显示加载状态
            >
                Upload and Process
            </Button>
        </div>
    );
};

export default ExcelUploader;
