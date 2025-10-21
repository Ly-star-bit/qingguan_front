import React, { useState, useRef } from 'react';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Form, Input, Popconfirm, Select, Tooltip } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

interface PackingType {
  id: string;
  packing_type: string;
  sender_name: string;
  receiver_name: string;
  remarks: string;
  check_data?: { name: string; value: string; operator: string; enabled: boolean }[];
  country: string;
}

interface ConsigneeData {
  id: number;
  中文: string;
  发货人: string;
  发货人详细地址: string;
  类型: string;
  关税类型: string;
  备注: string;
  hide: string;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const PackingTypeTable: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [currentPackingType, setCurrentPackingType] = useState<PackingType | null>(null);
  const [consignees, setConsignees] = useState<ConsigneeData[]>([]);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>();

  const fetchPackingTypes = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/packing_types/`);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      message.error('获取装箱类型失败');
      return {
        data: [],
        success: false,
      };
    } finally {
      setLoading(false);
    }
  };

  const fetchConsignees = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/consignee/`);
      setConsignees(response.data.items);
    } catch (error) {
      message.error('获取收发货人失败');
    }
  };

  React.useEffect(() => {
    fetchConsignees();
  }, []);



  const handleAdd = () => {
    setCurrentPackingType(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: PackingType) => {
    setCurrentPackingType(record);
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

  const handleDelete = async (record: PackingType) => {
    setLoading(true);
    try {
      await axiosInstance.delete(`${server_url}/qingguan/packing_types/${record.id}`);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除装箱类型失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (currentPackingType) {
        await axiosInstance.put(`${server_url}/qingguan/packing_types/${currentPackingType.id}`, values);
        message.success('更新成功');
      } else {
        await axiosInstance.post(`${server_url}/qingguan/packing_types/`, values);
        message.success('添加成功');
      }
      actionRef.current?.reload();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
        message.error('保存装箱类型失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns: ProColumns<PackingType>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '装箱类型',
      dataIndex: 'packing_type',
      key: 'packing_type',
    },
    {
      title: 'sender国家',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: '发件人',
      dataIndex: 'sender_name',
      key: 'sender_name',
    },
    {
      title: '收件人',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
    },
    {
      title: '检测数据',
      dataIndex: 'check_data',
      key: 'check_data',
      width: 200,
      render: (_: any, record: PackingType) => {
        const checkData = record.check_data;
        if (!checkData || checkData.length === 0) {
          return '-';
        }
        
        const enabledData = checkData.filter(item => item.enabled === true);
        
        if (enabledData.length === 0) {
          return '-';
        }
        
        const displayText = enabledData.map(item => {
          const operatorText = item.operator === '>' ? '大于' : item.operator === '<' ? '小于' : item.operator;
          return `${item.name}${operatorText}${item.value}`;
        }).join('；');
        
        const tooltipContent = (
          <div>
            {enabledData.map((item, index) => {
              const operatorText = item.operator === '>' ? '大于' : item.operator === '<' ? '小于' : item.operator;
              return (
                <div key={index}>
                  {item.name}{operatorText}{item.value}
                </div>
              );
            })}
          </div>
        );
        
        return (
          <Tooltip title={tooltipContent} placement="topLeft">
            <div style={{ 
              height: '24px',
              lineHeight: '24px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%'
            }}>
              {displayText}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (text:any, record:any) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定要删除这条记录吗?"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger type="link">删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <>
      <ProTable<PackingType>
        columns={columns}
        actionRef={actionRef}
        request={fetchPackingTypes}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button key='button' type="primary" onClick={handleAdd}>新增装箱类型</Button>,
        ]}
      />
      <Modal
        title={currentPackingType ? '编辑装箱类型' : '新增装箱类型'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="packing_type"
            label="装箱类型"
            rules={[{ required: true, message: '请输入装箱类型' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="country"
            label="sender国家"
            initialValue="China"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select>
              <Select.Option value="China">China</Select.Option>
              <Select.Option value="Vietnam">Vietnam</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="sender_name"
            label="发件人"
            rules={[{ required: true, message: '请选择发件人' }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="请选择或搜索发货人"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={consignees
                .filter(c => c.类型 === '发货人')
                .map(consignee => ({
                  label: `${consignee.中文} - ${consignee.发货人}`,
                  value: consignee.发货人
                }))}
            />
          </Form.Item>
          <Form.Item
            name="receiver_name"
            label="收件人"
            rules={[{ required: true, message: '请选择收件人' }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="请选择或搜索收货人"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={consignees
                .filter(c => c.类型 === '收货人')
                .map(consignee => ({
                  label: `${consignee.中文} - ${consignee.发货人}`,
                  value: consignee.发货人
                }))}
            />
          </Form.Item>
          <Form.Item
            name="remarks"
            label="Remarks(无特殊情况：清关+提货)"
          >
            <Input />
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

export default PackingTypeTable;
