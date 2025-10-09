'use client';
import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Table,
  Tag,
  Space,
  Popconfirm,
  Switch,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axiosInstance from '@/utils/axiosInstance';

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
}

interface ApiKey {
  _id: string;
  name: string;
  key?: string; // Only returned on creation
  status: 'active' | 'inactive';
  scopes?: string[]; // Original scopes for backward compatibility
  // scopes?: string[]; // API endpoint IDs
  created_at: string;
  last_used: string | null;
  usage_count: number;
  rate_limit: number;
  rate_limit_window: number;
  key_value?: string; // Only returned on creation
}

const { TextArea } = Input;

const ApiKeysPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [newApiKey, setNewApiKey] = useState<ApiKey | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);

  // Fetch API keys and API endpoints
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch API keys
      const apiKeysResponse = await axiosInstance.get('/api_keys/');
      setApiKeys(apiKeysResponse.data.data);

      // Fetch API endpoints
      const apiResponse = await axiosInstance.get('/api_endpoints');
      const apiResult = apiResponse.data;
      const flatApiEndpoints = Object.entries(apiResult).reduce((acc: ApiEndpoint[], [group, endpoints]) => {
        return acc.concat(endpoints as ApiEndpoint[]);
      }, []);
      setApiEndpoints(flatApiEndpoints);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle creating a new API key
  const handleCreate = async (values: { name: string; api_endpoints_selection: string[]; rate_limit?: number }) => {
    try {
      // Process the api_endpoints_selection field to get endpoint IDs
      const selections = values.api_endpoints_selection || [];
      
      // Get endpoint IDs (excluding custom paths since we're not using custom_api_paths anymore)
      const endpointIds = selections.filter((item: any) => 
        apiEndpoints.some(ep => ep.id === item)
      );
      
      // Prepare the payload
      const payload: any = {
        name: values.name,
      };
      
      // Set endpoint IDs to scopes field
      if (endpointIds.length > 0) {
        payload.scopes = endpointIds;
      } else {
        payload.scopes = undefined;
      }
      
      // Include rate limit if specified
      if (values.rate_limit !== undefined) {
        payload.rate_limit = values.rate_limit;
      }
      
      const response = await axiosInstance.post('/api_keys/', payload);
      if (response.data.code === 200) {
        message.success('API密钥创建成功');
        setNewApiKey(response.data.data);
        setIsModalVisible(false);
        setShowNewKey(true);
        fetchData(); // Refresh the data
      } else {
        message.error('创建失败');
      }
    } catch (error) {
      message.error('创建API密钥失败');
    }
  };

  // Handle updating an API key
  const handleUpdate = async (values: { 
    name?: string; 
    api_endpoints_selection?: string[]; 
    rate_limit?: number 
  }) => {
    if (!editingKey) return;
    
    try {
      // Process the api_endpoints_selection field to get endpoint IDs
      const selections = values.api_endpoints_selection || [];
      
      // Get endpoint IDs (excluding custom paths since we're not using custom_api_paths anymore)
      const endpointIds = selections.filter((item: any) => 
        apiEndpoints.some(ep => ep.id === item)
      );
      
      // Prepare the payload
      const payload: any = {};
      if (values.name) payload.name = values.name;
      if (endpointIds.length > 0) {
        payload.scopes = endpointIds;
      } else {
        payload.scopes = undefined;
      }
      if (values.rate_limit !== undefined) payload.rate_limit = values.rate_limit;
      
      const response = await axiosInstance.put(`/api_keys/${editingKey._id}/`, payload);
      if (response.data.code === 200) {
        message.success('更新成功');
        setIsUpdateModalVisible(false);
        updateForm.resetFields();
        fetchData(); // Refresh the data
      } else {
        message.error('更新失败');
      }
    } catch (error) {
      message.error('更新API密钥失败');
    }
  };

  // Handle deleting an API key
  const handleDelete = async (keyId: string) => {
    try {
      const response = await axiosInstance.delete(`/api_keys/${keyId}/`);
      if (response.data.code === 200) {
        message.success('删除成功');
        fetchData(); // Refresh the data
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除API密钥失败');
    }
  };

  // Handle enabling an API key
  const handleEnable = async (keyId: string) => {
    try {
      const response = await axiosInstance.patch(`/api_keys/${keyId}/enable/`);
      if (response.data.code === 200) {
        message.success('启用成功');
        fetchData(); // Refresh the data
      } else {
        message.error('启用失败');
      }
    } catch (error) {
      message.error('启用API密钥失败');
    }
  };

  // Handle disabling an API key
  const handleDisable = async (keyId: string) => {
    try {
      const response = await axiosInstance.patch(`/api_keys/${keyId}/disable/`);
      if (response.data.code === 200) {
        message.success('禁用成功');
        fetchData(); // Refresh the data
      } else {
        message.error('禁用失败');
      }
    } catch (error) {
      message.error('禁用API密钥失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: ApiKey) => {
    // Get endpoint IDs for the form field
    const selections = record.scopes || [];
    
    setEditingKey(record);
    updateForm.setFieldsValue({
      name: record.name,
      api_endpoints_selection: selections,
      rate_limit: record.rate_limit,
    });
    setIsUpdateModalVisible(true);
  };

  const columns: ColumnsType<ApiKey> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'active' | 'inactive') => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
      filters: [
        { text: '启用', value: 'active' },
        { text: '禁用', value: 'inactive' },
      ],
      onFilter: (value: unknown, record) => record.status === value,
    },
    {
      title: '权限范围',
      key: 'permissions',
      render: (_, record: ApiKey) => (
        <Space size={[0, 8]} wrap>
          {record.scopes && record.scopes.length > 0 ? (
            record.scopes.map((endpointId, index) => {
              const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
              return endpoint ? (
                <Tag key={index} color={
                  endpoint.Method === 'GET' ? 'green' :
                  endpoint.Method === 'POST' ? 'blue' :
                  endpoint.Method === 'PUT' ? 'orange' :
                  'red'
                }>
                  {endpoint.Method} {endpoint.Path}
                </Tag>
              ) : null;
            }).filter(Boolean) // Remove null values
          ) : record.scopes && record.scopes.length > 0 ? (
            record.scopes.map((scope, index) => (
              <Tag key={index} color="blue">
                {scope}
              </Tag>
            ))
          ) : (
            <Tag>无限制</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '调用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      sorter: (a, b) => a.usage_count - b.usage_count,
    },
    {
      title: '限流设置',
      key: 'rate_limit',
      render: (record: ApiKey) => (
        `${record.rate_limit}次/${record.rate_limit_window}秒`
      ),
      sorter: (a, b) => a.rate_limit - b.rate_limit,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '最后使用时间',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (date: string | null) => 
        date ? new Date(date).toLocaleString('zh-CN') : '从未使用',
      sorter: (a, b) => {
        if (a.last_used === null && b.last_used === null) return 0;
        if (a.last_used === null) return 1;
        if (b.last_used === null) return -1;
        return new Date(a.last_used).getTime() - new Date(b.last_used).getTime();
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Switch
            checked={record.status === 'active'}
            onChange={(checked) => 
              checked ? handleEnable(record._id) : handleDisable(record._id)
            }
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
          <Popconfirm
            title="确认删除API密钥"
            description="删除后将无法恢复，是否继续？"
            onConfirm={() => handleDelete(record._id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCopyApiKey = () => {
    if (newApiKey?.key_value) {
      const keyToCopy = newApiKey.key_value; // Capture the value in a local variable
      
      // Check if the Clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        // Use Clipboard API if available
        navigator.clipboard.writeText(keyToCopy)
          .then(() => {
            message.success('API密钥已复制到剪贴板');
          })
          .catch((err) => {
            // Fallback to execCommand if Clipboard API fails
            copyTextToClipboardFallback(keyToCopy);
            console.error('Failed to copy using Clipboard API: ', err);
          });
      } else {
        // Use fallback method if Clipboard API is not available (e.g., in insecure contexts)
        copyTextToClipboardFallback(keyToCopy);
      }
    }
  };

  const copyTextToClipboardFallback = (text: string) => {
    // Create a temporary textarea to copy text
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('API密钥已复制到剪贴板');
      } else {
        message.error('复制失败，请手动复制');
      }
    } catch (err) {
      message.error('复制失败，请手动复制');
      console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">API密钥管理</h1>
        <Button 
          type="primary" 
          onClick={handleAdd}
        >
          创建API密钥
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Table 
          columns={columns}
          dataSource={apiKeys}
          rowKey="_id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </div>

      {/* Create API Key Modal */}
      <Modal
        title="创建API密钥"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="API密钥名称"
            rules={[{ required: true, message: '请输入API密钥名称' }]}
          >
            <Input placeholder="输入API密钥名称" />
          </Form.Item>

          <Form.Item
            name="api_endpoints_selection"
            label="关联API端点"
          >
            <Select
              mode="tags"
              placeholder="选择API端点"
              showSearch
              tokenSeparators={[',']}
              filterOption={(input, option) => {
                const ep = apiEndpoints.find(api => api.id === option?.value);
                if (ep) {
                  return (
                    (ep?.Path?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Description?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Method?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.ApiGroup?.toLowerCase().includes(input.toLowerCase()))
                  );
                }
                // Only show options from the API endpoints list
                return false;
              }}
              options={apiEndpoints.map(ep => ({
                label: (
                  <div className="flex items-center">
                    <Tag 
                      color={
                        ep.Method === 'GET' ? 'green' :
                        ep.Method === 'POST' ? 'blue' :
                        ep.Method === 'PUT' ? 'orange' :
                        'red'
                      }
                    >
                      {ep.Method}
                    </Tag>
                    {ep.Path} - {ep.Description}
                  </div>
                ),
                value: ep.id, // Use ID for existing endpoints
              }))}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="限流设置 (次/分钟)"
            initialValue={1000}
          >
            <Input type="number" min={1} placeholder="输入每分钟允许的调用次数" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update API Key Modal */}
      <Modal
        title="编辑API密钥"
        open={isUpdateModalVisible}
        onCancel={() => setIsUpdateModalVisible(false)}
        footer={null}
      >
        <Form
          form={updateForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="API密钥名称"
            rules={[{ required: true, message: '请输入API密钥名称' }]}
          >
            <Input placeholder="输入API密钥名称" />
          </Form.Item>

          <Form.Item
            name="api_endpoints_selection"
            label="关联API端点"
          >
            <Select
              mode="tags"
              placeholder="选择API端点"
              showSearch
              tokenSeparators={[',']}
              filterOption={(input, option) => {
                const ep = apiEndpoints.find(api => api.id === option?.value);
                if (ep) {
                  return (
                    (ep?.Path?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Description?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Method?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.ApiGroup?.toLowerCase().includes(input.toLowerCase()))
                  );
                }
                // Only show options from the API endpoints list
                return false;
              }}
              options={apiEndpoints.map(ep => ({
                label: (
                  <div className="flex items-center">
                    <Tag 
                      color={
                        ep.Method === 'GET' ? 'green' :
                        ep.Method === 'POST' ? 'blue' :
                        ep.Method === 'PUT' ? 'orange' :
                        'red'
                      }
                    >
                      {ep.Method}
                    </Tag>
                    {ep.Path} - {ep.Description}
                  </div>
                ),
                value: ep.id, // Use ID for existing endpoints
              }))}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="限流设置 (次/分钟)"
            rules={[{ required: true, message: '请输入限流次数' }]}
          >
            <Input type="number" min={1} placeholder="输入每分钟允许的调用次数" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
              <Button onClick={() => setIsUpdateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Show New API Key Modal */}
      <Modal
        title="API密钥创建成功"
        open={showNewKey}
        onCancel={() => setShowNewKey(false)}
        footer={[
          <Space key="buttons">
            <Button onClick={handleCopyApiKey}>
              复制密钥
            </Button>
            <Button key="ok" type="primary" onClick={() => setShowNewKey(false)}>
              确定
            </Button>
          </Space>
        ]}
      >
        <p>API密钥创建成功！请妥善保存以下密钥信息：</p>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="font-medium">密钥名称: {newApiKey?.name}</p>
          <p className="font-medium mt-2">API密钥值:</p>
          <div className="mt-1 p-2 bg-white border rounded break-all font-mono text-sm flex items-center">
            <span className="flex-1 overflow-hidden text-ellipsis break-all">{newApiKey?.key_value}</span>
            <Button 
              type="text" 
              size="small" 
              onClick={handleCopyApiKey}
              style={{ marginLeft: '8px' }}
            >
              复制
            </Button>
          </div>
          <p className="text-red-500 text-sm mt-2">
            <strong>重要：</strong>此密钥值仅在此时显示一次，请立即保存，之后将无法查看。
          </p>
        </div>
        <p className="mt-2">此密钥已处于启用状态，可以立即使用。</p>
      </Modal>
    </div>
  );
};

export default ApiKeysPage;