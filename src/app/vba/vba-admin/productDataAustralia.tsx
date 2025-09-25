import React, { useState, useEffect } from 'react';
import { Product } from './types';
import { Table, Button, Form, Input, Modal, Pagination, message, Select, Upload, UploadFile } from 'antd';
import moment from 'moment';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckOutlined, CloseOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';

import styles from "@/styles/Home.module.css"
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { count } from 'console';

const { confirm } = Modal;
const { Option } = Select;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const ProductTableAustralia: React.FC = () => {
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
    
            const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&country=Australia`);
    
            const data = response.data;
    
            setAllProducts((prevProducts) => {
                const newProducts = append ? [...prevProducts, ...data.items] : data.items;
                const paginatedProducts = newProducts.slice(0, productPageSize); // 根据每页数量进行切片
                setTotalProducts(newProducts.length); // 设置产品总数
                setProducts(paginatedProducts); // 设置当前页显示的产品
                return newProducts;
            });
    
            console.log('count: %d', data.items.length);
            setLoadingProducts(false);
    
        } catch (error: any) {
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


    const deleteProduct = async (id: number) => {
        confirm({
            title: 'Are you sure you want to delete this product?',
            icon: <ExclamationCircleOutlined />,
            onOk: async () => {
                await axiosInstance.delete(`${server_url}/qingguan/products/${id}`);
                fetchProducts();
            },
        });
    };
    const fetchProducts = async (append = false) => {
        setLoadingProducts(true);
        const response = await axiosInstance.get(`${server_url}/qingguan/products?skip=${(productPage - 1) * productPageSize}&limit=${productPageSize}&名称=${productFilter}&username=${userName}&country=Australia`);
        setTotalProducts(response.data.total);
        setProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);
        setLoadingProducts(false);

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
            加征: values.加征 ?? '', // 假设 加征% 是一个字符串，而不是数字
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
            自税:values.自税,
            类型:values.类型,
            // huomian_file_name:values.huomian_file_name,
            country:'Australia',
        };
        
        console.log(productForm.getFieldValue('huomian_file'))
        // console.log(processedValues)
        confirm({
            title: 'Confirm',
            icon: <ExclamationCircleOutlined />,
            content: editingProduct ? 'Are you sure you want to edit this product?' : 'Are you sure you want to add this product?',
            onOk: async () => {
                const formData = new FormData();
                const file  = productForm.getFieldValue('huomian_file')
                if (file) {
                    formData.append('file', file.file.originFileObj);
                }
                formData.append('product', JSON.stringify(processedValues));
                
                if (editingProduct) {
                  
    

                    await axiosInstance.put(`${server_url}/qingguan/products/${editingProduct.id}`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                       
                } else {
                    await axiosInstance.post(`${server_url}/qingguan/products`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                }
                fetchProducts();
                setProductModalVisible(false);
                productForm.resetFields();
                setEditingProduct(null);
            },
        });
    };
    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(allProducts);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        XLSX.writeFile(workbook, 'all_products.xlsx');
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
            render: (_: any, __: any, index: number) => `${(productPage - 1) * productPageSize + index + 1}`, // 根据页数和每页数量计算序号
        },
        {
            title: '操作',
            key: 'action',
            render: (text: any, record: Product) => (
                <span>
                    <Button icon={<EditOutlined />} onClick={() => {
                        setEditingProduct(record);
                        productForm.setFieldsValue({
                            ...record,
                            豁免截止日期说明: record.豁免截止日期说明 ? moment(record.豁免截止日期说明) : null,
                            更新时间: record.更新时间 ? moment(record.更新时间) : null,
                        });
                        setProductModalVisible(true);
                    }}>Edit</Button>
                    <Button icon={<DeleteOutlined />} onClick={() => deleteProduct(record.序号)}>Delete</Button>
                </span>
            ),
        },
        {
            title: '类别',
            dataIndex: '类别',
            key: '类别',
            filters: Array.from(new Set(products.map(product => product.类别)))
                .map(category => ({ text: category, value: category })),
            onFilter: (value: any, record: any) => record.类别 === value,

        },
        {
            title: '中文品名',
            dataIndex: '中文品名',
            key: '中文品名',
        },
        {
            title: '英文品名',
            dataIndex: '英文品名',
            key: '英文品名',
        },
        {
            title: 'HS_CODE',
            dataIndex: 'HS_CODE',
            key: 'HS_CODE',
        },
        {
            title: '件/箱',
            dataIndex: '件箱',
            key: '件箱',
        },
        {
            title: '单价',
            dataIndex: '单价',
            key: '单价',
        },
        {
            title: '材质',
            dataIndex: '材质',
            key: '材质',
        },
        {
            title: '用途',
            dataIndex: '用途',
            key: '用途',
        },
        {
            title: '属性绑定工厂',
            dataIndex: '属性绑定工厂',
            key: '属性绑定工厂',
        },
        {
            title: '豁免代码',
            dataIndex: '豁免代码',
            key: '豁免代码',
        },
        {
            title: '豁免代码含义',
            dataIndex: '豁免代码含义',
            key: '豁免代码含义',
            ellipsis: true,

        },
        {
            title: '认证？',
            dataIndex: '认证',
            key: '认证',
        },
        // {
        //     title: '一箱税金',
        //     dataIndex: '一箱税金',
        //     key: '一箱税金',
        // },
        {
            title: 'Duty(%)',
            dataIndex: 'Duty',
            key: 'Duty',
            render: (text: any) => `${(Number(text) * 100).toFixed(2)}%`, // 转换为百分比并添加百分号

        },
        {
            title: '加征%',
            dataIndex: '加征',
            key: '加征',
            render: (text: any) => `${(Number(text) * 100).toFixed(2)}%`, // 转换为百分比并添加百分号

        },
        {
            title: '豁免截止日期/说明',
            dataIndex: '豁免截止日期说明',
            key: '豁免截止日期说明',
        },
        {
            title: '豁免过期后',
            dataIndex: '豁免过期后',
            key: '豁免过期后',
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: (text: any) => moment(text).format('YYYY-MM-DD'),
        },

        {
            title: '备注',
            dataIndex: '备注',
            key: '备注',
        },
        {
            title: '单件重量合理范围',
            dataIndex: '单件重量合理范围',
            key: '单件重量合理范围',
        },
        {
            title: '客户',
            dataIndex: '客户',
            key: '客户',
        },
        {
            title: '报关代码',
            dataIndex: '报关代码',
            key: '报关代码',
        },
        {
            title: '客人资料美金',
            dataIndex: '客人资料美金',
            key: '客人资料美金',
        },
        {
            title: '单个重量',
            dataIndex: 'single_weight',
            key: 'single_weight',
        },
        {
            title: '自税',
            dataIndex: '自税',
            key: '自税',
        },
        {
            title: '类型',
            dataIndex: '类型',
            key: '类型',

        },


    ];

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>产品数据源库Australia</h1>
            <Input placeholder="搜索名称..." onChange={e => filterProducts_ChineseName(e.target.value)} />
            <Input placeholder="搜索HSCODE..." onChange={e => filterProducts_HSCODE(e.target.value)} />
            <Input placeholder="搜索豁免代码..." onChange={e => filterProducts_HuoMianCode(e.target.value)} />

            <Button type="primary" onClick={() => {
                productForm.resetFields(); // 重置表单字段
                setEditingProduct(null); // 清空编辑产品
                setProductModalVisible(true); // 显示 Modal
            }}>新增产品</Button>
            <Button type="default" onClick={showExportConfirm}>导出所有产品</Button>

            <Table
                className={styles.table}
                dataSource={products}
                columns={columnsProduct}
                pagination={false}
                rowKey="id"
                scroll={{
                    x: 'max-content',  // 允许水平滚动
                    // y: 800           // 固定表头，并设置表格内容的最大高度
                }}
                sticky          // 使用 sticky 属性来固定表头
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
                    productForm.resetFields();
                    setEditingProduct(null);
                }}
                onOk={() => {
                    productForm.submit();
                }}
            >
                <Form
                    form={productForm}
                    onFinish={handleProductSubmit}
                    onFinishFailed={(errorInfo) => {
                        console.log('onFinishFailed:', errorInfo);
                    }}
                    initialValues={{
                        ...editingProduct,
                        更新时间: editingProduct && editingProduct.更新时间 ? moment(editingProduct.更新时间) : moment().startOf('day')
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
                    <Form.Item label="加征%" name="加征" rules={[{ required: false }]}>
                        <Input />
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
                        <Input />
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

export default ProductTableAustralia;
