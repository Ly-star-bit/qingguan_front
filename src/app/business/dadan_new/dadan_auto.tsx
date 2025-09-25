"use client";

import React, { useState, useEffect } from 'react';
import { Form, Select, Upload, Button, Row, Col, message, Card, Typography, Spin, Table, Space, Switch, Checkbox, Modal, Input, Dropdown, Menu, Empty, Radio } from 'antd';
import { UploadOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined, ClearOutlined, CalculatorOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import type { TableColumnsType, TableProps } from 'antd';
import type { MenuProps } from 'antd';

const { Option } = Select;
const { Title } = Typography;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface UploadedDataType {
    id: string;
    a_number: string;
    qty?: number;
    weight?: number;
    is_overweight?: boolean;
    is_ahs?: boolean;
    d_code?: string;
    port?: string;
    isNew?: boolean;
    calculationResults?: ChannelResult[];
    area?: string;
}

interface CalculateResultType {
    key: string;
    a_number: string;
    expressType: string;
    channelName: string;
    expressSupplier: string;
    channelCode: string;
    d_code: string;
    weight: number;
    qty: number;
    price?: number;
    productDetailList: any[];
    shipperTo: any;
    selected: boolean;
    isParent?: boolean;
    children?: CalculateResultType[];
}

interface ChannelResult {
    supplier: string;
    channelCode: string;
    expressType: string;
    channelName: string;
    totalFee: number;
    selected: boolean;
    shipperTo?: any;
    productDetailList?: any[];
}

const DaDanComponent: React.FC = () => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploadedData, setUploadedData] = useState<UploadedDataType[]>([]);   
    const [resultData, setResultData] = useState<CalculateResultType[]>([]);
    
    const [productOptions, setProductOptions] = useState<string[]>([]);
    const [allProductData, setAllProductData] = useState<any[]>([]);

    const [isRegionSelected, setIsRegionSelected] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState<{[key: string]: boolean}>({});
    const [failedDetails, setFailedDetails] = useState<{[key: string]: boolean}>({});
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedResults, setSelectedResults] = useState<{[key: string]: boolean}>({});
    const [calculatingRows, setCalculatingRows] = useState<{[key: string]: boolean}>({});
    const [priceCalculationFailed, setCalculationFailed] = useState<{[key: string]: boolean}>({});
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [addForm] = Form.useForm();
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [newRowData, setNewRowData] = useState<UploadedDataType | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 区域选项


    // 监听区域选择变化
    const handleRegionChange = async (value: string) => {
        try {
            // 清空产品相关状态
            setProductOptions([]);
            setSelectedProducts([]);
            setAllProductData([]);
            form.setFieldsValue({ products: [] });
            
            const response = await axiosInstance.get(`${server_url}/order/product_list?area=${value}`);
            if (response.data.success) {
                // 提取所有expressChannelName
                const channelNames: string[] = [];
                response.data.data.forEach((item: any) => {
                    item.productsList.forEach((product: any) => {
                        channelNames.push(product.expressChannelName);
                    });
                });
                setProductOptions(channelNames);
                setAllProductData(response.data.data);
                setIsRegionSelected(true);
            }
        } catch (error) {
            console.error('获取产品列表失败:', error);
            message.error('获取产品列表失败');
            setIsRegionSelected(false);
        }
    };

    // 获取单个A单号的详细数据
    const fetchANumberDetails = async (aNumber: string, id: string) => {
        setLoadingDetails(prev => ({ ...prev, [id]: true }));
        setFailedDetails(prev => ({ ...prev, [id]: false }));
        
        try {
            const response = await axiosInstance.post(`${server_url}/order/get_a_number_data_new?worknum=${aNumber}`);
            
            if (response.data.code === 200) {
                setUploadedData(prevData => {
                    const newData = [...prevData];
                    const index = newData.findIndex(item => item.id === id);
                    if (index > -1) {
                        newData[index] = {
                            id: id,
                            a_number: response.data.a_number || aNumber,
                            qty: response.data.data.qty,
                            weight: response.data.data.weight,
                            d_code: response.data.data.d_code,
                            is_overweight: response.data.data.is_overweight,
                            port: response.data.data.port,
                            area: prevData[index].area
                        };
                    }
                    return newData;
                });
                setLoadingDetails(prev => ({ ...prev, [id]: false }));
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('获取详细数据失败:', error);
            message.error(`获取A单号 ${aNumber} 的详细数据失败`);
            setLoadingDetails(prev => ({ ...prev, [id]: false }));
            setFailedDetails(prev => ({ ...prev, [id]: true }));
        }
    };

    // 处理文件上传
    const handleFileChange = (info: any) => {
        let fileList = [...info.fileList];
        fileList = fileList.slice(-1);
        setFileList(fileList);

        if (info.file.status === 'done') {
            message.success(`${info.file.name} 文件上传成功`);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const excelData = XLSX.utils.sheet_to_json(worksheet);
                
                // 只读取A单号和区域两列
                const formattedData: UploadedDataType[] = excelData.map((item: any) => ({
                    id: String(Date.now() + Math.random()),
                    a_number: item['A单号'],
                    area: item['区域'] || '',
                }));

                // 检查重复并合并数据
                setUploadedData(prevData => {
                    const newData = [...prevData];
                    formattedData.forEach(newItem => {
                        // 检查是否已存在相同的 A 单号
                        const existingIndex = newData.findIndex(item => item.a_number.split('-')[0] === newItem.a_number.split('-')[0]);
                        if (existingIndex === -1) {
                            // 如果不存在，添加新数据
                            newData.push(newItem);
                            // 获取详细数据
                            setTimeout(() => {
                                fetchANumberDetails(newItem.a_number, newItem.id);
                            }, 0);
                        } else {
                            message.warning(`A单号 ${newItem.a_number} 已存在，已跳过`);
                        }
                    });
                    return newData;
                });
            };
            
            reader.readAsBinaryString(info.file.originFileObj);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} 文件上传失败`);
        }
    };

    // 重试获取详细数据
    const handleRetry = (record: any) => {
        fetchANumberDetails(record.a_number, record.id);
    };

    // 计算单个 A 单号的价格
    const calculatePrice = async (record: CalculateResultType) => {
        setCalculatingRows(prev => ({ ...prev, [record.a_number]: true }));
        setCalculationFailed(prev => ({ ...prev, [record.a_number]: false }));

        try {
            const response = await axiosInstance.post(`${server_url}/order/try_calculate_new`, {
                order_item: {orders:record},
                area:"美中"
            });

            if (response.data.code === 200) {
                setResultData(prev => prev.map(item => {
                    if (item.a_number === record.a_number) {
                        const updatedChildren = item.children?.map(child => {
                            const matchingData = response.data.data.find((d: any) => d.child_id === child.key);
                            return {
                                ...child,
                                price: matchingData?.totalFee || 0,
                                channelName: matchingData?.channelName || '',
                                shipperTo: matchingData?.shipperTo || '',
                                productDetailList: matchingData?.productDetailList || []
                            };
                        })?.sort((a, b) => {
                            // 如果价格是0、1、-1或者渠道名称为空,视为失败,不参与排序
                            if (a.price === 0 || a.price === 1 || a.price === -1 || !a.channelName) return 1;
                            if (b.price === 0 || b.price === 1 || b.price === -1 || !b.channelName) return -1;
                            return a.price - b.price;
                        });

                        // 获取排序后的最小有效价格和渠道名称
                        const validChild = updatedChildren?.find(child => 
                            child.price > 0 && 
                            child.price !== 1 && 
                            child.price !== -1 && 
                            child.channelName
                        );
                        
                        return {
                            ...item,
                            price: validChild?.price || 0,
                            channelName: validChild?.channelName || "",
                            children: updatedChildren
                        };
                    }
                    return item;
                }));
            } else {
                throw new Error(response.data.message);
            }
            console.log(`${resultData}`)
        } catch (error) {
            console.error('计算价格失败:', error);
            setCalculationFailed(prev => ({ ...prev, [record.a_number]: true }));
        } finally {
            setCalculatingRows(prev => ({ ...prev, [record.a_number]: false }));
        }
    };

    // 重试计算价格
    const handleRetryCalculate = async (record: CalculateResultType) => {
        if (!record.isParent) return;

        try {
            // 只重新计算没有价格或价格为0的子项
            const needsCalculation = record.children?.some(child => 
                child.price === 0 || 
                child.price === undefined || 
                !child.channelName
            );

            if (needsCalculation) {
                await calculatePrice(record);
                message.success('重新计算完成');
            } else {
                message.info('所有渠道已有有效价格');
            }
        } catch (error) {
            console.error('重新计算失败:', error);
            message.error('重新计算失败');
        }
    };

    // 修改 handleCalculate 函数
    const handleCalculate = async () => {
        if (!uploadedData || uploadedData.length === 0) {
            message.error('请先上传数据');
            return;
        }

        // 检查是否所有数据都选择了区域
        const hasNoArea = uploadedData.some(item => !item.area);
        if (hasNoArea) {
            message.error('请为所有数据选择区域');
            return;
        }

        try {
            // 过滤出需要计算的数据（没有计算结果的数据）
            const needCalculateData = uploadedData.filter(item => 
                !item.calculationResults || item.calculationResults.length === 0
            );

            if (needCalculateData.length === 0) {
                message.info('所有数据都已经计算过了');
                return;
            }

            // 设置需要计算的行为计算中状态
            const calculatingState = needCalculateData.reduce((acc, item) => {
                acc[item.id] = true;
                return acc;
            }, {} as {[key: string]: boolean});
            setCalculatingRows(calculatingState);

            // 为每个需要计算的A单号创建计算请求
            const calculationPromises = needCalculateData.map(async (order) => {
                const orderData = {
                    key: `parent-${order.a_number}`,
                    a_number: order.a_number,
                    expressType: '',
                    channelName: '',
                    expressSupplier: '',
                    channelCode: '',
                    weight: order.weight || 0,
                    qty: order.qty || 0,
                    d_code: order.d_code || '',
                    productDetailList: [],
                    shipperTo: '',
                    price: 0,
                    selected: false,
                    isParent: true,
                    children: []
                };

                try {
                    const response = await axiosInstance.post(`${server_url}/order/try_calculate_new`, {
                        order_item: {orders: orderData},
                        area: order.area
                    });

                    if (response.data.code === 200) {
                        // 处理每个A单号的计算结果
                        const results = response.data.data
                            .map((result: any) => ({
                                supplier: result.supplier,
                                channelName: result.channelName,
                                channelCode: result.channelCode,
                                expressType: result.expressType,
                                totalFee: result.totalFee,
                                selected: false,
                                shipperTo: result.shipperTo,
                                productDetailList: result.productDetailList
                            } as ChannelResult))
                            .sort((a: ChannelResult, b: ChannelResult) => {
                                if (a.totalFee === -1) return 1;
                                if (b.totalFee === -1) return -1;
                                return a.totalFee - b.totalFee;
                            });

                        return {
                            orderId: order.id,
                            results: results
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`计算 A单号 ${order.a_number} 失败:`, error);
                    return null;
                }
            });

            // 等待所有计算完成
            const results = await Promise.all(calculationPromises);

            // 更新上传数据中的计算结果
            setUploadedData(prev => prev.map(item => {
                const calculationResult = results.find(r => r?.orderId === item.id);
                if (calculationResult) {
                    return {
                        ...item,                     // 保留所有原有属性
                        calculationResults: calculationResult.results || []
                        // 移除了之前错误覆盖 area 的代码
                    };
                }
                return item;
            }));

            message.success(`${needCalculateData.length}条数据计算完成`);
        } catch (error) {
            console.error('试算失败:', error);
            message.error('试算请求失败');
        } finally {
            // 清除所有行的计算中状态
            setCalculatingRows({});
        }
    };

    // 修改展开行渲染函数
    const expandedRowRender = (record: UploadedDataType) => {
        if (!record.calculationResults || record.calculationResults.length === 0) {
            return <Empty description="暂无试算结果" />;
        }

        const columns = [
            {
                title: '操作',
                key: 'action',
                width: 120,
                render: (_: any, channel: ChannelResult) => (
                    <Checkbox 
                        checked={channel.selected}
                        onChange={() => handleSelectChannel(record, channel.selected ? null : channel)}
                    >
                        选择
                    </Checkbox>
                )
            },
            {
                title: '供应商',
                dataIndex: 'supplier',
                key: 'supplier',
            },
            {
                title: '渠道名称',
                dataIndex: 'channelName',
                key: 'channelName',
            },
            {
                title: '价格($)',
                dataIndex: 'totalFee',
                key: 'totalFee',
                render: (fee: number) => fee === -1 ? '失败' : fee.toFixed(2)
            }
        ];

        return (
            <Table
                columns={columns}
                dataSource={record.calculationResults}
                pagination={false}
                rowKey={(record) => `${record.supplier}-${record.channelName}`}
            />
        );
    };

    // 修改选择渠道的处理函数
    const handleSelectChannel = (record: UploadedDataType, selectedChannel: ChannelResult | null) => {
        setUploadedData(prev => prev.map(item => {
            if (item.id === record.id) {
                const updatedResults = item.calculationResults?.map(channel => ({
                    ...channel,
                    selected: selectedChannel ? channel === selectedChannel : false
                }));
                
                // 更新父级显示的渠道信息
                setResultData(prevResultData => prevResultData.map(resultItem => {
                    if (resultItem.a_number === record.a_number) {
                        return {
                            ...resultItem,
                            channelName: selectedChannel ? `[${selectedChannel.supplier}] ${selectedChannel.channelName}` : '',
                            price: selectedChannel ? selectedChannel.totalFee : 0
                        };
                    }
                    return resultItem;
                }));

                return {
                    ...item,
                    calculationResults: updatedResults
                };
            }
            return item;
        }));
    };

    // 添加下单处理函数
    const handlePlaceOrder = () => {
        // 检查是否有选中的渠道
        const selectedOrders = uploadedData.filter(item => 
            item.calculationResults?.some(channel => channel.selected)
        );

        if (selectedOrders.length === 0) {
            message.error('请至少选择一个渠道进行下单');
            return;
        }

        // 准备下单数据
        const orderData = selectedOrders.map(item => {
            const selectedChannel = item.calculationResults?.find(channel => channel.selected);
            return {
                a_number: item.a_number,
                channelCode: selectedChannel?.channelCode,  
                channelName: selectedChannel?.channelName,
                expressType: selectedChannel?.expressType,
                expressSupplier: selectedChannel?.supplier,
                weight: item.weight,
                qty: item.qty,
                d_code: item.d_code,
                productDetailList: selectedChannel?.productDetailList,
                shipperTo: selectedChannel?.shipperTo
            };
        });
        
        // 调用下单接口
        Modal.confirm({
            title: '确认下单',
            content: '确定要为选中的渠道进行下单吗？',
            onOk: async () => {
                try {
                    const response = await axiosInstance.post(`${server_url}/order/TuffyOrder`, {
                        orders: orderData
                    });

                    if (response.data.code === 200) {
                        message.success('下单成功');
                        // 清空数据
                        setUploadedData([]);
                        setResultData([]);
                        setFileList([]);
                    } else {
                        throw new Error(response.data.message);
                    }
                } catch (error) {
                    console.error('下单失败:', error);
                    message.error('下单失败');
                }
            }
        });
    };

    // 添加区域选择处理函数
    const handleAreaChange = (id: string, value: string) => {
        setUploadedData(prev => prev.map(item => 
            item.id === id ? { ...item, area: value } : item
        ));
    };

    const uploadedColumns: TableColumnsType<UploadedDataType> = [
        {
            title: 'A单号',
            dataIndex: 'a_number',
            key: 'a_number',
            width: 200,
            render: (text, record: any) => {
                const isEditing = record.id === editingRow;
                const selectedChannel = record.calculationResults?.find((channel: ChannelResult) => channel.selected);
                return isEditing ? (
                    <Input
                        value={text}
                        onChange={e => {
                            setUploadedData(prev => prev.map(item => 
                                item.id === record.id 
                                    ? { ...item, a_number: e.target.value }
                                    : item
                            ));
                        }}
                        onPressEnter={() => handleSave(record.id)}
                    />
                ) : (
                    <Space>
                        {calculatingRows[record.id] && <Spin size="small" />}
                        {text}
                        {selectedChannel && (
                            <span style={{ color: '#1890ff', marginLeft: 8 }}>
                                [已选择: {selectedChannel.channelName}]
                            </span>
                        )}
                        {loadingDetails[record.id] && <Spin size="small" style={{ marginLeft: 8 }} />}
                        {failedDetails[record.id] && (
                            <Button
                                type="link"
                                icon={<ReloadOutlined />}
                                onClick={() => handleRetry(record)}
                                style={{ marginLeft: 8 }}
                            >
                                重试
                            </Button>
                        )}
                    </Space>
                );
            }
        },
        {
            title: '区域',
            dataIndex: 'area',
            key: 'area',
            width: 120,
            render: (text: string, record: UploadedDataType) => (
                <Select
                    value={text}
                    onChange={(value) => handleAreaChange(record.id, value)}
                    style={{ width: '100%' }}
                    placeholder="请选择区域"
                >
                    <Option value="美中">美中</Option>
                    <Option value="美东">美东</Option>
                    <Option value="美西">美西</Option>
                </Select>
            )
        },
        {
            title: '箱数',
            dataIndex: 'qty',
            key: 'qty',
            width: 100,
        },
        {
            title: '重量',
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
        },
        {
            title: '是否超重',
            dataIndex: 'is_overweight',
            key: 'is_overweight',
            width: 100,
            render: (text, record) => (
                <span>{record.is_overweight ? (
                    <span style={{ color: 'red' }}>是</span>
                ) : (
                    <span>否</span>
                )}</span>
            ),
        },
        {
            title: '是否AHS',
            dataIndex: 'is_ahs',
            key: 'is_ahs',
            width: 100,
            render: (text, record) => (
                <span>{record.is_ahs ? (
                    <span style={{ color: 'red' }}>是</span>
                ) : (
                    <span>否</span>
                )}</span>
            ),
        },

        {
            title: '发货port',
            dataIndex: 'port',
            key: 'port',
            width: 100,
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_, record) => {
                const isEditing = record.id === editingRow;
                return isEditing ? (
                    <Space>
                        <Button
                            type="link"
                            onClick={() => handleSave(record.id)}
                            loading={isSaving}
                            disabled={isSaving}
                        >
                            保存
                        </Button>
                        <Button
                            type="link"
                            onClick={() => handleCancel(record.id)}
                            disabled={isSaving}
                        >
                            取消
                        </Button>
                    </Space>
                ) : (
                    <Space>
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id)}
                        >
                            删除
                        </Button>
                    </Space>
                );
            }
        }
    ];

    const resultColumns: ProColumns<CalculateResultType>[] = [
        {
            title: 'A单号',
            dataIndex: 'a_number',
            width: 200,
        },
        {
            title: '渠道名称',
            dataIndex: 'channelName',
            width: 200,
            render: (_, record) => {
                // 如果是父级且有选中的渠道，显示选中的渠道信息
                if (record.isParent) {
                    const uploadedRecord = uploadedData.find(item => item.a_number === record.a_number);
                    const selectedChannel = uploadedRecord?.calculationResults?.find(channel => channel.selected);
                    if (selectedChannel) {
                        return `[${selectedChannel.supplier}] ${selectedChannel.channelName}`;
                    }
                }
                return record.expressSupplier ? `[${record.expressSupplier}]- ${record.channelName}` : record.channelName;
            }
        },
        {
            title: '价格',
            dataIndex: 'price',
            width: 200,
            render: (_, record) => {
                if (record.isParent) {
                    const uploadedRecord = uploadedData.find(item => item.a_number === record.a_number);
                    const selectedChannel = uploadedRecord?.calculationResults?.find(channel => channel.selected);
                    if (selectedChannel) {
                        return `${selectedChannel.totalFee}$`;
                    }
                }
                return (
                    <Space>
                        {calculatingRows[record.a_number] ? (
                            <Spin size="small" />
                        ) : (
                            <>
                                {record.price === 1 ? '已存在' : record.price === -1 ? '失败' : record.price || '-'}$
                                {priceCalculationFailed[record.a_number] && (
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<ReloadOutlined />}
                                        onClick={() => handleRetryCalculate(record)}
                                    >
                                        重试
                                    </Button>
                                )}
                            </>
                        )}
                    </Space>
                );
            }
        }
    ];

    const rowSelection: TableProps<UploadedDataType>['rowSelection'] = {
        onChange: (selectedRowKeys, selectedRows) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
            setSelectedRowKeys(selectedRowKeys);
        },
        getCheckboxProps: (record) => ({
            name: record.a_number,
        }),
    };

    // 开始添加新行
    const handleAdd = () => {
        // 如果有正在编辑的行，提示用户先保存
        if (editingRow !== null) {
            message.warning('请先保存当前正在编辑的数据');
            return;
        }

        const newId = String(Date.now());
        const newRow = {
            id: newId,
            a_number: '',
            isNew: true
        };
        setUploadedData(prev => [...prev, newRow]);
        setEditingRow(newId);
    };

    // 修改保存处理函数
    const handleSave = async (id: string) => {
        const editedData = uploadedData.find(item => item.id === id);
        if (!editedData?.a_number) {
            message.error('请输入A单号');
            return;
        }

        // 检查重复
        const isExist = uploadedData.some(item => 
            item.id !== id && item.a_number === editedData.a_number
        );
        if (isExist) {
            message.error(`A单号 ${editedData.a_number} 已存在`);
            return;
        }

        setIsSaving(true);
        try {
            await fetchANumberDetails(editedData.a_number, id);
            setEditingRow(null);
            message.success('保存成功');
        } catch (error) {
            // fetchANumberDetails 中已经处理了错误提示
        } finally {
            setIsSaving(false);
        }
    };

    // 取消编辑
    const handleCancel = (id: string) => {
        setEditingRow(null);
        // 如果是新添加的行，直接删除
        setUploadedData(prev => prev.filter(item => !(item.id === id && item.isNew)));
    };

    // 删除数据
    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条数据吗？',
            onOk: () => {
                setUploadedData(prev => prev.filter(item => item.id !== id));
            }
        });
    };

    // 提交手动添加的数据
    const handleAddSubmit = async () => {
        try {
            const values = await addForm.validateFields();
            const newId = String(Date.now());

            // 检查是否已存在相同的 A 单号
            const isExist = uploadedData.some(item => item.a_number === values.a_number);
            if (isExist) {
                message.error(`A单号 ${values.a_number} 已存在`);
                return;
            }
            
            // 先添加基本数据
            const newData = {
                id: newId,
                a_number: values.a_number,
            };
            
            setUploadedData(prev => [...prev, newData]);
            
            // 然后获取详细数据
            await fetchANumberDetails(values.a_number, newId);
            
            setIsAddModalVisible(false);
            addForm.resetFields();
            message.success('添加成功');
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
           
                    <Card 
                        title="上传数据预览" 
                        bordered={false} 
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        extra={
                            <Space>
                                 <Button
                                    type="primary"
                                    icon={<CalculatorOutlined />}
                                    onClick={handleCalculate}
                                >
                                    试算运费
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={handlePlaceOrder}
                                >
                                    下单
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    添加数据
                                </Button>
                                <Upload 
                                    fileList={fileList}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls"
                                    maxCount={1}
                                    showUploadList={false}
                                >
                                    <Button icon={<UploadOutlined />} type="primary">
                                        上传文件
                                    </Button>
                                </Upload>
                            </Space>
                        }
                        bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}
                    >
                        <Table<UploadedDataType>
                            columns={uploadedColumns}
                            dataSource={uploadedData}
                            rowKey="id"
                            style={{ flex: 1 }}
                            expandable={{
                                expandedRowRender,
                                rowExpandable: record => Boolean(record.calculationResults?.length)
                            }}
                        />
                    </Card>

            <Modal
                title="添加数据"
                open={isAddModalVisible}
                onOk={handleAddSubmit}
                onCancel={() => {
                    setIsAddModalVisible(false);
                    addForm.resetFields();
                }}
            >
                <Form form={addForm} layout="vertical">
                    <Form.Item
                        name="a_number"
                        label="A单号"
                        rules={[{ required: true, message: '请输入A单号' }]}
                    >
                        <Input placeholder="请输入A单号" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DaDanComponent;
