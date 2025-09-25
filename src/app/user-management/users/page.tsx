"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, message, Modal, Form, Input, Space, Switch, Tabs, Tree, Input as AntInput, Skeleton, Card, Typography, Badge, Tag, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, DeleteOutlined, EditOutlined, SettingOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import axiosInstance from '@/utils/axiosInstance';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface UserType {
  id: string;
  username: string;
  password?: string;
  status: number;
  last_login: string;
  last_ip: string;
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

// 添加密码生成选项的接口
interface PasswordOptions {
  length?: number;
  useUpperCase?: boolean;
  useLowerCase?: boolean;
  useNumbers?: boolean;
  useSymbols?: boolean;
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

// 递归查找节点
const findNodeById = (id: string, items: MenuItem[]): MenuItem | null => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findNodeById(id, item.children);
      if (found) return found;
    }
  }
  return null;
};

// 获取节点的所有父节点路径
const getParentPath = (nodeId: string, items: MenuItem[]): string[] => {
  const path: string[] = [];

  const findPath = (id: string, menuItems: MenuItem[]) => {
    for (const item of menuItems) {
      if (item.id === id) {
        path.push(item.id);
        return true;
      }
      if (item.children) {
        if (findPath(id, item.children)) {
          path.push(item.id);
          return true;
        }
      }
    }
    return false;
  };

  findPath(nodeId, items);
  return path.reverse(); // 从根节点到目标节点的顺序
};

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增用户');
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
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // 添加缓存
  const [menuCache, setMenuCache] = useState<{data: MenuItem[], timestamp: number} | null>(null);
  const [apiCache, setApiCache] = useState<{data: ApiGroupData[], timestamp: number} | null>(null);
  const CACHE_TIMEOUT = 5 * 60 * 1000; // 缓存有效期：5分钟

  // 获取用户总数
  const fetchTotalUsers = async () => {
    try {
      // 使用更新后的接口格式
      const response = await axiosInstance.get(`${server_url}/users?limit=10`);
      if (response.data && typeof response.data.total === 'number') {
        setTotalUsers(response.data.total);
        return response.data.total;
      }
      return 0;
    } catch (error) {
      console.error('获取用户总数失败:', error);
      return 0;
    }
  };

  // 当组件首次加载时获取用户总数
  useEffect(() => {
    fetchTotalUsers();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setModalTitle('新增用户');
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (record: UserType) => {
    form.setFieldsValue({
      username: record.username,
      status: record.status,
    });
    setModalTitle('编辑用户');
    setEditingId(record.id);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？删除后不可恢复。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: {
        danger: true
      },
      onOk: async () => {
        try {
          await axiosInstance.delete(`${server_url}/users/${id}`);
          message.success('删除成功');
          // 刷新用户总数
          fetchTotalUsers();
          actionRef.current?.reload();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleResetPassword = async (id: string) => {
    Modal.confirm({
      title: '确认重置密码',
      content: '确定要将该用户的密码重置为默认密码吗?',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 创建表单数据
          const formData = new URLSearchParams();
          formData.append('user_id', id);
          
          // 使用x-www-form-urlencoded格式发送请求
          await axiosInstance.post(`${server_url}/users/reset-password/`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          message.success('密码已重置为默认密码: 123456');
        } catch (error) {
          message.error('重置密码失败');
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      setConfirmLoading(true);
      const values = await form.validateFields();
      if (editingId) {
        // 为空密码处理，如果为空则不发送密码字段
        const updateData = { ...values };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        // 创建表单数据
        const formData = new URLSearchParams();
        // 添加用户名
        if (updateData.username) {
          formData.append('username', updateData.username);
        }
        // 添加新密码（如果有）
        if (updateData.password) {
          formData.append('password', updateData.password);
        }
        // 添加原始密码（必需）
        if (updateData.old_password) {
          formData.append('old_password', updateData.old_password);
        }
        // 添加状态
        formData.append('status', updateData.status ? '1' : '0');
        
        await axiosInstance.put(`${server_url}/users/${editingId}/`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        message.success('更新成功');
      } else {
        await axiosInstance.post(`${server_url}/users`, values);
        message.success('创建成功');
        // 新增用户后刷新总数
        fetchTotalUsers();
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

  // 使用useCallback进行优化，避免不必要的函数重建
  const getMenuData = useCallback(async () => {
    // 检查缓存是否有效
    if (menuCache && Date.now() - menuCache.timestamp < CACHE_TIMEOUT) {
      return menuCache.data;
    }
    
    // 缓存过期或不存在，重新获取数据
    const menuResponse = await axiosInstance.get(`${server_url}/menu`);
    const menuData = menuResponse.data;
    
    // 更新缓存
    setMenuCache({
      data: menuData,
      timestamp: Date.now()
    });
    
    return menuData;
  }, [menuCache]);
  
  const getApiData = useCallback(async () => {
    // 检查缓存是否有效
    if (apiCache && Date.now() - apiCache.timestamp < CACHE_TIMEOUT) {
      return apiCache.data;
    }
    
    // 缓存过期或不存在，重新获取数据
    const response = await axiosInstance.get(`${server_url}/api_endpoints`);
    const apis = response.data || {};
    
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
    
    // 更新缓存
    setApiCache({
      data: groupedData,
      timestamp: Date.now()
    });
    
    return groupedData;
  }, [apiCache]);

  const handlePermission = async (record: UserType) => {
    try {
      setPermissionLoading(true);
      setPermissionButtonLoadingId(record.id);
      setEditingId(record.id);
      
      // 先不显示Modal，等数据加载完成后再显示
      
      // 并行请求数据，使用缓存机制
      const [menuData, menuPermissionResponse, apiData, userApiResponse] = await Promise.all([
        getMenuData(), // 使用缓存获取菜单数据
        axiosInstance.get(`${server_url}/menu/user/get_user_menu_permissions?user_id=${record.id}`),
        getApiData(), // 使用缓存获取API数据
        axiosInstance.get(`${server_url}/user/get_user_api_permissions?user_id=${record.id}`)
      ]);
      
      // 设置菜单树和用户菜单权限
      setMenuTree(menuData);
      setCheckedKeys(menuPermissionResponse.data || []);
      
      // 设置API数据
      setApiData(apiData);
      setFilteredApiData(apiData);
      setCheckedApiKeys(userApiResponse.data || []);
      
      // 所有数据加载完成后再显示Modal
      setPermissionModalVisible(true);
    } catch (error) {
      message.error('获取权限数据失败');
    } finally {
      setPermissionLoading(false);
      setPermissionButtonLoadingId(null);
    }
  };

  // 处理树节点选择
  const handleTreeCheck = (checked: any) => {
    const checkedArray = Array.isArray(checked) ? checked : checked.checked;
    const newCheckedKeys = new Set(checkedKeys);

    const newlyChecked = checkedArray.filter((key: string) => !checkedKeys.includes(key));
    const unchecked = checkedKeys.filter((key: string) => !checkedArray.includes(key));

    newlyChecked.forEach((key: string) => {
      newCheckedKeys.add(key);
      const parentPath = getParentPath(key, menuTree);
      parentPath.forEach((id) => newCheckedKeys.add(id));
    });

    unchecked.forEach((key: string) => {
      newCheckedKeys.delete(key);
    });

    setCheckedKeys(Array.from(newCheckedKeys));
  };

  const handlePermissionOk = async () => {
    try {
      if (editingId) {
        await axiosInstance.put(`${server_url}/menu/user/update_user_menu_permissions`, {
          user_id: editingId,
          menu_ids: checkedKeys,
        });
        message.success('菜单权限更新成功');
      }
      setPermissionModalVisible(false);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '菜单权限更新失败');
    }
  };
  const handleApiPermissionOk = async () => {
    try {
      if (editingId) {
        await axiosInstance.put(`${server_url}/user/update_user_api_permissions`, {
          user_id: editingId,
          api_ids: checkedApiKeys.filter((key: string) => !key.startsWith('group-')),
        });
        message.success('API权限更新成功');
      }
      setPermissionModalVisible(false);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'API权限更新失败');
    }
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

  /**
   * 使用 window.crypto 生成一个 0 到 max-1 之间的安全随机整数
   */
  const cryptoRandom = (max: number) => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] % max;
  };

  /**
   * 使用安全的随机数进行 Fisher-Yates 洗牌
   */
  const shuffleWithCrypto = (arr: any[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = cryptoRandom(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  /**
   * 生成一个密码学安全的随机密码
   * @param {PasswordOptions} options - 配置选项
   * @returns {string} 生成的随机密码
   */
  const generateSecurePassword = (options: PasswordOptions = {}) => {
    // 1. 设置默认值和字符集
    const {
      length = 12,
      useUpperCase = true,
      useLowerCase = true,
      useNumbers = true,
      useSymbols = true,
    } = options;

    const charSets = {
      lowerCase: 'abcdefghijklmnopqrstuvwxyz',
      upperCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+',
    };
    
    // 2. 准备一个保证包含的字符列表和一个所有可用字符的池
    let guaranteedChars = [];
    let charPool = '';

    if (useUpperCase) {
      guaranteedChars.push(charSets.upperCase[cryptoRandom(charSets.upperCase.length)]);
      charPool += charSets.upperCase;
    }
    if (useLowerCase) {
      guaranteedChars.push(charSets.lowerCase[cryptoRandom(charSets.lowerCase.length)]);
      charPool += charSets.lowerCase;
    }
    if (useNumbers) {
      guaranteedChars.push(charSets.numbers[cryptoRandom(charSets.numbers.length)]);
      charPool += charSets.numbers;
    }
    if (useSymbols) {
      guaranteedChars.push(charSets.symbols[cryptoRandom(charSets.symbols.length)]);
      charPool += charSets.symbols;
    }

    if (charPool === '') {
      throw new Error('至少需要选择一种字符类型！');
    }

    // 3. 填充剩余的密码字符
    const remainingLength = length - guaranteedChars.length;
    let passwordChars = [...guaranteedChars];
    for (let i = 0; i < remainingLength; i++) {
      passwordChars.push(charPool[cryptoRandom(charPool.length)]);
    }

    // 4. 使用安全的随机数进行 Fisher-Yates 洗牌
    shuffleWithCrypto(passwordChars);
    
    return passwordChars.join('');
  };

  // 生成随机密码的处理函数
  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    form.setFieldsValue({ password });
    message.success('已生成随机密码');
  };

  const columns: ProColumns<UserType>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
      render: (text) => (
        <Space>
          <UserOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
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
      title: '最近登录情况',
      dataIndex: 'last_login', 
      width: 240,
      render: (_, record) => (
        <Space>
          <Text strong>
            {record.last_login && record.last_ip ? 
              `${record.last_login}\n${record.last_ip}` : 
              '暂无登录记录'
            }
          </Text>
        </Space>
      ),
    },
    {
      title: '操作',
      width: 240,
      key: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Tooltip title="编辑用户" key="edit">
          <Button 
            key="edit" 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Tooltip>,
        <Tooltip title="权限设置" key="permission">
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
        <Tooltip title="重置密码" key="reset">
          <Button 
            key="reset" 
            type="link" 
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
          </Button>
        </Tooltip>,
        <Tooltip title="删除用户" key="delete">
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
            <UserOutlined style={{ marginRight: '8px' }} />
            用户管理
          </Title>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={{ borderRadius: '4px' }}
          >
            新增用户
          </Button>
        }
      >
        <ProTable<UserType>
          columns={columns}
          actionRef={actionRef}
          request={async (params) => {
            const { current, pageSize } = params;
            const skip = ((current || 1) - 1) * (pageSize || 10);
            const limit = pageSize || 10;
            
            const response = await axiosInstance.get(`${server_url}/users?skip=${skip}&limit=${limit}`);
            return {
              data: response.data.users || [],
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
          headerTitle="用户列表"
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
            {modalTitle === '新增用户' ? <PlusOutlined /> : <EditOutlined />}
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
        width={450}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          {editingId && (
            <Form.Item
              name="old_password"
              label="原始密码"
              rules={[{ required: true, message: '请输入原始密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入原始密码" />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={
              <Space>
                <span>密码</span>
                <Tooltip title="点击生成随机密码">
                  <Button 
                    type="link" 
                    icon={<SyncOutlined />} 
                    onClick={handleGeneratePassword}
                    style={{ padding: 0 }}
                  >
                    生成随机密码
                  </Button>
                </Tooltip>
              </Space>
            }
            rules={editingId ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={editingId ? "如需修改密码请填写，否则留空" : "请输入密码"} />
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
          <Tabs.TabPane 
            tab={<><UserOutlined /> 菜单权限</>} 
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
                    checkStrictly={true}
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
          </Tabs.TabPane>
          <Tabs.TabPane 
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
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default UserManagement;