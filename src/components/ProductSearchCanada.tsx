import * as React from 'react';
import { useState, useEffect } from 'react';
import { Form, Select, Row, Descriptions, Button, Modal, AutoComplete, Input, Tooltip } from 'antd';
import EyeOutlined from '@ant-design/icons/lib/icons/EyeOutlined';
import moment from 'moment';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef  } from '@mui/x-data-grid';
import axiosInstance from '@/utils/axiosInstance';
export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string;
    加征: string;
    一箱税金: string;
    豁免代码: string;
    豁免代码含义: string;
    豁免截止日期说明: string;
    豁免过期后: string;
    认证: string;
    件箱: string;
    单价: string;
    材质: string;
    用途: string;
    更新时间: string;
    类别: string;
    属性绑定工厂: string;
    序号: number;
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

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const ProductSearchCanada: React.FC<ProductSearchProps> = (data) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const userName = useSelector((state: RootState) => state.user.name);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&country=Canada`);
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
    const calculateTotalJiazheng = (product: Product) => {
        let totalJiazheng = 0;
        if (product.加征) {
            try {
                // 将字符串解析为对象
                const jiazhengObj = typeof product.加征 === 'string' ? 
                    JSON.parse(product.加征) : product.加征;
                
                // 遍历对象的所有值
                Object.values(jiazhengObj).forEach(value => {
                    totalJiazheng += Number(value) || 0;
                });
            } catch (e) {
                console.error('解析加征数据失败:', e);
            }
        }
        return totalJiazheng;
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

    const columns: GridColDef<Product>[] = [
        {
            field: '序号',
            headerName: '序号',
            width: 90,
            renderCell: (params) => {
                // 使用索引作为序号
                return params.api.getRowIndexRelativeToVisibleRows(params.id) + 1;
            }
        },
        {
            field: '中文品名',
            headerName: '中文品名',
            width: 300,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button type="link" onClick={() => showModal(params.row)}>
                        {params.value}
                    </Button>
                    {params.row.huomian_file_name && params.row.huomian_file_name !== '"' && (
                        <Tooltip 
                            title={
                                <img 
                                    src={`${server_url}/qingguan/products/${params.row.huomian_file_name}`} 
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
                                    const imageUrl = `${server_url}/qingguan/products/${params.row.huomian_file_name}`;
                                    const link = document.createElement('a');
                                    link.href = imageUrl;
                                    link.download = params.row.huomian_file_name;
                                    link.click();
                                }}
                            />
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            field: '英文品名',
            headerName: '英文品名',
            width: 200,
        },
        {
            field: 'HS_CODE',
            headerName: 'HS CODE',
            width: 150,
        },
        {
            field: 'Duty',
            headerName: 'DUTY(%)',
            width: 120,
            renderCell: (params) => `${(Number(params.value) * 100).toFixed(2)}%`,
        },
        {
            field: 'GST',
            headerName: 'GST(%)',
            width: 120,
            renderCell: (params) => `${(calculateTotalJiazheng(params.row)*100).toFixed(2)}%`,
        },
        {
            field: '总税金',
            headerName: '总税金/箱',
            width: 130,
            renderCell: (params) => {
                const jianxiang = Number(params.row.件箱 || 0);
                const danjia = Number(params.row.单价 || 0);
                const duty = Number(params.row.Duty || 0);
                const totalJiazheng = 0.05; // 固定5%
                
                const result = (
                    danjia * jianxiang * (duty + totalJiazheng) +
                    (danjia * jianxiang + danjia * jianxiang * (duty + totalJiazheng)) * 0.05
                );
                
                return `${result.toFixed(2)}`;
            },
        },
        {
            field: '材质',
            headerName: '材质',
            width: 150,
        },
        {
            field: '认证',
            headerName: '认证',
            width: 100,
        }
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
                <Form.Item label="选择HSCODE">
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

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={filteredProducts}
                    columns={columns}
                    // getRowId={(row) => row.id}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: pageSize,
                            },
                        },
                    }}
                    pageSizeOptions={[10, 20, 30, 40, products.length]}
                    onPaginationModelChange={(params) => setPageSize(params.pageSize)}
                />
            </Box>

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
                        <Descriptions.Item label="中文品名">{selectedProduct.中文品名}</Descriptions.Item>
                        <Descriptions.Item label="英文品名">{selectedProduct.英文品名}</Descriptions.Item>
                        <Descriptions.Item label="HS CODE">{selectedProduct.HS_CODE}</Descriptions.Item>
                        <Descriptions.Item label="DUTY(%)">{(Number(selectedProduct.Duty) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label="GST">{(calculateTotalJiazheng(selectedProduct)*100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label={<RedText>总税率</RedText>}>
                            <RedText>{((Number(selectedProduct.Duty) * 100) + calculateTotalJiazheng(selectedProduct)*100).toFixed(2)}%</RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label={<RedText>总税金/箱</RedText>}>
                            <RedText>
                                {(
                                    Number(selectedProduct.单价) *
                                    Number(selectedProduct.件箱) *
                                    (Number(selectedProduct.Duty) + 0.05) +
                                    (Number(selectedProduct.单价) * Number(selectedProduct.件箱) +
                                    Number(selectedProduct.单价) * Number(selectedProduct.件箱) *
                                    (Number(selectedProduct.Duty) + 0.05)
                                    ) * 0.05
                                ).toFixed(2)}
                            </RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label="认证">{selectedProduct.认证}</Descriptions.Item>
                        <Descriptions.Item label="材质">{selectedProduct.材质}</Descriptions.Item>
                        <Descriptions.Item label="建议清关单价">{selectedProduct.单价}</Descriptions.Item>
                        <Descriptions.Item label="建议装箱PCS/CTN">{selectedProduct.件箱}</Descriptions.Item>
                        <Descriptions.Item label="更新时间">{selectedProduct.更新时间}</Descriptions.Item>
                    </StyledDescriptions>
                )}
            </Modal>
        </div>
    );
};

export default ProductSearchCanada;
