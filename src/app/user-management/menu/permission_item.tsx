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
  Dropdown,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
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
  CopyOutlined,
  MoreOutlined,
  EllipsisOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { MenuItem } from './menu';
import { BulkAddPermissionsModal } from './BulkAddPermissionsModal';
export interface PermissionItem {
  id?: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  menu_id?: string;  // 保留用于向后兼容
  menu_ids?: string[];  // 新增：支持多个菜单
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
  const [permissionCodeOptions, setPermissionCodeOptions] = useState<{ label: string; options: { value: string; label: string; }[] }[]>([]);
  const [resourceOptions, setResourceOptions] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchForm] = Form.useForm();
  const [enableDynamicParams, setEnableDynamicParams] = useState(false);
  const [jsonEditorVisible, setJsonEditorVisible] = useState(false);
  const [currentJsonField, setCurrentJsonField] = useState<{ fieldName: number; currentValue: string }>({ fieldName: 0, currentValue: '' });
  const [jsonEditorContent, setJsonEditorContent] = useState('');

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
      
      // 按 ApiGroup 分组组织 API 端点选项
      const groupedOptions: { label: string; options: { value: string; label: string; }[] }[] = [];
      
      Object.entries(result).forEach(([group, endpoints]) => {
        const groupEndpoints = (endpoints as ApiEndpoint[]).map(api => ({
          value: api.id,
          label: `${api.Method} ${api.Path} - ${api.Description || api.id}`,
        }));
        
        if (groupEndpoints.length > 0) {
          groupedOptions.push({
            label: group,
            options: groupEndpoints
          });
        }
      });
      
      setPermissionCodeOptions(groupedOptions);
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

    // 菜单过滤 - 支持 menu_ids 数组
    if (selectedMenuId !== null) {
      filtered = filtered.filter(p => {
        // 兼容新旧格式
        if (p.menu_ids && Array.isArray(p.menu_ids)) {
          return p.menu_ids.includes(selectedMenuId);
        }
        return p.menu_id === selectedMenuId;
      });
    }

    setFilteredPermissions(filtered);
  };

  const handleMenuSelect = (menuId: string | null, menuName: string) => {
    setSelectedMenuId(menuId);
    setSelectedMenuName(menuName);
  };

  const handleAdd = () => {
    form.resetFields();
    // 如果当前选择了某个菜单，默认关联到该菜单
    if (selectedMenuId) {
      form.setFieldsValue({ menu_ids: [selectedMenuId] });
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
    
    // 兼容新旧格式：优先使用 menu_ids，如果没有则使用 menu_id
    const menuIds = record.menu_ids || (record.menu_id ? [record.menu_id] : []);
    
    // 转换 dynamic_params 对象为数组格式
    const formValues = {
      ...record,
      menu_ids: menuIds,
      dynamic_params: hasDynamicParams
        ? Object.entries(record.dynamic_params!).map(([key, value]) => ({ key, value }))
        : undefined,
    };
    
    form.setFieldsValue(formValues);
    setEditingId(record.id || null);
    setEnableDynamicParams(hasDynamicParams);
    setIsModalVisible(true);
  };

  const handleCopy = (record: PermissionItem) => {
    const hasDynamicParams = !!record.dynamic_params && Object.keys(record.dynamic_params).length > 0;
    
    // 兼容新旧格式：优先使用 menu_ids，如果没有则使用 menu_id
    const menuIds = record.menu_ids || (record.menu_id ? [record.menu_id] : []);
    
    // 转换 dynamic_params 对象为数组格式，复制时不包含 id
    const formValues = {
      code: record.code,
      name: `${record.name} - 副本`,  // 添加"副本"后缀以区分
      action: record.action,
      menu_ids: menuIds,
      description: record.description,
      dynamic_params: hasDynamicParams
        ? Object.entries(record.dynamic_params!).map(([key, value]) => ({ key, value }))
        : undefined,
    };
    
    form.setFieldsValue(formValues);
    setEditingId(null);  // 设置为null表示这是新增操作
    setEnableDynamicParams(hasDynamicParams);
    setIsModalVisible(true);
    message.info('已复制权限项数据，请修改后保存');
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
      
      // code 字段现在是API端点的ID，不需要拆分
      // resource 和 action 由用户手动填写

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
      // 兼容新旧格式统计权限数量
      const permissionCount = permissions.filter(p => {
        if (p.menu_ids && Array.isArray(p.menu_ids)) {
          return p.menu_ids.includes(item.id);
        }
        return p.menu_id === item.id;
      }).length;
      
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
      title: 'API端点ID',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => (
        <code className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-mono text-xs">
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
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const colorMap: Record<string, string> = {
          read: 'green',
          create: 'blue',
          update: 'orange',
          delete: 'red'
        };
        return <Tag color={colorMap[action] || 'cyan'}>{action}</Tag>;
      },
    },
    {
      title: '关联菜单',
      dataIndex: 'menu_ids',
      key: 'menu_ids',
      width: 200,
      render: (menu_ids: string[] | undefined, record: PermissionItem) => {
        // 兼容新旧格式
        const menuIdList = menu_ids || (record.menu_id ? [record.menu_id] : []);
        
        if (!menuIdList || menuIdList.length === 0) {
          return <span className="text-gray-400">未关联</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {menuIdList.map(menuId => {
              const menuItem = findMenuItem(menuData, menuId);
              return menuItem ? (
                <Tag key={menuId} color="blue">{menuItem.name}</Tag>
              ) : (
                <Tag key={menuId} color="default">未知菜单</Tag>
              );
            })}
          </div>
        );
      },
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
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          },
          {
            key: 'copy',
            label: '复制',
            icon: <CopyOutlined />,
            onClick: () => handleCopy(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定删除该权限项吗？',
                content: '此操作无法撤销',
                okText: '确定',
                cancelText: '取消',
                okType: 'danger',
                onOk: () => handleDelete(record.id!),
              });
            },
          },
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click','hover']}>
            <Button type="link" size="small" icon={<EllipsisOutlined />}>
              
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    let filtered = permissions;

    // 菜单过滤 - 支持 menu_ids 数组
    if (selectedMenuId !== null) {
      filtered = filtered.filter(p => {
        // 兼容新旧格式
        if (p.menu_ids && Array.isArray(p.menu_ids)) {
          return p.menu_ids.includes(selectedMenuId);
        }
        return p.menu_id === selectedMenuId;
      });
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
                    <Form.Item name="action" label="操作">
                      <Select
                        allowClear
                        placeholder="请选择操作"
                      >
                        <Select.Option value="read">读取</Select.Option>
                        <Select.Option value="create">创建</Select.Option>
                        <Select.Option value="update">更新</Select.Option>
                        <Select.Option value="delete">删除</Select.Option>
                      </Select>
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
            label="API端点ID"
            rules={[
              { required: true, message: '请选择或输入API端点ID' }
            ]}
            extra="选择一个API端点，此权限项将关联到该端点"
          >
            <Select
              showSearch
              placeholder="选择API端点"
              filterOption={(input, option) => {
                // 支持在分组中搜索
                const label = option?.label?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
              options={permissionCodeOptions}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="权限名称"
            rules={[{ required: true, message: '请输入权限名称' }]}
          >
            <Input placeholder="删除用户" />
          </Form.Item>

          <Form.Item
            name="action"
            label="操作"
            rules={[{ required: true, message: '请选择操作' }]}
          >
            <Select placeholder="选择操作类型">
              <Select.Option value="read">读取 (read)</Select.Option>
              <Select.Option value="create">创建 (create)</Select.Option>
              <Select.Option value="update">更新 (update)</Select.Option>
              <Select.Option value="delete">删除 (delete)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="menu_ids" 
            label="关联菜单（可选）"
            extra="可以选择多个菜单进行分组展示"
          >
            <Select
              mode="multiple"
              placeholder="选择菜单用于分组展示"
              allowClear
              options={flattenMenus(menuData)}
              maxTagCount="responsive"
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
                      <Tooltip title="使用JSON编辑器">
                        <Button
                          type="text"
                          icon={<CodeOutlined />}
                          onClick={() => {
                            const currentValue = form.getFieldValue(['dynamic_params', name, 'value']) || '';
                            setCurrentJsonField({ fieldName: name, currentValue });
                            setJsonEditorContent(currentValue);
                            setJsonEditorVisible(true);
                          }}
                        />
                      </Tooltip>
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

      {/* JSON Editor Modal */}
      <Modal
        title="JSON 编辑器"
        open={jsonEditorVisible}
        onOk={() => {
          try {
            // 验证JSON格式
            if (jsonEditorContent.trim()) {
              JSON.parse(jsonEditorContent);
            }
            // 更新表单字段值
            form.setFieldValue(['dynamic_params', currentJsonField.fieldName, 'value'], jsonEditorContent);
            setJsonEditorVisible(false);
            message.success('JSON内容已更新');
          } catch (error) {
            message.error('无效的JSON格式，请检查语法');
          }
        }}
        onCancel={() => {
          setJsonEditorVisible(false);
          setJsonEditorContent('');
        }}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <div className="mb-4">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CodeOutlined />
              <span>在下方输入JSON格式的数据，支持对象和数组</span>
            </div>
            <div className="text-xs text-gray-500">
              示例: {'{}'} 或 {'"value"'} 或 {'["item1", "item2"]'} 或 {'{\"key\": \"value\"}'}
            </div>
          </Space>
        </div>
        <Input.TextArea
          value={jsonEditorContent}
          onChange={(e) => setJsonEditorContent(e.target.value)}
          placeholder="输入JSON内容..."
          rows={12}
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
            fontSize: '13px',
          }}
        />
        <div className="mt-2 text-xs text-gray-500">
          提示：确保JSON格式正确，否则保存时会提示错误
        </div>
      </Modal>
    </div>
  );
};

export default PermissionItemManagement;
