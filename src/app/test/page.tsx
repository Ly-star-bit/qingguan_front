"use client";

import React, { useState } from 'react';
import { Upload, Button, message, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const ExcelUploader: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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

            const response = await axiosInstance.post('/api/process-excel', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob', // important for handling file response
            });

            // Create a URL and download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'processed_output.xlsx');
            document.body.appendChild(link);
            link.click();

            message.success('File processed and downloaded successfully!');
            handleRemove(); // Clear the selected file after successful upload
        } catch (error) {
            console.error('Error uploading file:', error);
            message.error('Failed to upload and process the file.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
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
