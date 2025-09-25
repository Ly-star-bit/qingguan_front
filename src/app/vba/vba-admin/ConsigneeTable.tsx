import React, { useState, useEffect, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm, Select } from 'antd';
import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

interface ConsigneeData {
  id: number;
  中文: string;
  发货人: string;
  发货人详细地址: string;
  类型: string;
  关税类型: string;
  备注: string;
  hide: string
}
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const ConsigneeTable: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [data, setData] = useState<ConsigneeData[]>([]);
  const [filteredData, setFilteredData] = useState<ConsigneeData[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ConsigneeData | null>(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchConsignees = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/consignee/`);
      setData(response.data.items);
      setFilteredData(response.data.items);
    } catch (error) {
      message.error('Failed to fetch data');
    }
  };

  useEffect(() => {
    fetchConsignees();
  }, []);

  const handleAdd = async (values: Omit<ConsigneeData, 'id'>) => {
    try {
      values.hide = '0'
      await axiosInstance.post(`${server_url}/qingguan/consignee/`, values);
      message.success('Added successfully');
      setCreateModalVisible(false);
      addForm.resetFields();
      fetchConsignees();
    } catch (error) {
      message.error('Failed to add');
    }
  };

  const handleEdit = async (values: ConsigneeData) => {
    try {

      await axiosInstance.put(`${server_url}/qingguan/consignee/${values.id}`, values);
      message.success('Updated successfully');
      setEditModalVisible(false);
      setCurrentRecord(null);
      fetchConsignees();
    } catch (error) {
      message.error('Failed to update');
    }
  };

  const handleSearch = (value: string) => {
    const filtered = data.filter(item =>
      item.中文.includes(value) || item.发货人.includes(value) || item.发货人详细地址.includes(value)
    );
    setFilteredData(filtered);
  };

  const getUniqueAttributes = (attribute: keyof ConsigneeData) => {
    const uniqueAttributes = Array.from(new Set(data.map(item => item[attribute])));
    return uniqueAttributes.map(attr => ({ text: attr, value: attr }));
  };

  const columns: ProColumns<ConsigneeData>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '中文',
      dataIndex: '中文',
      key: '中文',
      filters: getUniqueAttributes('中文'),
      onFilter: (value, record) => record.中文.includes(value as string),
    },
    {
      title: '发货人',
      dataIndex: '发货人',
      key: '发货人',
      filters: getUniqueAttributes('发货人'),
      onFilter: (value, record) => record.发货人.includes(value as string),
    },
    {
      title: '发货人详细地址',
      dataIndex: '发货人详细地址',
      key: '发货人详细地址',
    },
    {
      title: '类型',
      dataIndex: '类型',
      key: '类型',
      filters: getUniqueAttributes('类型'),
      onFilter: (value, record) => record.类型.includes(value as string),
    },
    {
      title: '关税类型',
      dataIndex: '关税类型',
      key: '关税类型',
      filters: getUniqueAttributes('关税类型'),
      onFilter: (value, record) => record.关税类型.includes(value as string),
    },
    {
      title: '备注',
      dataIndex: '备注',
      key: '备注',
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
                await axiosInstance.delete(`${server_url}/qingguan/consignee/${record.id}`);
                message.success('Deleted successfully');
                fetchConsignees();
              } catch (error) {
                message.error('Failed to delete');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button danger>Delete</Button>
          </Popconfirm>
          <Popconfirm
            title={record.hide === '1' ? '确定要取消隐藏这条记录吗?' : '确定要隐藏这条记录吗?'}
            onConfirm={async () => {
              try {
                const updatedRecord = { ...record, hide: record.hide === '1' ? '0' : '1' };
                await axiosInstance.put(`${server_url}/qingguan/consignee/${record.id}`, updatedRecord);
                message.success(record.hide === '1' ? 'Record unhidden successfully' : 'Record hidden successfully');
                fetchConsignees();
              } catch (error) {
                message.error('Failed to update hide status');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button>{record.hide === '1' ? '取消隐藏' : '隐藏'}</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <Input
        placeholder="搜索中文、发货人或详细地址"
        onChange={e => handleSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <ProTable<ConsigneeData>
        columns={columns}
        dataSource={filteredData}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
        }}
        dateFormatter="string"
        headerTitle="收发货人数据"
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
              fetchConsignees();
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
        title="新建收发货人数据"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={addForm.submit}
      >
        <Form form={addForm} onFinish={handleAdd} initialValues={{ 备注: '', hide: "0", 关税类型: '包税' }}>
          <Form.Item
            label="中文"
            name="中文"
            rules={[{ required: true, message: '请输入中文' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="发货人"
            name="发货人"
            rules={[{ required: true, message: '请输入发货人' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="发货人详细地址"
            name="发货人详细地址"
            rules={[{ required: true, message: '请输入发货人详细地址' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="类型"
            name="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Select.Option value="收货人">收货人</Select.Option>
              <Select.Option value="发货人">发货人</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="关税类型"
            name="关税类型"
            rules={[{ required: true, message: '请选择关税类型' }]}
          >
            <Select>
              <Select.Option value="包税">包税</Select.Option>
              <Select.Option value="自税">自税</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="备注"
            name="备注"
            rules={[{ required: false, message: '请输入备注' }]}
          >
            <Input />

          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="编辑收发货人数据"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={editForm.submit}
      >
        <Form form={editForm} onFinish={handleEdit} initialValues={currentRecord || { id: '', 中文: '', 发货人: '', 发货人详细地址: '', 关税类型: '' }}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="中文"
            name="中文"
            rules={[{ required: true, message: '请输入中文' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="发货人"
            name="发货人"
            rules={[{ required: true, message: '请输入发货人' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="发货人详细地址"
            name="发货人详细地址"
            rules={[{ required: true, message: '请输入发货人详细地址' }]}
          >
            <Input />

          </Form.Item>
          <Form.Item
            label="类型"
            name="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Select.Option value="收货人">收货人</Select.Option>
              <Select.Option value="发货人">发货人</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="关税类型"
            name="关税类型"
            rules={[{ required: true, message: '请选择关税类型' }]}
          >
            <Select>
              <Select.Option value="包税">包税</Select.Option>
              <Select.Option value="自税">自税</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="hide"
            name="hide"
            rules={[{ required: false}]}
          >
              <Select>
              <Select.Option value="1">1</Select.Option>
              <Select.Option value="0">0</Select.Option>
            </Select>

          </Form.Item>
          <Form.Item
            label="备注"
            name="备注"
            rules={[{ required: false, message: '请输入备注' }]}
          >
            <Input />

          </Form.Item>
          
        </Form>
      </Modal>
    </>
  );
};

export default ConsigneeTable;
