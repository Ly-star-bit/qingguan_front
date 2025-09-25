import React, { useRef, useState } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm } from 'antd';
import axiosInstance from '@/utils/axiosInstance' ;

interface HaiyunZishui {
  id: number;
  zishui_name: string;
  sender: string;
  receiver: string;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const HaiyunZishuiPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [currentHaiYunZiShui, setCurrentHaiYunZiShui] = useState<HaiyunZishui | null>(null);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>();

  const handleAdd = () => {
    setCurrentHaiYunZiShui(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: HaiyunZishui) => {
    setCurrentHaiYunZiShui(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (record: HaiyunZishui) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`${server_url}/qingguan/haiyunzishui/${record.id}`);
      message.success('Deleted successfully');
      // 重新加载数据
      // 这里可以不手动调用 fetchPorts，因为 ProTable 会自动重新加载数据
    } catch (error) {
      message.error('Failed to delete port');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (currentHaiYunZiShui) {
        await axiosInstance.put(`${server_url}/qingguan/haiyunzishui/${currentHaiYunZiShui.id}`, values);
        message.success('Updated successfully');
      } else {
        await axiosInstance.post(`${server_url}/qingguan/haiyunzishui/`, values);
        message.success('Added successfully');
      }
      // 关闭模态框并重置表单
      setIsModalVisible(false);
      form.resetFields();
      // 重新加载数据
      // 这里可以不手动调用 fetchPorts，因为 ProTable 会自动重新加载数据
      actionRef.current?.reload()
    } catch (error) {
      message.error('Failed to save port');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns: ProColumns<HaiyunZishui>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '自税名称',
      dataIndex: 'zishui_name',
      key: 'zishui_name',
    },
    {
      title: 'Sender Name',
      dataIndex: 'sender',
      key: 'sender',
    },
    {
      title: 'Receiver Name',
      dataIndex: 'receiver',
      key: 'receiver',
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
                await axiosInstance.delete(`${server_url}/qingguan/haiyunzishui/${record.id}`);
                message.success('Deleted successfully');
                // 重新加载数据
                // 这里可以不手动调用 fetchPorts，因为 ProTable 会自动重新加载数据
                actionRef.current?.reload()
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
      <ProTable<HaiyunZishui>
        columns={columns}
        rowKey="id"
        loading={loading}
        search={false}
        actionRef={actionRef}

        toolBarRender={() => [
          <Button key='button' type="primary" onClick={handleAdd}>新增</Button>,
        ]}
        request={async (params, sorter, filter) => {
          setLoading(true);
          try {
            const response = await axiosInstance.get(`${server_url}/qingguan/haiyunzishui/`);
            return {
              data: response.data,
              success: true,
            };
          } catch (error) {
            message.error('Failed to load ports');
            return {
              data: [],
              success: false,
            };
          } finally {
            setLoading(false);
          }
        }}
      />
      <Modal
        title={currentHaiYunZiShui ? '编辑' : '新增'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="zishui_name"
            label="自税名称"
            rules={[{ required: true, message: 'Please enter port name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="sender"
            label="Sender Name"
            rules={[{ required: true, message: 'Please enter sender name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="receiver"
            label="Receiver Name"
            rules={[{ required: true, message: 'Please enter receiver name' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default HaiyunZishuiPage;
