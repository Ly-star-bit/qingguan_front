"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button, message, Modal, Form, Input, Space, Switch, Tabs, Tree, Input as AntInput, Skeleton, Card, Typography, Badge, Tag, Tooltip } from 'antd';
import { TeamOutlined, EditOutlined, DeleteOutlined, SettingOutlined, PlusOutlined, CheckOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import axiosInstance from '@/utils/axiosInstance';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface RoleType {
  id: string;
  role_name: string;
  description?: string;
  permissions: string[];
  status: number;
  created_at?: string;
  updated_at?: string;
}

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  children?: MenuItem[];
}

interface ApiItem {
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
  id: string;
}

interface ApiGroupData {
  title: string;
  key: string;
  children: {
    title: string;
    key: string;
    method: string;
    path: string;
    description: string;
  }[];
}

const { Search } = AntInput;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// 递归转换菜单树为 Tree 组件所需的格式
const convertMenuToTreeData = (menuItems: MenuItem[]): any[] => {
  return menuItems.map(item => ({
    title: item.name,
    key: item.id,
    children: item.children ? convertMenuToTreeData(item.children) : undefined
  }));
};

const RoleManagement: React.FC = () => {
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增角色');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuTree, setMenuTree] = useState<MenuItem[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [apiData, setApiData] = useState<ApiGroupData[]>([]);
  const [checkedApiKeys, setCheckedApiKeys] = useState<string[]>([]);
  const [apiSearchValue, setApiSearchValue] = useState('');
  const [filteredApiData, setFilteredApiData] = useState<ApiGroupData[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionButtonLoadingId, setPermissionButtonLoadingId] = useState<string | null>(null);
  const [totalRoles, setTotalRoles] = useState<number>(0);

  // 获取角色总数
  const fetchTotalRoles = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/roles?limit=10`);
      if (response.data && typeof response.data.total === 'number') {
        setTotalRoles(response.data.total);
        return response.data.total;
      }
      return 0;
    } catch (error) {
      console.error('获取角色总数失败:', error);
      return 0;
    }
  };

  // 当组件首次加载时获取角色总数
  useEffect(() => {
    fetchTotalRoles();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setModalTitle('新增角色');
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (record: RoleType) => {
    form.setFieldsValue({
      role_name: record.role_name,
      description: record.description,
      status: record.status,
    });
    setModalTitle('编辑角色');
    setEditingId(record.id);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该角色吗？删除后不可恢复。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: {
        danger: true
      },
      onOk: async () => {
        try {
          await axiosInstance.delete(`${server_url}/roles/${id}`);
          message.success('删除成功');
          // 刷新角色总数
          fetchTotalRoles();
          actionRef.current?.reload();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      setConfirmLoading(true);
      const values = await form.validateFields();
      
      if (editingId) {
        await axiosInstance.put(`${server_url}/roles/${editingId}/`, values);
        message.success('更新成功');
      } else {
        await axiosInstance.post(`${server_url}/roles/`, values);
        message.success('创建成功');
        // 新增角色后刷新总数
        fetchTotalRoles();
      }
      setModalVisible(false);
      form.resetFields(); // 清空表单
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePermission = async (record: RoleType) => {
    try {
      setPermissionLoading(true);
      setPermissionButtonLoadingId(record.id);
      setEditingId(record.id);
      
      // 获取菜单数据
      const menuResponse = await axiosInstance.get(`${server_url}/menu`);
      const menuData = menuResponse.data;
      setMenuTree(menuData);
      
      // 获取角色的菜单权限 (暂未实现对应的API，先使用空数组)
      // const menuPermissionResponse = await axiosInstance.get(`${server_url}/menu/role/get_role_menu_permissions?role_id=${record.id}`);
      setCheckedKeys([]);
      
      // 获取API数据
      const apiResponse = await axiosInstance.get(`${server_url}/api_endpoints`);
      const apis = apiResponse.data || {};
      const groupedData = Object.entries(apis).map((entry): ApiGroupData => {
        const [group, items] = entry as [string, ApiItem[]];
        return {
          title: group,
          key: `group-${group}`,
          children: items.map(item => ({
            title: item.Description,
            key: item.id,
            method: item.Method,
            path: item.Path,
            description: item.Description
          }))
        };
      });
      
      setApiData(groupedData);
      setFilteredApiData(groupedData);
      
      // 获取角色的API权限
      const rolePermissionResponse = await axiosInstance.get(`${server_url}/roles/${record.id}/permissions/`);
      setCheckedApiKeys(rolePermissionResponse.data.permissions || []);
      
      setPermissionModalVisible(true);
    } catch (error) {
      message.error('获取权限数据失败');
    } finally {
      setPermissionLoading(false);
      setPermissionButtonLoadingId(null);
    }
  };

  const handleAssignToUser = async (record: RoleType) => {
    try {
      // 弹出对话框让用户输入用户名
      const username = prompt('请输入要分配角色的用户名:');
      if (!username) return;
      
      const response = await axiosInstance.post(`${server_url}/roles/${record.id}/assign-to-user/`, {
        username: username
      });
      
      message.success(response.data.message);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '分配角色失败');
    }
  };

  // 处理树节点选择
  const handleTreeCheck = (checked: any) => {
    setCheckedKeys(checked);
  };

  const handlePermissionOk = async () => {
    try {
      // 目前后端没有提供角色的菜单权限管理API，暂时显示提示信息
      message.warning('角色的菜单权限管理功能暂未实现');
      setPermissionModalVisible(false);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '菜单权限更新失败');
    }
  };

  const handleApiPermissionOk = async () => {
    try {
      if (editingId) {
        // 从API权限中提取权限字符串（格式为 "object:action"）
        const extractedPermissions = checkedApiKeys
          .filter((key: string) => !key.startsWith('group-'))
          .map((key: string) => {
            // 从apiData中找到对应的API项，然后构建权限字符串
            const result = findApiItemById(key);
            return result ? `${result.path}:${result.method}` : key;
          });

        // 更新角色的权限列表
        const response = await axiosInstance.post(`${server_url}/roles/${editingId}/assign-permissions/`, extractedPermissions);
        message.success(response.data.message);
      }
      setPermissionModalVisible(false);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'API权限更新失败');
    }
  };

  // 辅助函数：根据ID查找API项
  const findApiItemById = (id: string): any => {
    for (const group of apiData) {
      const found = group.children.find(child => child.key === id);
      if (found) return found;
    }
    return null;
  };

  // 处理 API 搜索
  const handleApiSearch = (value: string) => {
    setApiSearchValue(value);
    if (!value) {
      setFilteredApiData(apiData);
      return;
    }

    const lowerCaseValue = value.toLowerCase();
    const filtered = apiData.map(group => ({
      ...group,
      children: group.children.filter(api =>
        group.title.toLowerCase().includes(lowerCaseValue) ||
        api.title.toLowerCase().includes(lowerCaseValue) ||
        api.path.toLowerCase().includes(lowerCaseValue) ||
        api.method.toLowerCase().includes(lowerCaseValue)
      )
    })).filter(group => group.children.length > 0);

    setFilteredApiData(filtered);
  };

  // 处理 API 树节点选择
  const handleApiTreeCheck = (checked: any) => {
    const checkedArray = Array.isArray(checked) ? checked : checked.checked;
    let newCheckedKeys = new Set(checkedArray.map((key: any) => key.toString()));

    // 处理分组选择
    checkedArray.forEach((key: string) => {
      // 如果是分组被选中
      if (key.startsWith('group-')) {
        // 找到对应的分组
        const group = apiData.find(g => g.key === key);
        if (group) {
          // 添加该分组下所有子项的 key
          group.children.forEach(child => {
            newCheckedKeys.add(child.key.toString());
          });
        }
      }
    });

    // 处理取消选择
    const uncheckedKeys = checkedApiKeys.filter(key => !newCheckedKeys.has(key.toString()));
    uncheckedKeys.forEach(key => {
      // 如果是分组被取消选择
      if (key.startsWith('group-')) {
        // 找到对应的分组
        const group = apiData.find(g => g.key === key);
        if (group) {
          // 移除该分组下所有子项的 key
          group.children.forEach(child => {
            newCheckedKeys.delete(child.key.toString());
          });
        }
      }
    });

    setCheckedApiKeys(Array.from(newCheckedKeys) as string[]);
  };

  const columns: ProColumns<RoleType>[] = [
    {
      title: '角色名称',
      dataIndex: 'role_name',
      width: 150,
      render: (text) => (
        <Space>
          <TeamOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      render: (text) => text || '无描述',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Error' },
      },
      render: (_, record) => (
        <Badge 
          status={record.status === 1 ? 'success' : 'error'} 
          text={<Tag color={record.status === 1 ? 'success' : 'error'}>
            {record.status === 1 ? '启用' : '禁用'}
          </Tag>}
        />
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      width: 120,
      render: (_, record) => (
        <Tag color="blue">{record.permissions ? record.permissions.length : 0}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString() : 'N/A',
    },
    {
      title: '操作',
      width: 300,
      key: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Tooltip title="编辑角色" key="edit">
          <Button 
            key="edit" 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Tooltip>,
        <Tooltip title="分配权限" key="permission">
          <Button 
            key="permission" 
            type="link" 
            icon={<SettingOutlined />}
            onClick={() => handlePermission(record)}
            loading={permissionButtonLoadingId === record.id}
          >
            权限
          </Button>
        </Tooltip>,
        <Tooltip title="分配给用户" key="assign">
          <Button 
            key="assign" 
            type="link" 
            icon={<UsergroupAddOutlined />}
            onClick={() => handleAssignToUser(record)}
          >
            分配给用户
          </Button>
        </Tooltip>,
        <Tooltip title="删除角色" key="delete">
          <Button 
            key="delete" 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Tooltip>,
      ],
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        bordered={false}
        style={{ marginBottom: '24px', borderRadius: '8px' }}
        title={
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: '8px' }} />
            角色管理
          </Title>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={{ borderRadius: '4px' }}
          >
            新增角色
          </Button>
        }
      >
        <ProTable<RoleType>
          columns={columns}
          actionRef={actionRef}
          request={async (params) => {
            const { current, pageSize } = params;
            const skip = ((current || 1) - 1) * (pageSize || 10);
            const limit = pageSize || 10;
            
            const response = await axiosInstance.get(`${server_url}/roles/?skip=${skip}&limit=${limit}`);
            return {
              data: response.data.roles || [],
              success: true,
              total: response.data.total || 0,
            };
          }}
          rowKey="id"
          search={false}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          dateFormatter="string"
          headerTitle="角色列表"
          cardProps={{
            bodyStyle: { padding: '0px' }
          }}
          options={{
            density: true, 
            fullScreen: true,
            reload: true,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            {modalTitle === '新增角色' ? <PlusOutlined /> : <EditOutlined />}
            <span>{modalTitle}</span>
          </Space>
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={confirmLoading}
        bodyStyle={{ padding: '24px 24px 0' }}
        maskClosable={false}
        style={{ top: '20px' }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="role_name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input prefix={<TeamOutlined />} placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入角色描述" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            initialValue={1}
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用"
              style={{ width: '70px' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>权限设置</span>
          </Space>
        }
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: '20px' }}
        bodyStyle={{ padding: '16px' }}
        maskClosable={false}
      >
        <Tabs defaultActiveKey="menu" type="card">
          <TabPane 
            tab={<><TeamOutlined /> 菜单权限</>} 
            key="menu"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {permissionLoading ? (
                <div style={{ padding: '20px' }}>
                  <Skeleton active paragraph={{ rows: 10 }} />
                </div>
              ) : (
                <Card bordered={false}>
                  <Tree
                    checkable
                    checkedKeys={checkedKeys}
                    onCheck={handleTreeCheck}
                    treeData={convertMenuToTreeData(menuTree)}
                    defaultExpandAll
                    checkStrictly={false}
                    height={400}
                    virtual
                  />
                </Card>
              )}
              <div style={{ textAlign: 'right', marginTop: '16px' }}>
                <Space>
                  <Button onClick={() => setPermissionModalVisible(false)}>
                    取消
                  </Button>
                  <Button type="primary" onClick={handlePermissionOk} disabled={permissionLoading}>
                    保存菜单权限
                  </Button>
                </Space>
              </div>
            </div>
          </TabPane>
          <TabPane 
            tab={<><SettingOutlined /> API权限</>} 
            key="api"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Search
                placeholder="搜索 API..."
                onChange={e => handleApiSearch(e.target.value)}
                style={{ width: '100%' }}
                disabled={permissionLoading}
                allowClear
              />
              {permissionLoading ? (
                <div style={{ padding: '20px' }}>
                  <Skeleton active paragraph={{ rows: 10 }} />
                </div>
              ) : (
                <Card bordered={false}>
                  <Tree
                    checkable
                    checkedKeys={checkedApiKeys}
                    onCheck={handleApiTreeCheck}
                    treeData={filteredApiData}
                    defaultExpandAll
                    checkStrictly={true}
                    height={400}
                    virtual
                    titleRender={(node: any) => (
                      <Space>
                        {node.method ? (
                          <>
                            <Tag color={
                              node.method === 'GET' ? 'green' : 
                              node.method === 'POST' ? 'blue' :
                              node.method === 'PUT' ? 'orange' : 'red'
                            }>
                              {node.method}
                            </Tag>
                            <Text code>{node.path}</Text>
                            <Text type="secondary">{node.title}</Text>
                          </>
                        ) : (
                          <Text strong>{node.title}</Text>
                        )}
                      </Space>
                    )}
                  />
                </Card>
              )}
              <div style={{ textAlign: 'right', marginTop: '16px' }}>
                <Space>
                  <Button onClick={() => setPermissionModalVisible(false)}>
                    取消
                  </Button>
                  <Button type="primary" onClick={handleApiPermissionOk} disabled={permissionLoading}>
                    保存API权限
                  </Button>
                </Space>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default RoleManagement;