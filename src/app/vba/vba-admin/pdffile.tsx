import { Table, Button, Input, Modal } from 'antd';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { SortOrder } from 'antd/es/table/interface';

const { Search } = Input;

interface FileInfo {
  name: string;
  time: Date;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const PdfViewDownload = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${server_url}/qingguan/files`);
      setFiles(response.data);
      setFilteredFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const filtered = files.filter(file =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  }, [searchTerm, files]);

  const handleDownload = async (fileName: string) => {
    try {
      const response = await axios.get(`${server_url}/qingguan/download/${fileName}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Last Modified Time',
      dataIndex: 'time',
      key: 'time',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      defaultSortOrder: 'descend' as SortOrder,
    },
    {
      title: '预估税金',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => {
        // 去掉文件扩展名并分割字符串
        const parts = text.replace('.pdf', '').split('-');
        // 获取最后一个元素
        const lastPart = parts.pop();
        // 检查最后一个元素是否为数字
        if (lastPart && !isNaN(Number(lastPart))) {
          return Number(lastPart).toFixed(2);
        } else {
          return '';
        }
      }
    },
    
    
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FileInfo) => (
        <>
          <Button onClick={() => handleDownload(record.name)} style={{ marginRight: 8 }}>Download</Button>
          {/* <Button onClick={() => handlePreview(record.name)}>Preview</Button> */}
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="Search by file name"
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '70%' }}
        />
        <Button type="primary" onClick={fetchFiles}>Refresh</Button>
      </div>
      <Table dataSource={filteredFiles} columns={columns} rowKey="name" />
    </div>
  );
};

export default PdfViewDownload;
