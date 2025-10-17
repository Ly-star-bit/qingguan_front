"use client";

import React, { useRef, useState, useEffect } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Select } from 'antd';
import axiosInstance from '@/utils/axiosInstance';

interface User {
  id: number;
  username: string;
  permissions: string[];
  roles?: string[];
  created_at: string;
}

interface UserCreate {
  username: string;
  password: string;
  permissions: string[];
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<Array<{ id: string; role_name: string }>>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const actionRef = useRef<ActionType>();

  useEffect(() => {
    fetchUsers();
    fetchAdminPermissions();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/users`);
      setUsers(response.data);
    } catch (error) {
      message.error('Failed to load users.');
    }
  };

  const fetchAdminPermissions = async () => {
    try {
      const response = await axiosInstance.get<string[][]>(`${server_url}/get_user_policies`, { params: { user: 'admin' } });
      const policies = response.data;
      // 只保留 ptype 为 'p' 的策略（API接口权限），过滤掉 'g' 和 'g2' 类型
      const apiPermissions = policies.filter(policy => policy[0] === 'p');
      const permissions = Array.from(new Set(apiPermissions.map(policy => `${policy[1]}:${policy[2]}`)));
      setAdminPermissions(permissions);
    } catch (error) {
      message.error('Failed to load admin permissions.');
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/roles/`, {
        params: { all_data: true }
      });
      setRoles(response.data.roles || []);
    } catch (error) {
      message.error('获取角色列表失败');
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setSelectedRoles([]);
    setIsModalVisible(true);
  };

  const handleEdit = async (record: User) => {
    try {
      const response = await axiosInstance.get<string[][]>(`${server_url}/get_user_policies`, { params: { user: record.username } });
      const userPolicies = response.data;
      
      // 分离 API 权限（ptype='p'）和角色继承（ptype='g2'）
      const apiPolicies = userPolicies.filter(policy => policy[0] === 'p' && policy[3] === 'allow');
      const rolePolicies = userPolicies.filter(policy => policy[0] === 'g2');
      
      const userPermissions = apiPolicies.map(policy => `${policy[1]}:${policy[2]}`);
      const userRoles = rolePolicies.map(policy => policy[2]); // g2 策略中 policy[2] 是角色名
      
      setEditingUser({ ...record, permissions: userPermissions, roles: userRoles });
      setSelectedRoles(userRoles);
      form.setFieldsValue({ ...record, password: '', permissions: userPermissions });
      setIsModalVisible(true);
    } catch (error) {
      message.error('加载用户权限失败。');
      setEditingUser({ ...record, permissions: [], roles: [] });
      setSelectedRoles([]);
      form.setFieldsValue({ ...record, password: '', permissions: [] });
      setIsModalVisible(true);
    }
  };
  
  

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          await axiosInstance.delete(`${server_url}/users/${id}`);
          message.success('User deleted successfully.');
          fetchUsers();
        } catch (error) {
          message.error('Failed to delete user.');
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        await axiosInstance.put(`${server_url}/users/${editingUser.id}/`, values);
        message.success('User updated successfully.');
      } else {
        await axiosInstance.post(`${server_url}/users/`, values);
        message.success('User created successfully.');
      }
      
      // 处理角色继承（g2 策略）
      if (values.username && selectedRoles.length > 0) {
        try {
          // 如果是编辑模式，先删除旧的角色继承关系
          if (editingUser) {
            const oldRoles = editingUser.roles || [];
            const rolesToRemove = oldRoles.filter(role => !selectedRoles.includes(role));
            
            // 删除不再需要的角色继承
            for (const role of rolesToRemove) {
              try {
                await axiosInstance.delete(`${server_url}/casbin/policies`, {
                  data: {
                    ptype: 'g2',
                    sub: values.username,
                    obj: role,
                    eft: 'allow'
                  }
                });
              } catch (error) {
                console.warn(`删除角色继承失败: ${role}`);
              }
            }
          }
          
          // 添加新的角色继承关系
          const rolesToAdd = editingUser 
            ? selectedRoles.filter(role => !(editingUser.roles || []).includes(role))
            : selectedRoles;
          
          for (const role of rolesToAdd) {
            try {
              await axiosInstance.post(`${server_url}/casbin/policies`, {
                ptype: 'g2',
                sub: values.username,
                obj: role,
                eft: 'allow',
                description: `用户 ${values.username} 继承角色 ${role}`
              });
            } catch (error) {
              console.warn(`添加角色继承失败: ${role}`);
            }
          }
          
          if (rolesToAdd.length > 0) {
            message.success(`已为用户分配 ${rolesToAdd.length} 个角色`);
          }
        } catch (error) {
          message.warning('用户保存成功，但角色分配失败');
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setSelectedRoles([]);
      fetchUsers();
    } catch (error) {
      message.error('Failed to save user.');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setSelectedRoles([]);
  };

  const columns: ProColumns<User>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <>
      <ProTable<User>
        columns={columns}
        dataSource={users}
        rowKey="id"
        search={false}
        actionRef={actionRef}
        toolBarRender={() => [
          <Button type="primary" key="add-user" onClick={handleAdd}>
            Add User
          </Button>,
        ]}
      />
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: !editingUser }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="permissions" label="API权限" rules={[{ required: false }]}>
            <Select mode="multiple" placeholder="选择用户直接拥有的API接口权限">
              {adminPermissions.map(permission => (
                <Select.Option key={permission} value={permission}>
                  {permission}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="角色" extra="选择用户继承的角色，用户将自动获得角色的所有权限">
            <Select 
              mode="multiple" 
              placeholder="选择角色"
              value={selectedRoles}
              onChange={setSelectedRoles}
            >
              {roles.map(role => (
                <Select.Option key={role.id} value={role.role_name}>
                  {role.role_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserManagement;
