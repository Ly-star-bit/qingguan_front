import React, { useState, useEffect } from 'react';
import { Product } from './types';
import { Table, Button, Form, Input, Modal, Pagination, message, Select, Upload, UploadFile, Space } from 'antd';
import moment from 'moment';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckOutlined, CloseOutlined, UploadOutlined, EyeOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

import styles from "@/styles/Home.module.css"
import axiosInstance from '@/utils/axiosInstance';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const { confirm } = Modal;
const { Option } = Select;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const ProductTableCanada: React.FC = () => {
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

    const userName = useSelector((state: RootState) => state.user.name);

    useEffect(() => {
        fetchAllProducts();
    }, []); 

    const fetchAllProducts = async (append = false) => {
        try {
            setLoadingProducts(true);
    
            const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&country=Canada`);
            
            setAllProducts((prevProducts) => {
                const newProducts = append ? [...prevProducts, ...response.data.items] : response.data.items;
                const paginatedProducts = newProducts.slice(0, productPageSize); // 根据每页数量进行切片
                setTotalProducts(newProducts.length); // 设置产品总数
                setProducts(paginatedProducts); // 设置当前页显示的产品
                return newProducts;
            });
    
            console.log('count: %d', response.data.items.length);
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
                await axiosInstance.delete(`${server_url}/qingguan/products/${id}`);
                fetchProducts();
            },
        });
    };
    
    const fetchProducts = async (append = false) => {
        setLoadingProducts(true);
        const response = await axiosInstance.get(`${server_url}/qingguan/products?skip=${(productPage - 1) * productPageSize}&limit=${productPageSize}&名称=${productFilter}&username=${userName}&country=Canada`);
        setTotalProducts(response.data.total);
        setProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);
        setLoadingProducts(false);
    };
    
    const handleProductSubmit = async (values: Product) => {
        // 预处理 values，将 null 值替换为具体的默认值
        const processedValues = {
            中文品名: values.中文品名 ?? '',
            英文品名: values.英文品名 ?? '',
            HS_CODE: values.HS_CODE ?? '',
            件箱: values.件箱 ?? '',
            单价: values.单价 ?? '',
            材质: values.材质 ?? '',
            用途: values.用途 ?? '',
            认证: values.认证 ?? '',
            Duty: values.Duty ?? '', 
            加征: Array.isArray(values.加征) ? values.加征.reduce((obj: any, item: any) => {
                obj[item.name] = item.value;
                return obj;
            }, {}) : { 加征_GST: '0.05' }, // 将加征数组转换为单个对象,key为加征名称,value为加征值
            一箱税金: (Number(values.单价) *
                Number(values.件箱) *
                (Number(values.Duty) + Number(values.加征)
            )).toFixed(2) ?? '',
            类别: values.类别 ?? '',
            备注: values.备注 ?? '',
            单件重量合理范围: values.单件重量合理范围 ?? '',
            客户: values.客户 ?? '',
            报关代码: values.报关代码 ?? '',
            客人资料美金: values.客人资料美金 ?? '',
            更新时间: values.更新时间 ?? moment().format('YYYY-MM-DD'),
            自税: values.自税,
            类型: values.类型,
            country: 'Canada',
        };
        
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
                fetchAllProducts();
                setProductModalVisible(false);
                productForm.resetFields();
                setEditingProduct(null);
            },
        });
    };
    
    const exportToExcel = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/output_products?country=Canada`, {
                responseType: 'blob', // Important: Indicate that you expect a blob response
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'canada_products.xlsx';
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
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
                    <Button icon={<DeleteOutlined />} onClick={() => deleteProduct(record.id)}>Delete</Button>
                </span>
            ),
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
            title: '认证',
            dataIndex: '认证',
            key: '认证',
        },
        {
            title: 'Duty(%)',
            dataIndex: 'Duty',
            key: 'Duty',
            render: (text: any) => `${(Number(text) * 100).toFixed(2)}%`, // 转换为百分比并添加百分号
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
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: (text: any) => moment(text).format('YYYY-MM-DD'),
        },
    ];

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>中国出口加拿大</h1>
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
                    x: 'max-content',  // 允许水平滚动
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
                    <Form.Item label="认证" name="认证" rules={[{ required: false }]}>
                        <Input />
                    </Form.Item>
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
                    <Form.Item label="更新时间" name="更新时间" rules={[{ required: false }]}>
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

export default ProductTableCanada;
