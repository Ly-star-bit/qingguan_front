"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, message, Modal, Form, Input, Space, Switch, Tabs, Tree, Input as AntInput, Skeleton, Card, Typography, Badge, Tag, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, DeleteOutlined, EditOutlined, SettingOutlined, PlusOutlined, SyncOutlined, TeamOutlined } from '@ant-design/icons';
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

interface Role {
  id: string;
  role_name: string;
  description?: string;
  status: number;
}

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  children?: MenuItem[];
}

interface PermissionItem {
  id: string;
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
  Type: string;
  Description: string;
}

interface PermissionTreeNode {
  title: any;
  key: string;
  children?: PermissionTreeNode[];
  isLeaf?: boolean;
  disabled?: boolean;
  checkable?: boolean;
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [permissionItems, setPermissionItems] = useState<PermissionItem[]>([]);
  const [checkedPermissionKeys, setCheckedPermissionKeys] = useState<string[]>([]);
  const [inheritedPermissionKeys, setInheritedPermissionKeys] = useState<string[]>([]);
  const [permissionSearchValue, setPermissionSearchValue] = useState('');
  const [filteredPermissionData, setFilteredPermissionData] = useState<PermissionTreeNode[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionButtonLoadingId, setPermissionButtonLoadingId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);

  // 添加缓存
  const [permissionCache, setPermissionCache] = useState<{data: PermissionItem[], timestamp: number} | null>(null);
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

