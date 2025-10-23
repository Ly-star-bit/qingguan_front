import * as React from 'react';
import { useState, useEffect } from 'react';
import { Form, Select, Descriptions, Button, Modal, AutoComplete, Input, Tooltip, message } from 'antd';
import EyeOutlined from '@ant-design/icons/lib/icons/EyeOutlined';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { SyncOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';

const { Option } = Select;

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

interface ProductSearchUnifiedProps {
    data?: Product[];
    defaultStartland?: string;
    defaultDestination?: string;
    defaultTransportType?: string;
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

const ProductSearchUnified: React.FC<ProductSearchUnifiedProps> = ({ 
    data, 
    defaultStartland = 'China',
    defaultDestination = 'America',
    defaultTransportType = '空运'
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const userName = useSelector((state: RootState) => state.user.name);
    const [loading, setLoading] = useState(false);
    
    // 筛选条件状态
    const [startland, setStartland] = useState(defaultStartland);
    const [destination, setDestination] = useState(defaultDestination);
    const [transportType, setTransportType] = useState(defaultTransportType);

    const calculateTotalJiazheng = (product: Product) => {
        let totalJiazheng = 0;
        if (product.加征) {
            try {
                const jiazhengObj = typeof product.加征 === 'string' ? 
                    JSON.parse(product.加征) : product.加征;
                
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
            const baseParams = `get_all=true&username=${userName}&startland=${startland}&destination=${destination}`;
            
            // 根据目的地选择不同的计算逻辑
            if (destination === 'Canada') {
                // 加拿大使用空运产品接口
                url = `${server_url}/qingguan/products/?${baseParams}`;
            } else {
                // 美国和越南根据运输类型选择
                if (transportType === "空运") {
                    url = `${server_url}/qingguan/products/?${baseParams}&zishui=false&is_hidden=false`;
                } else {
                    url = `${server_url}/qingguan/products_sea/?${baseParams}&zishui=false&is_hidden=false`;
                }
            }
            
            const response = await axiosInstance.get(url);
            setProducts(response.data.items);
            setFilteredProducts(response.data.items);
        } catch (error) {
            console.error('Failed to fetch products', error);
            message.error('获取产品数据失败');
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
    }, [userName, data, startland, destination, transportType]);

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

    const handleCategoryChange = (value: string | undefined) => {
        if (!value || value.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(p => p.类别?.includes(value));
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

    // 根据目的地返回不同的列配置
    const getColumns = (): GridColDef<Product>[] => {
        const baseColumns: GridColDef<Product>[] = [
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
                headerName: destination === 'Canada' ? 'HS CODE' : 'HS_CODE',
                width: 150,
            },
        ];

        // 加拿大目的地的特殊列
        if (destination === 'Canada') {
            return [
                ...baseColumns,
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
                    renderCell: (params) => `5.00%`,
                },
                {
                    field: '总税金',
                    headerName: '总税金/箱',
                    width: 130,
                    renderCell: (params) => {
                        const jianxiang = Number(params.row.件箱 || 0);
                        const danjia = Number(params.row.单价 || 0);
                        const duty = Number(params.row.Duty || 0);
                        const totalJiazheng = 0.05;
                        
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
                },
            ];
        }

        // 美国目的地的列
        return [
            ...baseColumns,
            destination !== 'Canada' && {
                field: '类别',
                headerName: '类别',
                width: 100,
            },
            {
                field: 'Duty',
                headerName: 'Duty(%)',
                width: 100,
                renderCell: (params:any) => `${(Number(params.value) * 100).toFixed(2)}%`,
            },
            {
                field: '总加征',
                headerName: '总加征%',
                width: 100,
                renderCell: (params:any) => {
                    return `${(calculateTotalJiazheng(params.row) * 100).toFixed(2)}%`;
                },
            },
            ...(transportType === "空运" ? [
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
        ].filter(Boolean) as GridColDef<Product>[];
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                {/* 第一行：起运地、目的地、运输类型 */}
                <Form layout="inline" style={{ marginBottom: 8 }}>
                    <Form.Item label="起运地">
                        <Select
                            value={startland}
                            onChange={setStartland}
                            style={{ width: 150 }}
                        >
                            <Option value="China">中国</Option>
                            <Option value="Vietnam">越南</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="目的地">
                        <Select
                            value={destination}
                            onChange={setDestination}
                            style={{ width: 150 }}
                        >
                            <Option value="America">美国</Option>
                            <Option value="Canada">加拿大</Option>
                        </Select>
                    </Form.Item>
                    {destination !== 'Canada' && (
                        <Form.Item label="运输类型">
                            <Select
                                value={transportType}
                                onChange={setTransportType}
                                style={{ width: 150 }}
                            >
                                <Option value="空运">空运</Option>
                                <Option value="海运">海运</Option>
                            </Select>
                        </Form.Item>
                    )}
                </Form>
                
                {/* 第二行：中文品名、HSCODE、类别、刷新按钮 */}
                <Form layout="inline" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item label="中文品名">
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
                        <Form.Item label="HSCODE">
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
                        {destination !== 'Canada' && (
                            <Form.Item label="类别">
                                <AutoComplete
                                    style={{ width: 200 }}
                                    onChange={handleCategoryChange}
                                    placeholder="输入类别"
                                    allowClear
                                    options={Array.from(new Set(products.map(product => product.类别))).map(category => ({
                                        value: category,
                                        label: category,
                                    }))}
                                >
                                    <Input />
                                </AutoComplete>
                            </Form.Item>
                        )}
                    </div>
                    <Form.Item>
                        <Button icon={<SyncOutlined spin={loading} />} onClick={fetchProducts} loading={loading}>
                            刷新
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={filteredProducts}
                    columns={getColumns()}
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
                {selectedProduct && destination === 'Canada' && (
                    <StyledDescriptions column={1} bordered size="small">
                        <Descriptions.Item label="中文品名">{selectedProduct.中文品名}</Descriptions.Item>
                        <Descriptions.Item label="英文品名">{selectedProduct.英文品名}</Descriptions.Item>
                        <Descriptions.Item label="HS CODE">{selectedProduct.HS_CODE}</Descriptions.Item>
                        <Descriptions.Item label="DUTY(%)">{(Number(selectedProduct.Duty) * 100).toFixed(2)}%</Descriptions.Item>
                        <Descriptions.Item label="GST">5.00%</Descriptions.Item>
                        <Descriptions.Item label={<RedText>总税率</RedText>}>
                            <RedText>{((Number(selectedProduct.Duty) * 100) + 5).toFixed(2)}%</RedText>
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
                {selectedProduct && destination !== 'Canada' && (
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
                        <Descriptions.Item label="豁免截止日期说明">{selectedProduct.豁免截止日期说明}</Descriptions.Item>
                        <Descriptions.Item label="建议清关美金单价">{selectedProduct.单价}</Descriptions.Item>
                        <Descriptions.Item label="建议装箱PCS/CTN">{selectedProduct.件箱}</Descriptions.Item>
                        <Descriptions.Item label="最近更新时间">{selectedProduct.更新时间}</Descriptions.Item>
                    </StyledDescriptions>
                )}
            </Modal>
        </div>
    );
};

export default ProductSearchUnified;
