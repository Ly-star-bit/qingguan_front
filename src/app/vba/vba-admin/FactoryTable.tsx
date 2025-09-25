import React, { useState, useEffect, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm } from 'antd';
import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

interface FactoryData {
  id: number;
  属性: string;
  中文名字: string;
  英文: string;
  地址: string;
}
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const FactoryTable: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [data, setData] = useState<FactoryData[]>([]);
  const [filteredData, setFilteredData] = useState<FactoryData[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<FactoryData | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();


  const fetchFactories = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/factory/`);
      setData(response.data.items);
      setFilteredData(response.data.items);
    } catch (error) {
      message.error('Failed to fetch data');
    }
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  const handleAdd = async (values: Omit<FactoryData, 'id'>) => {
    try {
      await axiosInstance.post(`${server_url}/qingguan/factory/`, values);
      message.success('Added successfully');
      setCreateModalVisible(false);
      addForm.resetFields();
      fetchFactories();
    } catch (error) {
      message.error('Failed to add');
    }
  };

  const handleEdit = async (values: FactoryData) => {
    try {
      await axiosInstance.put(`${server_url}/qingguan/factory/${values.id}`, values);
      message.success('Updated successfully');
      setEditModalVisible(false);
      setCurrentRecord(null);
      fetchFactories();
    } catch (error) {
      message.error('Failed to update');
    }
  };

  const handleSearch = (value: string) => {
    const filtered = data.filter(item => 
      item.中文名字.includes(value) || item.属性.includes(value)
    );
    setFilteredData(filtered);
  };

  const getUniqueAttributes = (attribute: keyof FactoryData) => {
    const uniqueAttributes = Array.from(new Set(data.map(item => item[attribute])));
    return uniqueAttributes.map(attr => ({ text: attr, value: attr }));
  };

  const columns: ProColumns<FactoryData>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '属性',
      dataIndex: '属性',
      key: '属性',
      filters: getUniqueAttributes('属性'),
      onFilter: (value, record) => record.属性.includes(value as string),
    },
    {
      title: '中文名字',
      dataIndex: '中文名字',
      key: '中文名字',
      filters: getUniqueAttributes('中文名字'),
      onFilter: (value, record) => record.中文名字.includes(value as string),
    },
    {
      title: '英文',
      dataIndex: '英文',
      key: '英文',
    },
    {
      title: '地址',
      dataIndex: '地址',
      key: '地址',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <span>
          <Button
            onClick={() => {
              setCurrentRecord(record);
              setEditModalVisible(true);
              editForm.setFieldsValue(record);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗?"
            onConfirm={async () => {
              try {
                await axiosInstance.delete(`${server_url}/qingguan/factory/${record.id}`);
                message.success('Deleted successfully');
                fetchFactories();
              } catch (error) {
                message.error('Failed to delete');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <Input
        placeholder="搜索中文名字或属性"
        onChange={e => handleSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <ProTable<FactoryData>
        columns={columns}
        dataSource={filteredData}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
        }}
        dateFormatter="string"
        headerTitle="工厂数据"
        toolBarRender={() => [
          <Button
            key="button"
            type="primary"
            onClick={() => {
              setCurrentRecord(null);
              setCreateModalVisible(true);
            }}
          >
            新建
          </Button>,
                    <Button
                    key="reload"
                    type="default"
                    onClick={() => {
                      fetchFactories();
                      if (actionRef.current) {
                        actionRef.current.reload();
                      }
                    }}
                  >
                    刷新
                  </Button>,
        ]}
      />
      <Modal
        title="新建工厂数据"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={addForm.submit}
      >
        <Form form={addForm} onFinish={handleAdd}>
          <Form.Item
            label="属性"
            name="属性"
            rules={[{ required: true, message: '请输入属性' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="中文名字"
            name="中文名字"
            rules={[{ required: true, message: '请输入中文名字' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="英文"
            name="英文"
            rules={[{ required: true, message: '请输入英文' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="地址"
            name="地址"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="编辑工厂数据"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={editForm.submit}
      >
        <Form form={editForm} onFinish={handleEdit} initialValues={currentRecord || { id: '', 属性: '', 中文名字: '', 英文: '', 地址: '' }}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="属性"
            name="属性"
            rules={[{ required: true, message: '请输入属性' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="中文名字"
            name="中文名字"
            rules={[{ required: true, message: '请输入中文名字' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="英文"
            name="英文"
            rules={[{ required: true, message: '请输入英文' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="地址"
            name="地址"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FactoryTable;
