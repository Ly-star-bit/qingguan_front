'use client';
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Typography, Tag, Row, Col, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axiosInstance from '@/utils/axiosInstance';

const { Title } = Typography;

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
  Type?: 'ACL' | 'RBAC';
  PermissionCode?: string; // 🔑 关联 PermissionItem.code，如 "product:read"
}

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface SearchParams {
  apiGroup: string;
  method: string;
  path: string;
  description: string;
}

const methodColors = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
  '*': 'magenta',
};

const ApiEndpointPage = () => {
  const [data, setData] = useState<Record<string, ApiEndpoint[]>>({});
  const [flatData, setFlatData] = useState<ApiEndpoint[]>([]);
  const [filteredData, setFilteredData] = useState<ApiEndpoint[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [apiGroups, setApiGroups] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [permissionItems, setPermissionItems] = useState<PermissionItem[]>([]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get('/api_endpoints');
      const result = response.data;
      setData(result);
      const flat = Object.entries(result).reduce((acc: ApiEndpoint[], [group, endpoints]) => {
        return acc.concat((endpoints as ApiEndpoint[]).map(e => ({...e, Type: e.Type || 'ACL'})));
      }, []);
      setFlatData(flat);
      setFilteredData(flat);
      
      // 提取所有唯一的API分组
      const groups = Array.from(new Set(flat.map(item => item.ApiGroup))).sort();
      setApiGroups(groups);
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  const fetchPermissionItems = async () => {
    try {
      const response = await axiosInstance.get('/permission_item');
      setPermissionItems(response.data);
    } catch (error) {
      message.error('获取权限项失败');
    }
  };

  useEffect(() => {
    fetchData();
    fetchPermissionItems();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: ApiEndpoint) => {
    form.setFieldsValue({...record});
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/api_endpoints/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSyncFromOpenAPI = async () => {
    try {
      const response = await axiosInstance.post('/api_endpoints/sync_from_openapi');
      message.success(response.data.message);
      fetchData();
    } catch (error) {
      message.error('从OpenAPI同步失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // 移除Type字段，因为它已被移除
      const { Type, ...apiValues } = values;
      if (editingId) {
        // 更新
        await axiosInstance.put(`/api_endpoints/${editingId}`, apiValues);
        message.success('更新成功');
      } else {
        // 创建
        await axiosInstance.post('/api_endpoints', apiValues);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue() as SearchParams;
    const filtered = flatData.filter(item => {
      const matchApiGroup = !values.apiGroup || item.ApiGroup === values.apiGroup;
      const matchMethod = !values.method || item.Method === values.method;
      const matchPath = !values.path || item.Path.toLowerCase().includes(values.path.toLowerCase());
      const matchDescription = !values.description || item.Description.toLowerCase().includes(values.description.toLowerCase());
      return matchApiGroup && matchMethod && matchPath && matchDescription;
    });
    setFilteredData(filtered);
  };

  const resetSearch = () => {
    searchForm.resetFields();
    setFilteredData(flatData);
  };

  const columns: ColumnsType<ApiEndpoint> = [
    {
      title: 'API组',
      dataIndex: 'ApiGroup',
      key: 'ApiGroup',
      render: (text) => (
        <Tag 
          color="processing" 
          style={{ 
            fontSize: '14px',
            whiteSpace: 'normal',
            wordBreak: 'break-all'
          }}
        >
          {text}
        </Tag>
      ),
      width: 200,
      ellipsis: false,
    },



    {
      title: '请求方法',
      dataIndex: 'Method',
      key: 'Method',
      render: (text) => (
        <Tag color={methodColors[text as keyof typeof methodColors]} style={{ minWidth: '60px', textAlign: 'center' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: '路径',
      dataIndex: 'Path',
      key: 'Path',
      render: (text) => <code className="bg-gray-100 px-2 py-1 rounded">{text}</code>,
    },
    {
      title: '描述',
      dataIndex: 'Description',
      key: 'Description',
      width: 200,
      ellipsis: false,
    },
    {
      title: '权限代码',
      dataIndex: 'PermissionCode',
      key: 'PermissionCode',
      width: 180,
      render: (code) => code ? (
        <code className="bg-green-50 px-2 py-1 rounded text-green-700 font-mono text-xs">
          {code}
        </code>
      ) : (
        <Tag color="default">未关联</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <div className="mb-6">
          <Row justify="space-between" align="middle" className="mb-4">
            <Col>
              <Title level={3} style={{ margin: 0 }}>API端点管理</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  高级搜索
                </Button>
                <Popconfirm
                  title="确认同步API"
                  description="您确定要从OpenAPI同步最新的API端点吗？"
                  onConfirm={handleSyncFromOpenAPI}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button icon={<SyncOutlined />}>
                    更新最新API
                  </Button>
                </Popconfirm>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  添加API端点
                </Button>
              </Space>
            </Col>
          </Row>

          {showAdvancedSearch && (
            <Card className="mb-4" bodyStyle={{ padding: '16px' }}>
              <Form
                form={searchForm}
                layout="horizontal"
                onFinish={handleSearch}
              >
                <Row gutter={16}>
                  <Col span={5}>
                    <Form.Item name="apiGroup" label="API组">
                      <Select
                        allowClear
                        placeholder="请选择API组"
                        options={apiGroups.map(group => ({
                          label: group,
                          value: group
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name="method" label="请求方法">
                      <Select allowClear placeholder="请选择请求方法">
                        <Select.Option value="*">*</Select.Option>
                        <Select.Option value="GET">GET</Select.Option>
                        <Select.Option value="POST">POST</Select.Option>
                        <Select.Option value="PUT">PUT</Select.Option>
                        <Select.Option value="DELETE">DELETE</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name="path" label="路径">
                      <Input placeholder="请输入路径" allowClear />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name="description" label="描述">
                      <Input placeholder="请输入描述" allowClear />
                    </Form.Item>
                  </Col>
                  
                </Row>
                <Row justify="end">
                  <Space>
                    <Button onClick={resetSearch}>
                      重置
                    </Button>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      搜索
                    </Button>
                  </Space>
                </Row>
              </Form>
            </Card>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          className="shadow-sm"
        />

        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              {editingId ? "编辑API端点" : "添加API端点"}
            </Title>
          }
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="ApiGroup"
              label="API组"
              rules={[{ required: true, message: '请选择API组' }]}
            >
              <Select
                showSearch
                placeholder="请选择或搜索API组"
                optionFilterProp="label"
                options={apiGroups.map(group => ({
                  label: group,
                  value: group
                }))}
              >
              </Select>
            </Form.Item>
            <Form.Item
              name="Method"
              label="请求方法"
              rules={[{ required: true, message: '请选择请求方法' }]}
            >
              <Select placeholder="请选择请求方法">
                <Select.Option value="*">*</Select.Option>
                <Select.Option value="GET">GET</Select.Option>
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="PUT">PUT</Select.Option>
                <Select.Option value="DELETE">DELETE</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="Path"
              label="路径"
              rules={[
                { 
                  required: true, 
                  message: '请输入路径' 
                },
                { 
                  pattern: /^\/[a-zA-Z0-9\-_.~()*!@:+,;=%?#&$\[\]\/\*]*$/, 
                  message: '请输入有效的路径格式，例如: /users 或 /users/*' 
                }
              ]}
              help="支持通配符路径，如: /qingguan/products/* 用于匹配所有产品相关接口"
            >
              <Input placeholder="请输入API路径，例如: /users 或 /users/*" />
            </Form.Item>
            <Form.Item
              name="Description"
              label="描述"
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <Input.TextArea 
                placeholder="请输入API端点的详细描述"
                rows={4}
              />
            </Form.Item>
            <Form.Item
              name="PermissionCode"
              label="关联权限代码（可选）"
              rules={[
                { 
                  pattern: /^[a-z_]+:[a-z_]+$/, 
                  message: '格式应为: resource:action (如 product:read)' 
                }
              ]}
              extra="格式：resource:action，例如 product:read, user:delete"
            >
              <Input 
                placeholder="product:read" 
                allowClear
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default ApiEndpointPage;