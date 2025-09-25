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
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import axiosInstance from '@/utils/axiosInstance';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  api_endpoint_ids?: string[];
  api_endpoints?: ApiEndpoint[];
  children?: MenuItem[];
}

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
}

const MenuPage = () => {
  const [data, setData] = useState<MenuItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const menuResponse = await axiosInstance.get('/menu');
      const menuResult = menuResponse.data;
      setData(menuResult);

      const apiResponse = await axiosInstance.get('/api_endpoints');
      const apiResult = apiResponse.data;
      const flatApiEndpoints = Object.entries(apiResult).reduce((acc: ApiEndpoint[], [group, endpoints]) => {
        return acc.concat(endpoints as ApiEndpoint[]);
      }, []);
      setApiEndpoints(flatApiEndpoints);
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
      parent_id: record.parent_id || undefined,
      api_endpoint_ids: record.api_endpoint_ids || [],
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
      if (!values.api_endpoint_ids || values.api_endpoint_ids.length === 0) {
        values.api_endpoint_ids = undefined;
      }

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

  const convertMenuToTreeData = (items: MenuItem[]): DataNode[] => {
    return items.map(item => ({
      title: (
        <div className="flex items-center justify-between w-full py-2">
          <div className="flex items-center">
            <span className="mr-2">
              {item.children && item.children.length > 0 ? 
                <FolderOpenOutlined /> : <FileOutlined />
              }
            </span>
            <span className="font-medium">{item.name}</span>
            {item.path && (
              <span className="ml-2 text-gray-500 text-sm">({item.path})</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {item.api_endpoints?.slice(0, 2).map((api, index) => (
              <Tag 
                key={index}
                color={
                  api.Method === 'GET' ? 'green' :
                  api.Method === 'POST' ? 'blue' :
                  api.Method === 'PUT' ? 'orange' :
                  'red'
                }
              >
                {api.Method}
              </Tag>
            ))}
            {item.api_endpoints && item.api_endpoints.length > 2 && (
              <Tag>+{item.api_endpoints.length - 2}</Tag>
            )}
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(item)}
              size="small"
            />
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(item.id)}
              size="small"
              danger
            />
          </div>
        </div>
      ),
      key: item.id,
      children: item.children ? convertMenuToTreeData(item.children) : [],
    }));
  };

  const groupedApiOptions = apiEndpoints.reduce((acc, endpoint) => {
    const group = endpoint.ApiGroup || '其他';
    if (!acc[group]) acc[group] = [];
    acc[group].push(endpoint);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">菜单管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          添加菜单
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {data.length > 0 ? (
          <Tree
            treeData={convertMenuToTreeData(data)}
            defaultExpandAll
            showLine
          />
        ) : (
          <Empty 
            description="暂无菜单数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>

      <Modal
        title={editingId ? '编辑菜单' : '添加菜单'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingId ? '更新' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="输入菜单名称" />
          </Form.Item>

          <Form.Item name="path" label="前端路径">
            <Input placeholder="/user/list" />
          </Form.Item>

          <Form.Item name="api_endpoint_ids" label="关联API端点">
            <Select
              mode="multiple"
              placeholder="选择关联的API端点"
              options={apiEndpoints.map(ep => ({
                label: (
                  <div className="flex items-center">
                    <Tag 
                      color={
                        ep.Method === 'GET' ? 'green' :
                        ep.Method === 'POST' ? 'blue' :
                        ep.Method === 'PUT' ? 'orange' :
                        'red'
                      }
                    >
                      {ep.Method}
                    </Tag>
                    {ep.Path} - {ep.Description}
                  </div>
                ),
                value: ep.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuPage;