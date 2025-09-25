'use client';
import React, { useState, useEffect } from 'react';
import {
  Table,
  Upload,
  Button,
  message,
  Space,
  DatePicker,
  Select,
  Form,
  Card,
  Spin,
  Tooltip,
  Modal,
} from 'antd';
import { UploadOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import axiosInstance from '@/utils/axiosInstance';

const { RangePicker } = DatePicker;

interface PriceCardData {
  _id: string;
  亚马逊仓: string;
  时间: string;
  类型: string;
  [key: string]: any;
}

const AdminUse: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [data, setData] = useState<PriceCardData[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [types, setTypes] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查用户是否为admin
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAdmin(parsedUser.username === 'admin');
    }
  }, []);

  // 获取类型列表
  const fetchTypes = async () => {
    try {
      const { data: result } = await axiosInstance.get('/price_card/get_types');
      if (result.status === 'success') {
        setTypes(result.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取类型列表失败');
    }
  };

  // 获取数据
  const fetchData = async (params: any = {}) => {
    setLoading(true);
    try {
      const { data: result } = await axiosInstance.get('/price_card/query_price_cards', {
        params: {
          page: params.current || 1,
          page_size: params.pageSize || 10,
          ...(params.timeRange && {
            time_start: dayjs(params.timeRange[0]).format('YYYY-MM-DD'),
            time_end: dayjs(params.timeRange[1]).format('YYYY-MM-DD'),
          }),
          ...(params.types && { types: params.types.join(',') }),
        }
      });

      if (result.status === 'success') {
        setData(result.data.records);
        setPagination({
          ...pagination,
          current: params.current || 1,
          total: result.data.total,
        });
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取数据失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
    fetchData();
  }, []);

  const handleTableChange = (newPagination: any) => {
    const formValues = form.getFieldsValue();
    fetchData({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      ...formValues,
    });
  };

  const handleSearch = (values: any) => {
    fetchData({
      current: 1,
      pageSize: pagination.pageSize,
      ...values,
    });
  };

  const customRequest = async ({ file, onSuccess, onError }: any) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploadLoading(true);
    
    try {
      const { data: result } = await axiosInstance.post('/price_card/upload_price_card', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (result.status === 'success') {
        message.success('上传成功');
        onSuccess(result);
        // 刷新数据
        fetchData({
          current: 1,
          pageSize: pagination.pageSize,
        });
      } else {
        message.error(result.message || '上传失败');
        onError(new Error(result.message));
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '上传失败');
      onError(error);
    } finally {
      setUploadLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    customRequest,
    accept: '.xlsx,.xls',
    showUploadList: false,
  };

  const copyToClipboard = (text: string) => {
    // 创建临时文本区域
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    
    try {
      // 选择文本
      textArea.select();
      // 执行复制命令
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('已复制到剪贴板');
      } else {
        message.error('复制失败');
      }
    } catch (err) {
      message.error('复制失败');
    } finally {
      // 清理：移除临时文本区域
      document.body.removeChild(textArea);
    }
  };

  // 更新失效时间
  const handleUpdateInvalidTime = async () => {
    Modal.confirm({
      title: '确认更新',
      content: '确定要更新失效时间吗？',
      onOk: async () => {
        setUpdateLoading(true);
        try {
          const { data: result } = await axiosInstance.post('/price_card/update_invalid_data');
          if (result.status === 'success') {
            message.success('更新成功');
            fetchData({
              current: pagination.current,
              pageSize: pagination.pageSize,
              ...form.getFieldsValue(),
            });
          } else {
            message.error(result.message || '更新失败');
          }
        } catch (error: any) {
          message.error(error.response?.data?.message || '更新失败');
        } finally {
          setUpdateLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: '产品',
      dataIndex: '产品',
      key: '产品',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '亚马逊仓',
      dataIndex: '亚马逊仓',
      key: '亚马逊仓',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '+45Kg',
      dataIndex: '+45Kg',
      key: '+45Kg',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '+100Kg',
      dataIndex: '+100Kg',
      key: '+100Kg',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '+300Kg',
      dataIndex: '+300Kg',
      key: '+300Kg',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '时效',
      dataIndex: '时效',
      key: '时效',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '时间',
      dataIndex: '时间',
      key: '时间',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '失效时间',
      dataIndex: '失效时间',
      key: '失效时间',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span>{text}</span>
              <CopyOutlined 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(text);
                }}
              />
            </div>
          }
        >
          <span>{text}</span>
        </Tooltip>
      ),
    }
  ];

  return (
    <div className="p-6">
      <Card>
        <Form form={form} onFinish={handleSearch} layout="inline" className="mb-4">
          <Form.Item name="timeRange">
            <RangePicker />
          </Form.Item>
          <Form.Item name="types">
            <Select
              mode="multiple"
              placeholder="选择类型"
              style={{ width: '300px' }}
              options={types.map(type => ({ label: type, value: type }))}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              {isAdmin && (
                <>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />} loading={uploadLoading}>
                      上传价格表
                    </Button>
                  </Upload>
                  <Button 
                    icon={<ReloadOutlined />} 
                    loading={updateLoading}
                    onClick={handleUpdateInvalidTime}
                  >
                    更新失效时间
                  </Button>
                </>
              )}
            </Space>
          </Form.Item>
        </Form>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="_id"
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AdminUse;