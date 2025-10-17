import React, { useState, useRef } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm, Select, Tooltip } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

interface Port {
  id: number;
  port_name: string;
  sender_name: string;
  receiver_name: string;
  remarks: string;
  check_data: { name: string; value: string; operator: string; enabled: boolean }[];
  country: string;
  expansion_factor: number;
}
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const PortsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [currentPort, setCurrentPort] = useState<Port | null>(null);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>();

  const fetchPorts = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/ports/`);
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
    }
  };

  const handleAdd = () => {
    setCurrentPort(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: Port) => {
    setCurrentPort(record);
    // 确保check_data中的enabled字段正确设置
    const formattedRecord = {
      ...record,
      check_data: record.check_data?.map(item => ({
        ...item,
        enabled: item.enabled ?? false
      })) || []
    };
    form.setFieldsValue(formattedRecord);
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Port) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`${server_url}/qingguan/ports/${record.id}`);
      message.success('Deleted successfully');
      actionRef.current?.reload();
    } catch (error) {
      message.error('Failed to delete port');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    console.log(values);
    setLoading(true);
    try {
      if (currentPort) {
        await axiosInstance.put(`${server_url}/qingguan/ports/${currentPort.id}`, values);
        message.success('Updated successfully');
      } else {
        await axiosInstance.post(`${server_url}/qingguan/ports/`, values);
        message.success('Added successfully');
      }
      // 使用actionRef刷新表格
      actionRef.current?.reload();
      setIsModalVisible(false);
      form.resetFields();
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

  const columns: ProColumns<Port>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'serder国家',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: 'Port Name',
      dataIndex: 'port_name',
      key: 'port_name',
    },
    {
      title: 'Sender Name',
      dataIndex: 'sender_name',
      key: 'sender_name',
    },
    {
      title: 'Receiver Name',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
    },
    {
      title: '膨胀系数',
      dataIndex: 'expansion_factor',
      key: 'expansion_factor',
      render: (_: any, record: Port) => {
        const factor = record.expansion_factor;
        return factor != null ? Number(factor).toFixed(2) : '-';
      },
    },
    {
      title: '检测数据',
      dataIndex: 'check_data',
      key: 'check_data',
      width: 200,
      render: (_: any, record: Port) => {
        const checkData = record.check_data;
        if (!checkData || checkData.length === 0) {
          return '-';
        }
        
        const enabledData = checkData.filter(item => item.enabled === true);
        
        if (enabledData.length === 0) {
          return '-';
        }
        
        const displayItems = enabledData.map(item => {
          const operatorText = item.operator === '>' ? '大于' : item.operator === '<' ? '小于' : item.operator;
          return `${item.name}${operatorText}${item.value}`;
        });
        
        const displayText = displayItems.join('；');
        
        // Tooltip 内容，每个字段一行
        const tooltipContent = (
          <div>
            {displayItems.map((item, index) => (
              <div key={index}>{item}</div>
            ))}
          </div>
        );
        
        return (
          <Tooltip title={tooltipContent} placement="topLeft">
            <div
              style={{
                height: '40px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '40px',
                cursor: 'pointer'
              }}
            >
              {displayText}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (text:any, record:any) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm
          title="确定要删除这条记录吗?"
          onConfirm={async () => {
            try {
              await axiosInstance.delete(`${server_url}/qingguan/ports/${record.id}`);
              message.success('Deleted successfully');
              actionRef.current?.reload();
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
      <ProTable<Port>
        columns={columns}
        request={fetchPorts}
        rowKey="id"
        actionRef={actionRef}
        search={false}
        toolBarRender={() => [
          <Button key='button' type="primary" onClick={handleAdd}>New Port</Button>,
        ]}
      />
      <Modal
        title={currentPort ? 'Edit Port' : 'New Port'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" initialValues={{ country: 'China' }}>
          <Form.Item
            name="country"
            label="serder国家"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select>
              <Select.Option value="China">China</Select.Option>
              <Select.Option value="Vietnam">Vietnam</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="port_name"
            label="Port Name"
            rules={[{ required: true, message: 'Please enter port name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="sender_name"
            label="Sender Name"
            rules={[{ required: true, message: 'Please enter sender name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="receiver_name"
            label="Receiver Name"
            rules={[{ required: true, message: 'Please enter receiver name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="remarks"
            label="Remarks(无特殊情况：清关+提货)"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="expansion_factor"
            label="膨胀系数"
            rules={[
              { required: false, message: '请输入膨胀系数' },
              { 
                validator: (_, value) => {
                  if (value && parseFloat(value) <= 1) {
                    return Promise.reject(new Error('膨胀系数必须大于1'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input type="number" step="0.01" placeholder="请输入膨胀系数" />
          </Form.Item>
          <Form.List name="check_data">
                        {(fields, { add, remove }) => (
                            <>
                                <div style={{ marginBottom: 16 }}>检测数据设置</div>
                                <div style={{ maxWidth: 600 }}>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div
                                            key={key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginBottom: 16,
                                                gap: 16,
                                            }}
                                        >
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'name']}
                                                rules={[{ required: true, message: '请输入检测数据名称' }]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <Input placeholder="检测数据名称" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'operator']}
                                                rules={[{ required: true, message: '请选择比较操作符' }]}
                                                style={{ margin: 0, width: 100 }}
                                            >
                                                <Select placeholder="操作符">
                                                    <Select.Option value=">">大于</Select.Option>
                                                    <Select.Option value="<">小于</Select.Option>
                                                </Select>
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'value']}
                                                rules={[{ required: true, message: '请输入检测数据值' }]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <Input placeholder="检测数据值" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'enabled']}
                                                style={{ margin: 0 }}
                                            >
                                                <Select placeholder="是否开启" style={{ width: 100 }}>
                                                    <Select.Option value={true}>开启</Select.Option>
                                                    <Select.Option value={false}>关闭</Select.Option>
                                                </Select>
                                            </Form.Item>
                                            <MinusCircleOutlined
                                                onClick={() => remove(name)}
                                                style={{ color: '#ff4d4f', fontSize: 16 }}
                                            />
                                        </div>
                                    ))}
                                    <Form.Item>
                                        <Button
                                            type="dashed"
                                            onClick={() => {
                                                add({ name: '', value: '', operator: '>', enabled: true });
                                            }}
                                            block
                                            icon={<PlusOutlined />}
                                            style={{
                                                width: '100%',
                                                maxWidth: 200,
                                                marginTop: 8
                                            }}
                                        >
                                            添加检测项
                                        </Button>
                                    </Form.Item>
                                </div>
                            </>
                        )}
                    </Form.List>
        </Form>
 
      </Modal>
    </>
  );
};

export default PortsPage;
