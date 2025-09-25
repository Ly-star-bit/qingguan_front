import React, { useState, useEffect } from 'react';
import { ProCard, ProTable } from '@ant-design/pro-components';
import { Form, Select, Row, Descriptions, Button, Modal, AutoComplete, Input, Tooltip } from 'antd';
import EyeOutlined from '@ant-design/icons/lib/icons/EyeOutlined';
import axiosInstance from '@/utils/axiosInstance';
import moment from 'moment';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string; // 对应 Duty(%)
    加征: string; // 对应 加征%
    一箱税金: string;
    豁免代码: string;
    豁免代码含义: string;
    豁免截止日期说明: string; // 对应 豁免截止日期/说明
    豁免过期后: string;
    认证: string; // 对应 认证？
    件箱: string; // 对应 件/箱
    单价: string;
    材质: string;
    用途: string;
    更新时间: string; // 假设 更新时间 是一个字符串，而不是日期时间
    类别: string;
    属性绑定工厂: string;
    序号: number; // 假设 序号 是一个数字
    备注: string;
    单件重量合理范围: string;
    客户: string;
    报关代码: string;
    客人资料美金: string;
    huomian_file_name: string;
}

interface ProductSearchProps {
    data: Product[];
}

const { Option } = Select;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const ProductSearch: React.FC<ProductSearchProps> = (data) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const userName = useSelector((state: RootState) => state.user.name);

    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}`);
                setProducts(response.data.items);
                setFilteredProducts(response.data.items);
            } catch (error) {
                console.error('Failed to fetch products', error);
            }
        };

        if (data.data.length > 0) {
            setProducts(data.data);
            setFilteredProducts(data.data);
        } else {
            fetchProducts();
        }
    }, [userName, data]);

    const handleSelectChange = (value: string | undefined) => {
        if (!value || value.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(p => p.中文品名.includes(value));
            setFilteredProducts(filtered);
        }
    };
    const handleHSCodeChange = (value: string | undefined) => {
        if (!value || value.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(p => p.HS_CODE.includes(value));
            setFilteredProducts(filtered);
        }
    };



    const showModal = (product: Product) => {
        setSelectedProduct(product);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedProduct(null);
    };

    const StyledDescriptions = styled(Descriptions)`
        .ant-descriptions-item-label {
            text-align: right;
        }
        .ant-descriptions-item-content {
            text-align: left;
        }
    `;

    const RedText = styled.span`
        color: red;
    `;

    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            render: (_: any, __: any, index: number) => `${index + 1}`, // 显示基于索引的序号
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
            ellipsis: true, // 允许内容溢出时显示省略号
            width:300,
            render: (_: any, record: Product) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button type="link" onClick={() => showModal(record)}>
                        {record.中文品名}
                    </Button>
                    {record.huomian_file_name && record.huomian_file_name !== '“”' ? (
                        <Tooltip 
                            title={
                                <img 
                                    src={`${server_url}/qingguan/products/${record.huomian_file_name}`} 
                                    alt="豁免文件预览" 
                                    style={{ maxWidth: 300, maxHeight: 300 }}
                                />
                            }
                            placement="right"
                            overlayStyle={{ maxWidth: 300 }}
                        >
                            <Button 
                                type="link" 
                                icon={<EyeOutlined />} 
                                onClick={() => {
                                    const imageUrl = `${server_url}/qingguan/products/${record.huomian_file_name}`;
                                    const link = document.createElement('a');
                                    link.href = imageUrl;
                                    link.download = record.huomian_file_name;
                                    link.click();
                                }}
                            />
                        </Tooltip>
                    ) : null}
                </div>
            ),
        },
        {
            title: '英文品名',
            dataIndex: '英文品名',
            key: '英文品名',
            ellipsis: true, // 允许内容溢出时显示省略号


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
            title: '豁免代码',
            dataIndex: '豁免代码',
            key: '豁免代码',
        },
        {
            title: '豁免代码含义',
            dataIndex: '豁免代码含义',
            key: '豁免代码含义',
            ellipsis: true, // 允许内容溢出时显示省略号
            render: (text:any) => (
                <Tooltip  >
                  <span>{text}</span>
                </Tooltip>
              ),

        },
        {
            title: '认证？',
            dataIndex: '认证',
            key: '认证',
        },
        {
            title: '一箱税金',
            dataIndex: '一箱税金',
            key: '一箱税金',
        },
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
            dataIndex: '更新时间',
            key: '更新时间',
            render: (text: any) => moment(text).format('YYYY-MM-DD'),
        },
        {
            title: '单件重量合理范围',
            dataIndex: '单件重量合理范围',
            key: '单件重量合理范围',
        },
        {
            title: '报关代码',
            dataIndex: '报关代码',
            key: '报关代码',
        },
        {
            title: '单个重量',
            dataIndex: 'single_weight',
            key: 'single_weight',
        },
    ];

    return (
        <div>
            <Form layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item label="选择中文品名">
                    <AutoComplete
                        style={{ width: 200 }}
                        onChange={handleSelectChange}
                        placeholder="输入中文品名"
                        allowClear
                        options={products.map(product => ({
                            value: product.中文品名,
                            label: product.中文品名,
                        }))}
                    >
                        <Input />
                    </AutoComplete>
                </Form.Item>
                <Form.Item
                    label='选择HSCODE'
                >
                    <AutoComplete
                        style={{ width: 200 }}
                        onChange={handleHSCodeChange}
                        placeholder="输入HSCODE"
                        allowClear
                        options={products.map(product => ({
                            value: product.HS_CODE,
                            label: product.HS_CODE,
                        }))}
                    >
                        <Input />
                    </AutoComplete>
                </Form.Item>

            </Form>

            <ProTable<Product>
                columns={columns}
                dataSource={filteredProducts}
                rowKey="序号"
                scroll={{x: '200%' }}
                pagination={{
                    pageSize: pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '30', '40', products.length.toString()],
                    showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 项`,
                    onChange: (page, newPageSize) => {
                        setPageSize(newPageSize);
                    },
                }}
                search={false}
            />

            <Modal
                title={selectedProduct?.中文品名}
                visible={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        关闭
                    </Button>,
                ]}
            >
                {selectedProduct && (
                    <StyledDescriptions column={1} bordered size="small">
                        <Descriptions.Item label="英文品名">{selectedProduct.英文品名}</Descriptions.Item>
                        <Descriptions.Item label="认证">{selectedProduct.认证}</Descriptions.Item>
                        <Descriptions.Item label="美国清关代码">{selectedProduct.HS_CODE}</Descriptions.Item>
                        <Descriptions.Item label="材质">{selectedProduct.材质}</Descriptions.Item>
                        <Descriptions.Item label="Duty(%)">{(Number(selectedProduct.Duty) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label="附加关税(%)">{(Number(selectedProduct.加征) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label={<RedText>总税率</RedText>}>
                            <RedText>{((Number(selectedProduct.Duty) + Number(selectedProduct.加征)) * 100).toFixed(2)}%</RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label="豁免代码">{selectedProduct.豁免代码}</Descriptions.Item>
                        <Descriptions.Item label="豁免代码含义">{selectedProduct.豁免代码含义}</Descriptions.Item>

                        <Descriptions.Item label="豁免截止日期说明">{selectedProduct.豁免截止日期说明}</Descriptions.Item>
                        <Descriptions.Item label="豁免过期后">{selectedProduct.豁免过期后}</Descriptions.Item>
                        <Descriptions.Item label="建议清关美金单价">{selectedProduct.单价}</Descriptions.Item>
                        <Descriptions.Item label="建议装箱PCS/CTN">{selectedProduct.件箱}</Descriptions.Item>
                        <Descriptions.Item label={<RedText>预估一箱关税</RedText>}>
                            <RedText>
                                {(
                                    Number(selectedProduct.单价) *
                                    Number(selectedProduct.件箱) *
                                    (Number(selectedProduct.Duty) + Number(selectedProduct.加征))
                                ).toFixed(2)}
                            </RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label="最近更新时间">{selectedProduct.更新时间}</Descriptions.Item>
                    </StyledDescriptions>
                )}
            </Modal>
        </div>
    );
};

export default ProductSearch;
