import React, { useState, useEffect } from 'react';
import { Product } from './types';
import { Table, Button, Form, Input, Modal, Pagination, message, Select, Upload, Space, Spin, Dropdown, Card, Row, Col, Tooltip, AutoComplete, Timeline, Tag } from 'antd';
import moment from 'moment';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, EyeOutlined, MinusCircleOutlined, PlusOutlined, CopyOutlined, RetweetOutlined, MoreOutlined, SearchOutlined, HistoryOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { InputNumber } from 'antd/lib';

const { confirm } = Modal;
const { Option } = Select;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

// 定义路线配置
const ROUTE_CONFIGS = {
    'China-America': {
        label: '中国出口美国',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', '属性绑定工厂', '豁免代码', '豁免代码含义', '认证', 'Duty', '加征', '豁免截止日期说明', '豁免过期后', '更新时间', '备注']
    },
    'China-Canada': {
        label: '中国出口加拿大',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', '属性绑定工厂', '豁免代码', '认证', 'Duty', '加征', '更新时间', '备注']
    },
    'China-Europe': {
        label: '中国出口欧洲',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', 'Duty', '加征', '更新时间', '备注']
    },
    'China-Australia': {
        label: '中国出口澳洲',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', 'Duty', '更新时间', '备注']
    },
    'China-England': {
        label: '中国出口英国',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', 'Duty', '更新时间', '备注']
    },
    'China-Vietnam': {
        label: '中国出口越南',
        apiEndpoint: '/qingguan/products/',
        seaApiEndpoint: '/qingguan/products_sea/',
        columns: ['中文品名', '英文品名', 'HS_CODE', '件箱', '单价', '材质', '用途', 'Duty', '更新时间', '备注']
    }
};

