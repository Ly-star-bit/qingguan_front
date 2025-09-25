import React, { useState, useEffect, useRef } from 'react';
import { ActionType, EditableProTable, ProColumns } from '@ant-design/pro-components';
import { Button, Input, Modal, DatePicker, message, Spin, Popconfirm } from 'antd';
import axiosInstance from '@/utils/axiosInstance';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'; // 设置中文语言

const { RangePicker } = DatePicker;
const { Search } = Input;
interface ShipmentLog {
    id: number;
    shipper_name: string;
    receiver_name: string;
    master_bill_no: string;
    gross_weight: number;
    volume: number;
    total_boxes: number;
    all_english_name: string;
    status: number; // 0: 未完成, 1: 已完成, -1: 失败
}
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const TiDanLog = () => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const actionRef = useRef<ActionType>();

    const [searchTerm, setSearchTerm] = useState<string>('');
    const [visible, setVisible] = useState(false);
    const [dates, setDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

    const [downloading, setDownloading] = useState<Record<number, boolean>>({});
    useEffect(() => {
        actionRef.current?.reload()
    })
    const columns: ProColumns<ShipmentLog>[] = [
        {
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            readonly: true,
        },
        {
            title: 'Shipper Name',
            dataIndex: 'shipper_name',
            key: 'shipper_name',
            readonly: true,
        },
        {
            title: 'Receiver Name',
            dataIndex: 'receiver_name',
            key: 'receiver_name',
            readonly: true,
        },
        {
            title: 'Master Bill No',
            dataIndex: 'master_bill_no',
            key: 'master_bill_no',
            readonly: true,
        },
        {
            title: 'Gross Weight',
            dataIndex: 'gross_weight',
            key: 'gross_weight',
        },
        {
            title: 'Volume',
            dataIndex: 'volume',
            key: 'volume',
        },
        {
            title: 'Total Boxes',
            dataIndex: 'total_boxes',
            key: 'total_boxes',
        },
        {
            title: 'All English Name',
            dataIndex: 'all_english_name',
            key: 'all_english_name',
            readonly: true,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text) => {
                if (text === 1) {
                    return '成功';
                } else if (text === 0) {
                    return '未完成';
                } else if (text === -1) {
                    return '失败';
                } else {
                    return '未知';
                }
            },
            filters: [
                { text: '成功', value: 1 },
                { text: '未完成', value: 0 },
                { text: '失败', value: -1 },
            ],
            onFilter: (value, record) => {
                if (value === null) {
                    return record.status !== 1 && record.status !== 0 && record.status !== -1;
                }
                return record.status === value;
            },
            readonly: true,
        },
        
        {
            title: 'Action',
            key: 'action',
            valueType: 'option',
            render: (text: any, record: ShipmentLog, _, action: any) => [
                downloading[record.id] ? (
                    <span key="download" style={{ marginRight: 8 }}>
                        <Spin size="small" /> 处理中...
                    </span>
                ) : (
                    <Popconfirm
                        key="download"
                        title="确定需要重新获取吗？"
                        onConfirm={() => handleDownload(record.id, record.master_bill_no)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <a style={{ marginRight: 8 }}>重新获取</a>
                    </Popconfirm>
                ),
                <a
                    key="editable"
                    onClick={() => {
                        action?.startEditable?.(record.id);
                    }}
                >
                    编辑
                </a>,
            ],
        },
    ];

    const handleDownload = async (id: number, master_bill_no: string) => {
        try {
            setDownloading((prev) => ({ ...prev, [id]: true }));

            const response = await axiosInstance.get(`${server_url}/qingguan/get_tidan_pdf_again/${id}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${master_bill_no}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file:', error);
        }
        finally {
            setDownloading((prev) => ({ ...prev, [id]: false }));

        }
    };

    const handleOk = () => {
        if (dates[0] && dates[1]) {
            const startDate = dates[0].format('YYYY-MM-DD');
            const endDate = dates[1].format('YYYY-MM-DD');
            console.log(`Exporting data from ${startDate} to ${endDate}`);

            axiosInstance.get(`${server_url}/qingguan/export_shipment_logs/`, {
                params: {
                    start_time: startDate,
                    end_time: endDate
                },
                responseType: 'blob'
            })
                .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'shipment_logs.xlsx');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                })
                .catch(error => {
                    console.error('Error exporting data:', error);
                    message.error('Failed to export data. Please try again.');
                })
                .finally(() => {
                    setVisible(false);
                    setDates([null, null]);
                });
        } else {
            alert('Please select both start and end dates.');
        }
    };

    const handleDateChange = (values: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
        if (values) {
            setDates(values);
        } else {
            setDates([null, null]);
        }
    };

    const requestData = async (params: any) => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/shipment_logs/`, {
                params: {
                    enable_pagination: true,
                    search: searchTerm, // 确保 setSearchTerm 是一个有效的字符串或变量
                    page: params.current, // 当前页码
                    pageSize: params.pageSize, // 每页显示的记录数
                    status: 0
                },
            });

            return {
                data: response.data.shipment_logs,
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

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => actionRef.current?.reload()}>Refresh</Button>
            </div>

            <EditableProTable<ShipmentLog>
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
                editable={{
                    type: 'multiple',
                    editableKeys,
                    onSave: async (rowKey, data, row) => {
                        try {
                            // 调用接口更新 remarks
                            await axiosInstance.put(`${server_url}/qingguan/shipment_logs/${rowKey}`, {
                                ...data, // 发送其他更新数据
                            });

                            console.log('Remarks updated successfully:', rowKey, data, row);
                        } catch (error) {
                            console.error('Failed to update remarks:', error);
                        }
                    },
                    onChange: setEditableRowKeys
                }}
            />



        </div>
    );
};

export default TiDanLog;
