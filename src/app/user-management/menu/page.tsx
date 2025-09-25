'use client';
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, TreeSelect, Popconfirm, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axiosInstance from '@/utils/axiosInstance';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  children?: MenuItem[];
}

const MenuPage = () => {
  const [data, setData] = useState<MenuItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 转换数据结构为TreeSelect需要的格式
  const convertToTreeData = (data: MenuItem[]): any[] => {
    return data.map(item => ({
      title: item.name,
      value: item.id,
      key: item.id,
      children: item.children ? convertToTreeData(item.children) : [],
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/menu');
      const result = response.data;
      setData(result);
      setTreeData(convertToTreeData(result));
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: MenuItem) => {
    form.setFieldsValue({
      ...record,
      // 处理空值
      parent_id: record.parent_id || undefined
    });
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/menu/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await axiosInstance.put(`/menu/${editingId}`, values);
      } else {
        await axiosInstance.post('/menu', values);
      } 
      setIsModalVisible(false);
      message.success(`${editingId ? '更新' : '添加'}成功`);
      fetchData();
    } catch (error) {
      message.error(`${editingId ? '更新' : '添加'}失败`);
    }
  };

  const columns: ColumnsType<MenuItem> = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: '30%',
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">菜单管理</h1>
        <Button 
          type="primary" 
          onClick={handleAdd}
          icon={<PlusOutlined />}
        >
          添加菜单
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table 
          columns={columns} 
          dataSource={data}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ y: 'calc(100vh - 260px)' }}
          // 树形结构展示
          expandable={{
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
          }}
        />
      </Spin>

      <Modal
        title={editingId ? "编辑菜单" : "添加菜单"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
        okText={editingId ? "更新" : "添加"}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="请输入菜单名称" />
          </Form.Item>
          
          <Form.Item
            name="parent_id"
            label="父级菜单"
          >
            <TreeSelect
              treeData={treeData}
              placeholder="请选择父级菜单"
              allowClear
              treeDefaultExpandAll
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            />
          </Form.Item>
          
          <Form.Item
            name="path"
            label="路径"
          >
            <Input placeholder="请输入路径，如：/dashboard" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuPage;
