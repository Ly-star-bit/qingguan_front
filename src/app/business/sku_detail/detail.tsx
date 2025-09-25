'use client';
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Card, Row, Col, Upload } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import dayjs from 'dayjs';
import type { RcFile } from 'antd/es/upload/interface';

interface SkuDetail {
  Id?: number;
  oldsku?: string;
  newsku?: string;
  trackingnumber?: string;
  boxno?: string;
  labelurl?: string;
  pcno?: string;
  createtime?: string;
  all_download_count?: number;
  remaining_download_count?: number;
}

interface IPdfElement {
  type: 'pdf';
  url: string;
  display: 'inline' | 'side' | 'page';
  page?: number;
}

export default function SkuDetailPage() {
  const [data, setData] = useState<SkuDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadExcelLoading, setUploadExcelLoading] = useState(false);
  const [uploadZipLoading, setUploadZipLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchForm] = Form.useForm();
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Excel上传配置
  const uploadExcelProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      const formData = new FormData();
      formData.append('file', file as RcFile);
      
      try {
        setUploadExcelLoading(true);
        await axiosInstance.post('/skudetail/upload_excel', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Excel文件上传成功');
        fetchData(currentPage, pageSize);
        onSuccess?.('ok');
      } catch (error: any) {
        message.error(error.response?.data?.detail || 'Excel文件上传失败');
        onError?.(error);
      } finally {
        setUploadExcelLoading(false);
      }
    },
  };

  // ZIP上传配置
  const uploadZipProps: UploadProps = {
    name: 'file',
    accept: '.zip',
    showUploadList: false,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      const formData = new FormData();
      formData.append('file', file as RcFile);
      
      try {
        setUploadZipLoading(true);
        await axiosInstance.post('/skudetail/upload_labels', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('ZIP文件上传成功');
        fetchData(currentPage, pageSize);
        onSuccess?.('ok');
      } catch (error: any) {
        message.error(error.response?.data?.detail || 'ZIP文件上传失败');
        onError?.(error);
      } finally {
        setUploadZipLoading(false);
      }
    },
  };

  const columns: ColumnsType<SkuDetail> = [
    { title: '原SKU', dataIndex: 'oldsku', key: 'oldsku' },
    { title: '新SKU', dataIndex: 'newsku', key: 'newsku' },
    { title: '跟踪号', dataIndex: 'trackingnumber', key: 'trackingnumber' },
    { title: '箱号', dataIndex: 'boxno', key: 'boxno' },
    { 
      title: '标签', 
      dataIndex: 'labelurl', 
      key: 'labelurl', 
      render: (_, record) => record.oldsku ? (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handlePreviewPdf(record.oldsku!)}
        >
          预览
        </Button>
      ) : '-'
    },
    { title: 'PC编号', dataIndex: 'pcno', key: 'pcno' },
    {
      title: '创建时间',
      dataIndex: 'createtime',
      key: 'createtime',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '全部下载次数',
      dataIndex: 'all_download_count',
      key: 'all_download_count',
      render: (text) => text || '-',
    },
    {
      title: '剩余下载次数',
      dataIndex: 'remaining_download_count',
      key: 'remaining_download_count',
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.Id!)} />
        </Space>
      ),
    },
  ];

  // PDF预览处理
  const handlePreviewPdf = async (sku: string) => {
    try {
      const response = await axiosInstance.get(`/skudetail/download_label_preview/${sku}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(pdfUrl);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取PDF文件失败');
    }
  };

  // 添加下载模板处理函数
  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosInstance.get('/skudetail/download_excel_template', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SKU详情导入模板.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载模板失败');
    }
  };

  const fetchData = async (page = currentPage, size = pageSize, searchParams = {}) => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * size,
        limit: size,
        type:"web",
        ...searchParams,
      };
      const response = await axiosInstance.get('/skudetail/', { params });
      setData(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values: any) => {
    setCurrentPage(1);
    fetchData(1, pageSize, values);
  };

  const handleEdit = (record: SkuDetail) => {
    setEditingId(record.Id!);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '您确定要删除这条记录吗？此操作不可撤销。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axiosInstance.delete(`/skudetail/${id}`);
          message.success('删除成功');
          const searchParams = searchForm.getFieldsValue();
          if (data.length === 1 && currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            fetchData(newPage, pageSize, searchParams);
          } else {
            fetchData(currentPage, pageSize, searchParams);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      const searchParams = searchForm.getFieldsValue();
      if (editingId) {
        await axiosInstance.put(`/skudetail/${editingId}`, values);
        message.success('更新成功');
        fetchData(currentPage, pageSize, searchParams);
      } else {
        await axiosInstance.post('/skudetail/', values);
        message.success('创建成功');
        setCurrentPage(1);
        fetchData(1, pageSize, searchParams);
      }
      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
    } catch (error) {
      message.error('操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleTableChange = (pagination: any) => {
    const newPage = pagination.current;
    const newPageSize = pagination.pageSize;
    setCurrentPage(newPage);
    setPageSize(newPageSize);
    fetchData(newPage, newPageSize, searchForm.getFieldsValue());
  };

  useEffect(() => {
    fetchData(1, 10);
  }, []);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <Card
        title="SKU详情管理"
        bordered={false}
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载Excel模板
            </Button>
            <Upload {...uploadExcelProps}>
              <Button 
                icon={<UploadOutlined />} 
                loading={uploadExcelLoading}
              >
                上传Excel
              </Button>
            </Upload>
            <Upload {...uploadZipProps}>
              <Button 
                icon={<UploadOutlined />} 
                loading={uploadZipLoading}
              >
                上传标签ZIP
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingId(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              新建
            </Button>
          </Space>
        }
      >
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="mb-6"
        >
          <Form.Item name="boxno" label="箱号">
            <Input placeholder="请输入箱号" allowClear />
          </Form.Item>
          <Form.Item name="trackingnumber" label="跟踪号">
            <Input placeholder="请输入跟踪号" allowClear />
          </Form.Item>
          <Form.Item name="pcno" label="PC编号">
            <Input placeholder="请输入PC编号" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button
                onClick={() => {
                  searchForm.resetFields();
                  handleSearch({});
                }}
                icon={<ReloadOutlined />}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="Id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          bordered
        />

        <Modal
          title={editingId ? '编辑SKU详情' : '新建SKU详情'}
          open={modalVisible}
          onOk={handleSubmit}
          confirmLoading={confirmLoading}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingId(null);
          }}
          width={600}
          destroyOnClose
        >
          <Form form={form} layout="vertical" name="skuDetailForm">
            <Form.Item name="oldsku" label="原SKU" rules={[{ required: true, message: '请输入原SKU' }]}>
              <Input placeholder="请输入原SKU" />
            </Form.Item>
            <Form.Item name="newsku" label="新SKU">
              <Input placeholder="请输入新SKU" />
            </Form.Item>
            <Form.Item name="trackingnumber" label="跟踪号">
              <Input placeholder="请输入跟踪号" />
            </Form.Item>
            <Form.Item name="boxno" label="箱号">
              <Input placeholder="请输入箱号" />
            </Form.Item>
           
            <Form.Item name="pcno" label="PC编号">
              <Input placeholder="请输入PC编号" />
            </Form.Item>
            <Form.Item name="all_download_count" label="全部下载次数">
              <Input type="number" placeholder="请输入全部下载次数" />
            </Form.Item>
            <Form.Item name="remaining_download_count" label="剩余下载次数">
              <Input type="number" placeholder="请输入剩余下载次数" />
            </Form.Item>
          </Form>
        </Modal>

        {/* PDF预览Modal */}
        <Modal
          title="PDF预览"
          open={!!pdfPreviewUrl}
          onCancel={() => {
            if (pdfPreviewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(pdfPreviewUrl);
            }
            setPdfPreviewUrl(null);
          }}
          footer={null}
          width="80%"
          style={{ top: 20 }}
          destroyOnClose
        >
          {pdfPreviewUrl && (
            <div style={{ height: 'calc(100vh - 200px)' }}>
              <iframe
                src={`/pdfjs-5.3.93/web/viewer.html?file=${encodeURIComponent(pdfPreviewUrl)}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
}