const SeaAllProductTable: React.FC = () => {
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productForm] = Form.useForm();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isProductModalVisible, setProductModalVisible] = useState(false);
    const [productPage, setProductPage] = useState(1);
    const [productPageSize, setProductPageSize] = useState(10);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isFiltered, setIsFiltered] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isBatchUpdateModalVisible, setIsBatchUpdateModalVisible] = useState(false);
    const [batchUpdateColumns, setBatchUpdateColumns] = useState<string[]>([]);
    const [batchUpdateFile, setBatchUpdateFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [factories, setFactories] = useState<any[]>([]);
    const [tariffData, setTariffData] = useState<any[]>([]);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [currentProductId, setCurrentProductId] = useState<string>('');

    const userName = useSelector((state: RootState) => state.user.name);

    const [searchForm] = Form.useForm();
    const [routeForm] = Form.useForm();

    // 获取工厂列表
    const fetchFactories = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/factory/`);
            const data = await response.data;
            setFactories(data.items || []);
        } catch (error) {
            console.error('Failed to fetch factories:', error);
            message.error('获取工厂列表失败');
        }
    };

    // 获取所有加征数据
    const fetchAllTariffs = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/tariff/list/all`);
            setTariffData(response.data || []);
        } catch (error) {
            console.log('获取加征数据失败');
            setTariffData([]);
        }
    };

    // 在组件加载时获取工厂列表和加征数据
    useEffect(() => {
        fetchFactories();
        fetchAllTariffs();
    }, []);

    // 路线选择相关状态
    const [startland, setStartland] = useState<string>('');
    const [destination, setDestination] = useState<string>('');
    const transport_type = '海运'; // 固定为海运
    const [currentRoute, setCurrentRoute] = useState<string>('');
    const [showTable, setShowTable] = useState(false);

    // 处理查询按钮点击
    const handleRouteSearch = (values: any) => {
        const { startland: start, destination: dest } = values;
        
        if (!start || !dest) {
            message.warning('请选择起运地和目的地');
            return;
        }

        setStartland(start);
        setDestination(dest);
        setCurrentRoute(`${start}-${dest}`);
        setShowTable(true);
        
        // 重置分页
        setProductPage(1);
        
        // 获取产品数据
        fetchAllProducts(start, dest, '海运');
    };

    const fetchAllProducts = async (start: string, dest: string, type: string, append = false) => {
        try {
            setLoadingProducts(true);

            const routeKey = `${start}-${dest}` as keyof typeof ROUTE_CONFIGS;
            const routeConfig = ROUTE_CONFIGS[routeKey];
            
            if (!routeConfig) {
                message.error('不支持的路线');
                setLoadingProducts(false);
                return;
            }

            const apiEndpoint = type.includes("空运") 
                ? `${server_url}${routeConfig.apiEndpoint}?get_all=true&username=${userName}&startland=${start}&destination=${dest}`
                : `${server_url}${routeConfig.seaApiEndpoint}?get_all=true&username=${userName}&startland=${start}&destination=${dest}`;
                
            const response = await axiosInstance.get(apiEndpoint);
            const data = await response.data;

            setAllProducts((prevProducts) => {
                const newProducts = append ? [...prevProducts, ...data.items] : data.items;
                const paginatedProducts = newProducts.slice(0, productPageSize);
                setTotalProducts(newProducts.length);
                setProducts(paginatedProducts);
                return newProducts;
            });

            // 获取类别数据（空运和海运都需要）
            const uniqueCategories = Array.from(new Set(data.items.map((product: Product) => product.类别))).filter(Boolean) as string[];
            setCategories(uniqueCategories);

            setLoadingProducts(false);

        } catch (error) {
            console.error('Failed to fetch products:', error);
            message.error('获取产品数据失败');
            setLoadingProducts(false);
        }
    };

    const deleteProduct = async (id: string) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: '您确定要删除该产品吗？',
            onOk: async () => {
                try {
                    const apiEndpoint = transport_type.includes("空运")
                        ? `${server_url}/qingguan/products/${id}`
                        : `${server_url}/qingguan/products_sea/${id}`;
                    
                    await axiosInstance.delete(apiEndpoint);
                    message.success('删除成功');
                    fetchAllProducts(startland, destination, transport_type);
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleProductSubmit = async (values: Product) => {
        const processedValues = {
            总税率: values.总税率 ?? '',
            中文品名: values.中文品名 ?? '',
            英文品名: values.英文品名 ?? '',
            HS_CODE: values.HS_CODE ?? '',
            Duty: values.Duty ? Number(values.Duty) / 100 : '',
            加征: Array.isArray(values.加征) ? values.加征.reduce((obj: any, item: any) => {
                obj[item.name] = Number(item.value) / 100;
                return obj;
            }, {}) : {},
            豁免代码: values.豁免代码 ?? '',
            豁免代码含义: values.豁免代码含义 ?? '',
            豁免截止日期说明: values.豁免截止日期说明 ?? '',
            豁免过期后: values.豁免过期后 ?? '',
            认证: values.认证 ?? '',
            件箱: values.件箱 ?? '',
            单价: values.单价 ?? '',
            材质: values.材质 ?? '',
            用途: values.用途 ?? '',
            更新时间: values.更新时间 ?? '',
            类别: values.类别 ?? '',
            属性绑定工厂: values.属性绑定工厂 ?? '',
            备注: values.备注 ?? '',
            单件重量合理范围: values.单件重量合理范围 ?? '',
            客户: values.客户 ?? '',
            报关代码: values.报关代码 ?? '',
            客人资料美金: values.客人资料美金 ?? '',
            single_weight: values.single_weight ?? null,
            single_weight_range: values.single_weight_range ?? {
                min_weight_per_box: null,
                max_weight_per_box: null
            },
            自税: values.自税,
            类型: values.类型,
            country: startland,
            startland: startland,
            destination: destination,
            other_rate: values.other_rate ?? "",
            加征0204: values.加征0204 ?? "",
            加征代码: values.加征代码 ?? ""
        };

        confirm({
            title: '确认',
            icon: <ExclamationCircleOutlined />,
            content: editingProduct ? '确定要修改该产品吗？' : '确定要添加该产品吗？',
            onOk: async () => {
                try {
                    const formData = new FormData();
                    const file = productForm.getFieldValue('huomian_file');
                    if (file) {
                        formData.append('file', file.file.originFileObj);
                    }
                    formData.append('product', JSON.stringify(processedValues));
                    
                    let api_point = "";
                    if(transport_type.includes("空运")){
                        api_point = `${server_url}/qingguan/products/`;
                    } else {
                        api_point = `${server_url}/qingguan/products_sea/`;
                    }
                    
                    if (editingProduct) {
                        await axiosInstance.put(`${api_point}${editingProduct.id}`, formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        });
                    } else {
                        await axiosInstance.post(api_point, formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        });
                    }
                    
                    message.success(editingProduct ? '修改成功' : '添加成功');
                    fetchAllProducts(startland, destination, transport_type);
                    setProductModalVisible(false);
                    productForm.resetFields();
                    setEditingProduct(null);
                } catch (error) {
                    message.error(editingProduct ? '修改失败' : '添加失败');
                }
            },
        });
    };

    const exportToExcel = async () => {
        try {
            let api_point = "";
            if (transport_type.includes("空运")) {
                api_point = `${server_url}/qingguan/output_products?startland=${startland}&destination=${destination}`;
            } else {
                api_point = `${server_url}/qingguan/output_products?transport_type=sea&startland=${startland}&destination=${destination}`;
            }
            
            const response = await axiosInstance.get(api_point, {
                responseType: 'blob',
            });
            
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${startland}_${destination}_${transport_type}_products.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success('导出成功');
        } catch (error) {
            console.error('导出Excel失败', error);
            message.error('导出Excel失败');
        }
    };

    // 动态生成表格列
    const generateColumns = () => {
        const routeKey = currentRoute as keyof typeof ROUTE_CONFIGS;
        const routeConfig = ROUTE_CONFIGS[routeKey];
        
        if (!routeConfig) return [];

        const baseColumns = [
            {
                title: '序号',
                dataIndex: 'index',
                key: 'index',
                width: 59,
                render: (_: any, __: any, index: number) => `${(productPage - 1) * productPageSize + index + 1}`,
            },
            {
                title: '操作',
                key: 'action',
                width: 50,
                fixed: 'left' as const,
                render: (_: any, record: Product) => {
                    const items = [
                        {
                            key: 'edit',
                            icon: <EditOutlined />,
                            label: '编辑',
                            onClick: () => handleEdit(record)
                        },
                        {
                            key: 'history',
                            icon: <HistoryOutlined />,
                            label: '查看历史',
                            onClick: () => fetchHistory(record.id)
                        },
                        {
                            key: 'delete',
                            icon: <DeleteOutlined />,
                            label: '删除',
                            onClick: () => deleteProduct(record.id)
                        },
                        {
                            key: 'copy',
                            icon: <CopyOutlined />,
                            label: `复制到${transport_type.includes("空运") ? "海运" : "空运"}`,
                            onClick: () => copyProduct(record)
                        },
                        {
                            key: 'clone',
                            icon: <RetweetOutlined />,
                            label: '克隆',
                            onClick: () => cloneProduct(record)
                        }
                    ];

                    return (
                        <Dropdown
                            menu={{ items }}
                            placement="bottomRight"
                            trigger={['hover', 'click']}
                        >
                            <Button icon={<MoreOutlined />} />
                        </Dropdown>
                    );
                },
            },
            {
                title: '是否隐藏',
                dataIndex: 'is_hidden',
                key: 'is_hidden',
                width: 120,
                render: (isHidden: boolean, record: Product) => (
                    <Button
                        type={isHidden ? "primary" : "default"}
                        danger={isHidden}
                        onClick={() => toggleHidden(record)}
                    >
                        {isHidden ? '已隐藏' : '已显示'}
                    </Button>
                ),
            }
        ];

        // 根据路线配置动态添加列
        const dynamicColumns = routeConfig.columns.map(columnKey => {
            const columnConfig: any = {
                title: columnKey,
                dataIndex: columnKey,
                key: columnKey,
                width: 120,
                ellipsis: true,
            };

            // 特殊列处理
            if (columnKey === '中文品名' || columnKey === '英文品名') {
                columnConfig.width = 150;
                columnConfig.render = (text: string) => <Tooltip title={text}>{text}</Tooltip>;
            } else if (columnKey === 'HS_CODE') {
                columnConfig.width = 120;
            } else if (columnKey === 'Duty') {
                columnConfig.render = (text: any) => `${(Number(text) * 100).toFixed(2)}%`;
            } else if (columnKey === '加征') {
                columnConfig.render = (text: any) => `${(Number(text) * 100).toFixed(2)}%`;
            } else if (columnKey === '更新时间') {
                columnConfig.render = (text: any) => moment(text).format('YYYY-MM-DD');
            } else if (columnKey === '类别' && transport_type === "海运") {
                columnConfig.width = 120;
                columnConfig.filters = Array.from(new Set(products.map(product => product.类别)))
                    .map(category => ({ text: category, value: category }));
                columnConfig.onFilter = (value: any, record: any) => record.类别 === value;
            }

            return columnConfig;
        });

        return [...baseColumns, ...dynamicColumns];
    };

    const handleEdit = async (record: Product) => {
        productForm.resetFields();
        setEditingProduct(record);
        
        setTimeout(() => {
            const jiazhengArray = record.加征 ? 
                Object.entries(record.加征).map(([name, value]) => ({
                    name,
                    value: Number((Number(value) * 100).toFixed(10))
                })) : [];

            productForm.setFieldsValue({
                ...record,
                Duty: record.Duty ? Number((Number(record.Duty) * 100).toFixed(10)) : undefined,
                类别: record.类别 || '',
                startland: startland,
                destination: destination,
                transport_type: transport_type,
                更新时间: record.更新时间 ? moment(record.更新时间) : moment().startOf('day'),
                加征: jiazhengArray,
                single_weight_range: record.single_weight_range || {
                    min_weight_per_box: null,
                    max_weight_per_box: null
                }
            });
            setProductModalVisible(true);
        }, 0);
    };

    const handleAdd = async () => {
        setEditingProduct(null);
        productForm.resetFields();
        
        // 设置默认值
        productForm.setFieldsValue({
            startland: startland,
            destination: destination,
            transport_type: transport_type
        });
        setProductModalVisible(true);
    };

    const copyProduct = async (record: Product) => {
        const targetType = transport_type.includes("空运") ? "海运" : "空运";
        confirm({
            title: `确认复制`,
            content: `确定要将该产品复制到${targetType}吗？`,
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                try {
                    const newProduct = {
                        ...record,
                        id: undefined,
                        类型: targetType,
                        更新时间: moment().format('YYYY-MM-DD'),
                    };

                    const formData = new FormData();
                    formData.append('product', JSON.stringify(newProduct));

                    const api_point = targetType === "海运" 
                        ? `${server_url}/qingguan/products_sea/`
                        : `${server_url}/qingguan/products/`;

                    await axiosInstance.post(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    message.success(`成功复制到${targetType}`);
                    fetchAllProducts(startland, destination, transport_type);
                } catch (error) {
                    console.error('复制失败:', error);
                    message.error('复制失败');
                }
            },
        });
    };

    const cloneProduct = async (record: Product) => {
        confirm({
            title: `确认克隆`,
            content: `确定要克隆这个产品吗？`,
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                try {
                    const newProduct = {
                        ...record,
                        id: undefined,
                        更新时间: moment().format('YYYY-MM-DD'),
                        中文品名: record.中文品名 + '(克隆)',
                    };

                    const formData = new FormData();
                    formData.append('product', JSON.stringify(newProduct));

                    const api_point = transport_type.includes("空运") 
                        ? `${server_url}/qingguan/products/`
                        : `${server_url}/qingguan/products_sea/`;

                    await axiosInstance.post(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    message.success('克隆成功');
                    fetchAllProducts(startland, destination, transport_type);
                } catch (error) {
                    console.error('克隆失败:', error);
                    message.error('克隆失败');
                }
            },
        });
    };

    const handleSearch = (values: any) => {
        const { chineseName, hsCode, huomianCode, category, isHidden } = values;
        let filteredData = [...allProducts];

        if (chineseName) {
            filteredData = filteredData.filter(product => product.中文品名 && product.中文品名.includes(chineseName));
        }
        if (hsCode) {
            filteredData = filteredData.filter(product => product.HS_CODE && product.HS_CODE.includes(hsCode));
        }
        if (huomianCode) {
            filteredData = filteredData.filter(product => product.豁免代码 && product.豁免代码.includes(huomianCode));
        }
        if (category) {
            filteredData = filteredData.filter(product => product.类别 === category);
        }
        if (isHidden !== undefined) {
            if (isHidden === false) {
                filteredData = filteredData.filter(product => !product.is_hidden || product.is_hidden === undefined);
            } else {
                filteredData = filteredData.filter(product => product.is_hidden === isHidden);
            }
        }

        setFilteredProducts(filteredData);
        setIsFiltered(true);
        setTotalProducts(filteredData.length);
        setProducts(filteredData.slice(0, productPageSize));
    };

    const handleReset = () => {
        searchForm.resetFields();
        setIsFiltered(false);
        setFilteredProducts([]);
        setTotalProducts(allProducts.length);
        setProducts(allProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize));
        fetchAllProducts(startland, destination, transport_type);
    };

    const toggleHidden = async (record: Product) => {
        confirm({
            title: '确认操作', 
            icon: <ExclamationCircleOutlined />,
            content: `确定要${record.is_hidden ? '显示' : '隐藏'}该产品吗？`,
            onOk: async () => {
                try {
                    const newHiddenState = !record.is_hidden;
                    const formData = new FormData();
                    formData.append('product', JSON.stringify({
                        is_hidden: newHiddenState
                    }));
                    
                    const api_point = transport_type.includes("空运") 
                        ? `${server_url}/qingguan/products/${record.id}`
                        : `${server_url}/qingguan/products_sea/${record.id}`;
                    
                    await axiosInstance.put(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    message.success(`${newHiddenState ? '隐藏' : '显示'}成功`);
                    fetchAllProducts(startland, destination, transport_type);
                } catch (error) {
                    message.error('更新失败');
                    console.error('更新失败:', error);
                }
            }
        });
    };

    const handleBulkToggleHidden = async (isHidden: boolean) => {
        if (selectedRowKeys.length === 0) {
            message.warning('请至少选择一项');
            return;
        }

        confirm({
            title: `确认批量${isHidden ? '隐藏' : '显示'}`,
            content: `确定要${isHidden ? '隐藏' : '显示'}选中的 ${selectedRowKeys.length} 个产品吗？`,
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                try {
                    const formData = new FormData();
                    formData.append('bulk_hide', JSON.stringify({
                        product_ids: selectedRowKeys,
                        is_hidden: isHidden
                    }));
                    
                    const api_point = transport_type.includes("空运") 
                        ? `${server_url}/qingguan/products/bulk_hide`
                        : `${server_url}/qingguan/products_sea/bulk_hide`;
                    
                    await axiosInstance.post(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    message.success('批量操作成功');
                    await fetchAllProducts(startland, destination, transport_type);
                    setSelectedRowKeys([]);
                } catch (error) {
                    console.error('批量操作失败:', error);
                    message.error('批量操作失败');
                }
            },
        });
    };

    const handleBatchUpload = async (file: File) => {
        setIsUploading(true);
        setBatchUpdateFile(file);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                const columns = jsonData[0] as string[];
                
                setBatchUpdateColumns(columns);
                setIsBatchUpdateModalVisible(true);
            } catch (error) {
                message.error('读取Excel文件失败');
                console.error(error);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        
        return false;
    };

    const handleBatchUpdateConfirm = async () => {
        if (!batchUpdateFile) {
            message.error('请先选择文件');
            return;
        }

        setIsUpdating(true);
        const formData = new FormData();
        formData.append('file', batchUpdateFile);

        try {
            const response = await axiosInstance.post(`${server_url}/qingguan/products/update_batch?transport_type=${transport_type}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            message.success(response.data.message);
            setIsBatchUpdateModalVisible(false);
            fetchAllProducts(startland, destination, transport_type);
        } catch (error) {
            message.error('批量更新失败');
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    // 获取修改历史
    const fetchHistory = async (productId: string) => {
        setLoadingHistory(true);
        setCurrentProductId(productId);
        try {
            const apiEndpoint = transport_type.includes("空运")
                ? `${server_url}/qingguan/products/${productId}/history`
                : `${server_url}/qingguan/products_sea/${productId}/history`;

            const response = await axiosInstance.get(apiEndpoint);
            setHistoryData(response.data.edit_log || []);
            setIsHistoryModalVisible(true);
        } catch (error) {
            console.error('获取历史记录失败:', error);
            message.error('获取历史记录失败');
        } finally {
            setLoadingHistory(false);
        }
    };

    // 渲染修改详情
    const renderChangeDetails = (details: any) => {
        if (!details) return null;

        if (details.说明 === "无字段变更") {
            return <Tag color="blue">无字段变更</Tag>;
        }

        return (
            <div style={{ marginTop: 8 }}>
                {Object.entries(details).map(([key, value]: [string, any]) => {
                    if (key === '说明') return null;

                    const oldValue = value.原值;
                    const newValue = value.新值;

                    // 处理复杂对象
                    const formatValue = (val: any) => {
                        if (val === null || val === undefined || val === '') {
                            return <Tag color="default">空</Tag>;
                        }
                        if (typeof val === 'object') {
                            return (
                                <pre style={{ margin: 0, fontSize: 12, maxWidth: 400, overflow: 'auto' }}>
                                    {JSON.stringify(val, null, 2)}
                                </pre>
                            );
                        }
                        return <span>{String(val)}</span>;
                    };

                    return (
                        <div key={key} style={{ marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{key}</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <Tag color="red">原值</Tag>
                                    {formatValue(oldValue)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Tag color="green">新值</Tag>
                                    {formatValue(newValue)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>海运产品管理</h1>
            
            {/* 路线选择区域 */}
            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={routeForm}
                    onFinish={handleRouteSearch}
                    layout="inline"
                >
                    <Form.Item label="起运地" name="startland" rules={[{ required: true, message: '请选择起运地' }]}>
                        <Select style={{ width: 150 }} placeholder="请选择起运地">
                            <Option value="China">中国</Option>
                            <Option value="Vietnam">越南</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="目的地" name="destination" rules={[{ required: true, message: '请选择目的地' }]}>
                        <Select style={{ width: 150 }} placeholder="请选择目的地">
                            <Option value="America">美国</Option>
                            <Option value="Canada">加拿大</Option>
                            <Option value="Europe">欧洲</Option>
                            <Option value="Australia">澳洲</Option>
                            <Option value="England">英国</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                            查询
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* 表格区域 - 只在查询后显示 */}
            {showTable && (
                <>
                    <Card style={{ marginBottom: 16 }}>
                        <Form
                            form={searchForm}
                            onFinish={handleSearch}
                            layout="vertical"
                        >
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Form.Item label="中文品名" name="chineseName">
                                        <Input placeholder="请输入中文品名..." />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item label="HS编码" name="hsCode">
                                        <Input placeholder="请输入HS编码..." />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item label="豁免代码" name="huomianCode">
                                        <Input placeholder="请输入豁免代码..." />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item label="类别" name="category">
                                        <Select
                                            showSearch
                                            allowClear
                                            placeholder="请选择或输入类别"
                                            options={categories.map(cat => ({ label: cat, value: cat }))}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item label="是否隐藏" name="isHidden">
                                        <Select allowClear placeholder="请选择显示状态">
                                            <Option value={true}>已隐藏</Option>
                                            <Option value={false}>已显示</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row justify="end" style={{ marginTop: 16 }}>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        查询
                                    </Button>
                                    <Button onClick={handleReset}>
                                        重置
                                    </Button>
                                </Space>
                            </Row>
                        </Form>
                    </Card>

                    <Row justify="space-between" style={{ marginBottom: 16 }}>
                        <Space>
                            <strong>当前路线：{ROUTE_CONFIGS[currentRoute as keyof typeof ROUTE_CONFIGS]?.label} - 海运</strong>
                        </Space>
                        <Space>
                            {selectedRowKeys.length > 0 && (
                                <>
                                    <Button onClick={() => handleBulkToggleHidden(true)}>批量隐藏</Button>
                                    <Button onClick={() => handleBulkToggleHidden(false)}>批量显示</Button>
                                </>
                            )}
                            <Button type="primary" onClick={handleAdd}>新增产品</Button>
                            <Button onClick={exportToExcel}>导出所有产品</Button>
                            <Upload
                                accept=".xlsx,.xls"
                                showUploadList={false}
                                beforeUpload={handleBatchUpload}
                            >
                                <Button type="primary">批量更新</Button>
                            </Upload>
                        </Space>
                    </Row>

                    <Spin spinning={loadingProducts}>
                        <Table
                            className={styles.table}
                            dataSource={products}
                            columns={generateColumns()}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: (keys) => setSelectedRowKeys(keys),
                            }}
                            pagination={false}
                            rowKey="id"
                            scroll={{
                                y: 'calc(100vh - 450px)'
                            }}
                            sticky
                            size="small"
                        />
                    </Spin>

                    <Pagination
                        className={styles.pagination}
                        current={productPage}
                        pageSize={productPageSize}
                        total={totalProducts}
                        onChange={(page, pageSize) => {
                            setProductPage(page);
                            setProductPageSize(pageSize);

                            const dataSource = isFiltered ? filteredProducts : allProducts;
                            const start = (page - 1) * pageSize;
                            const end = start + pageSize;
                            const paginatedProducts = dataSource.slice(start, end);
                            setProducts(paginatedProducts);
                        }}
                        showSizeChanger
                        pageSizeOptions={['10', '20', '30', '40', `${totalProducts}`]}
                        showTotal={(total, range) => `${range[0]}-${range[1]} 共 ${total} 项`}
                    />
                </>
            )}

            {/* 产品编辑模态框 */}
            <Modal
                title={editingProduct ? "编辑产品信息" : "新增产品信息"}
                open={isProductModalVisible}
                onCancel={() => {
                    setProductModalVisible(false);
                    setEditingProduct(null);
                    productForm.resetFields();
                }}
                onOk={() => {
                    productForm.submit();
                }}
                width={800}
                afterClose={() => {
                    setEditingProduct(null);
                    productForm.resetFields();
                }}
            >
                <Form
                    form={productForm}
                    onFinish={handleProductSubmit}
                    layout="vertical"
                >
                    {/* 隐藏字段 */}
                    <Form.Item name="startland" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item name="destination" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item name="transport_type" hidden>
                        <Input />
                    </Form.Item>

                    {/* 显示当前路线信息 */}
                    <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
                        <strong>当前路线：</strong>{startland} → {destination} ({transport_type})
                    </div>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="中文品名" name="中文品名" rules={[{ required: true, message: '中文品名是必填项' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="英文品名" name="英文品名" rules={[{ required: true, message: '英文品名是必填项' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="HS_CODE" name="HS_CODE" rules={[{ required: true, message: 'HS_CODE是必填项' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="件/箱" name="件箱" rules={[{ required: true}]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="单价" name="单价" rules={[{ required: true}]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="材质" name="材质">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="用途" name="用途">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="属性绑定工厂" name="属性绑定工厂" rules={[{ required: true, message: '工厂是必填项' }]}>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="请选择或搜索工厂"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={factories.map(factory => ({
                                        label: `${factory.属性} - ${factory.中文名字}`,
                                        value: factory.属性
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="豁免代码" name="豁免代码">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="豁免代码含义" name="豁免代码含义">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="认证" name="认证">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item 
                                label="Duty" 
                                name="Duty"
                                rules={[
                                    { required: false },
                                    { type: 'number', min: 0, max: 100, message: '请输入0-100之间的数值' }
                                ]}
                            >
                                <InputNumber 
                                    min={0} 
                                    max={100} 
                                    step={0.01} 
                                    style={{ width: '100%' }}
                                    placeholder="请输入百分比（如20表示20%）"
                                    addonAfter="%"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.List name="加征">
                        {(fields, { add, remove }) => (
                            <>
                                <div style={{ marginBottom: 16 }}>加征设置</div>
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
                                                rules={[{ required: true, message: '请选择加征类型' }]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <Select
                                                    showSearch
                                                    placeholder="请选择加征类型"
                                                    allowClear
                                                    filterOption={(input, option) =>
                                                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    options={tariffData
                                                        // .filter((t: any) => {
                                                        //     const currentCategory = productForm.getFieldValue('类别');
                                                        //     const matchRoute = t.start_land?.toUpperCase() === startland?.toUpperCase() && 
                                                        //                      t.destination?.toUpperCase() === destination?.toUpperCase();
                                                            
                                                        //     if (!currentCategory) {
                                                        //         return matchRoute;
                                                        //     }
                                                            
                                                        //     const categories = Array.isArray(t.category) ? t.category : [t.category];
                                                        //     const matchCategory = categories.includes('*') || categories.includes(currentCategory);
                                                            
                                                        //     return matchRoute && matchCategory;
                                                        // })
                                                        .map((t: any) => ({
                                                            label: `加征_${t.tariff_type}`,
                                                            value:`加征_${t.tariff_type}`,
                                                            tariff_rate: t.tariff_rate
                                                        }))
                                                    }
                                                    onChange={(value, option: any) => {
                                                        if (option) {
                                                            const currentValues = productForm.getFieldValue('加征') || [];
                                                            currentValues[name] = {
                                                                name: value,
                                                                value: Number((Number(option.tariff_rate) * 100).toFixed(10))
                                                            };
                                                            productForm.setFieldsValue({ 加征: currentValues });
                                                        }
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'value']}
                                                rules={[
                                                    { required: true, message: '请输入加征值' },
                                                    { type: 'number', min: 0, max: 100, message: '请输入0-100之间的数值' }
                                                ]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <InputNumber 
                                                    min={0} 
                                                    max={100} 
                                                    step={0.01} 
                                                    style={{ width: '100%' }}
                                                    placeholder="请输入百分比（如20表示20%）"
                                                    addonAfter="%"
                                                />
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
                                                const newName = `加征_${fields.length + 1}`;
                                                add({ name: newName, value: '' });
                                            }}
                                            block
                                            icon={<PlusOutlined />}
                                        >
                                            添加加征项
                                        </Button>
                                    </Form.Item>
                                </div>
                            </>
                        )}
                    </Form.List>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="豁免截止日期/说明" name="豁免截止日期说明">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="豁免过期后" name="豁免过期后">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="类别" name="类别" rules={[{ required: true, message: '类别是必填项' }]}>
                                <AutoComplete
                                    placeholder="请选择或输入类别"
                                    options={categories.map(cat => ({ label: cat, value: cat }))}
                                    filterOption={(inputValue, option) =>
                                        (option?.label ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
                                    }
                                    allowClear
                                    dropdownMatchSelectWidth={252}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="备注" name="备注">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="单件重量合理范围" name="单件重量合理范围">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="客户" name="客户">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="报关代码" name="报关代码">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="客人资料美金" name="客人资料美金">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="单箱重量(net weight)" name="single_weight">
                                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="单箱重量范围" style={{ marginBottom: 16 }}>
                        <Input.Group compact>
                            <Form.Item
                                name={['single_weight_range', 'min_weight_per_box']}
                                style={{ display: 'inline-block', width: 'calc(50% - 12px)' }}
                            >
                                <InputNumber
                                    placeholder="最小重量"
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    addonBefore="最小"
                                />
                            </Form.Item>
                            <span style={{ display: 'inline-block', width: '24px', textAlign: 'center', lineHeight: '32px' }}>~</span>
                            <Form.Item
                                name={['single_weight_range', 'max_weight_per_box']}
                                style={{ display: 'inline-block', width: 'calc(50% - 12px)' }}
                            >
                                <InputNumber
                                    placeholder="最大重量"
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    addonBefore="最大"
                                />
                            </Form.Item>
                        </Input.Group>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="自税" name="自税" rules={[{ required: true }]}>
                                <Select placeholder="请选择自税">
                                    <Option value={true}>是</Option>
                                    <Option value={false}>否</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="类型" name="类型" rules={[{ required: true }]}>
                                <Select placeholder="请选择类型">
                                    <Option value='空运'>空运</Option>
                                    <Option value='海运'>海运</Option>
                                    <Option value='混合'>混合</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="豁免文件上传" name="huomian_file">
                        <Upload
                            onChange={(info) => {
                                if (info.file.status === 'removed') {
                                    productForm.setFieldsValue({ huomian_file: null });
                                }
                            }}
                        >
                            <Button icon={<UploadOutlined />}>点击上传</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 批量更新确认模态框 */}
            <Modal
                title="确认批量更新"
                open={isBatchUpdateModalVisible}
                onOk={handleBatchUpdateConfirm}
                onCancel={() => setIsBatchUpdateModalVisible(false)}
                confirmLoading={isUpdating}
            >
                <p>请确认以下列是否需要更新：</p>
                <ul>
                    {batchUpdateColumns.map((column, index) => (
                        <li key={index}>{column}</li>
                    ))}
                </ul>
                <p>注意：Excel文件必须包含id列，用于匹配需要更新的记录。</p>
            </Modal>

            {/* 修改历史模态框 */}
            <Modal
                title="修改历史记录"
                open={isHistoryModalVisible}
                onCancel={() => {
                    setIsHistoryModalVisible(false);
                    setHistoryData([]);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setIsHistoryModalVisible(false);
                        setHistoryData([]);
                    }}>
                        关闭
                    </Button>
                ]}
                width={800}
            >
                <Spin spinning={loadingHistory}>
                    {historyData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            暂无修改历史记录
                        </div>
                    ) : (
                        <Timeline
                            mode="left"
                            items={historyData.map((log, index) => ({
                                color: log.操作 === '更新' ? 'blue' : log.操作 === '创建' ? 'green' : 'red',
                                children: (
                                    <Card
                                        key={index}
                                        size="small"
                                        style={{ marginBottom: 16 }}
                                        title={
                                            <Space>
                                                <Tag color={log.操作 === '更新' ? 'blue' : log.操作 === '创建' ? 'green' : 'red'}>
                                                    {log.操作}
                                                </Tag>
                                                <span>{log.操作时间}</span>
                                            </Space>
                                        }
                                        extra={<Tag color="purple">操作人: {log.操作人}</Tag>}
                                    >
                                        {renderChangeDetails(log.修改详情)}
                                    </Card>
                                )
                            }))}
                        />
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default SeaAllProductTable;
