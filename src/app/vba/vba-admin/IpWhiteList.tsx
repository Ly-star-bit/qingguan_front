import React, { useState, useEffect } from 'react';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
interface IpWhiteList {
  id: number;
  ip: string;
  remarks?: string
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const IpWhiteListPage: React.FC = () => {
  const [ipWhiteList, setIpWhiteList] = useState<IpWhiteList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [currentIp, setCurrentIp] = useState<IpWhiteList | null>(null);
  const [form] = Form.useForm();

  const fetchIpWhiteList = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/ip_white_list/`);
      setIpWhiteList(response.data);
    } catch (error) {
      message.error('Failed to load IP white list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIpWhiteList();
  }, []);

  const handleAdd = () => {
    setCurrentIp(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: IpWhiteList) => {
    setCurrentIp(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (record: IpWhiteList) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`${server_url}/qingguan/ip_white_list/${record.id}`);
      message.success('Deleted successfully');
      fetchIpWhiteList();
    } catch (error) {
      message.error('Failed to delete IP');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (currentIp) {
        await axiosInstance.put(`${server_url}/qingguan/ip_white_list/${currentIp.id}`, values);
        message.success('Updated successfully');
      } else {
        await axiosInstance.post(`${server_url}/qingguan/ip_white_list/`, values);
        message.success('Added successfully');
      }
      fetchIpWhiteList();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to save IP');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns: ProColumns<IpWhiteList>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
    },
    {
      title: 'Action',
      key: 'action',
      render: (text: any, record: any) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm
            title="确定要删除这条记录吗?"
            onConfirm={async () => {
              try {
                await axiosInstance.delete(`${server_url}/qingguan/ip_white_list/${record.id}`);
                message.success('Deleted successfully');
                fetchIpWhiteList();
              } catch (error) {
                message.error('Failed to delete');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button danger type="link">Delete</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <>
      <ProTable<IpWhiteList>
        columns={columns}
        dataSource={ipWhiteList}
        rowKey="id"
        loading={loading}
        search={false}
        toolBarRender={() => [
          <Button key='button' type="primary" onClick={handleAdd}>New IP</Button>,
        ]}
      />
      <Modal
        title={currentIp ? 'Edit IP' : 'New IP'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="ip"
            label="IP Address"
            rules={[{ required: true, message: 'Please enter IP address' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="remarks"
            label="备注"
            rules={[{ required: false }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default IpWhiteListPage;