  // 获取API端点数据
  const fetchApiEndpoints = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/api_endpoints`);
      const endpointsData = response.data;
      
      // 将分组数据转换为平面数组
      const allEndpoints: ApiEndpoint[] = [];
      
      Object.entries(endpointsData).forEach(([group, endpoints]) => {
        (endpoints as ApiEndpoint[]).forEach(endpoint => {
          allEndpoints.push(endpoint);
        });
      });
      
      setApiEndpoints(allEndpoints);
    } catch (error) {
      console.error('获取API端点数据失败:', error);
    }
  };

  // 获取菜单数据
  const fetchMenuItems = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('获取菜单数据失败:', error);
    }
  };

  // 当组件首次加载时获取用户总数、API端点和菜单数据
  useEffect(() => {
    fetchTotalUsers();
    fetchApiEndpoints();
    fetchMenuItems();
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

  // 获取权限项数据
  const getPermissionData = useCallback(async () => {
    // 检查缓存是否有效
    if (permissionCache && Date.now() - permissionCache.timestamp < CACHE_TIMEOUT) {
      return permissionCache.data;
    }
    
    // 缓存过期或不存在，重新获取数据
    const response = await axiosInstance.get(`${server_url}/permission_item`);
    const permissions = response.data || [];
    
    // 更新缓存
    setPermissionCache({
      data: permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  }, [permissionCache]);

  // 递归查找菜单项
  const findMenuById = (id: string, menus: MenuItem[]): MenuItem | null => {
    for (const menu of menus) {
      if (menu.id === id) {
        return menu;
      }
      if (menu.children) {
        const found = findMenuById(id, menu.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 构建权限树 - 按照完整的菜单层级结构组织
  const buildPermissionTree = (permissions: PermissionItem[], directPermissions: string[], inheritedPermissions: string[]): PermissionTreeNode[] => {
    // 按 menu_id 分组权限项
    const permissionsByMenu = new Map<string, PermissionItem[]>();
    const noMenuPermissions: PermissionItem[] = [];
    
    permissions.forEach(p => {
      if (p.menu_id) {
        if (!permissionsByMenu.has(p.menu_id)) {
          permissionsByMenu.set(p.menu_id, []);
        }
        permissionsByMenu.get(p.menu_id)!.push(p);
      } else {
        noMenuPermissions.push(p);
      }
    });
    
    // 渲染权限项节点
    const renderPermissionNode = (p: PermissionItem): PermissionTreeNode => {
      const isInherited = inheritedPermissions.includes(p.id);
      return {
        title: (
          <Space>
            <span>{p.name}</span>
            {isInherited && <Tag color="blue">继承</Tag>}
            {p.description && <Text type="secondary" style={{ fontSize: '12px' }}>({p.description})</Text>}
          </Space>
        ),
        key: p.id,
        isLeaf: true,
        disabled: isInherited,
        checkable: !isInherited
      };
    };
    
    // 递归构建菜单树节点
    const buildMenuNodes = (menus: MenuItem[]): PermissionTreeNode[] => {
      return menus.map(menu => {
        const menuPermissions = permissionsByMenu.get(menu.id) || [];
        const hasChildren = menu.children && menu.children.length > 0;
        const hasPermissions = menuPermissions.length > 0;
        
        // 构建子节点：包含子菜单和当前菜单的权限项
        const children: PermissionTreeNode[] = [];
        
        // 先添加子菜单
        if (hasChildren) {
          children.push(...buildMenuNodes(menu.children!));
        }
        
        // 再添加当前菜单的权限项
        if (hasPermissions) {
          children.push(...menuPermissions.map(renderPermissionNode));
        }
        
        // 如果既没有子菜单也没有权限项，则不显示该菜单
        if (children.length === 0) {
          return null;
        }
        
        return {
          title: menu.name,
          key: `menu-${menu.id}`,
          children
        };
      }).filter(node => node !== null) as PermissionTreeNode[];
    };
    
    const tree: PermissionTreeNode[] = buildMenuNodes(menuItems);
    
    // 添加未分组的权限项
    if (noMenuPermissions.length > 0) {
      tree.push({
        title: '未分组权限',
        key: 'no-menu',
        children: noMenuPermissions.map(renderPermissionNode)
      });
    }
    
    return tree;
  };

  const handlePermission = async (record: UserType) => {
    try {
      setPermissionLoading(true);
      setPermissionButtonLoadingId(record.id);
      setEditingId(record.id);
      
      // 获取角色列表和用户已有的角色
      fetchRoles();
      const userRoles = await fetchUserRoles(record.username);
      
      // 先不显示Modal，等数据加载完成后再显示
      
      // 并行请求数据，使用缓存机制
      const [permissionData, userPoliciesResponse] = await Promise.all([
        getPermissionData(), // 使用缓存获取权限项数据
        axiosInstance.get(`${server_url}/casbin/policies/get_user_policies`, {
          params: { username: record.username }
        })
      ]);
      
      // 设置权限项数据
      setPermissionItems(permissionData);
      
      // 从 Casbin 策略中提取用户的直接权限
      // 后端返回的是对象数组，格式：{ptype, sub, obj, act, attrs, eft, description}
      const directPolicies = userPoliciesResponse.data || [];
      
      // 获取每个角色的权限策略，合并到继承权限中
      const inheritedPermissionSet = new Set<string>();
      for (const roleName of userRoles) {
        try {
          const rolePoliciesResponse = await axiosInstance.get(`${server_url}/casbin/policies/get_role_policies`, {
            params: { role: roleName }
          });
          const rolePolicies = rolePoliciesResponse.data || [];
          // 只统计 allow 的策略
          rolePolicies
            .filter((p: any) => p.eft === 'allow')
            .forEach((p: any) => {
              // 通过 obj(路径) 和 act(方法) 查找对应的权限项
              const matchedPermission = permissionData.find((perm: PermissionItem) => {
                const apiEndpoint = apiEndpoints.find(api => api.id === perm.code);
                return apiEndpoint && apiEndpoint.Path === p.obj && apiEndpoint.Method === p.act;
              });
              if (matchedPermission) {
                inheritedPermissionSet.add(matchedPermission.id);
              }
            });
        } catch (error) {
          console.warn(`获取角色 ${roleName} 的权限失败:`, error);
        }
      }
      
      // 将用户的直接策略转换为权限项ID
      const userDirectPermissionIds: string[] = [];
      for (const policy of directPolicies) {
        const obj = policy.obj; // 对象属性：资源路径
        const act = policy.act; // 对象属性：操作方法
        
        // 通过路径和方法查找对应的权限项
        const matchedPermission = permissionData.find((perm: PermissionItem) => {
          const apiEndpoint = apiEndpoints.find(api => api.id === perm.code);
          return apiEndpoint && apiEndpoint.Path === obj && apiEndpoint.Method === act;
        });
        
        if (matchedPermission) {
          userDirectPermissionIds.push(matchedPermission.id);
        }
      }
      
      setCheckedPermissionKeys(userDirectPermissionIds);
      setInheritedPermissionKeys(Array.from(inheritedPermissionSet));
      
      // 构建权限树并设置过滤数据
      const treeData = buildPermissionTree(permissionData, userDirectPermissionIds, Array.from(inheritedPermissionSet));
      setFilteredPermissionData(treeData);
      
      // 所有数据加载完成后再显示Modal
      setPermissionModalVisible(true);
    } catch (error) {
      message.error('获取权限数据失败');
      console.error('获取权限数据失败:', error);
    } finally {
      setPermissionLoading(false);
      setPermissionButtonLoadingId(null);
    }
  };

  // 保存权限项
  const handlePermissionOk = async () => {
    try {
      if (!editingId) {
        message.error('无法确定要更新的用户');
        return;
      }
      
      // 获取用户名
      const userResponse = await axiosInstance.get(`${server_url}/users?skip=0&limit=10000`);
      const users = userResponse.data.users || [];
      const currentUser = users.find((u: UserType) => u.id === editingId);
      if (!currentUser) {
        message.error('用户不存在');
        return;
      }
      const username = currentUser.username;
      
      // 获取当前用户的所有 p 策略（后端已经只返回 p 策略）
      const currentPoliciesResponse = await axiosInstance.get(`${server_url}/casbin/policies/get_user_policies`, {
        params: { username: username }
      });
      const currentDirectPolicies = currentPoliciesResponse.data || [];
      
      // 根据选中的权限项ID，构建需要的策略列表
      const selectedPermissions = permissionItems.filter(p => checkedPermissionKeys.includes(p.id));
      
      // 获取 API 端点数据（如果还没有）
      if (apiEndpoints.length === 0) {
        const apiResponse = await axiosInstance.get(`${server_url}/api_endpoints`);
        const endpointsData = apiResponse.data;
        const allEndpoints: ApiEndpoint[] = [];
        Object.entries(endpointsData).forEach(([group, endpoints]) => {
          (endpoints as ApiEndpoint[]).forEach(endpoint => {
            allEndpoints.push(endpoint);
          });
        });
        setApiEndpoints(allEndpoints);
      }
      
      // 收集需要创建和更新的策略
      const policiesToCreate: any[] = [];
      const policiesToUpdate: any[] = [];
      
      // 为每个选中的权限项创建/更新策略
      for (const permission of selectedPermissions) {
        const endpoint = apiEndpoints.find(api => api.id === permission.code);
        if (!endpoint) {
          console.warn('未找到API端点:', permission.code);
          continue;
        }
        
        const dynamicParams = permission.dynamic_params || {};
        
        // 检查是否已存在该策略
        const existingPolicy = currentDirectPolicies.find((policy: any) => 
          policy.obj === endpoint.Path && 
          policy.act === endpoint.Method &&
          JSON.stringify(policy.attrs || {}) === JSON.stringify(dynamicParams)
        );
        
        if (!existingPolicy) {
          // 策略不存在，需要创建
          policiesToCreate.push({
            ptype: 'p',
            sub: username,
            obj: endpoint.Path,
            act: endpoint.Method,
            eft: 'allow',
            attrs: dynamicParams,
            description: endpoint.Description || `${username} - ${endpoint.Path}`
          });
        } else if (existingPolicy.eft === 'deny') {
          // 策略存在但是 deny，需要更新为 allow
          policiesToUpdate.push({
            old_ptype: 'p',
            old_sub: username,
            old_obj: endpoint.Path,
            old_act: endpoint.Method,
            old_eft: 'deny',
            old_attrs: existingPolicy.attrs || {},
            old_description: existingPolicy.description || endpoint.Description || `${username} - ${endpoint.Path}`,
            new_ptype: 'p',
            new_sub: username,
            new_obj: endpoint.Path,
            new_act: endpoint.Method,
            new_eft: 'allow',
            new_attrs: dynamicParams,
            new_description: endpoint.Description || `${username} - ${endpoint.Path}`
          });
        }
      }
      
      // 处理被取消选中的权限项：将对应的 policy 设置为 deny
      const currentPermissionIds = new Set(checkedPermissionKeys);
      for (const policy of currentDirectPolicies) {
        if (policy.eft === 'deny') continue; // 跳过已经是 deny 的策略
        
        const obj = policy.obj;
        const act = policy.act;
        const attrs = policy.attrs || {};
        
        // 查找对应的权限项
        const matchedPermission = permissionItems.find(perm => {
          const endpoint = apiEndpoints.find(api => api.id === perm.code);
          return endpoint && 
                 endpoint.Path === obj && 
                 endpoint.Method === act &&
                 JSON.stringify(perm.dynamic_params || {}) === JSON.stringify(attrs);
        });
        
        // 如果找到了权限项但它不在选中列表中，则需要更新为 deny
        if (matchedPermission && !currentPermissionIds.has(matchedPermission.id)) {
          const endpoint = apiEndpoints.find(api => api.id === matchedPermission.code);
          if (endpoint) {
            policiesToUpdate.push({
              old_ptype: 'p',
              old_sub: username,
              old_obj: obj,
              old_act: act,
              old_eft: 'allow',
              old_attrs: attrs,
              old_description: policy.description || endpoint.Description || `${username} - ${obj}`,
              new_ptype: 'p',
              new_sub: username,
              new_obj: obj,
              new_act: act,
              new_eft: 'deny',
              new_attrs: attrs,
              new_description: endpoint.Description || `${username} - ${obj}`
            });
          }
        }
      }
      
      // 批量创建新策略
      let createCount = 0;
      if (policiesToCreate.length > 0) {
        for (const policy of policiesToCreate) {
          try {
            await axiosInstance.post(`${server_url}/casbin/policies`, policy);
            createCount++;
          } catch (error) {
            console.warn('创建策略失败:', policy.obj);
          }
        }
      }
      
      // 批量更新策略
      let updateCount = 0;
      if (policiesToUpdate.length > 0) {
        try {
          await axiosInstance.put(`${server_url}/casbin/policies`, policiesToUpdate);
          updateCount = policiesToUpdate.length;
        } catch (error) {
          console.error('批量更新策略失败:', error);
        }
      }
      
      // 显示结果消息
      const messages: string[] = [];
      if (createCount > 0) {
        messages.push(`创建 ${createCount} 个新权限`);
      }
      if (updateCount > 0) {
        messages.push(`更新 ${updateCount} 个权限`);
      }
      if (messages.length > 0) {
        message.success(`已为用户 ${username} ${messages.join('，')}`);
      } else {
        message.success('权限更新成功');
      }
      
      setPermissionModalVisible(false);
    } catch (error: any) {
      console.error('权限更新失败:', error);
      message.error(error?.response?.data?.message || '权限更新失败');
    }
  };

  // 处理权限项搜索
  const handlePermissionSearch = (value: string) => {
    setPermissionSearchValue(value);
    if (!value) {
      const treeData = buildPermissionTree(permissionItems, checkedPermissionKeys, inheritedPermissionKeys);
      setFilteredPermissionData(treeData);
      return;
    }

    const lowerCaseValue = value.toLowerCase();
    const filtered = permissionItems.filter(p =>
      p.name.toLowerCase().includes(lowerCaseValue) ||
      (p.description && p.description.toLowerCase().includes(lowerCaseValue)) ||
      p.code.toLowerCase().includes(lowerCaseValue)
    );
    
    const treeData = buildPermissionTree(filtered, checkedPermissionKeys, inheritedPermissionKeys);
    setFilteredPermissionData(treeData);
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await axiosInstance.get(`${server_url}/roles/`, {
        params: { all_data: true }
      });
      setRoles(response.data.roles || []);
    } catch (error) {
      message.error('获取角色列表失败');
    } finally {
      setRolesLoading(false);
    }
  };

  // 获取用户已有的角色
  const fetchUserRoles = async (username: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/casbin/policies/get_user_policies`, {
        params: { username: username }
      });
      const policies = response.data || [];
      // 只有 g2 策略才包含角色信息，需要单独获取
      // 使用 /casbin/policies 接口获取 g2 策略
      const g2Response = await axiosInstance.get(`${server_url}/casbin/policies`, {
        params: { policy_type: 'g' }
      });
      const g2Policies = g2Response.data?.g_policies || [];
      // 过滤出该用户的角色
      const userRoles = g2Policies
        .filter((g: any) => g.user === username)
        .map((g: any) => g.role);
      setSelectedRoles(userRoles);
      return userRoles;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      setSelectedRoles([]);
      return [];
    }
  };

  // 保存角色继承
  const handleRoleOk = async () => {
    try {
      if (!editingId) return;
      
      // 获取用户名（从表格数据中）
      const userResponse = await axiosInstance.get(`${server_url}/users?skip=0&limit=10000`);
      const users = userResponse.data.users || [];
      const currentUser = users.find((u: UserType) => u.id === editingId);
      if (!currentUser) {
        message.error('用户不存在');
        return;
      }
      const username = currentUser.username;
      
      // 获取当前用户的所有角色
      const g2Response = await axiosInstance.get(`${server_url}/casbin/policies`, {
        params: { policy_type: 'g' }
      });
      const g2Policies = g2Response.data?.g_policies || [];
      const currentRoles = g2Policies
        .filter((g: any) => g.user === username)
        .map((g: any) => g.role);
      
      // 找出需要删除和添加的角色
      const rolesToRemove = currentRoles.filter((role: string) => !selectedRoles.includes(role));
      const rolesToAdd = selectedRoles.filter(role => !currentRoles.includes(role));
      
      // 删除不再需要的角色
      for (const role of rolesToRemove) {
        try {
          await axiosInstance.delete(`${server_url}/casbin/policies/groups`, {
            data: {
              user: username,
              group: role,
              description: `用户 ${username} 具有 ${role} 角色`
            }
          });
        } catch (error) {
          console.warn(`删除角色失败: ${role}`);
        }
      }
      
      // 添加新的角色
      for (const role of rolesToAdd) {
        try {
          await axiosInstance.post(`${server_url}/casbin/policies/groups`, {
            ptype: 'g',
            user: username,
            group: role,
            description: `用户 ${username} 具有 ${role} 角色`
          });
        } catch (error) {
          console.warn(`添加角色失败: ${role}`);
        }
      }
      
      if (rolesToAdd.length > 0 || rolesToRemove.length > 0) {
        message.success('角色继承更新成功');
      }
      setPermissionModalVisible(false);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '角色继承更新失败');
    }
  };

  // 处理权限树节点选择
  const handlePermissionTreeCheck = (checked: any) => {
    const checkedArray = Array.isArray(checked) ? checked : checked.checked;
    // 只保留权限项 ID，过滤掉分组节点
    const permissionIds = checkedArray.filter((key: string) => 
      !key.startsWith('menu-') && key !== 'no-menu'
    );
    setCheckedPermissionKeys(permissionIds);
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
        <Tabs defaultActiveKey="api" type="card">
          <Tabs.TabPane 
            tab={<><KeyOutlined /> 权限项</>} 
            key="permissions"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text type="secondary">
                  蓝色"继承"标签表示该权限通过角色继承获得，无法直接取消。如需取消，请在"角色继承" Tab中移除对应角色。
                </Text>
              </div>
              <Search
                placeholder="搜索权限项..."
                onChange={e => handlePermissionSearch(e.target.value)}
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
                    checkedKeys={[...checkedPermissionKeys, ...inheritedPermissionKeys]}
                    onCheck={handlePermissionTreeCheck}
                    treeData={filteredPermissionData}
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
                    保存权限
                  </Button>
                </Space>
              </div>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane 
            tab={<><TeamOutlined /> 角色继承</>} 
            key="roles"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {permissionLoading || rolesLoading ? (
                <div style={{ padding: '20px' }}>
                  <Skeleton active paragraph={{ rows: 10 }} />
                </div>
              ) : (
                <Card bordered={false}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">选择用户继承的角色，用户将自动获得角色的所有权限</Text>
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {roles.map(role => (
                      <Card 
                        key={role.id}
                        size="small"
                        hoverable
                        style={{ 
                          cursor: 'pointer',
                          border: selectedRoles.includes(role.role_name) ? '2px solid #1890ff' : '1px solid #d9d9d9'
                        }}
                        onClick={() => {
                          if (selectedRoles.includes(role.role_name)) {
                            setSelectedRoles(selectedRoles.filter(r => r !== role.role_name));
                          } else {
                            setSelectedRoles([...selectedRoles, role.role_name]);
                          }
                        }}
                      >
                        <Space>
                          <Badge 
                            status={selectedRoles.includes(role.role_name) ? 'processing' : 'default'}
                          />
                          <TeamOutlined style={{ fontSize: '16px' }} />
                          <div>
                            <Text strong>{role.role_name}</Text>
                            {role.description && (
                              <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {role.description}
                                </Text>
                              </div>
                            )}
                          </div>
                          {role.status === 1 ? (
                            <Tag color="success">启用</Tag>
                          ) : (
                            <Tag color="error">禁用</Tag>
                          )}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </Card>
              )}
              <div style={{ textAlign: 'right', marginTop: '16px' }}>
                <Space>
                  <Button onClick={() => setPermissionModalVisible(false)}>
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={handleRoleOk} 
                    disabled={permissionLoading || rolesLoading}
                  >
                    保存角色继承
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