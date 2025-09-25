"use client";

import React, { useRef, useState, useEffect } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Select } from 'antd';
import axiosInstance from '@/utils/axiosInstance';

interface User {
  id: number;
  username: string;
  permissions: string[];
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
  const actionRef = useRef<ActionType>();

  useEffect(() => {
    fetchUsers();
    fetchAdminPermissions();
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
      const permissions = Array.from(new Set(policies.map(policy => `${policy[1]}:${policy[2]}`)));
      setAdminPermissions(permissions);
    } catch (error) {
      message.error('Failed to load admin permissions.');
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalVisible(true);
  };

  const handleEdit = async (record: User) => {
    try {
      const response = await axiosInstance.get<string[][]>(`${server_url}/get_user_policies`, { params: { user: record.username } });
      const userPolicies = response.data;
      const userPermissions = userPolicies
        .filter(policy => policy[3] === 'allow')
        .map(policy => `${policy[1]}:${policy[2]}`);
        
      setEditingUser({ ...record, permissions: userPermissions });
      form.setFieldsValue({ ...record, password: '', permissions: userPermissions });
      setIsModalVisible(true);
    } catch (error) {
      message.error('加载用户权限失败。');
      setEditingUser({ ...record, permissions: [] });
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
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('Failed to save user.');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
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
          <Form.Item name="permissions" label="Permissions" rules={[{ required: true }]}>
            <Select mode="multiple">
              {adminPermissions.map(permission => (
                <Select.Option key={permission} value={permission}>
                  {permission}
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
