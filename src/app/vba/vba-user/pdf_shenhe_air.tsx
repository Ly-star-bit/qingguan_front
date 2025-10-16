import React, { useState, useEffect, useRef } from 'react';
import { ActionType, EditableProTable, ProColumns } from '@ant-design/pro-components';
import { Button, Input, Modal, DatePicker, message, Space, Tooltip, Select, Dropdown, Card, Row, Col, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'; // 设置中文语言
import { DownOutlined, EyeOutlined, SearchOutlined, FilterOutlined, ExportOutlined, ReloadOutlined, LockOutlined, UnlockOutlined, FileTextOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import { jwtDecode } from "jwt-decode";
import { PDFElement } from '@/components/PDF';
import { type IPdfElement } from '@chainlit/react-client';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Title } = Typography;

interface CustomsClearSummaryLog {
  id: string;
  filename: string;
  port:string;
  packing_type:string;
  gross_weight_kg:number;
  total_price_sum:number;
  generation_time: Date;
  estimated_tax_amount: number;
  estimated_tax_rate_cny_per_kg: number;
  remarks: string;
  abnormal: string;
  latest_update_time: Date;
  shenhe_excel_path: string;
  user_id: string;
  lock?: boolean;
  reviewer?: string;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const PdfViewDownloadUserAir = () => {
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const actionRef = useRef<ActionType>();
  const [isAdmin, setIsAdmin] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchRemarks, setsearchRemarks] = useState<string>('');
  const [searchAbnormal, setsearchAbnormal] = useState<string>('');
  const [searchConveyType, setsearchConveyType] = useState<string>('空运');
  const [searchPort, setSearchPort] = useState<string>('');
  const [searchCreator, setSearchCreator] = useState<string>('');
  const [searchReviewer, setSearchReviewer] = useState<string>('');

  const [exportLoading, setExportLoading] = useState(false);
  const [datesfilter, setDatesfilter] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewElement, setPreviewElement] = useState<IPdfElement | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<ArrayBuffer | null>(null);
  const [excelPreviewVisible, setExcelPreviewVisible] = useState(false);

  useEffect(() => {
    // 检查用户是否为admin
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAdmin(parsedUser.username === 'admin');
    }
  }, []);

  // 根据后端API参数调整，summary_id为id列表，lock为布尔值
  const handleLockToggle = async (ids: React.Key[], lockStatus: boolean) => {
    try {
      const response = await axiosInstance.post(`${server_url}/qingguan/lock_cumstom_clear_history_summary_remarks/`, {
        summary_id: ids,
        lock: lockStatus,
      });

      // 可根据后端返回的详细结果进行提示
      if (response.data && response.data.modified_count > 0) {
        message.success(lockStatus ? '锁定成功' : '解锁成功');
      } else {
        message.warning('未有记录被修改');
      }
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Failed to update lock status:', error);
      message.error('操作失败，请重试');
    }
  };

  const columns: ProColumns<CustomsClearSummaryLog>[] = [
    {
      title: '🔒',
      dataIndex: 'lock',
      width: 60,
      align: 'center',
      readonly:true,
      render: (_, record) => (
        <span>
          {record.lock ? '🔒' : ''}
        </span>
      ),
    },
    {
      title: 'id',
      dataIndex: 'id', 
      key: 'id',
      readonly:true
    },
    {
      title: 'generation_time',
      dataIndex: 'generation_time',
      key: 'generation_time',
      sorter: true,
      render: (dom, entity) => {
        const text = entity.generation_time;
        return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
      },
      defaultSortOrder: 'descend',
      readonly:true,
    },
    {
      title: '最新更新时间',
      dataIndex: 'latest_update_time',
      key: 'latest_update_time',
      sorter: true,
      render: (dom, entity) => {
        const text = entity.generation_time;
        const text2 = entity.latest_update_time;
        if(text2){
          return dayjs(text2).format('YYYY-MM-DD HH:mm:ss');
        }else{
          return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
      },
      defaultSortOrder: 'descend',
      readonly:true,
    },
    {
      title: 'File Name',
      dataIndex: 'filename',
      key: 'filename',
      readonly: true,
      render: (dom, entity) => {
        const text = entity.filename;
        return text.split("-").slice(1).join("-");
      }
    },

    {
      title: '整票货值',
      dataIndex: 'total_price_sum',
      key: 'total_price_sum',
      readonly:true,
    },
    {
      title: '整票重量',
      dataIndex: 'gross_weight_kg',
      key: 'gross_weight_kg',
      readonly:true,
      render: (dom, entity) => {
        const text = entity.gross_weight_kg;
        return text.toFixed(2);
      }
    },

    {
      title: '整票预估税金',
      dataIndex: 'estimated_tax_amount',
      key: 'estimated_tax_amount',
      readonly:true
    },

    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
    },
    {
      title: '异常',
      dataIndex: 'abnormal',
      key: 'abnormal',
    },
    {
      title: 'Creator',
      dataIndex: 'user_id',
      key: 'user_id',
      readonly:true,
      render: (dom, entity) => {
        return entity.user_id || 'admin';
      }
    },
    {
      title: '审核人',
      dataIndex: 'reviewer',
      key: 'reviewer',
      readonly:true,
    },
    {
      title: 'Action',
      key: 'action',
      valueType: 'option',
      render: (text, record: CustomsClearSummaryLog, _, action) => {
        const downloadOptions = record.shenhe_excel_path ? (
          <Dropdown
            menu={{
              items: [
                // {
                //   key: 'preview',
                //   label: <a onClick={() => handlePreview(record.filename)}>预览PDF</a>
                // },
                {
                  key: 'excel_preview',
                  label: <a onClick={() => handleExcelPreview(record.shenhe_excel_path)}>预览Excel</a>
                },
                {
                  key: 'excel', 
                  label: <a onClick={() => handleDownload(record.shenhe_excel_path)}>下载Excel(user)</a>
                }
              ]
            }}
          >
            <a style={{ marginRight: 8 }}>
              操作 <DownOutlined />
            </a>
          </Dropdown>
        ) : (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'preview',
                  label: <a onClick={() => handlePreview(record.filename)}>预览PDF</a>
                },
                {
                  key: 'download',
                  label: <a onClick={() => handleDownload(record.filename)}>下载文件</a>
                },
              ]
            }}
          >
            <a style={{ marginRight: 8 }}>
              操作 <DownOutlined />
            </a>
          </Dropdown>
        );

        return [
          downloadOptions,
          !record.lock && (
            <a
              key="editable"
              onClick={() => {
                action?.startEditable?.(record.id);
              }}
            >
              编辑
            </a>
          )
        ];
      },
    },
  ];

  const handleDownload = async (fileName: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/user_download/${fileName}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.split("-").slice(1).join("-"));
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleExport = () => {
    if (!datesfilter[0] || !datesfilter[1]) {
      message.warning('请先选择日期范围');
      return;
    }

    const startDate = datesfilter[0].format('YYYY-MM-DD');
    const endDate = datesfilter[1].format('YYYY-MM-DD');
    
    setExportLoading(true);
    axiosInstance.get(`${server_url}/qingguan/output_cumtoms_clear_log/`, {
      params: {
        start_time: startDate,
        end_time: endDate,
        file_name: searchTerm || undefined,
        convey_type: searchConveyType || undefined,
        remarks: searchRemarks || undefined,
        abnormal: searchAbnormal || undefined,
        port: searchPort || undefined,
        user_id: searchCreator || undefined,
        reviewer: searchReviewer || undefined
      },
      responseType: 'blob'
    })
      .then((response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'custom_clear_history_log.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('导出成功');
      })
      .catch((error: any) => {
        console.error('Error exporting data:', error);
        message.error('导出失败，请重试');
      })
      .finally(() => {
        setExportLoading(false);
      });
  };

  const handleDateChangefilter = (values: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (values) {
      setDatesfilter(values);
    } else {
      setDatesfilter([null, null]);
    }
  };

  const requestData = async (params: any, sort: any) => {
    let generation_time_sort, latest_update_time_sort;
    if (sort) {
      if (sort.generation_time) {
        generation_time_sort = sort.generation_time === 'ascend' ? 'asc' : 'desc';
      }
      if (sort.latest_update_time) {
        latest_update_time_sort = sort.latest_update_time === 'ascend' ? 'asc' : 'desc';
      }
    }
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_summary/`, {
        params: {
          enable_pagination: true,
          file_name: searchTerm,
          remarks: searchRemarks,
          abnormal: searchAbnormal,
          page: params.current,
          pageSize: params.pageSize,
          convey_type: '空运',
          port: searchPort,
          start_time: datesfilter[0]?.format('YYYY-MM-DD'),
          end_time: datesfilter[1]?.format('YYYY-MM-DD'),
          generation_time_sort,
          latest_update_time_sort,
          user_id: searchCreator || undefined,
          reviewer: searchReviewer || undefined
        },
      });
  
      return {
        data: response.data.summaries,
        success: true,
        total: response.data.total,
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };
  
  const handlePreview = async (fileName: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/user_download/${fileName}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewElement({
        id: fileName,
        name: fileName,
        type: 'pdf',
        url: url,
        display: 'inline',
        page: 1,
        forId: ''
      });
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('预览失败，请重试');
    }
  };

  const handlePreviewClose = () => {
    setPreviewVisible(false);
    if (previewElement?.url) {
      window.URL.revokeObjectURL(previewElement.url);
    }
    setPreviewElement(null);
  };

  const handleExcelPreview = async (fileName: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/qingguan/user_download/${fileName}`, {
        responseType: 'arraybuffer',
      });
      setExcelPreviewData(response.data);
      setExcelPreviewVisible(true);
    } catch (error) {
      console.error('Error previewing Excel file:', error);
      message.error('预览失败，请重试');
    }
  };

  const handleExcelPreviewClose = () => {
    setExcelPreviewVisible(false);
    setExcelPreviewData(null);
  };

  return (
    <div>
      <Card
        title={<Title level={4}><FilterOutlined /> 查询条件</Title>}
        bordered={false}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Search
              placeholder="通过文件名查询"
              onChange={e => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={() => actionRef.current?.reload()}
              style={{ marginRight: 8 }}
            >
              刷新
            </Button>
            
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Typography.Text strong>港口：</Typography.Text>
            <Select
              placeholder="选择港口"
              onChange={value => setSearchPort(value)}
              style={{ width: '100%', marginTop: 4 }}
              showSearch
              allowClear
              options={[
                { value: 'LAX', label: 'LAX' },
                { value: 'DFW', label: 'DFW' },
                { value: 'SFO', label: 'SFO' },
                { value: 'ORD', label: 'ORD' },
                { value: 'JFK', label: 'JFK' },
                { value: 'LAX直飞', label: 'LAX直飞' },
                { value: 'LAX转飞', label: 'LAX转飞' }
              ]}
            />
          </Col>
          <Col span={8}>
            <Typography.Text strong>运输方式：</Typography.Text>
            <Select
              placeholder="选择或输入运输方式"
              onChange={value => setsearchConveyType(value)}
              style={{ width: '100%', marginTop: 4 }}
              defaultValue='空运'
              showSearch
              allowClear
              options={[
                { value: '空运', label: '空运' },
                // { value: '海运', label: '海运' }, 
                // { value: '整柜', label: '整柜' },
                // { value: '拼箱', label: '拼箱' }
              ]}
            />
          </Col>
          <Col span={8}>
            <Typography.Text strong>日期范围：</Typography.Text>
            <RangePicker
              format="YYYY-MM-DD"
              onChange={handleDateChangefilter}
              value={datesfilter}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Typography.Text strong>备注：</Typography.Text>
            <Search
              placeholder="通过备注查询"
              onChange={e => setsearchRemarks(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Typography.Text strong>异常：</Typography.Text>
            <Search
              placeholder="通过异常查询"
              onChange={e => setsearchAbnormal(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Typography.Text strong>Creator：</Typography.Text>
            <Search
              placeholder="通过 Creator 查询"
              onChange={e => setSearchCreator(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Typography.Text strong>审核人：</Typography.Text>
            <Search
              placeholder="通过审核人查询"
              onChange={e => setSearchReviewer(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <EditableProTable<CustomsClearSummaryLog>
        rowKey="id"
        columns={columns}
        request={requestData}
        actionRef={actionRef}
        pagination={{
          pageSize: 10,
          showQuickJumper: true,
        }}
        recordCreatorProps={false}
        scroll={{
          x: 960,
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        headerTitle={
          <Space>
            <Title level={4}>清关历史记录</Title>
            {isAdmin && (
              <>
                <Button 
                  type="primary" 
                  icon={<LockOutlined />}
                  onClick={() => handleLockToggle(selectedRowKeys, true)}
                  disabled={selectedRowKeys.length === 0}
                >
                  锁定
                </Button>
                <Button
                  icon={<UnlockOutlined />}
                  onClick={() => handleLockToggle(selectedRowKeys, false)}
                  disabled={selectedRowKeys.length === 0}
                >
                  解锁
                </Button>
              </>
            )}
          </Space>
        }
        editable={{
          type: 'multiple',
          editableKeys,
          onSave: async (rowKey, data, row) => {
            try {
              const response = await axiosInstance.post(`${server_url}/qingguan/update_cumstom_clear_history_summary_remarks/`, {
                id: rowKey,
                remarks: data.remarks,
                abnormal: data.abnormal,
              });
              
              if (response.data.code === 200) {
                message.success('更新成功');
                actionRef.current?.reload();
              } else {
                message.error(response.data.msg || '更新失败');
              }
            } catch (error) {
              console.error('Failed to update remarks:', error);
              message.error('更新失败，请重试');
            }
          },
          onChange: setEditableRowKeys,
        }}
      />

      <Modal
        title="PDF预览"
        open={previewVisible}
        onCancel={handlePreviewClose}
        width="90%"
        footer={null}
        style={{ top: 10 }}
        bodyStyle={{ 
          height: 'calc(100vh - 100px)',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {previewElement && (
          <div style={{ height: '100%', width: '100%' }}>
            <PDFElement
              element={previewElement}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="Excel预览"
        open={excelPreviewVisible}
        onCancel={handleExcelPreviewClose}
        width="90%"
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(90vh - 108px)', padding: 0, overflow: 'hidden' }}
      >
        {excelPreviewData && (
          <div style={{ width: '100%', height: '100%' }}>
            <iframe
              src={`${server_url}/luckysheet-preview?data=${Buffer.from(excelPreviewData).toString('base64')}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: 'loadExcel',
                    fileData: excelPreviewData,
                    fileName: 'shenhe.xlsx'
                  }, '*');
                }
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PdfViewDownloadUserAir;

