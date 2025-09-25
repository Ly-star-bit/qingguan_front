import React, { useState } from 'react';
import { Card, DatePicker, Table, Button, Modal, message, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '@/utils/axiosInstance';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface FileInfo {
  filename: string;
  local_exists: boolean;
  minio_exists: boolean;
  local_path: string | null;
  minio_path: string | null;
}

interface ResponseData {
  status: string;
  data: {
    total: number;
    files: FileInfo[];
  };
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const PriceCardArchive: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FileInfo[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<ArrayBuffer | null>(null);

  const columns: ColumnsType<FileInfo> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '本地存储',
      dataIndex: 'local_exists',
      key: 'local_exists',
      render: (exists: boolean) => exists ? '✅' : '❌',
    },
    {
      title: 'MinIO存储',
      dataIndex: 'minio_exists',
      key: 'minio_exists',
      render: (exists: boolean) => exists ? '✅' : '❌',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          icon={<EyeOutlined />} 
          onClick={() => handlePreview(record)}
          disabled={!record.local_exists && !record.minio_exists}
        >
          预览
        </Button>
      ),
    },
  ];

  const handleSearch = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.warning('请选择日期范围');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.get<ResponseData>(`${server_url}/price_card/get_files_by_time_range`, {
        params: {
          time_start: dateRange[0].format('YYYY-MM-DD'),
          time_end: dateRange[1].format('YYYY-MM-DD'),
        },
      });

      if (response.data.status === 'success') {
        setData(response.data.data.files);
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (record: FileInfo) => {
    try {
      const params: Record<string, string> = {};
      if (record.local_exists && record.local_path) {
        params.local_file_path = record.local_path;
      } else if (record.minio_exists && record.minio_path) {
        params.minio_file_path = record.minio_path;
      } else {
        message.error('文件路径不存在');
        return;
      }

      const response = await axiosInstance.get(`${server_url}/price_card/download_price_card_xlsx`, {
        params,
        responseType: 'arraybuffer',
      });

      setExcelPreviewData(response.data);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('预览失败，请重试');
    }
  };

  return (
    <div>
      <Card title={<Title level={4}>价格卡存档查询</Title>}>
        <div style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            style={{ marginRight: 16 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            查询
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="filename"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      <Modal
        title="Excel预览"
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setExcelPreviewData(null);
        }}
        width="90%"
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(90vh - 108px)', padding: 0, overflow: 'hidden' }}
      >
        {excelPreviewData && (
            <div style={{ width: '100%', height: '100%' }}>
            <iframe
              key={new Date().getTime()}
              src={`${server_url}/luckysheet-preview`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentWindow && excelPreviewData) {
                  setTimeout(() => {
                    iframe.contentWindow?.postMessage({
                      type: 'loadExcel',
                      fileData: excelPreviewData,
                      fileName: 'price_card.xlsx'
                    }, '*');
                  }, 500);
                }
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PriceCardArchive;
