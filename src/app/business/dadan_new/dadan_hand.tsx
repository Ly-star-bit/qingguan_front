"use client";

import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, Space, Row, Col, Typography, InputNumber, Divider, Table, message, Modal } from 'antd';
import { ProForm, ProFormText, ProFormSelect, ProFormDigit, ProFormGroup } from '@ant-design/pro-components';
import { SaveOutlined, PrinterOutlined, PlusOutlined, DeleteOutlined, CalculatorOutlined, CheckOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import axiosInstance from '@/utils/axiosInstance';

const { Title } = Typography;
const { Option } = Select;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const DaDanHandComponent: React.FC = () => {
  const [orderForm] = Form.useForm();
  const [recipientForm] = Form.useForm();
  const [packages, setPackages] = useState<any[]>([
    {
      key: uuidv4(),
      length: undefined,
      width: undefined,
      height: undefined,
      weight: undefined,
      number: 1,
    }
  ]);
  const [calculationResults, setCalculationResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculationModalVisible, setCalculationModalVisible] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);


  const addPackage = () => {
    setPackages([...packages, {
      key: uuidv4(),
      length: undefined,
      width: undefined,
      height: undefined,
      weight: undefined,
      number: 1,
    }]);
  };

  const removePackage = (key: string) => {
    if (packages.length <= 1) {
      message.warning('至少需要保留一个包裹信息');
      return;
    }
    setPackages(packages.filter(pkg => pkg.key !== key));
  };

  const handlePackageChange = (key: string, field: string, value: any) => {
    setPackages(packages.map(pkg => 
      pkg.key === key ? { ...pkg, [field]: value } : pkg
    ));
  };

  const calculateShippingFee = async () => {
    try {
      const orderValues = await orderForm.validateFields();
      const recipientValues = await recipientForm.validateFields();
      
      // 验证所有包裹信息是否已填写
      const invalidPackage = packages.find(pkg => 
        !pkg.length || !pkg.width || !pkg.height || !pkg.weight || !pkg.number
      );
      
      if (invalidPackage) {
        message.error('请完整填写所有包裹的尺寸和重量信息');
        return;
      }

      setLoading(true);
      
      // 准备请求数据
      const requestData = {
        orders: {
            area: orderValues.area,

          a_number: orderValues.trackingNumber,
          shipperTo: {
            name: recipientValues.recipient,
            companyName: recipientValues.company || '',
            phone: recipientValues.phone,
            postalCode: recipientValues.zipCode,
            country: recipientValues.country,
            province: recipientValues.state,
            city: recipientValues.city,
            address1: recipientValues.address1,
            address2: recipientValues.address2 || '',
          },
          productDetailList: packages.map(pkg => ({
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            weight: pkg.weight,
            number: pkg.number,
          })),
          children: []
        },
      };

      // 发送API请求
      const response = await axiosInstance.post(`${server_url}/order/try_calculate_hand`, requestData);
      
      const result = response.data;
      
      if (result.code === 200 && result.data) {
        // 处理数据：过滤掉计算失败和订单已存在的结果，然后按运费从低到高排序
        const validResults = result.data.filter((item: any) => 
          item.totalFee !== -1 && item.totalFee !== 1
        );
        
        const sortedResults = validResults.sort((a: any, b: any) => a.totalFee - b.totalFee);
        
        // 如果有有效结果，则自动选择运费最低的渠道
        if (sortedResults.length > 0) {
          setSelectedChannel(sortedResults[0].child_id);
        } else {
          setSelectedChannel(null);
        }
        
        // 合并排序后的结果和无效结果
        const invalidResults = result.data.filter((item: any) => 
          item.totalFee === -1 || item.totalFee === 1
        );
        
        setCalculationResults([...sortedResults, ...invalidResults]);
        setCalculationModalVisible(true);
      } else {
        message.error(result.message || '运费计算失败');
      }
    } catch (error) {
      console.error('运费计算失败:', error);
      message.error('运费计算失败，请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannel(channelId);
  };

  const handleSubmitOrder = () => {
    // 如果没有选中渠道，提示用户
    if (!selectedChannel) {
      message.error('请先选择一个渠道');
      return;
    }

    // 查找选中的渠道信息
    const selectedChannelInfo = calculationResults.find(item => item.child_id === selectedChannel);
    
    // 如果找不到选中的渠道或者该渠道计算失败/订单已存在，不允许提交
    if (!selectedChannelInfo || selectedChannelInfo.totalFee === -1 || selectedChannelInfo.totalFee === 1) {
      message.error('所选渠道无效，请重新选择');
      return;
    }

    // 显示确认对话框
    Modal.confirm({
      title: '确认下单',
      content: `您确定要使用 ${selectedChannelInfo.channelName} (${selectedChannelInfo.supplier}) 渠道下单吗？运费: ${selectedChannelInfo.totalFee.toFixed(2)}元`,
      okText: '确认下单',
      cancelText: '取消',
      onOk: async () => {
        try {
          setSubmitLoading(true);
          
          // 获取表单数据
          const orderValues = await orderForm.validateFields();
          const recipientValues = await recipientForm.validateFields();
          
          // 准备下单请求数据
          const requestData = {
            orders: [{
              a_number: orderValues.trackingNumber,
              expressType: selectedChannelInfo.expressType,
              expressSupplier: selectedChannelInfo.supplier,
              channelName: selectedChannelInfo.channelName,
              channelCode: selectedChannelInfo.channelCode,
              shipperTo: {
                name: recipientValues.recipient,
                companyName: recipientValues.company || '',
                phone: recipientValues.phone,
                postalCode: recipientValues.zipCode,
                country: recipientValues.country,
                province: recipientValues.state,
                city: recipientValues.city,
                address1: recipientValues.address1,
                address2: recipientValues.address2 || '',
              },
              productDetailList: packages.map(pkg => ({
                length: String(pkg.length),
                width: String(pkg.width),
                height: String(pkg.height),
                weight: String(pkg.weight),
                number: String(pkg.number),
              })),
            }]
          };

          // 发送下单请求
          const response = await axiosInstance.post(`${server_url}/order/TuffyOrder`, requestData);
          
          if (response.data.code === 200) {
            message.success('下单成功');
            setCalculationModalVisible(false);
            
            // 下单成功后重置部分表单数据，方便用户继续下单
            orderForm.setFieldsValue({ trackingNumber: '' });
            setPackages([{
              key: uuidv4(),
              length: undefined,
              width: undefined,
              height: undefined,
              weight: undefined,
              number: 1,
            }]);
          } else {
            message.error(response.data.message || '下单失败');
          }
        } catch (error) {
          console.error('下单失败:', error);
          message.error('下单失败，请稍后重试');
        } finally {
          setSubmitLoading(false);
        }
      }
    });
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Title level={2} style={{ marginBottom: '24px', textAlign: 'center' }}>手动打单系统</Title>
      
      <Row gutter={[24, 24]}>
        {/* 订单信息表单 */}
        <Col xs={24} lg={12}>
          <Card 
            title={<Title level={4}>订单信息</Title>} 
            bordered={false} 
            style={{ height: '100%' }}
          >
            <ProForm
              form={orderForm}
              submitter={false}
              layout="vertical"
            >
              <ProFormSelect
                name="area"
                label="地区"
                placeholder="请选择地区"
                rules={[{ required: true, message: '请选择地区' }]}
                options={[
                  { label: '美中', value: '美中' },
                  { label: '美东', value: '美东' },
                  { label: '美西', value: '美西' },
                ]}
              />
              
              <ProFormText
                name="trackingNumber"
                label="单号"
                placeholder="请输入单号"
                rules={[{ required: true, message: '请输入单号' }]}
              />
              
              <Divider orientation="left">包裹信息</Divider>
              
              {packages.map((pkg, index) => (
                <div key={pkg.key} style={{ marginBottom: '16px', padding: '16px', border: '1px dashed #d9d9d9', borderRadius: '8px' }}>
                  <Row align="middle" style={{ marginBottom: '8px' }}>
                    <Col flex="auto">
                      <Title level={5} style={{ margin: 0 }}>包裹 {index + 1}</Title>
                    </Col>
                    <Col>
                      <Button 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => removePackage(pkg.key)}
                        size="small"
                      >
                        删除
                      </Button>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="长(cm)" rules={[{ required: true, message: '请输入长度' }]}>
                        <InputNumber
                          min={0}
                          placeholder="长"
                          value={pkg.length}
                          onChange={(value) => handlePackageChange(pkg.key, 'length', value)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="宽(cm)" rules={[{ required: true, message: '请输入宽度' }]}>
                        <InputNumber
                          min={0}
                          placeholder="宽"
                          value={pkg.width}
                          onChange={(value) => handlePackageChange(pkg.key, 'width', value)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="高(cm)" rules={[{ required: true, message: '请输入高度' }]}>
                        <InputNumber
                          min={0}
                          placeholder="高"
                          value={pkg.height}
                          onChange={(value) => handlePackageChange(pkg.key, 'height', value)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="重量(kg)" rules={[{ required: true, message: '请输入重量' }]}>
                        <InputNumber
                          min={0.01}
                          step={0.01}
                          precision={2}
                          placeholder="重量"
                          value={pkg.weight}
                          onChange={(value) => handlePackageChange(pkg.key, 'weight', value)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="件数" rules={[{ required: true, message: '请输入件数' }]}>
                        <InputNumber
                          min={1}
                          placeholder="件数"
                          value={pkg.number}
                          onChange={(value) => handlePackageChange(pkg.key, 'number', value)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ))}
              
              <Button 
                type="dashed" 
                onClick={addPackage} 
                style={{ width: '100%', marginBottom: '16px' }}
                icon={<PlusOutlined />}
              >
                添加包裹
              </Button>
            </ProForm>
          </Card>
        </Col>
        
        {/* 收件人信息表单 */}
        <Col xs={24} lg={12}>
          <Card 
            title={<Title level={4}>收件人信息</Title>} 
            bordered={false}
            style={{ height: '100%' }}
          >
            <ProForm
              form={recipientForm}
              submitter={false}
              layout="vertical"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <ProFormSelect
                    name="country"
                    label="国家"
                    placeholder="请选择国家"
                    rules={[{ required: true, message: '请选择国家' }]}
                    options={[
                      { label: '美国', value: 'US' },
                      { label: '加拿大', value: 'CA' },
                      { label: '英国', value: 'UK' },
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <ProFormText
                    name="city"
                    label="城市"
                    placeholder="请输入城市"
                    rules={[{ required: true, message: '请输入城市' }]}
                  />
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <ProFormText
                    name="state"
                    label="州简称"
                    placeholder="请输入州简称"
                    rules={[{ required: true, message: '请输入州简称' }]}
                  />
                </Col>
                <Col span={12}>
                  <ProFormText
                    name="zipCode"
                    label="邮编"
                    placeholder="请输入邮编"
                    rules={[{ required: true, message: '请输入邮编' }]}
                  />
                </Col>
              </Row>
              
              <ProFormText
                name="company"
                label="收件公司"
                placeholder="请输入收件公司"
              />
              
              <ProFormText
                name="recipient"
                label="收件人"
                placeholder="请输入收件人姓名"
                rules={[{ required: true, message: '请输入收件人姓名' }]}
              />
              
              <Row gutter={16}>
                <Col span={12}>
                  <ProFormText
                    name="phone"
                    label="电话"
                    placeholder="请输入电话号码"
                    rules={[{ required: true, message: '请输入电话号码' }]}
                  />
                </Col>
                <Col span={12}>
                  <ProFormText
                    name="email"
                    label="邮箱"
                    placeholder="请输入邮箱"
                    rules={[{ type: 'email', message: '邮箱格式不正确' }]}
                  />
                </Col>
              </Row>
              
              <ProFormText
                name="address1"
                label="地址1"
                placeholder="请输入地址1"
                rules={[{ required: true, message: '请输入地址1' }]}
              />
              
              <ProFormText
                name="address2"
                label="地址2"
                placeholder="请输入地址2（可选）"
              />
            </ProForm>
          </Card>
        </Col>
      </Row>
      
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Space size="large">
          <Button 
            type="primary" 
            icon={<CalculatorOutlined />} 
            size="large" 
            onClick={calculateShippingFee}
            loading={loading}
          >
            运费试算
          </Button>
 
      
        </Space>
      </div>
      
      <Modal
        title="运费计算结果"
        open={calculationModalVisible}
        onCancel={() => setCalculationModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCalculationModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmitOrder}
            loading={submitLoading}
            disabled={!selectedChannel || calculationResults.length === 0}
          >
            下单
          </Button>
        ]}
        width={800}
      >
        <Table
          dataSource={calculationResults}
          rowKey="child_id"
          pagination={false}
          rowClassName={(record) => record.child_id === selectedChannel ? 'ant-table-row-selected' : ''}
          columns={[
            {
              title: '选择',
              key: 'select',
              width: 60,
              render: (_, record) => {
                // 对于计算失败或订单已存在的渠道不显示选择按钮
                if (record.totalFee === -1 || record.totalFee === 1) {
                  return null;
                }
                return (
                  <Button 
                    type={record.child_id === selectedChannel ? "primary" : "default"}
                    shape="circle"
                    icon={record.child_id === selectedChannel ? <CheckOutlined /> : null}
                    size="small"
                    onClick={() => handleSelectChannel(record.child_id)}
                  />
                );
              }
            },
            {
              title: '订单号',
              dataIndex: 'a_number',
              key: 'a_number',
            },
            {
              title: '渠道名称',
              dataIndex: 'channelName',
              key: 'channelName',
            },
            {
              title: '供应商',
              dataIndex: 'supplier',
              key: 'supplier',
            },
            {
              title: '运费(元)',
              dataIndex: 'totalFee',
              key: 'totalFee',
              sorter: (a, b) => {
                // 处理特殊值
                if (a.totalFee === -1 || a.totalFee === 1) return 1;
                if (b.totalFee === -1 || b.totalFee === 1) return -1;
                return a.totalFee - b.totalFee;
              },
              defaultSortOrder: 'ascend',
              render: (totalFee) => {
                if (totalFee === -1) return <span style={{ color: 'red' }}>计算失败</span>;
                if (totalFee === 1) return <span style={{ color: 'orange' }}>订单已存在</span>;
                return totalFee.toFixed(2);
              }
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default DaDanHandComponent;
