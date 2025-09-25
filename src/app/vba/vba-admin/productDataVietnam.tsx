import React, { useState, useEffect } from 'react';
import { Product } from './types';
import { Table, Button, Form, Input, Modal, Pagination, message, Select, Upload, UploadFile, Space, Dropdown } from 'antd';
import moment from 'moment';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckOutlined, CloseOutlined, UploadOutlined, EyeOutlined, MinusCircleOutlined, PlusOutlined, CopyOutlined, RetweetOutlined, MoreOutlined } from '@ant-design/icons';

import styles from "@/styles/Home.module.css"
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { InputNumber } from 'antd/lib';

const { confirm } = Modal;
const { Option } = Select;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface ProductTableProps {
    transport_type?: string;
}

const ProductDataVietnam: React.FC<ProductTableProps> = ({ transport_type = "空运" }) => {
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productFilter, setProductFilter] = useState('');
    const [productForm] = Form.useForm();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isProductModalVisible, setProductModalVisible] = useState(false);
    const [productPage, setProductPage] = useState(1); // 页数
    const [productPageSize, setProductPageSize] = useState(10); //每页多少
    const [jsonContent, setJsonContent] = useState(null);

    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]); // 用于存储过滤后的产品数据
    const [isFiltered, setIsFiltered] = useState(false); // 用于判断是否处于过滤状态

    // useEffect(() => {
    //     fetchProducts();
    // }, [productPage, productPageSize]); // Add productPageSize as dependency
    const userName = useSelector((state: RootState) => state.user.name);

    useEffect(() => {
        fetchAllProducts();

    }, []); // Add shipperPageSize as dependency

    const fetchAllProducts = async (append = false) => {
        try {
            setLoadingProducts(true);

            const apiEndpoint = transport_type.includes("空运") 
                ? `${server_url}/qingguan/products/?get_all=true&username=${userName}&country=Vietnam`
                : `${server_url}/qingguan/products_sea/?get_all=true&username=${userName}&country=Vietnam`;
                
            const response = await axiosInstance.get(apiEndpoint);
            const data = await response.data;

            setAllProducts((prevProducts) => {
                const newProducts = append ? [...prevProducts, ...data.items] : data.items;
                const paginatedProducts = newProducts.slice(0, productPageSize); // 根据每页数量进行切片
                setTotalProducts(newProducts.length); // 设置产品总数
                setProducts(paginatedProducts); // 设置当前页显示的产品
                return newProducts;
            });

            console.log('count: %d', data.items.length);
            setLoadingProducts(false);

        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    }



    const filterProducts_HSCODE = (filter: string) => {
        if (filter) {
            const filteredProducts = allProducts.filter(product => product.HS_CODE && product.HS_CODE.includes(filter));
            setFilteredProducts(filteredProducts); // 存储过滤后的产品数据
            setIsFiltered(true); // 标记为过滤状态
            setTotalProducts(filteredProducts.length); // 更新总产品数
            setProductPage(1); // 重置当前页为第一页
            setProducts(filteredProducts.slice(0, productPageSize)); // 根据新的分页更新产品列表
        } else {
            setIsFiltered(false); // 标记为非过滤状态
            setFilteredProducts([]); // 清空过滤后的产品数据
            setTotalProducts(allProducts.length); // 恢复总产品数
            setProducts(allProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize));
        }
    }


    const filterProducts_ChineseName = (filter: string) => {
        if (filter) {
            const filteredProducts = allProducts.filter(product => product.中文品名 && product.中文品名.includes(filter));
            setFilteredProducts(filteredProducts); // 存储过滤后的产品数据
            setIsFiltered(true); // 标记为过滤状态
            setTotalProducts(filteredProducts.length); // 更新总产品数
            setProductPage(1); // 重置当前页为第一页
            setProducts(filteredProducts.slice(0, productPageSize)); // 根据新的分页更新产品列表
        } else {
            setIsFiltered(false); // 标记为非过滤状态
            setFilteredProducts([]); // 清空过滤后的产品数据
            setTotalProducts(allProducts.length); // 恢复总产品数
            setProducts(allProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize));
        }
    }


    const filterProducts_HuoMianCode = (filter: string) => {
        if (filter) {
            const filteredProducts = allProducts.filter(product => product.豁免代码 && product.豁免代码.includes(filter));
            setFilteredProducts(filteredProducts); // 存储过滤后的产品数据
            setIsFiltered(true); // 标记为过滤状态
            setTotalProducts(filteredProducts.length); // 更新总产品数
            setProductPage(1); // 重置当前页为第一页
            setProducts(filteredProducts.slice(0, productPageSize)); // 根据新的分页更新产品列表
        } else {
            setIsFiltered(false); // 标记为非过滤状态
            setFilteredProducts([]); // 清空过滤后的产品数据
            setTotalProducts(allProducts.length); // 恢复总产品数
            setProducts(allProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize));
        }
    }


    const deleteProduct = async (id: string) => {
        confirm({
            title: 'Are you sure you want to delete this product?',
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                if(transport_type.includes("空运")){
                    await axiosInstance.delete(`${server_url}/qingguan/products/${id}`);
                }else{
                    await axiosInstance.delete(`${server_url}/qingguan/products_sea/${id}`);
                }
                fetchAllProducts();
            },
        });
    };

    // 添加复制产品的函数
    const copyProduct = async (record: Product) => {
        const targetType = transport_type.includes("空运") ? "海运" : "空运";
        confirm({
            title: `确认复制`,
            content: `确定要将该产品复制到${targetType}吗？`,
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                try {
                    // 创建新的产品数据，复制原有数据并修改必要字段
                    const newProduct = {
                        ...record,
                        id: undefined, // 移除id，让后端生成新的id
                        类型: targetType, // 修改运输类型
                        更新时间: moment().format('YYYY-MM-DD'), // 更新时间为当前时间
                    };

                    // 构建FormData
                    const formData = new FormData();
                    formData.append('product', JSON.stringify(newProduct));

                    // 选择正确的API端点
                    const api_point = targetType === "海运" 
                        ? `${server_url}/qingguan/products_sea/`
                        : `${server_url}/qingguan/products/`;

                    // 发送创建请求
                    await axiosInstance.post(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    message.success(`成功复制到${targetType}`);
                    fetchAllProducts(); // 刷新数据列表
                } catch (error) {
                    console.error('复制失败:', error);
                    message.error('复制失败');
                }
            },
        });
    };

    // 添加克隆产品的函数
    const cloneProduct = async (record: Product) => {
        confirm({
            title: `确认克隆`,
            content: `确定要克隆这个产品吗？`,
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                try {
                    // 创建新的产品数据，复制原有数据并修改必要字段
                    const newProduct = {
                        ...record,
                        id: undefined, // 移除id，让后端生成新的id
                        更新时间: moment().format('YYYY-MM-DD'), // 更新时间为当前时间
                        中文品名: record.中文品名 + '(克隆)', // 添加标记以区分
                    };

                    // 构建FormData
                    const formData = new FormData();
                    formData.append('product', JSON.stringify(newProduct));

                    // 使用当前的API端点
                    const api_point = transport_type.includes("空运") 
                        ? `${server_url}/qingguan/products/`
                        : `${server_url}/qingguan/products_sea/`;

                    // 发送创建请求
                    await axiosInstance.post(api_point, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    message.success('克隆成功');
                    fetchAllProducts(); // 刷新数据列表
                } catch (error) {
                    console.error('克隆失败:', error);
                    message.error('克隆失败');
                }
            },
        });
    };

    const handleProductSubmit = async (values: Product) => {
        // 预处理 values，将 null 值替换为具体的默认值
        const processedValues = {
            // ...values,
            总税率: values.总税率 ?? '',
            中文品名: values.中文品名 ?? '',
            英文品名: values.英文品名 ?? '',
            HS_CODE: values.HS_CODE ?? '',
            Duty: values.Duty ?? '', // 假设 Duty(%) 是一个字符串，而不是数字
            加征: Array.isArray(values.加征) ? values.加征.reduce((obj: any, item: any) => {
                obj[item.name] = item.value;
                return obj;
            }, {}) : {}, // 将加征数组转换为单个对象,key为加征名称,value为加征值

            一箱税金: (Number(values.单价) *
                Number(values.件箱) *
                (Number(values.Duty) + Number(values.加征)
                )
            ).toFixed(2) ?? '',
            豁免代码: values.豁免代码 ?? '',
            豁免代码含义: values.豁免代码含义 ?? '',
            豁免截止日期说明: values.豁免截止日期说明 ?? '', // 假设 豁免截止日期/说明 是一个字符串，而不是日期
            豁免过期后: values.豁免过期后 ?? '',
            认证: values.认证 ?? '',
            件箱: values.件箱 ?? '',
            单价: values.单价 ?? '',
            材质: values.材质 ?? '',
            用途: values.用途 ?? '',
            更新时间: values.更新时间 ?? '', // 假设 更新时间 是一个字符串，而不是日期时间
            类别: values.类别 ?? '',
            属性绑定工厂: values.属性绑定工厂 ?? '',
            // 序号: values.序号 ?? 0, // 假设 序号 是一个数字
            备注: values.备注 ?? '',
            单件重量合理范围: values.单件重量合理范围 ?? '',
            客户: values.客户 ?? '',
            报关代码: values.报关代码 ?? '',
            客人资料美金: values.客人资料美金 ?? '',
            single_weight: values.single_weight ?? null,
            自税: values.自税,
            类型: values.类型,
            // huomian_file_name:values.huomian_file_name,
            country: "Vietnam",
            other_rate: values.other_rate ?? "",
            加征0204: values.加征0204 ?? "",
            加征代码: values.加征代码 ?? ""
        };
        console.log(processedValues)

        // console.log(processedValues)
        confirm({
            title: 'Confirm',
            icon: <ExclamationCircleOutlined />,
            content: editingProduct ? 'Are you sure you want to edit this product?' : 'Are you sure you want to add this product?',
            onOk: async () => {
                const formData = new FormData();
                const file = productForm.getFieldValue('huomian_file')
                if (file) {
                    formData.append('file', file.file.originFileObj);
                }
                formData.append('product', JSON.stringify(processedValues));
                let api_point = ""
                if(transport_type.includes("空运")){
                    api_point = `${server_url}/qingguan/products/`;
                }else{
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
                fetchAllProducts();
                setProductModalVisible(false);
                productForm.resetFields();
                setEditingProduct(null);
            },
        });
    };
    const exportToExcel = async () => {
        try {
            let api_point = "";
            if (transport_type.includes("空运")) {
                api_point = `${server_url}/qingguan/output_products?country=Vietnam`;
            } else {
                api_point = `${server_url}/qingguan/output_products?transport_type=sea&country=Vietnam`;
            }
            const response = await axiosInstance.get(api_point, {
                responseType: 'blob', // Important: Indicate that you expect a blob response
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all_products_${transport_type}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('导出Excel失败', error);
            message.error('导出Excel失败');
        }
    };

    const showExportConfirm = () => {
        confirm({
            title: '确认导出',
            content: '您确定要导出所有产品数据吗？',
            onOk: () => {
                exportToExcel();
                message.success('导出成功');
            },
            onCancel() {
                message.info('导出取消');
            },
        });
    };

    const columnsProduct = [
        {
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            width: 80,
            render: (_: any, __: any, index: number) => `${(productPage - 1) * productPageSize + index + 1}`,
        },
        {
            title: '操作',
            key: 'action',
            width: 50,
            fixed: 'left' as const,
            render: (text: any, record: Product) => {
                const items = [
                    {
                        key: 'edit',
                        icon: <EditOutlined />,
                        label: '编辑',
                        onClick: () => handleEdit(record)
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
            title: '类别',
            dataIndex: '类别',
            key: '类别',
            width: 120,
            filters: Array.from(new Set(products.map(product => product.类别)))
                .map(category => ({ text: category, value: category })),
            onFilter: (value: any, record: any) => record.类别 === value,
        },
        {
            title: '中文品名',
            dataIndex: '中文品名',
            key: '中文品名',
            width: 150,
            ellipsis: true,
        },
        {
            title: '英文品名',
            dataIndex: '英文品名',
            key: '英文品名',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'HS_CODE',
            dataIndex: 'HS_CODE',
            key: 'HS_CODE',
            width: 120,
        },
        {
            title: '件/箱',
            dataIndex: '件箱',
            key: '件箱',
            width: 100,
        },
        {
            title: '单价',
            dataIndex: '单价',
            key: '单价',
            width: 100,
        },
        {
            title: '材质',
            dataIndex: '材质',
            key: '材质',
            width: 120,
            ellipsis: true,
        },
        {
            title: '用途',
            dataIndex: '用途',
            key: '用途',
            width: 120,
            ellipsis: true,
        },
        {
            title: '属性绑定工厂',
            dataIndex: '属性绑定工厂',
            key: '属性绑定工厂',
            width: 150,
            ellipsis: true,
        },
        {
            title: '豁免代码',
            dataIndex: '豁免代码',
            key: '豁免代码',
            width: 120,
        },
        {
            title: '豁免代码含义',
            dataIndex: '豁免代码含义',
            key: '豁免代码含义',
            width: 200,
            ellipsis: true,
        },
        {
            title: '认证',
            dataIndex: '认证',
            key: '认证',
            width: 100,
        },
        {
            title: 'Duty(%)',
            dataIndex: 'Duty',
            key: 'Duty',
            width: 100,
            render: (text: any) => `${(Number(text) * 100).toFixed(2)}%`,
        },
        {
            title: '加征%',
            dataIndex: '加征',
            key: '加征',
            width: 100,
            render: (text: any) => `${(Number(text) * 100).toFixed(2)}%`,
        },
        {
            title: '豁免截止日期/说明',
            dataIndex: '豁免截止日期说明',
            key: '豁免截止日期说明',
            width: 150,
            ellipsis: true,
        },
        {
            title: '豁免过期后',
            dataIndex: '豁免过期后',
            key: '豁免过期后',
            width: 120,
            ellipsis: true,
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            width: 120,
            render: (text: any) => moment(text).format('YYYY-MM-DD'),
        },
        {
            title: '备注',
            dataIndex: '备注',
            key: '备注',
            width: 150,
            ellipsis: true,
        },
        {
            title: '单件重量合理范围',
            dataIndex: '单件重量合理范围',
            key: '单件重量合理范围',
            width: 150,
            ellipsis: true,
        },
        {
            title: '客户',
            dataIndex: '客户',
            key: '客户',
            width: 120,
            ellipsis: true,
        },
        {
            title: '报关代码',
            dataIndex: '报关代码',
            key: '报关代码',
            width: 120,
        },
        {
            title: '客人资料美金',
            dataIndex: '客人资料美金',
            key: '客人资料美金',
            width: 120,
        },
        {
            title: '单个重量',
            dataIndex: 'single_weight',
            key: 'single_weight',
            width: 100,
        },
        {
            title: '自税',
            dataIndex: '自税',
            key: '自税',
            width: 80,
        },
        {
            title: '类型',
            dataIndex: '类型',
            key: '类型',
            width: 100,
        },
    ];

    // 处理编辑按钮点击
    const handleEdit = (record: Product) => {
        productForm.resetFields(); // 先重置表单
        setEditingProduct(record);
        
        // 使用 setTimeout 确保表单重置后再设置新的值
        setTimeout(() => {
            // 将加征对象转换为数组格式以适应 Form.List
            const jiazhengArray = record.加征 ? 
                Object.entries(record.加征).map(([name, value]) => ({
                    name,
                    value
                })) : [];

            productForm.setFieldsValue({
                ...record,
                更新时间: record.更新时间 ? moment(record.更新时间) : moment().startOf('day'),
                加征: jiazhengArray
            });
            setProductModalVisible(true);
        }, 0);
    };

    // 处理新增按钮点击
    const handleAdd = () => {
        setEditingProduct(null);
        productForm.resetFields();
        setProductModalVisible(true);
    };

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>越南出口美国-{transport_type}</h1>
            <Input placeholder="搜索名称..." onChange={e => filterProducts_ChineseName(e.target.value)} />
            <Input placeholder="搜索HSCODE..." onChange={e => filterProducts_HSCODE(e.target.value)} />
            <Input placeholder="搜索豁免代码..." onChange={e => filterProducts_HuoMianCode(e.target.value)} />

            <Button type="primary" onClick={handleAdd}>新增产品</Button>
            <Button type="default" onClick={showExportConfirm}>导出所有产品</Button>

            <Table
                className={styles.table}
                dataSource={products}
                columns={columnsProduct}
                pagination={false}
                rowKey="id"
                scroll={{
                    x: 'max-content',
                    y: 'calc(100vh - 300px)'
                }}
                sticky
                size="middle"
            />
            <Pagination
                className={styles.pagination}
                current={productPage}
                pageSize={productPageSize}
                total={totalProducts}
                onChange={(page, pageSize) => {
                    console.log("当前是第%d页", page);
                    console.log("每页展示%d个", pageSize);

                    setProductPage(page);
                    setProductPageSize(pageSize);

                    // 更新 products
                    const dataSource = isFiltered ? filteredProducts : allProducts; // 判断使用过滤后的数据还是所有数据
                    const start = (page - 1) * pageSize;
                    const end = start + pageSize;
                    const paginatedProducts = dataSource.slice(start, end);
                    setProducts(paginatedProducts); // 设置当前页显示的产品
                }}
                showSizeChanger
                pageSizeOptions={['10', '20', '30', '40', `${totalProducts}`]}
                showTotal={(total, range) => `${range[0]}-${range[1]} 共 ${total} 项`}
            />





            <Modal
                title="产品信息"
                open={isProductModalVisible}
                onCancel={() => {
                    setProductModalVisible(false);
                    setEditingProduct(null);
                    productForm.resetFields();
                }}
                onOk={() => {
                    productForm.submit();
                }}
                afterClose={() => {
                    setEditingProduct(null);
                    productForm.resetFields();
                }}
            >
                <Form
                    form={productForm}
                    onFinish={handleProductSubmit}
                    onFinishFailed={(errorInfo) => {
                        console.log('onFinishFailed:', errorInfo);
                    }}
                >
                    <Form.Item label="中文品名" name="中文品名" rules={[{ required: true, message: '中文品名是必填项' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="英文品名" name="英文品名" rules={[{ required: true, message: '英文品名是必填项' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="HS_CODE" name="HS_CODE" rules={[{ required: true, message: 'HS_CODE是必填项' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="件/箱" name="件箱" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="单价" name="单价" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="材质" name="材质" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="用途" name="用途" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="属性绑定工厂" name="属性绑定工厂" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="豁免代码" name="豁免代码" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="豁免代码含义" name="豁免代码含义" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="认证" name="认证" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    {/* <Form.Item label="一箱税金" name="一箱税金" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item> */}
                    <Form.Item label="Duty(%)" name="Duty" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
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
                                                rules={[{ required: true, message: '请输入加征名称' }]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <Input placeholder="加征名称" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'value']}
                                                rules={[{ required: true, message: '请输入加征值' }]}
                                                style={{ margin: 0, flex: 1 }}
                                            >
                                                <Input placeholder="加征值" />
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
                                            style={{
                                                width: '100%',
                                                maxWidth: 200,
                                                marginTop: 8
                                            }}
                                        >
                                            添加加征项
                                        </Button>
                                    </Form.Item>
                                </div>
                            </>
                        )}
                    </Form.List>
                    {/* <Form.Item label="加征0204%" name="加征0204" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="加征代码" name="加征代码" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item> */}
                    <Form.Item label="其他税率" style={{ marginBottom: 0 }}>
                        <Form.Item
                            name={['other_rate', 'unit']}
                            rules={[{ required: false }]}
                            style={{ display: 'inline-block', width: 'calc(30% - 8px)' }}
                        >
                            <Select placeholder="选择单位">
                                <Option value="/kg">/kg</Option>
                                <Option value="/CBM">/CBM</Option>
                                <Option value="/件">/件</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name={['other_rate', 'value']}
                            rules={[{ required: false }]}
                            style={{ display: 'inline-block', width: 'calc(70% - 8px)', marginLeft: '16px' }}
                        >
                            <Input placeholder="输入税率值" />
                        </Form.Item>
                    </Form.Item>
                    <Form.Item label="豁免截止日期/说明" name="豁免截止日期说明" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="豁免过期后" name="豁免过期后" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    {/* <Form.Item label="更新时间" name="更新时间" rules={[{ required: false }]}>
                    <DatePicker defaultValue={moment().startOf('day')} format="YYYY-MM-DD" />
                </Form.Item> */}
                    <Form.Item label="类别" name="类别" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="备注" name="备注" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="单件重量合理范围" name="单件重量合理范围" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="客户" name="客户" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="报关代码" name="报关代码" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="客人资料美金" name="客人资料美金" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="单个重量(net weight)" name="single_weight" rules={[{ required: false }]}>
                        <InputNumber min={0} step={0.01} />
                    </Form.Item>
                    <Form.Item label="自税" name="自税" rules={[{ required: true }]}>
                        <Select placeholder="请选择自税">
                            <Option value={true}>是</Option>
                            <Option value={false}>否</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="类型" name="类型" rules={[{ required: true }]}>
                        <Select placeholder="请选择类型">
                            <Option value='空运'>空运</Option>
                            <Option value='海运'>海运</Option>
                            <Option value='混合'>混合</Option>

                        </Select>
                    </Form.Item>
                    <Form.Item label="豁免文件名称" name="huomian_file_name" rules={[{ required: false }]}>
                        <Input readOnly addonAfter={<Button type="link" icon={<EyeOutlined />} onClick={() => setIsPreviewVisible(true)} />} />
                    </Form.Item>
                    <Modal
                        visible={isPreviewVisible}
                        footer={null}
                        onCancel={() => setIsPreviewVisible(false)}
                    >
                        <img alt="豁免文件预览" style={{ width: '100%' }} src={`${server_url}/qingguan/products/${productForm.getFieldValue('huomian_file_name')}`} />
                    </Modal>
                    <Form.Item label="豁免文件上传" name="huomian_file" rules={[{ required: false }]}>
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


            <Modal title="错误" visible={isModalVisible} onOk={() => {
                setIsModalVisible(false);
            }} onCancel={() => {
                setIsModalVisible(false);
            }}>
                <pre>{JSON.stringify(jsonContent, null, 2)}</pre>
            </Modal>

        </div>
    )


}

export default ProductDataVietnam;
