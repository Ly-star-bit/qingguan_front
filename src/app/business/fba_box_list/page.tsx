'use client';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType, ProFormInstance } from '@ant-design/pro-components';
import { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import dayjs from 'dayjs';
import { Button, message, Select, Modal, Input, Space } from 'antd';
import type { InputRef } from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  FormOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import React from 'react';

// ... (interfaces remain the same) ...
interface FBABoxItem {
  id: number;
  sono: string;
  fbaShipmentBoxId: string;
  trackingId: string;
  createTime: string;
  customerName: string;
  customerId: number;
  operNo: string;
}

interface CustomerOption {
  id: number;
  code: string;
  name: string;
  value: string;
  label: string;
  customerId: number;
}


const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const FBABoxList = () => {
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [manualUpdateLoading, setManualUpdateLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [orderLines, setOrderLines] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<{
    sono?: string;
    startTime?: string;
    endTime?: string;
    customerId?: string;
  }>({
    startTime: dayjs().startOf('month').format('YYYY-MM-DD'),
    endTime: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const lineInputRefs = useRef<(InputRef | null)[]>([]);


  useEffect(() => {
    // ... (fetchCustomers logic remains the same) ...
    const fetchCustomers = async () => {
      try {
        const response = await axiosInstance.get(`${server_url}/order/getcustomerslist`);
        if (response.data.success) {
          const options = response.data.data.map((customer: any) => ({
            ...customer,
            value: customer.id,
            label: customer.name,
            customerId: customer.id,
          }));
          setCustomerOptions(options);
        }
      } catch (error) {
        console.error('获取客户列表失败:', error);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      const lastInput = lineInputRefs.current[orderLines.length - 1];
      if (lastInput) {
        lastInput.focus();
      }
    }
  }, [orderLines.length, isModalVisible]);


  // ... (handleManualUpdate and handleExport logic remains the same) ...
  const handleManualUpdate = async () => {
    try {
      setManualUpdateLoading(true);
      const response = await axiosInstance.get(`${server_url}/order/mannual_update_order`);
      if (response.data.code === 200) {
        message.success('手动更新成功');
        actionRef.current?.reload();
      } else {
        message.error(response.data.message || '手动更新失败');
      }
    } catch (error) {
      console.error('手动更新失败:', error);
      message.error('手动更新失败');
    } finally {
      setManualUpdateLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const { sono, startTime, endTime, customerId } = searchParams;
      const response = await axiosInstance.get(`${server_url}/order/export_fba_tracking`, {
        params: {
          sonno: sono,
          startTime: startTime,
          endTime: endTime,
          customerId: customerId,
        },
        responseType: 'blob',
      });
      if (response.data.code === 500) {
        message.error('导出失败');
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FBA箱号清单_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const showModal = () => {
    const currentSonoValue = formRef.current?.getFieldValue('sono') || '';
    const lines = currentSonoValue
      ? String(currentSonoValue)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
      
    // Ensure there's at least one line to start with
    setOrderLines(lines.length > 0 ? lines : ['']);
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    const commaSeparatedString = orderLines.map((line) => line.trim()).filter(Boolean).join(',');
    formRef.current?.setFieldsValue({ sono: commaSeparatedString });
    setIsModalVisible(false);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleLineChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newLines = [...orderLines];
    newLines[index] = e.target.value;
    setOrderLines(newLines);
  };

  const handleDeleteLine = (index: number) => {
    const newLines = orderLines.filter((_, i) => i !== index);
    // If the list becomes empty, add one blank line back.
    if (newLines.length === 0) {
      setOrderLines(['']);
    } else {
      setOrderLines(newLines);
    }
  };
  
  const handleClearAll = () => {
    setOrderLines(['']); // Reset to a single empty line
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const newLines = [...orderLines];
        newLines.splice(index + 1, 0, '');
        setOrderLines(newLines);
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newPastedLines = pastedText
      .replace(/[，, \s\t\r]+/g, '\n')
      .split('\n')
      .filter((line) => line.trim() !== '');

    if (newPastedLines.length > 0) {
      setOrderLines((prevLines) => {
        // If the only line is empty, replace it. Otherwise, append.
        const existingLines = prevLines.length === 1 && prevLines[0].trim() === ''
          ? []
          : prevLines;
        return [...existingLines, ...newPastedLines];
      });
    }
  };
  
  // ... (ProTable columns definition remains the same) ...
  const columns: ProColumns<FBABoxItem>[] = [
    {
      title: '创建时间',
      dataIndex: 'createTime', 
      valueType: 'dateRange',
      fieldProps: {
        defaultValue: [dayjs().startOf('month'), dayjs().endOf('month')],
      },
      search: {
        transform: (value) => {
          return {
            startTime: value[0] ? dayjs(value[0]).format('YYYY-MM-DD') : undefined,
            endTime: value[1] ? dayjs(value[1]).format('YYYY-MM-DD') : undefined
          };
        },
      },
      render: (_, record) => dayjs(record.createTime).format('YYYY-MM-DD'),
      order: 1,
    },
    {
      title: '客户名称',
      dataIndex: 'customerId',
      valueType: 'select',
      fieldProps: {
        options: customerOptions,
        showSearch: true,
        allowClear: true,
        filterOption: (input: string, option?: { label: string; value: string | number }) => 
          option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false,
      },
      render: (_, record) => {
        const customer = customerOptions.find(c => c.id === Number(record.customerId));
        return customer ? customer.name : record.customerId;
      },
      order: 3,
    },
    {
      title: '订单号',
      dataIndex: 'sono',
      order: 2,
      fieldProps: {
        placeholder: '点击右侧图标批量输入',
        addonAfter: <FormOutlined onClick={showModal} style={{ cursor: 'pointer' }} />,
      },
      search: {
        transform: (value) => {
          if (!value) return { sono: undefined };
          const normalizedValue = value.replace(/[，\s]+/g, ',').replace(/,+/g, ',').trim();
          return { sono: normalizedValue };
        }
      }
    },
    {
      title: 'FBA箱号',
      dataIndex: 'fbaShipmentBoxId',
      search: false,
    },
    {
      title: '跟踪号',
      dataIndex: 'trackingId',
      search: false,
    },
    {
      title: 'A单号',
      dataIndex: 'operNo',
      search: false,
    },
  ];

  return (
    <>
      <ProTable<FBABoxItem>
        actionRef={actionRef}
        formRef={formRef}
        columns={columns}
        // ... (request and other props remain the same) ...
        request={async (params) => {
          const { pageSize, current, sono, startTime, endTime, customerId } = params;
          setSearchParams({ 
            sono, 
            startTime: startTime ? dayjs(startTime).format('YYYY-MM-DD') : undefined,
            endTime: endTime ? dayjs(endTime).format('YYYY-MM-DD') : undefined,
            customerId
          });
          
          try {
            const response = await axiosInstance.get(`${server_url}/order/getfbatrackinglist`, {
              params: {
                sonno: sono,
                startTime: startTime ? dayjs(startTime).format('YYYY-MM-DD') : searchParams.startTime,
                endTime: endTime ? dayjs(endTime).format('YYYY-MM-DD') : searchParams.endTime,
                customerId: customerId,
                page: current,
                size: pageSize,
              }
            });

            return {
              data: response.data.data.data,
              success: response.data.success,
              total: response.data.data.dataCount,
            };
          } catch (error) {
            console.error('获取数据失败:', error);
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        rowKey="id"
        pagination={{
          showQuickJumper: true,
        }}
        search={{
          layout: 'vertical',
          defaultCollapsed: false,
        }}
        dateFormatter="string"
        toolbar={{
          title: 'FBA箱号清单',
          actions: [
            <Button
              key="manualUpdate"
              type="primary"
              onClick={handleManualUpdate}
              loading={manualUpdateLoading}
              icon={<SyncOutlined />}
            >
              手动执行获取数据
            </Button>,
            <Button 
              key="export" 
              type="primary" 
              onClick={handleExport}
              loading={exportLoading}
              icon={<DownloadOutlined />}>
              导出Excel
            </Button>
          ],
        }}
      />
      <Modal
        title="批量输入订单号"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        destroyOnClose
        width={600}
        footer={[
            <Button key="clear" onClick={handleClearAll} danger style={{ float: 'left' }}>
              Clear All
            </Button>,
            <Button key="back" onClick={handleModalCancel}>
              Cancel
            </Button>,
            <Button key="submit" type="primary" onClick={handleModalOk}>
              OK
            </Button>,
        ]}
      >
        <p>支持从Excel/Txt直接粘贴，回车可换行。</p>
        <div
          onPaste={handleContainerPaste}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            padding: '8px',
            height: '400px',
            overflowY: 'auto',
          }}
        >
          {orderLines.map((line, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ marginRight: '8px', color: '#999', userSelect: 'none', width: '30px' }}>
                {index + 1}.
              </span>
              <Input
                // CORRECTED: Use a function body to ensure a void return type
                ref={(el) => {
                  lineInputRefs.current[index] = el;
                }}
                value={line}
                onChange={(e) => handleLineChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="请输入订单号"
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => handleDeleteLine(index)}
                danger
                style={{ marginLeft: '4px' }}
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default FBABoxList;