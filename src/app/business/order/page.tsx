'use client';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, Table, message } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import moment from 'moment';
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface OrderItem {
  orderId: number;
  userOrderNumber: string;
  trackNumber: string;
  channelId: number;
  channelName: string;
  boxCount: number;
  totalWeight: number;
  actualPrice: number;
  toName: string;
  toCompanyName: string;
  toPostalCode: string;
  addressLine: string;
  addressType: string;
  labelUrl: string;
  remoteAddressType: string;
  status: number;
  createDate: string;
  expressSupplier: string;
  expressType: string | null;
}

export default function OrderPage() {
  const downloadPdfs = async (selectedRows: OrderItem[]) => {
    if (!selectedRows.length) {
      message.error('请选择要下载的订单');
      return;
    }

    try {
      const urls = selectedRows.map(row => row.labelUrl);
      const response = await axiosInstance.post(`${server_url}/order/download_order_list_pdf`, {
        urls: urls
      }, {
        responseType: 'arraybuffer' // 指定响应类型为arraybuffer
      });

      if (response.status !== 200) {
        throw new Error('下载失败');
      }

      const blob = new Blob([response.data], {
        type: selectedRows.length === 1 ? 'application/pdf' : 'application/zip'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      if (selectedRows.length === 1) {
        // 单个文件下载
        link.download = `面单_${selectedRows[0].userOrderNumber}.pdf`;
        message.success('面单下载开始');
      } else {
        // 多个文件打包下载
        link.download = `面单_${moment().format('YYYY-MM-DD_HH-mm-ss')}.zip`;
        message.success(`${selectedRows.length}个面单已打包下载`);
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      message.error('下载失败');
      console.error(error);
    }
  };

  const columns: ProColumns<OrderItem>[] = [
    {
      title: '用户单号',
      dataIndex: 'userOrderNumber',
      key: 'orderNumber',
      formItemProps: {
        labelCol: { span: 6 },
        wrapperCol: { span: 18 }
      }
    },
    {
      title: '快递单号', 
      dataIndex: 'trackNumber',
      search: false,
    },
    {
      title: '供应商',
      dataIndex: 'expressSupplier',
      search: false,
    },
    {
      title: '渠道名称',
      dataIndex: 'channelName',
      search: false,
    },
   
    {
      title: '箱数',
      dataIndex: 'boxCount',
      search: false,
    },
    {
      title: '总重量KG',
      dataIndex: 'totalWeight',
      search: false,
    },
    {
      title: '价格',
      dataIndex: 'actualPrice',
      search: false,
    },
    {
      title: '邮编',
      dataIndex: 'toPostalCode',
      search: false,
    },
    {
      title: '面单pdf',
      dataIndex: 'labelUrl',
      search: false,
      render: (_, record) => (
        <Space>
          <Button type="link" href={record.labelUrl} target="_blank">
            查看
          </Button>
          <Button type="link" onClick={() => downloadPdfs([record])}>
            下载
          </Button>
        </Space>
      ),
    },
    {
      title: '地址类型',
      dataIndex: 'addressType',
      search: false,
    },
    {
      title: '偏远类型',
      dataIndex: 'remoteAddressType',
      search: false,
    },
    
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      valueEnum: {
        1: { text: '已创建', status: 'Success' },
        2: { text: '已取消', status: 'Error' },
      },
    },

    {
      title: '收件人',
      dataIndex: 'toName',
      search: false,
    },
    {
      title: '收件人公司',
      dataIndex: 'toCompanyName',
      search: false,
    },
    {
      title: '详细地址',
      dataIndex: 'addressLine',
      search: false,
    },

    {
      title: '创建时间',
      dataIndex: 'createDate',
      valueType: 'dateRange',
      key: 'dateRange',
      formItemProps: {
        labelCol: { span: 6 },
        wrapperCol: { span: 18 }
      },
      render: (_, record) => {
        if (typeof record.createDate === 'string') {
          return moment(record.createDate).format('YYYY-MM-DD HH:mm:ss');
        }
        return '-';
      },
    },
  ];

  return (
    <ProTable<OrderItem>
      columns={columns}
      scroll={{ x: 'max-content' }}
      request={async (params) => {
        const { 
          current = 1, 
          pageSize = 10, 
          orderNumber,
          dateRange 
        } = params;

        let queryUrl = `${server_url}/order/get_order_list?page=${current}&size=${pageSize}`;

        if (orderNumber) {
          queryUrl += `&orderNumber=${orderNumber}`;
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
          queryUrl += `&startTime=${dateRange[0]}&endTime=${dateRange[1]}`;
        }

        try {
          const res = await axiosInstance.get(queryUrl);
          const result = res.data;

          if (!result.data || !result.data.data) {
            return {
              data: [],
              success: false,
              total: 0
            };
          }

          return {
            data: result.data.data,
            success: result.code === 200,
            total: result.data.dataCount,
          };
        } catch (error) {
          console.error('Error fetching data:', error);
          return {
            data: [],
            success: false,
            total: 0
          };
        }
      }}
      rowKey="orderId"
      rowSelection={{
        selections: [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
        ],
      }}
      tableAlertRender={({ selectedRowKeys, selectedRows, onCleanSelected }) => (
        <Space size={24}>
          <span>
            已选 {selectedRowKeys.length} 项
            <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
              取消选择
            </a>
          </span>
          <Button type="primary" onClick={() => downloadPdfs(selectedRows)}>
            批量下载面单
          </Button>
        </Space>
      )}
      pagination={{
        showQuickJumper: true,
      }}
      search={{
        labelWidth: 120,
        defaultCollapsed: false,
        span: 8,
        layout: "horizontal",
        optionRender: (searchConfig, formProps, dom) => [
          ...dom.reverse(),
        ],
      }}
      dateFormatter="string"
      toolbar={{
        title: '订单列表',
      }}
    />
  );
}
