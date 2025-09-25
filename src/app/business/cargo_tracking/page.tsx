'use client';
import { useState, useEffect, useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType, ProFieldValueType } from '@ant-design/pro-components';
import { message, Button, Select, Space, Form, Row, Col, Card, DatePicker } from 'antd';
import axiosInstance from '@/utils/axiosInstance';

const CargoTrackingPage = () => {
  // 动态列定义状态
  const [columns, setColumns] = useState<ProColumns[]>([]);
  const actionRef = useRef<ActionType>();
  const [formValues, setFormValues] = useState<any>({ 客户名称: 'FSQP-佛山七派-SZ' });
  const [loading, setLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [customerOptions, setCustomerOptions] = useState<{label: string, value: string}[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<string>('FSQP-佛山七派-SZ');
  const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { RangePicker } = DatePicker;

  // 预设状态选项
  const statusOptions = [
    { label: '全部', value: '' },
    { label: '已签收', value: '已签收' },
    { label: '未签收', value: '未签收' },
    { label: '转运中', value: '转运中' },
    { label: '已收货', value: '已收货' },
    { label: '已下单', value: '已下单' }
  ];

  // 获取所有客户名称
  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/cargo_tracking/customers');
      if (response.data.code === 200) {
        const options = response.data.data.map((customer: string) => ({
          label: customer,
          value: customer
        }));
        setCustomerOptions(options);
      } else {
        message.error('获取客户列表失败');
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
      message.error('获取客户列表失败');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 导出Excel
  const handleExport = async () => {
    // 获取当前表单值
    const values = formValues;
    console.log('导出参数:', values);
    
    if (!values.客户名称) {
      message.warning('请先输入客户名称');
      return;
    }

    try {
      setExportLoading(true);
      const response = await axiosInstance.get('/cargo_tracking/export_excel', {
        params: {
          customer_name: values.客户名称,
          start_date: startDate,
          end_date: endDate
        },
        responseType: 'blob'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${values.客户名称}_${startDate || ''}_${endDate || ''}_cargo_tracking.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 处理客户选择变更
  const handleCustomerChange = (value: string) => {
    setCurrentCustomer(value);
    setFormValues({...formValues, 客户名称: value});
    
    // 刷新表格数据
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };

  // 处理状态选择变更
  const handleStatusChange = (value: string | undefined) => {
    setCurrentStatus(value);
    
    // 刷新表格数据
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };

  // 处理日期范围变更
  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
    setStartDate(dateStrings[0] || undefined);
    setEndDate(dateStrings[1] || undefined);
    
    // 刷新表格数据
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };

  // 获取并设置动态列
  const getColumns = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    // 定义FSQP-佛山七派-SZ的字段顺序
    const fsqpFields = [
      '客户名称',
      '提货时间', 
      '开船/起飞',
      '主单号',
      'A/S单号',
      '当前状态',

      '收货地',
      '件数',
      'FBA号',
      '客户内部号',
      '预计到港时间',
      '派送方式',
      '机场提货/港口提柜',
      '计划派送时间',
      '实际送达',
      '卡车追踪码/快递单号',
      '时效（按15天/22天计算）',
      'POD',
      '上架情况',
      'sono'
    ];

    // 定义HKLMT-香港兰玛特-SZ的字段顺序
    const hklmtFields = [
      '客户名称',
      '月份', 
      '收货时间',
      '备货单号',
      '起运地',
      '目的港',
      '提单号',
      'A/S单号',
      '当前状态',

      '派送方式',
      '箱数',
      '快递单号',
      '子单号',
      'FBA号',
      '收货地',
      '是否国内查验',
      '报关放行时间',
      '上航班时间',
      '航班抵达时间',
      '清关放行时间',
      '当地提取时间',
      '签收时间',
      '时效',
      '是否进口查验',
      '异常备注',
      '航班号',
      'sono'
    ];

    // 检查客户类型
    const customerType = data[0]['客户名称'];
    
    // 获取所有字段
    const allFields = Object.keys(data[0]);
    
    // 根据客户类型决定字段顺序
    let orderedFields;
    // if (customerType === 'FSQP-佛山七派-SZ') {
    //   orderedFields = fsqpFields;
    // } else if (customerType === 'HKLMT-香港兰玛特-SZ') {
    //   orderedFields = hklmtFields;
    // } else {
    //   orderedFields = allFields;
    // }
    orderedFields = allFields;
    return orderedFields.map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      // _id字段默认隐藏
      hideInTable: key === '_id',
      // 客户名称不需要搜索，我们使用自定义组件
      search: false,
      // 添加文本溢出处理
      ellipsis: true,
      width: 150,
    }));
  };

  // 初始化默认列，确保页面首次加载时有默认的列
  useEffect(() => {
    const defaultColumns: ProColumns[] = [
      {
        title: '客户名称',
        dataIndex: '客户名称',
        key: '客户名称',
        search: false,
        ellipsis: true,
        width: 150,
      }
    ];
    setColumns(defaultColumns);
  }, []);

  useEffect(() => {
    // 组件挂载时自动触发一次查询
    if (actionRef.current) {
      actionRef.current.reload();
    }
  }, []);

  // 自定义工具栏
  const customToolBarRender = () => [
    <Button
      key="export"
      type="primary"
      onClick={handleExport}
      loading={exportLoading}
    >
      导出Excel
    </Button>
  ];

  return (
    <>
      {/* 查询条件卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Form 
          form={form} 
          layout="horizontal" 
          initialValues={{ customerName: 'FSQP-佛山七派-SZ', currentStatus: '' }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="客户名称" name="customerName">
                <Select
                  style={{ width: '100%' }}
                  options={customerOptions}
                  value={currentCustomer}
                  onChange={handleCustomerChange}
                  placeholder="请选择客户"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="当前状态" name="currentStatus">
                <Select
                  style={{ width: '100%' }}
                  options={statusOptions}
                  value={currentStatus}
                  onChange={handleStatusChange}
                  placeholder="请选择状态"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="提货时间" name="pickupDateRange">
                <RangePicker 
                  style={{ width: '100%' }}
                  onChange={handleDateRangeChange}
                  placeholder={['开始日期', '结束日期']}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <ProTable
        columns={columns}
        actionRef={actionRef}
        scroll={{ x: 'max-content', y: 500 }}
        sticky
        loading={loading}
        request={async (params = {}, sort, filter) => {
          setLoading(true);
          try {
            const { current, pageSize } = params;
            const customerName = currentCustomer;
            const statusValue = currentStatus === '' ? undefined : currentStatus;
            console.log('请求参数:', params, '客户名称:', customerName, '当前状态:', statusValue, '开始日期:', startDate, '结束日期:', endDate);
            
            const response = await axiosInstance.get(`/cargo_tracking/list`, {
              params: {
                page: current,
                page_size: pageSize,
                customer_name: customerName,
                current_status: statusValue,
                start_date: startDate,
                end_date: endDate
              }
            });

            if (response.data.code === 200) {
              // 设置动态列
              if (response.data.data.list.length > 0) {
                setColumns(getColumns(response.data.data.list));
              }

              setLoading(false);
              return {
                data: response.data.data.list,
                success: true,
                total: response.data.data.pagination.total,
              };
            } else {
              message.error(response.data.message);
              setLoading(false);
              return {
                data: [],
                success: false,
                total: 0
              };
            }
          } catch (error) {
            console.error('获取货物跟踪数据失败:', error);
            message.error('获取数据失败');
            setLoading(false);
            return {
              data: [],
              success: false,
              total: 0
            };
          }
        }}
        onChange={(pagination) => {
          console.log('分页变化:', pagination);
          setLoading(true);
        }}
        rowKey="_id"
        pagination={{
          showQuickJumper: true,
          showSizeChanger: true,
          defaultPageSize: 10,
          defaultCurrent: 1,
        }}
        search={false}
        dateFormatter="string"
        headerTitle="货物跟踪列表"
        toolBarRender={customToolBarRender}
      />
    </>
  );
};

export default CargoTrackingPage;
