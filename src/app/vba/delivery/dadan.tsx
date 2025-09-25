"use client";

import React, { useState, useEffect } from 'react';
import { Form, Select, Upload, Button, Row, Col, message, Card, Typography, Spin, Table, Space, Switch, Checkbox, Modal } from 'antd';
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import type { TableColumnsType, TableProps } from 'antd';

const { Option } = Select;
const { Title } = Typography;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface UploadedDataType {
    id: string;
    a_number: string;
    qty?: number;
    // length?: number;
    // width?: number;
    // height?: number;
    weight?: number;
    d_code?: string;
    // children?: UploadedDataType[];
}

interface CalculateResultType {
    key: string;
    a_number: string;
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
    const [calculatingPrices, setCalculatingPrices] = useState<{[key: string]: boolean}>({});
    const [priceCalculationFailed, setCalculationFailed] = useState<{[key: string]: boolean}>({});
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    // 区域选项
    const regionOptions = [
        { label: '美中', value: '美中' },
        { label: '美东', value: '美东' },
        { label: '美西', value: '美西' }
    ];

    // 监听区域选择变化
    const handleRegionChange = async (value: string) => {
        try {
            
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
                //#清空产品
                form.setFieldValue('products', []);

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
            const response = await axiosInstance.post(`${server_url}/order/get_a_number_data?worknum=${aNumber}`);
            
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
                            d_code: response.data.data.d_code
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
        fileList = fileList.slice(-1); // 只保留最后上传的文件
        setFileList(fileList);

        if (info.file.status === 'done') {
            message.success(`${info.file.name} 文件上传成功`);
            
            // 读取Excel文件内容
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const excelData = XLSX.utils.sheet_to_json(worksheet);
                // 转换数据格式
                const formattedData: UploadedDataType[] = excelData.map((item: any, index) => {
                    const id = String(index + 1);
                    const aNumber = item['A单号'];
                    
                    return {
                        id,
                        a_number: aNumber,
                    };
                });
                
                // 先设置数据,然后在回调中执行获取详细信息
                setUploadedData(formattedData);
                
                // // 确保数据设置完成后再获取详细信息
                setTimeout(() => {
                    formattedData.forEach(item => {
                        fetchANumberDetails(item.a_number, item.id);
                    });
                }, 0);
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
        setCalculatingPrices(prev => ({ ...prev, [record.a_number]: true }));
        setCalculationFailed(prev => ({ ...prev, [record.a_number]: false }));

        try {
            const response = await axiosInstance.post(`${server_url}/order/try_calculate`, {
                orders: record
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
                            // 如果价格是0或者渠道名称为空,视为失败,不参与排序
                            if (a.price === 0 || !a.channelName) return 1;
                            if (b.price === 0 || !b.channelName) return -1;
                            return a.price - b.price;
                        });

                        // 获取排序后的最小有效价格和渠道名称
                        const validChild = updatedChildren?.find(child => child.price > 0 && child.channelName);
                        
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
            setCalculatingPrices(prev => ({ ...prev, [record.a_number]: false }));
        }
    };

    // 重试计算价格
    const handleRetryCalculate = (record: CalculateResultType) => {
        calculatePrice(record);
    };

    // 添加试算处理函数
    const handleCalculate = async () => {
        const selectedProducts = form.getFieldValue('products');
    
        if (!selectedProducts || selectedProducts.length === 0) {
            message.error('请先选择产品');
            return;
        }

        if (!uploadedData || uploadedData.length === 0) {
            message.error('请先上传数据');
            return;
        }

        try {
            const productsInfo = allProductData.reduce((acc: any[], curr: any) => {
                return acc.concat(curr.productsList.filter((p: any) => 
                    selectedProducts.includes(p.expressChannelName)
                ));
            }, []);

            // 重构数据结构
            const calculationResults: CalculateResultType[] = uploadedData.map(order => ({
                key: `parent-${order.a_number}`,
                a_number: order.a_number,
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
                children: productsInfo.map((product, index) => ({
                    key: `child-${order.a_number}-${index}`,
                    a_number: order.a_number,
                    channelName: product.expressChannelName,
                    expressSupplier: product.expressSupplier,
                    channelCode: product.expressChannelCode,
                    d_code: product.d_code,
                    weight: product.weight || 0,
                    qty: product.qty || 0,
                    price: 0,
                    selected: false,
                    isParent: false,
                    productDetailList: [],
                    shipperTo: ''
                }))
            }));
            // console.log(calculationResults);

            setResultData(calculationResults);

            // 为每个 A 单号计算价格
            for (const result of calculationResults) {
                if (result.isParent) {
                    await calculatePrice(result);
                }
            }
        } catch (error) {
            console.error('试算失败:', error);
            message.error('试算请求失败');
        }
    };

    // 修改处理选择逻辑
    const handleSelectAll = (record: CalculateResultType, selected: boolean) => {
        setResultData(prev => prev.map(item => {
            if (item.key === record.key) {
                return {
                    ...item,
                    selected,
                    children: item.children?.map(child => ({
                        ...child,
                        selected
                    }))
                };
            }
            return item;
        }));
    };

    // 处理单个产品选择
    const handleSelectProduct = (record: CalculateResultType, selected: boolean) => {
        setResultData(prev => prev.map(item => {
            if (item.a_number === record.a_number) {
                return {
                    ...item,
                    children: item.children?.map(child => 
                        child.key === record.key ? { ...child, selected } : child
                    )
                };
            }
            return item;
        }));
    };

    // 获取每个 A 单号下的最低价格
    const getMinPrice = (record: CalculateResultType) => {
        if (!record.isParent || !record.children) return null;
        const validPrices = record.children
            .filter(child => child.price !== undefined && child.price > 0)
            .map(child => child.price!);
        return validPrices.length > 0 ? Math.min(...validPrices) : null;
    };

    // 检查选择的订单
    const checkSelectedOrders = () => {
        const selectedOrders = new Map<string, number>(); // key: a_number, value: 选中数量

        resultData.forEach(parent => {
            if (parent.children) {
                const selectedCount = parent.children.filter(child => child.selected).length;
                if (selectedCount > 0) {
                    selectedOrders.set(parent.a_number, selectedCount);
                }
            }
        });

        const invalidOrders: string[] = [];
        selectedOrders.forEach((count, aNumber) => {
            if (count > 1) {
                invalidOrders.push(aNumber);
            }
        });

        return invalidOrders;
    };

    // 处理下单
    const handleOrder = () => {
        const invalidOrders = checkSelectedOrders();
        
        if (invalidOrders.length > 0) {
            message.error(`以下A单号选择了多个渠道，请每个A单号只选择一个渠道：${invalidOrders.join(', ')}`);
            return;
        }

        // 如果没有选择任何订单
        const hasSelectedOrders = resultData.some(parent => 
            parent.children?.some(child => child.selected)
        );

        if (!hasSelectedOrders) {
            message.error('请至少选择一个渠道进行下单');
            return;
        }

        setConfirmModalVisible(true);
    };

    // 确认下单
    const handleConfirmOrder = async () => {
        try {
            // 获取选中的订单数据
            const upload_selectedOrders = resultData
                .filter(parent => parent.children?.some(child => child.selected))
                .map(parent => {
                    const selectedChild = parent.children?.find(child => child.selected);
                    return {
                        a_number: parent.a_number,
                        channelName: selectedChild?.channelName,
                        channelCode: selectedChild?.channelCode,
                        expressSupplier: selectedChild?.expressSupplier,
                        weight: parent.weight,
                        qty: parent.qty,
                        d_code: parent.d_code,
                        productDetailList: selectedChild?.productDetailList,
                        shipperTo: selectedChild?.shipperTo
                    };
                });
            // console.log(`选中的订单数据为：${upload_selectedOrders}`)

            // // 调用下单接口
            const response = await axiosInstance.post(`${server_url}/order/create_order`, {
                orders: upload_selectedOrders
            });

            // if (response.data.code === 200) {
            //     message.success('下单成功');
            //     // 可以在这里清空或刷新数据
            //     setResultData([]);
            //     setUploadedData([]);
            //     setFileList([]);
            //     form.resetFields();
            // } else {
            //     throw new Error(response.data.message);
            // }
        } catch (error) {
            console.error('下单失败:', error);
            message.error('下单失败');
        } finally {
            setConfirmModalVisible(false);
        }
    };

    const uploadedColumns: TableColumnsType<UploadedDataType> = [
        {
            title: 'A单号',
            dataIndex: 'a_number',
            key: 'a_number',
            width: 200,
            render: (text, record: any) => (
                <>
                    {text}
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
                </>
            ),
        },
        {
            title: '箱数',
            dataIndex: 'qty',
            key: 'qty',
            width: 100,
        },
        // {
        //     title: '长',
        //     dataIndex: 'length',
        //     key: 'length',
        //     width: 100,
        // },
        // {
        //     title: '宽',
        //     dataIndex: 'width',
        //     key: 'width',
        //     width: 100,
        // },
        // {
        //     title: '高',
        //     dataIndex: 'height',
        //     key: 'height',
        //     width: 100,
        // },
        {
            title: '重量',
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
        },
    ];

    const resultColumns: ProColumns<CalculateResultType>[] = [
        {
            title: 'A单号',
            dataIndex: 'a_number',
            width: 200,
            render: (_, record) => (
                <Space>
                    {record.isParent && (
                        <Checkbox
                            checked={record.children?.every(child => child.selected)}
                            indeterminate={
                                record.children?.some(child => child.selected) && 
                                !record.children?.every(child => child.selected)
                            }
                            onChange={(e) => handleSelectAll(record, e.target.checked)}
                        />
                    )}
                    {!record.isParent && (
                        <Checkbox
                            checked={record.selected}
                            onChange={(e) => handleSelectProduct(record, e.target.checked)}
                        />
                    )}
                    {record.a_number}
                </Space>
            )
        },
        {
            title: '渠道名称',
            dataIndex: 'channelName',
            width: 200
        },
        {
            title: '价格',
            dataIndex: 'price',
            width: 200,
            render: (_, record) => {
                const minPrice = record.isParent ? getMinPrice(record) : null;
                return (
                    <Space>
                        {calculatingPrices[record.a_number] ? (
                            <Spin size="small" />
                        ) : (
                            <>
                                <span style={{ 
                                    color: !record.isParent && record.price && minPrice === record.price ? 'red' : 'inherit'
                                }}>
                                    {record.price || '-'}
                                    
                                </span>
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

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
                物流打单系统
            </Title>
            
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    <Card title="配置选项" bordered={false} style={{ height: '400px' }}>
                        <Form form={form} layout="vertical">
                            <Form.Item name="region" label="发货区域" rules={[{ required: true, message: '请选择发货区域' }]}>
                                <Select 
                                    placeholder="请选择发货区域"
                                    onChange={handleRegionChange}
                                >
                                    {regionOptions.map(option => (
                                        <Option key={option.value} value={option.value}>
                                            {option.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="products" label="产品" rules={[{ required: true, message: '请选择产品' }]}>
                                <Select 
                                    mode="multiple" 
                                    placeholder="请选择产品"
                                    style={{ width: '100%' }}
                                    disabled={!isRegionSelected}
                                >
                                    {productOptions.map(option => (
                                        <Option key={option} value={option}>
                                            {option}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="file" label="上传文件" rules={[{ required: true, message: '请上传文件' }]}>
                                <Upload 
                                    fileList={fileList}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls"
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />} type="primary" block>
                                        选择Excel文件
                                    </Button>
                                </Upload>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card title="上传数据预览" bordered={false} style={{ height: '400px', overflowY: 'auto' }}>
                       
                        <Table<UploadedDataType>
                                columns={uploadedColumns}
                            dataSource={uploadedData}
                            expandable={{
                                defaultExpandAllRows: true,
                            }}
                            rowKey="id"
                            scroll={{ y: 400 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row style={{ marginTop: '24px' }}>
                <Col span={24}>
                    <Card 
                        title="试算结果" 
                        bordered={false}
                        extra={
                            <Space>
                                <Button 
                                    type="primary" 
                                    onClick={handleCalculate}
                                >
                                    试算
                                </Button>
                                <Button 
                                    type="primary"
                                    onClick={handleOrder}
                                    disabled={resultData.length === 0}
                                >
                                    下单
                                </Button>
                            </Space>
                        }
                    >
                        <ProTable<CalculateResultType>
                            dataSource={resultData}
                                columns={resultColumns}
                            rowKey="key"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                            }}
                            expandable={{
                                defaultExpandAllRows: true
                            }}
                            search={false}
                            toolBarRender={false}
                            scroll={{ y: 800 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="确认下单"
                open={confirmModalVisible}
                onOk={handleConfirmOrder}
                onCancel={() => setConfirmModalVisible(false)}
            >
                <p>确认要为选中的订单进行下单吗？</p>
            </Modal>
        </div>
    );
};

export default DaDanComponent;
