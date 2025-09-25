"use client";

import React, { useState, useEffect } from 'react';
import { Form, Select, Upload, Button, Row, Col, message, Card, Typography, Spin, Table, Space, Switch, Checkbox, Modal, Input, Dropdown, Menu } from 'antd';
import { UploadOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined, ClearOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import * as XLSX from 'xlsx';
import type { TableColumnsType, TableProps } from 'antd';
import type { MenuProps } from 'antd';
import axiosInstance from '@/utils/axiosInstance';  
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
    isNew?: boolean;
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
    const [loading, setLoading] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [addForm] = Form.useForm();
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [newRowData, setNewRowData] = useState<UploadedDataType | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 区域选项
    const regionOptions = [
        { label: '美中', value: '美中' },
        { label: '美东', value: '美东' },
        { label: '美西', value: '美西' }
    ];

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
                
                // 转换数据格式
                const formattedData: UploadedDataType[] = excelData.map((item: any) => ({
                    id: String(Date.now() + Math.random()),
                    a_number: item['A单号'],
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
            setCalculatingPrices(prev => ({ ...prev, [record.a_number]: false }));
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

    // 添加试算处理函数
    const handleCalculate = async () => {
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
                ).map((p: any) => ({
                    ...p,
                    productType: curr.productType
                })));
            }, []);

            // 如果是第一次计算，创建新的结果数据
            if (resultData.length === 0) {
                const calculationResults: CalculateResultType[] = uploadedData.map(order => ({
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
                    children: productsInfo.map((product, index) => ({
                        key: `child-${order.a_number}-${index}`,
                        a_number: order.a_number,
                        expressType: product.productType,
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
                setResultData(calculationResults);
                
                console.log('calculationResults:', JSON.stringify(calculationResults, null, 2));

                // 计算所有价格
                await Promise.all(
                    calculationResults
                        .filter(result => result.isParent)
                        .map(result => calculatePrice(result))
                );
            } else {
                // 如果不是第一次计算，只计算没有价格的渠道
                const calculationsNeeded = resultData
                    .filter(result => result.isParent)
                    .filter(parent => {
                        // 检查是否有任何子项需要计算价格
                        return parent.children?.some(child => 
                            child.price === 0 || 
                            child.price === undefined || 
                            !child.channelName
                        );
                    });

                if (calculationsNeeded.length > 0) {
                    await Promise.all(calculationsNeeded.map(result => calculatePrice(result)));
                }
            }

            message.success('价格计算完成');
        } catch (error) {
            console.error('试算失败:', error);
            message.error('试算请求失败');
        }
    };

    // 修改选择单个产品的处理函数
    const handleSelectProduct = (record: CalculateResultType, checked: boolean) => {
        if (!record.isParent) {
            setResultData(prev => prev.map(item => {
                if (item.a_number === record.a_number) {
                    // 如果是选中操作，先取消该 A 单号下所有其他选中项
                    const updatedChildren = item.children?.map(child => ({
                        ...child,
                        selected: child.key === record.key ? checked : false
                    }));
                    return {
                        ...item,
                        children: updatedChildren
                    };
                }
                return item;
            }));
        }
    };

    // 修改全选处理函数
    const handleSelectAll = (record: CalculateResultType, checked: boolean) => {
        if (record.isParent && record.children) {
            // 如果是选中操作，找到价格最低的有效渠道
            if (checked) {
                const validChildren = record.children.filter(child => 
                    child.price !== undefined &&
                    child.price > 0 && 
                    child.price !== 1 && 
                    child.price !== -1 && 
                    child.channelName
                );
                
                if (validChildren.length > 0) {
                    // 按价格排序
                    const sortedChildren = [...validChildren].sort((a, b) => 
                        (a.price || 0) - (b.price || 0)
                    );
                    // 选中价格最低的渠道
                    const lowestPriceChild = sortedChildren[0];
                    
                    setResultData(prev => prev.map(item => {
                        if (item.a_number === record.a_number) {
                            const updatedChildren = item.children?.map(child => ({
                                ...child,
                                selected: child.key === lowestPriceChild.key
                            }));
                            return {
                                ...item,
                                children: updatedChildren
                            };
                        }
                        return item;
                    }));
                }
            } else {
                // 如果是取消选中，取消所有选中状态
                setResultData(prev => prev.map(item => {
                    if (item.a_number === record.a_number) {
                        const updatedChildren = item.children?.map(child => ({
                            ...child,
                            selected: false
                        }));
                        return {
                            ...item,
                            children: updatedChildren
                        };
                    }
                    return item;
                }));
            }
        }
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
            setLoading(true);
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
                        expressType: selectedChild?.expressType,
                        weight: parent.weight,
                        qty: parent.qty,
                        d_code: parent.d_code,
                        productDetailList: selectedChild?.productDetailList,
                        shipperTo: selectedChild?.shipperTo
                    };
                });
            // console.log(`选中的订单数据为：${upload_selectedOrders}`)
            
            // // 调用下单接口
            const response = await axiosInstance.post(`${server_url}/order/TuffyOrder`, {
                orders: upload_selectedOrders
            });

            if (response.data.code === 200) {
                message.success('下单成功');
                // 可以在这里清空或刷新数据
                setResultData([]);
                setUploadedData([]);
                setFileList([]);
                setProductOptions([]);
                setSelectedProducts([]);
                setAllProductData([]);
                form.resetFields();
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('下单失败:', error);
            message.error('下单失败');
        } finally {
            setConfirmModalVisible(false);
            setLoading(false);
        }
    };

    // 清空试算结果
    const handleClearResults = () => {
        Modal.confirm({
            title: '确认清空',
            content: '确定要清空所有试算结果吗？',
            onOk: () => {
                setResultData([]);
            }
        });
    };

    // 开始添加新行
    const handleAdd = () => {
        const newId = String(Date.now());
        const newRow = {
            id: newId,
            a_number: '',
            isNew: true
        };
        setUploadedData(prev => [...prev, newRow]);
        setEditingRow(newId);
    };

    // 修改 Dropdown 的处理函数
    const handleDropdownVisibleChange = (visible: boolean) => {
        setDropdownVisible(visible);
    };

    // 修改产品选择处理函数
    const handleProductSelect = (e: React.MouseEvent, productName: string) => {
        e.stopPropagation(); // 阻止事件冒泡
        const newSelected = selectedProducts.includes(productName)
            ? selectedProducts.filter(name => name !== productName)
            : [...selectedProducts, productName];
        setSelectedProducts(newSelected);
        form.setFieldsValue({ products: newSelected });
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

    // 生成菜单项
    const generateMenuItems = () => {
        // 按供应商分组
        const supplierGroups = new Map<string, any[]>();
        
        allProductData.forEach(typeGroup => {
            typeGroup.productsList.forEach((product: any) => {
                const supplier = product.expressSupplier;
                if (!supplierGroups.has(supplier)) {
                    supplierGroups.set(supplier, []);
                }
                supplierGroups.get(supplier)?.push(product);
            });
        });

        const menuItems: MenuProps['items'] = [];

        // 添加供应商分组
        supplierGroups.forEach((products, supplier) => {
            menuItems.push({
                key: supplier,
                type: 'group',
                label: supplier,
                children: products.map(product => ({
                    key: product.expressChannelName,
                    label: (
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px 8px',
                                cursor: 'pointer'
                            }}
                            onClick={(e) => handleProductSelect(e, product.expressChannelName)}
                        >
                            <Checkbox
                                checked={selectedProducts.includes(product.expressChannelName)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleProductSelect(e as any, product.expressChannelName)}
                            />
                            <span style={{ marginLeft: 8, flex: 1 }}>
                                {product.expressChannelName}
                            </span>
                        </div>
                    ),
                }))
            });
        });

        return menuItems;
    };

    // 渲染已选产品列表
    const renderSelectedProducts = () => {
        if (selectedProducts.length === 0) return null;

        return (
            <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>已选择产品：</div>
                <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    padding: 8
                }}>
                    {selectedProducts.map(productName => {
                        // 查找产品的供应商信息
                        let supplierInfo = '';
                        allProductData.forEach(typeGroup => {
                            const product = typeGroup.productsList.find((p: any) => p.expressChannelName === productName);
                            if (product) {
                                supplierInfo = product.expressSupplier;
                            }
                        });

                        return (
                            <div 
                                key={productName} 
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 0',
                                    borderBottom: '1px solid #f0f0f0'
                                }}
                            >
                                <div>
                                    <span style={{ color: '#666', marginRight: 8 }}>[{supplierInfo}]</span>
                                    <span>{productName}</span>
                                </div>
                                <Button 
                                    type="link" 
                                    size="small"
                                    onClick={(e) => handleProductSelect(e, productName)}
                                    style={{ padding: 0 }}
                                >
                                    移除
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const uploadedColumns: TableColumnsType<UploadedDataType> = [
        {
            title: 'A单号',
            dataIndex: 'a_number',
            key: 'a_number',
            width: 200,
            render: (text, record: any) => {
                const isEditing = record.id === editingRow;
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
                );
            }
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
            render: (_, record) => (
                <Space>
                    {record.isParent && (
                        <Checkbox
                            checked={record.children?.some(child => child.selected)}
                            onChange={(e) => handleSelectAll(record, e.target.checked)}
                        />
                    )}
                    {!record.isParent && (
                        <Checkbox
                            checked={record.selected}
                            onChange={(e) => handleSelectProduct(record, e.target.checked)}
                            disabled={!record.price || record.price <= 0 || record.price === 1 || record.price === -1}
                        />
                    )}
                    {record.a_number}
                </Space>
            )
        },
        {
            title: '渠道名称',
            dataIndex: 'channelName',
            width: 200,
            render: (_, record) => {
                return record.expressSupplier ? `[${record.expressSupplier}]- ${record.channelName} ` : record.channelName;
            }
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

    return (
        <div style={{  maxWidth: '100%', margin: '0 auto' }}>  
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

                            <Form.Item 
                                name="products" 
                                label="产品" 
                                rules={[{ required: true, message: '请选择产品' }]}
                                initialValue={[]}
                            >
                                <div>
                                    <Dropdown
                                        overlay={
                                            <Menu 
                                                items={generateMenuItems()} 
                                                onClick={(e) => e.domEvent.stopPropagation()}
                                            />
                                        }
                                        trigger={['click']}
                                        disabled={!isRegionSelected}
                                        open={dropdownVisible}
                                        onOpenChange={handleDropdownVisibleChange}
                                    >
                                        <Button style={{ width: '100%', textAlign: 'left' }}>
                                            {selectedProducts.length > 0 
                                                ? `已选择 ${selectedProducts.length} 个产品`
                                                : '请选择产品'
                                            }
                                        </Button>
                                    </Dropdown>
                                    {renderSelectedProducts()}
                                </div>
                            </Form.Item>

                            {/* <Form.Item name="file" label="上传文件" rules={[{ required: true, message: '请上传文件' }]}>
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
                            </Form.Item> */}
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card 
                        title="上传数据预览" 
                        bordered={false} 
                        style={{ height: '400px', overflowY: 'auto' }}
                        extra={
                            <Space>
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
                    >
                        <Table<UploadedDataType>
                            columns={uploadedColumns}
                            dataSource={uploadedData}
                            rowKey="id"
                            scroll={{ y: 400 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row style={{ marginTop: '12px' }}>
                <Col span={24}>
                    <Card 
                        title="试算结果" 
                        bordered={false}
                        extra={
                            <Space>
                                <Button 
                                    icon={<ClearOutlined />}
                                    onClick={handleClearResults}
                                >
                                    清空结果
                                </Button>
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
                confirmLoading={loading}
                okButtonProps={{ 
                    loading: loading,
                    disabled: loading 
                }}
                cancelButtonProps={{ 
                    disabled: loading 
                }}
            >
                <p>确认要为选中的订单进行下单吗？</p>
            </Modal>

            {/* 手动添加数据的弹窗 */}
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
