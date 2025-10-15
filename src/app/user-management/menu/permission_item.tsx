'use client';
import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tree,
  Empty,
  Tag,
  Table,
  Popconfirm,
  Space,
  AutoComplete,
  Card,
  Row,
  Col,
  Switch,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { ColumnsType } from 'antd/es/table';
import axiosInstance from '@/utils/axiosInstance';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  AppstoreAddOutlined,
  FilterOutlined,
  SearchOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { MenuItem } from './menu';
import { BulkAddPermissionsModal } from './BulkAddPermissionsModal';
export interface PermissionItem {
  id?: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  menu_id?: string;
  description?: string;
  dynamic_params?: Record<string, string>;
}

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
  PermissionCode?: string;
}

const PermissionItemManagement = () => {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<PermissionItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedMenuName, setSelectedMenuName] = useState<string>('全部');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [permissionCodeOptions, setPermissionCodeOptions] = useState<{ value: string; label: string }[]>([]);
  const [resourceOptions, setResourceOptions] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchForm] = Form.useForm();
  const [enableDynamicParams, setEnableDynamicParams] = useState(false);

  const fetchMenuData = async () => {
    try {
      const menuResponse = await axiosInstance.get('/menu');
      const menuResult = menuResponse.data;
      setMenuData(menuResult);
    } catch (error) {
      message.error('获取菜单数据失败');
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/permission_item');
      const result = response.data;
      setPermissions(result);
      setFilteredPermissions(result);
    } catch (error) {
      message.error('获取权限项失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiEndpoints = async () => {
    try {
      const response = await axiosInstance.get('/api_endpoints');
      const result = response.data;
      // 将嵌套的API端点数据展开
      const flat = Object.entries(result).reduce((acc: ApiEndpoint[], [group, endpoints]) => {
        return acc.concat(endpoints as ApiEndpoint[]);
      }, []);
      
      // 提取所有唯一的PermissionCode
      const codes = Array.from(
        new Set(
          flat
            .filter(api => api.PermissionCode)
            .map(api => api.PermissionCode!)
        )
      );
      
      setPermissionCodeOptions(
        codes.map(code => ({
          value: code,
          label: code,
        }))
      );
    } catch (error) {
      message.error('获取API端点失败');
    }
  };

  useEffect(() => {
    fetchMenuData();
    fetchPermissions();
    fetchApiEndpoints();
  }, []);

  useEffect(() => {
    // 从权限数据中提取独特的资源和操作
    const resources = Array.from(new Set(permissions.map(p => p.resource).filter(Boolean)));
    const actions = Array.from(new Set(permissions.map(p => p.action).filter(Boolean)));
    setResourceOptions(resources);
    setActionOptions(actions);
  }, [permissions]);

  useEffect(() => {
    applyFilters();
  }, [permissions, selectedMenuId]);

  const applyFilters = () => {
    let filtered = permissions;

    // 菜单过滤
    if (selectedMenuId !== null) {
      filtered = filtered.filter(p => p.menu_id === selectedMenuId);
    }

    setFilteredPermissions(filtered);
  };

  const handleMenuSelect = (menuId: string | null, menuName: string) => {
    setSelectedMenuId(menuId);
    setSelectedMenuName(menuName);
  };

  const handleAdd = () => {
    form.resetFields();
    if (selectedMenuId) {
      form.setFieldsValue({ menu_id: selectedMenuId });
    }
    setEditingId(null);
    setEnableDynamicParams(false);
    setIsModalVisible(true);
  };

  const handleBulkAdd = () => {
    setIsBulkModalVisible(true);
  };



  const handleEdit = (record: PermissionItem) => {
    const hasDynamicParams = !!record.dynamic_params && Object.keys(record.dynamic_params).length > 0;
    
    // 转换 dynamic_params 对象为数组格式
    const formValues = {
      ...record,
      dynamic_params: hasDynamicParams
        ? Object.entries(record.dynamic_params!).map(([key, value]) => ({ key, value }))
        : undefined,
    };
    
    form.setFieldsValue(formValues);
    setEditingId(record.id || null);
    setEnableDynamicParams(hasDynamicParams);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/permission_item/${id}`);
      message.success('删除成功');
      fetchPermissions();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 根据 code 自动拆分 resource 和 action
      if (values.code) {
        const parts = values.code.split(':');
        if (parts.length === 2) {
          values.resource = parts[0];
          values.action = parts[1];
        }
      }

      // 处理动态参数
      if (enableDynamicParams && values.dynamic_params) {
        const paramsObj: Record<string, string> = {};
        values.dynamic_params.forEach((param: { key: string; value: string }) => {
          if (param.key && param.key.trim()) {
            paramsObj[param.key.trim()] = param.value || '';
          }
        });
        values.dynamic_params = paramsObj;
      } else {
        delete values.dynamic_params;
      }

      if (editingId) {
        await axiosInstance.put(`/permission_item/${editingId}`, values);
      } else {
        await axiosInstance.post('/permission_item', values);
      }
      setIsModalVisible(false);
      message.success(`${editingId ? '更新' : '添加'}成功`);
      fetchPermissions();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || `${editingId ? '更新' : '添加'}失败`;
      message.error(errorMsg);
    }
  };

  const handleBulkSubmit = async (payload: Array<{
    code: string;
    name: string;
    resource: string;
    action: string;
    menu_id: string | number | null;
    description: string;
  }>) => {
    const hideLoading = message.loading(`正在创建 ${payload.length} 个权限项...`, 0);
    
    try {
      const results = await Promise.allSettled(
        payload.map(item => axiosInstance.post('/permission_item', {
          ...item,
          menu_id: item.menu_id || undefined,
        }))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      hideLoading();

      if (failCount === 0) {
        message.success(`成功创建 ${successCount} 个权限项`);
        await fetchPermissions();
      } else {
        message.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
        await fetchPermissions();
      }
    } catch (error) {
      hideLoading();
      message.error('批量创建失败');
      throw error;
    }
  };

  const flattenMenus = (items: MenuItem[]): { label: string; value: string }[] => {
    let result: { label: string; value: string }[] = [];
    
    const traverse = (menuItems: MenuItem[], depth = 0) => {
      menuItems.forEach(item => {
        result.push({
          label: `${'　'.repeat(depth)}${item.name}`,
          value: item.id,
        });
        
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      });
    };
    
    traverse(items);
    return result;
  };

  const convertMenuToTreeData = (items: MenuItem[]): DataNode[] => {
    return items.map(item => {
      const permissionCount = permissions.filter(p => p.menu_id === item.id).length;
      
      return {
        title: (
          <div className="flex items-center gap-2">
            <span>
              {item.children && item.children.length > 0 ? 
                <FolderOutlined style={{ color: '#faad14' }} /> : 
                <FileOutlined style={{ color: '#1890ff' }} />
              }
            </span>
            <span className="font-medium">{item.name}</span>
            {permissionCount > 0 && (
              <Tag color="green" className="ml-1">{permissionCount} 权限</Tag>
            )}
          </div>
        ),
        key: item.id,
        children: item.children ? convertMenuToTreeData(item.children) : [],
      };
    });
  };

  const findMenuItem = (items: MenuItem[], id: string): MenuItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findMenuItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const columns: ColumnsType<PermissionItem> = [
    {
      title: '权限代码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => (
        <code className="bg-green-50 px-2 py-1 rounded text-green-700 font-mono text-xs">
          {code}
        </code>
      ),
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (resource: string) => <Tag color="blue">{resource}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => <Tag color="cyan">{action}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该权限项吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
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

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    let filtered = permissions;

    // 菜单过滤
    if (selectedMenuId !== null) {
      filtered = filtered.filter(p => p.menu_id === selectedMenuId);
    }

    // 高级搜索过滤
    if (values.code) {
      filtered = filtered.filter(p => 
        p.code?.toLowerCase().includes(values.code.toLowerCase())
      );
    }
    if (values.name) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(values.name.toLowerCase())
      );
    }
    if (values.resource) {
      filtered = filtered.filter(p => p.resource === values.resource);
    }
    if (values.action) {
      filtered = filtered.filter(p => p.action === values.action);
    }

    setFilteredPermissions(filtered);
  };

  const resetSearch = () => {
    searchForm.resetFields();
    applyFilters();
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-4 gap-2">
        <Button 
          icon={<AppstoreAddOutlined />} 
          onClick={handleBulkAdd}
        >
          批量添加
        </Button>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          添加权限项
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧菜单树 */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">菜单分组</h2>
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                if (expandedKeys.length > 0) {
                  setExpandedKeys([]);
                } else {
                  const allKeys: string[] = [];
                  const collectKeys = (items: MenuItem[]) => {
                    items.forEach(item => {
                      allKeys.push(item.id);
                      if (item.children) collectKeys(item.children);
                    });
                  };
                  collectKeys(menuData);
                  setExpandedKeys(allKeys);
                }
              }}
            >
              {expandedKeys.length > 0 ? '收起' : '展开'}
            </Button>
          </div>

          {/* 全部权限选项 */}
          <div 
            className={`p-3 mb-2 rounded cursor-pointer hover:bg-gray-50 ${
              selectedMenuId === null ? 'bg-blue-50 border border-blue-200' : ''
            }`}
            onClick={() => handleMenuSelect(null, '全部')}
          >
            <div className="flex items-center gap-2">
              <FolderOutlined style={{ color: '#1890ff' }} />
              <span className="font-medium">全部权限</span>
              <Tag color="blue">{permissions.length}</Tag>
            </div>
          </div>

          {menuData.length > 0 ? (
            <Tree
              treeData={convertMenuToTreeData(menuData)}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  const menuItem = findMenuItem(menuData, selectedKeys[0] as string);
                  if (menuItem) {
                    handleMenuSelect(menuItem.id, menuItem.name);
                  }
                }
              }}
              showLine={{ showLeafIcon: false }}
              defaultExpandAll={false}
              style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}
            />
          ) : (
            <Empty 
              description="暂无菜单数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>

        {/* 右侧权限项列表 */}
        <div className="col-span-9 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Row justify="space-between" align="middle" className="mb-4">
            <Col>
              <h2 className="text-lg font-semibold text-gray-700" style={{ margin: 0 }}>
                {selectedMenuName} - 权限项列表
              </h2>
              <p className="text-sm text-gray-500 mt-1" style={{ margin: 0 }}>
                共 {filteredPermissions.length} 个权限项
              </p>
            </Col>
            <Col>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                高级搜索
              </Button>
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
                  <Col span={6}>
                    <Form.Item name="code" label="权限代码">
                      <Input placeholder="请输入权限代码" allowClear />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="name" label="权限名称">
                      <Input placeholder="请输入权限名称" allowClear />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="resource" label="资源">
                      <Select
                        allowClear
                        showSearch
                        placeholder="请选择资源"
                        options={resourceOptions.map(r => ({
                          label: r,
                          value: r
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="action" label="操作">
                      <Select
                        allowClear
                        showSearch
                        placeholder="请选择操作"
                        options={actionOptions.map(a => ({
                          label: a,
                          value: a
                        }))}
                      />
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

          <Table
            columns={columns}
            dataSource={filteredPermissions}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        </div>
      </div>

      {/* Single Add Modal */}
      <Modal
        title={editingId ? '编辑权限项' : '添加权限项'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingId ? '更新' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="code"
            label="权限代码"
             rules={[
    { required: true, message: '请输入权限代码' },
    {
      pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+:[\u4e00-\u9fa5a-zA-Z0-9_]+$/,
      message: '格式应为: 资源:动作（如 用户:删除 或 user:delete）',
    },
  ]}
  extra="格式：resource:action，例如 用户:删除, user:delete, 产品:创建。可从 API端点中选择或手动输入"
          >
            <AutoComplete
              placeholder="user:delete"
              options={permissionCodeOptions}
              filterOption={(inputValue, option) =>
                option?.value.toLowerCase().includes(inputValue.toLowerCase()) || false
              }
              onSelect={(value) => {
                const parts = value.split(':');
                if (parts.length === 2) {
                  form.setFieldsValue({
                    resource: parts[0],
                    action: parts[1]
                  });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="权限名称"
            rules={[{ required: true, message: '请输入权限名称' }]}
          >
            <Input placeholder="删除用户" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="resource"
              label="资源"
              rules={[{ required: true, message: '请输入资源' }]}
              extra="会根据权限代码自动填充"
            >
              <Input placeholder="user" />
            </Form.Item>

            <Form.Item
              name="action"
              label="操作"
              rules={[{ required: true, message: '请输入操作' }]}
              extra="会根据权限代码自动填充"
            >
              <Input placeholder="delete" />
            </Form.Item>
          </div>

          <Form.Item name="menu_id" label="关联菜单（可选）">
            <Select
              placeholder="选择菜单用于分组展示"
              allowClear
              options={flattenMenus(menuData)}
            />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="权限描述" rows={3} />
          </Form.Item>

          {/* 动态参数开关 */}
          <Form.Item label="动态参数（可选）">
            <Space>
              <Switch
                checked={enableDynamicParams}
                onChange={(checked) => {
                  setEnableDynamicParams(checked);
                  if (!checked) {
                    form.setFieldsValue({ dynamic_params: undefined });
                  }
                }}
              />
              <span className="text-sm text-gray-500">
                为此权限添加动态参数（如API路径参数、查询参数等）
              </span>
            </Space>
          </Form.Item>

          {/* 动态参数列表 */}
          {enableDynamicParams && (
            <Form.List name="dynamic_params">
              {(fields, { add, remove }) => (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">参数配置</span>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      icon={<PlusOutlined />}
                      size="small"
                    >
                      添加参数
                    </Button>
                  </div>

                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: '请输入参数名' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="参数名（如：id, type）" style={{ width: 200 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="参数值（可选）" style={{ width: 200 }} />
                      </Form.Item>
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{ color: '#ff4d4f', cursor: 'pointer' }}
                      />
                    </Space>
                  ))}

                  {fields.length === 0 && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无参数，点击上方按钮添加"
                      style={{ margin: '16px 0' }}
                    />
                  )}
                </div>
              )}
            </Form.List>
          )}
        </Form>
      </Modal>

      {/* Bulk Add Modal */}
      <BulkAddPermissionsModal
        open={isBulkModalVisible}
        onClose={() => setIsBulkModalVisible(false)}
        permissionCodeOptions={permissionCodeOptions}
        menuData={menuData}
        onSubmit={handleBulkSubmit}
      />
    </div>
  );
};

export default PermissionItemManagement;
