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
  Space,
  InputNumber,
  Tabs,
  Table,
  Popconfirm,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  KeyOutlined,
  MenuOutlined,
} from '@ant-design/icons';

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  icon?: string;
  sort_order?: number;
  description?: string;
  children?: MenuItem[];
}

interface PermissionItem {
  id?: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  menu_id?: string;
  description?: string;
}

const MenuManagementPage = () => {
  // 菜单相关状态
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [flattenedMenuOptions, setFlattenedMenuOptions] = useState<{ label: string; value: string }[]>([]);
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [menuForm] = Form.useForm();
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 权限项相关状态
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<PermissionItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedMenuName, setSelectedMenuName] = useState<string>('全部');
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionForm] = Form.useForm();
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionExpandedKeys, setPermissionExpandedKeys] = useState<string[]>([]);

  // Tab状态
  const [activeTab, setActiveTab] = useState('menu');

  // ==================== 菜单管理相关函数 ====================
  const fetchMenuData = async () => {
    try {
      setMenuLoading(true);
      const menuResponse = await axiosInstance.get('/menu');
      const menuResult = menuResponse.data;
      setMenuData(menuResult);
    } catch (error) {
      message.error('获取菜单数据失败');
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    setFlattenedMenuOptions(flattenMenuItems(menuData));
  }, [menuData]);

  const handleMenuAdd = () => {
    menuForm.resetFields();
    setEditingMenuId(null);
    setIsMenuModalVisible(true);
  };

  const handleMenuEdit = (record: MenuItem) => {
    menuForm.setFieldsValue({
      ...record,
      parent_id: record.parent_id || undefined,
    });
    setEditingMenuId(record.id);
    setIsMenuModalVisible(true);
  };

  const handleMenuDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/menu/${id}`);
      message.success('删除成功');
      fetchMenuData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleMenuModalOk = async () => {
    try {
      const values = await menuForm.validateFields();
      
      if (editingMenuId) {
        await axiosInstance.put(`/menu/${editingMenuId}`, values);
      } else {
        await axiosInstance.post('/menu', values);
      }
      setIsMenuModalVisible(false);
      message.success(`${editingMenuId ? '更新' : '添加'}成功`);
      fetchMenuData();
    } catch (error) {
      message.error(`${editingMenuId ? '更新' : '添加'}失败`);
    }
  };

  const flattenMenuItems = (items: MenuItem[]): { label: string; value: string }[] => {
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

  const convertMenuToTreeData = (items: MenuItem[], showPermissionCount: boolean = false): DataNode[] => {
    return items.map(item => {
      const permissionCount = showPermissionCount ? permissions.filter(p => p.menu_id === item.id).length : 0;
      
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
            {item.path && (
              <span className="text-gray-400 text-xs">({item.path})</span>
            )}
            {showPermissionCount && permissionCount > 0 && (
              <Tag color="green" className="ml-1">{permissionCount} 权限</Tag>
            )}
          </div>
        ),
        key: item.id,
        children: item.children ? convertMenuToTreeData(item.children, showPermissionCount) : [],
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

  // ==================== 权限项管理相关函数 ====================
  const fetchPermissions = async () => {
    try {
      setPermissionLoading(true);
      const response = await axiosInstance.get('/permission_item');
      const result = response.data;
      setPermissions(result);
      setFilteredPermissions(result);
    } catch (error) {
      message.error('获取权限项失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'permission') {
      fetchPermissions();
    }
  }, [activeTab]);

  const handleMenuSelect = (menuId: string | null, menuName: string) => {
    setSelectedMenuId(menuId);
    setSelectedMenuName(menuName);
    
    if (menuId === null) {
      setFilteredPermissions(permissions);
    } else {
      const filtered = permissions.filter(p => p.menu_id === menuId);
      setFilteredPermissions(filtered);
    }
  };

  const handlePermissionAdd = () => {
    permissionForm.resetFields();
    if (selectedMenuId) {
      permissionForm.setFieldsValue({ menu_id: selectedMenuId });
    }
    setEditingPermissionId(null);
    setIsPermissionModalVisible(true);
  };

  const handlePermissionEdit = (record: PermissionItem) => {
    permissionForm.setFieldsValue(record);
    setEditingPermissionId(record.id || null);
    setIsPermissionModalVisible(true);
  };

  const handlePermissionDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/permission_item/${id}`);
      message.success('删除成功');
      fetchPermissions();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handlePermissionModalOk = async () => {
    try {
      const values = await permissionForm.validateFields();
      
      // 根据 code 自动拆分 resource 和 action
      if (values.code) {
        const parts = values.code.split(':');
        if (parts.length === 2) {
          values.resource = parts[0];
          values.action = parts[1];
        }
      }

      if (editingPermissionId) {
        await axiosInstance.put(`/permission_item/${editingPermissionId}`, values);
      } else {
        await axiosInstance.post('/permission_item', values);
      }
      setIsPermissionModalVisible(false);
      message.success(`${editingPermissionId ? '更新' : '添加'}成功`);
      fetchPermissions();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || `${editingPermissionId ? '更新' : '添加'}失败`;
      message.error(errorMsg);
    }
  };

  const permissionColumns: ColumnsType<PermissionItem> = [
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
            onClick={() => handlePermissionEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该权限项吗？"
            onConfirm={() => handlePermissionDelete(record.id!)}
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

  // ==================== Tab内容渲染 ====================
  const renderMenuManagement = () => (
    <div>
      <div className="flex justify-end items-center mb-4">
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleMenuAdd}
        >
          添加菜单
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧树形菜单 */}
        <div className="col-span-5 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">菜单结构</h2>
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
              {expandedKeys.length > 0 ? '全部收起' : '全部展开'}
            </Button>
          </div>
          {menuData.length > 0 ? (
            <Tree
              treeData={convertMenuToTreeData(menuData, false)}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  const menuItem = findMenuItem(menuData, selectedKeys[0] as string);
                  setSelectedNode(menuItem);
                } else {
                  setSelectedNode(null);
                }
              }}
              showLine={{ showLeafIcon: false }}
              defaultExpandAll={false}
              style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}
            />
          ) : (
            <Empty 
              description="暂无菜单数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>

        {/* 右侧详情面板 */}
        <div className="col-span-7 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {selectedNode ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {selectedNode.children && selectedNode.children.length > 0 ? 
                      <FolderOutlined style={{ color: '#faad14' }} /> : 
                      <FileOutlined style={{ color: '#1890ff' }} />
                    }
                    {selectedNode.name}
                    <Tag color="blue">菜单</Tag>
                  </h2>
                  {selectedNode.path && (
                    <p className="text-gray-500 mt-1">路径: {selectedNode.path}</p>
                  )}
                  {selectedNode.description && (
                    <p className="text-gray-500 mt-1">描述: {selectedNode.description}</p>
                  )}
                </div>
                <Space>
                  <Button 
                    type="primary"
                    icon={<EditOutlined />} 
                    onClick={() => handleMenuEdit(selectedNode)}
                  >
                    编辑
                  </Button>
                  <Button 
                    danger
                    icon={<DeleteOutlined />} 
                    onClick={() => handleMenuDelete(selectedNode.id)}
                  >
                    删除
                  </Button>
                </Space>
              </div>

              {/* 菜单信息 */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">基本信息</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-gray-500 w-24">菜单ID:</span>
                      <span className="text-gray-800">{selectedNode.id}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">菜单名称:</span>
                      <span className="text-gray-800">{selectedNode.name}</span>
                    </div>
                    {selectedNode.path && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">前端路径:</span>
                        <code className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{selectedNode.path}</code>
                      </div>
                    )}
                    {selectedNode.icon && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">图标:</span>
                        <span className="text-gray-800">{selectedNode.icon}</span>
                      </div>
                    )}
                    {selectedNode.sort_order !== undefined && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">排序:</span>
                        <span className="text-gray-800">{selectedNode.sort_order}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 子菜单信息 */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-base font-semibold text-blue-800 mb-2">
                      子菜单信息
                    </h3>
                    <p className="text-blue-700">
                      该菜单包含 {selectedNode.children.length} 个子菜单项
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Empty 
                description="请从左侧选择一个菜单项以查看详情"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPermissionManagement = () => (
    <div>
      <div className="flex justify-end items-center mb-4">
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handlePermissionAdd}
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
                if (permissionExpandedKeys.length > 0) {
                  setPermissionExpandedKeys([]);
                } else {
                  const allKeys: string[] = [];
                  const collectKeys = (items: MenuItem[]) => {
                    items.forEach(item => {
                      allKeys.push(item.id);
                      if (item.children) collectKeys(item.children);
                    });
                  };
                  collectKeys(menuData);
                  setPermissionExpandedKeys(allKeys);
                }
              }}
            >
              {permissionExpandedKeys.length > 0 ? '收起' : '展开'}
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
              treeData={convertMenuToTreeData(menuData, true)}
              expandedKeys={permissionExpandedKeys}
              onExpand={(keys) => setPermissionExpandedKeys(keys as string[])}
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
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              {selectedMenuName} - 权限项列表
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              共 {filteredPermissions.length} 个权限项
            </p>
          </div>

          <Table
            columns={permissionColumns}
            dataSource={filteredPermissions}
            rowKey="id"
            loading={permissionLoading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        </div>
      </div>
    </div>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'menu',
      label: (
        <span className="flex items-center gap-2">
          <MenuOutlined />
          菜单管理
        </span>
      ),
      children: renderMenuManagement(),
    },
    {
      key: 'permission',
      label: (
        <span className="flex items-center gap-2">
          <KeyOutlined />
          权限项管理
        </span>
      ),
      children: renderPermissionManagement(),
    },
  ];

  return (
    <div className="max-w-full mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">菜单与权限管理</h1>
        <p className="text-gray-500 mt-1">管理系统菜单结构和权限项</p>
      </div>

      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />

      {/* 菜单Modal */}
      <Modal
        title={editingMenuId ? '编辑菜单' : '添加菜单'}
        open={isMenuModalVisible}
        onOk={handleMenuModalOk}
        onCancel={() => setIsMenuModalVisible(false)}
        okText={editingMenuId ? '更新' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={menuForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="输入菜单名称" />
          </Form.Item>

          <Form.Item name="parent_id" label="父级菜单">
            <Select
              placeholder="选择父级菜单（可选）"
              allowClear
              options={flattenedMenuOptions
                .filter(option => editingMenuId ? option.value !== editingMenuId : true)
              }
            />
          </Form.Item>

          <Form.Item name="path" label="前端路径">
            <Input placeholder="/user/list" />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Input placeholder="UserOutlined" />
          </Form.Item>

          <Form.Item name="sort_order" label="排序">
            <InputNumber placeholder="0" min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="菜单描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限项Modal */}
      <Modal
        title={editingPermissionId ? '编辑权限项' : '添加权限项'}
        open={isPermissionModalVisible}
        onOk={handlePermissionModalOk}
        onCancel={() => setIsPermissionModalVisible(false)}
        okText={editingPermissionId ? '更新' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={permissionForm} layout="vertical" className="mt-4">
          <Form.Item
            name="code"
            label="权限代码"
            rules={[
              { required: true, message: '请输入权限代码' },
              { pattern: /^[a-z_]+:[a-z_]+$/, message: '格式应为: resource:action (如 user:delete)' }
            ]}
            extra="格式：resource:action，例如 user:delete, product:create"
          >
            <Input placeholder="user:delete" />
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
              options={flattenedMenuOptions}
            />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="权限描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuManagementPage;
