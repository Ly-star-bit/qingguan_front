import * as React from 'react';
import { useState, useEffect } from 'react';
import { Form, Select, Row, Descriptions, Button, Modal, AutoComplete, Input, Tooltip } from 'antd';
import EyeOutlined from '@ant-design/icons/lib/icons/EyeOutlined';
import moment from 'moment';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { SyncOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string;
    加征: string;
    加征0204: string;
    加征代码: string;
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
    transport_type: string;
}
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

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const ProductSearchVietnam: React.FC<ProductSearchProps> = ({ data, transport_type }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const userName = useSelector((state: RootState) => state.user.name);
    const [loading, setLoading] = useState(false);

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
    const fetchProducts = async () => {
        setLoading(true);
        try {
            let url;
            console.log(transport_type);
            if (transport_type === "空运") {
                url = `${server_url}/qingguan/products/?get_all=true&username=${userName}&startland=Vietnam&destination=America`;
            } else {
                url = `${server_url}/qingguan/products_sea/?get_all=true&username=${userName}&startland=Vietnam&destination=America`;
            }
            const response = await axiosInstance.get(url);
            
            setProducts(response.data.items);
            setFilteredProducts(response.data.items);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (data && data.length > 0) {
            setProducts(data);
            setFilteredProducts(data);
        } else {
            fetchProducts();
        }
    }, [userName, data, transport_type]);

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


    const columns: GridColDef<Product>[] = [
      
        {
            field: '中文品名',
            headerName: '中文品名',
            width: 300,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button type="link" onClick={() => showModal(params.row)}>
                        {params.value}
                    </Button>
                    {params.row.huomian_file_name && params.row.huomian_file_name !== '""' && (
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
            headerName: 'HS_CODE',
            width: 150,
        },
        {
            field: 'Duty',
            headerName: 'Duty(%)',
            width: 100,
            renderCell: (params) => `${(Number(params.value) * 100).toFixed(2)}%`,
        },
    
        {
            field: '总加征',
            headerName: '总加征%',
            width: 100,
            renderCell: (params) => {
                return `${(calculateTotalJiazheng(params.row) * 100).toFixed(2)}%`;
            },
            
        },
        ...(transport_type === "空运" ? [
            {
                field: '空运一箱税金',
                headerName: '空运一箱税金',
                width: 100,
                renderCell: (params: GridRenderCellParams<Product>) => {
                    const jianxiang = Number(params.row.件箱 || 0);
                    const danjia = Number(params.row.单价 || 0);
                    const totalJiazheng = calculateTotalJiazheng(params.row);
                    const total_duty = Number(params.row.Duty || 0);
                    const result = jianxiang * danjia * (total_duty + totalJiazheng + 0.003464);
                    return `${result.toFixed(2)}`;
                },
            }
        ] : [
            {
                field: '海运一箱税金',
                headerName: '海运一箱税金',
                width: 100,
                renderCell: (params: GridRenderCellParams<Product>) => {
                    const jianxiang = Number(params.row.件箱 || 0);
                    const danjia = Number(params.row.单价 || 0);
                    const totalJiazheng = calculateTotalJiazheng(params.row);
                    const total_duty = Number(params.row.Duty || 0);
                    const result = jianxiang * danjia * (total_duty + totalJiazheng + 0.003464 + 0.00125);
                    return `${result.toFixed(2)}`;
                },
            }
        ]),
        {
            field: '认证',
            headerName: '认证？',
            width: 100,
        },
        {
            field: '豁免截止日期说明',
            headerName: '豁免截止日期/说明',
            width: 200,
        },
        {
            field: '材质',
            headerName: '材质',
            width: 150,
        },
        // {
        //     field: '一箱税金',
        //     headerName: '一箱税金',
        //     width: 100,
        // },

        // {
        //     field: '加征',
        //     headerName: '加征%',
        //     width: 100,
        //     renderCell: (params) => `${(Number(params.value) * 100).toFixed(2)}%`,
        // },

        // {
        //     field: '豁免过期后',
        //     headerName: '豁免过期后',
        //     width: 150,
        // },
        // {
        //     field: '更新时间',
        //     headerName: '更新时间',
        //     width: 150,
        //     renderCell: (params) => moment(params.value).format('YYYY-MM-DD'),
        // },
        // {
        //     field: '单件重量合理范围',
        //     headerName: '单件重量合理范围',
        //     width: 150,
        // },
        // {
        //     field: '报关代码',
        //     headerName: '报关代码',
        //     width: 150,
        // },
        // {
        //     field: 'single_weight',
        //     headerName: '单个重量',
        //     width: 100,
        // },
    ];

    return (
        <div>
            <Form layout="inline" style={{ marginBottom: 16, justifyContent: 'space-between', display: 'flex' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
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
                </div>
                <Form.Item>
                    <Button icon={<SyncOutlined spin={loading} />} onClick={fetchProducts} loading={loading}>
                        刷新
                    </Button>
                </Form.Item>
            </Form>

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={filteredProducts}
                    columns={columns}
                    // getRowId={(row) => row.序号}
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
                        <Descriptions.Item label="英文品名">{selectedProduct.英文品名}</Descriptions.Item>
                        <Descriptions.Item label="美国清关代码">{selectedProduct.HS_CODE}</Descriptions.Item>
                        <Descriptions.Item label="Duty(%)">{(Number(selectedProduct.Duty) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label="总加征(%)">{(calculateTotalJiazheng(selectedProduct) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label={<RedText>总税率</RedText>}>
                            <RedText>{((Number(selectedProduct.Duty) + calculateTotalJiazheng(selectedProduct)) * 100).toFixed(2)}%</RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label={<RedText>单箱海运关税+MPF+HMF</RedText>}>
                            <RedText>
                                
                                {(
                                    Number(selectedProduct.件箱) *
                                    Number(selectedProduct.单价) *
                                    (Number(selectedProduct.Duty) + calculateTotalJiazheng(selectedProduct) + 0.003464 + 0.00125)
                                ).toFixed(2)}
                            </RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label={<RedText>单箱空运关税+MPF</RedText>}>
                            <RedText>
                                {(
                                    Number(selectedProduct.件箱) *
                                    Number(selectedProduct.单价) *
                                    (Number(selectedProduct.Duty) + calculateTotalJiazheng(selectedProduct) + 0.003464)
                                ).toFixed(2)}
                            </RedText>
                        </Descriptions.Item>
                        <Descriptions.Item label="认证">{selectedProduct.认证}</Descriptions.Item>
                        <Descriptions.Item label="材质">{selectedProduct.材质}</Descriptions.Item>

                        {/* <Descriptions.Item label="豁免代码">{selectedProduct.豁免代码}</Descriptions.Item>
                        <Descriptions.Item label="豁免代码含义">{selectedProduct.豁免代码含义}</Descriptions.Item> */}
                        <Descriptions.Item label="豁免截止日期说明">{selectedProduct.豁免截止日期说明}</Descriptions.Item>
                        {/* <Descriptions.Item label="豁免过期后">{selectedProduct.豁免过期后}</Descriptions.Item> */}
                        <Descriptions.Item label="建议清关美金单价">{selectedProduct.单价}</Descriptions.Item>
                        <Descriptions.Item label="建议装箱PCS/CTN">{selectedProduct.件箱}</Descriptions.Item>
                        {/* <Descriptions.Item label={<RedText>预估一箱关税</RedText>}>
                            <RedText>
                                {(
                                    Number(selectedProduct.单价) *
                                    Number(selectedProduct.件箱) *
                                    (Number(selectedProduct.Duty) + Number(selectedProduct.加征))
                                ).toFixed(2)}
                            </RedText>
                        </Descriptions.Item> */}
                        <Descriptions.Item label="最近更新时间">{selectedProduct.更新时间}</Descriptions.Item>
                    </StyledDescriptions>
                )}
            </Modal>
        </div>
    );
};

export default ProductSearchVietnam;
