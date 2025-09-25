"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Select, Checkbox, Typography, message, InputNumber, Row, Col, List, Space, Card, Divider } from 'antd';
import { EditOutlined, ExclamationCircleOutlined, HistoryOutlined, CalculatorOutlined, EyeOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import { SelectedItem, Product, ShipperReceiver, Port } from "./types"
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import TiDanLog from './customs_clear_tidan';

// 添加表格行样式
const tableRowStyles = `
  .row-light {
    background-color: #fafafa;
  }
  .row-light:hover {
    background-color: #e6f7ff !important;
  }
  .row-dark {
    background-color: #ffffff;
  }
  .row-dark:hover {
    background-color: #e6f7ff !important;
  }
`;

// 将样式注入到页面
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = tableRowStyles;
  document.head.appendChild(styleElement);
}

const { confirm } = Modal;

interface OptimizationResult {
    status: string;
    success: boolean;
    parameters: {
        W_target: number;
        B_target: number;
        alpha: number;
        beta_cny: number;
        exchange_rate: number;
        k: number;
        min_boxes_per_product: number;
    };
    selected_products: {
        name: string;
        boxes: number;
        weight_per_box: number;
        total_weight: number;
        value_usd: number;
        tax_cny: number;
        pieces_per_box: number;
        pieces: number;
    }[];
    summary: {
        total_weight: number;
        total_value_usd: number;
        total_tax_cny: number;
        selected_count: number;
        value_per_weight_usd: number;
        tax_per_weight_cny: number;
        value_ratio_ok: boolean;
        tax_ratio_ok: boolean;
    };
}

interface PackingOptimizationRequest {
    products_data: any[];
    W_target: number;
    B_target: number;
    alpha: number;
    beta_cny: number;
    exchange_rate: number;
    k: number;
    min_boxes_per_product: number;
    expansion_factor?: number | null; // 膨胀系数，可为空
}

interface SubmissionHistoryEntry {
    _id?: string; // MongoDB的_id
    formValues: any;
    selectedItems: SelectedItem[];
    timestamp: string;
    type?: string;
    user?: string;
}

// const server_url = "http://localhost:9008";
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;
// console.log(server_url)
const ExecuteAirNew: React.FC = () => {


    const [products, setProducts] = useState<Product[]>([]);
    const [shippersAndReceivers, setShippersAndReceivers] = useState<ShipperReceiver[]>([]);
    const [selectedSender, setSelectedSender] = useState<string | undefined>();
    const [selectedReceiver, setSelectedReceiver] = useState<string | undefined>();

    const [executeForm] = Form.useForm();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

    const [totalYuguTax, setTotalYuguTax] = useState<number>(0);
    //整票预估税金
    const [totalAllYuguTax, setTotalAllYuguTax] = useState<number>(0);
    const [totalCarrierPrice, setTotalCarrierPrice] = useState<number>(0);

    const [jsonContent, setJsonContent] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [isTiDanLogModalVisible, setTiDanLogModalVisible] = useState(false);


    //港口
    const [PortContent, setPortContent] = useState<Port[]>([]);

    //出口国
    const [selectedCountry, setSelectedCountry] = useState<string | undefined>();

    //汇率
    const [CnUsdRate, setCnUsdRate] = useState<number | null>(null);
    const [loadingsubmit, setLoadingSubmit] = useState(false);

    //单箱重量
    const [newSingleWeight, setNewSingleWeight] = useState<number | null>(null);
    //复选框
    const [isChecked, setIsChecked] = useState(false);

    const userName = useSelector((state: RootState) => state.user.name);

    // 包装优化相关状态
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [optimizationParams, setOptimizationParams] = useState<PackingOptimizationRequest>({
        products_data: [],
        W_target: 3537,
        B_target: 214,
        alpha: 0.46,
        beta_cny: 1.27,
        exchange_rate: 7.22,
        k: 3,
        min_boxes_per_product: 20
    });
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [optimizationHistory, setOptimizationHistory] = useState<OptimizationResult[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isOptimizationModalVisible, setIsOptimizationModalVisible] = useState(false);
    const [isOptimizationHistoryModalVisible, setIsOptimizationHistoryModalVisible] = useState(false);

    const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryEntry[]>([]);
    const [isSubmissionHistoryModalVisible, setIsSubmissionHistoryModalVisible] = useState(false);

    const [optimizationForm] = Form.useForm();

    // 添加状态来触发重新渲染
    const [portBasedRefresh, setPortBasedRefresh] = useState(0);
    // 添加状态来控制前两个比率参数的显示/隐藏
    const [showAdvancedRatioParams, setShowAdvancedRatioParams] = useState(false);

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
    useEffect(() => {
        if (selectedCountry) {
            fetchAllProducts(selectedCountry);
            fetchAllPorts()
        }
        console.log(CnUsdRate)
    }, [selectedCountry]);

    useEffect(() => {
        fetchExchangeRate();
        fetchShippersAndReceivers();
    }, []); // Add shipperPageSize as dependency
    useEffect(() => {
        if (CnUsdRate !== undefined) {
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
        }
    }, [CnUsdRate, executeForm]);



    const calculateYuguTaxMoneyUsd = (quantity: number, product: Product | undefined, customPacking?: number, mannual_single_price?: number): number | null => {
        if (!product) return null;
        const taxRate = Number(product.Duty);
        const totalJiazheng = calculateTotalJiazheng(product);
        // 使用自定义的packing值或产品默认的件箱值
        const packing = customPacking !== undefined ? customPacking : Number(product.件箱);
        let result = 0;
        if (mannual_single_price) {
            result = Math.round(quantity * (packing * mannual_single_price)) * (taxRate + totalJiazheng);
        } else {
            result = Math.round(quantity * (packing * Number(product.单价))) * (taxRate + totalJiazheng);
        }
        return Math.round((result + Number.EPSILON) * 100) / 100;
    };

    const handlePortChange = (value: string) => {
        const port = PortContent.find(p => p.port_name === value);
        if (port) {
            executeForm.setFieldsValue({
                sender: port.sender_name,
                receiver: port.receiver_name
            });
        } else {
            executeForm.setFieldsValue({
                sender: undefined,
                receiver: undefined
            });
        }
        let qingguanTihuo = '';
        if (port?.remarks) {
            qingguanTihuo = port.remarks;

        } else {
            qingguanTihuo = '口岸选择不对';
        }
        executeForm.setFieldsValue({ special_qingguan_tihuo: qingguanTihuo });
        
        // 触发重新渲染优化参数显示
        setPortBasedRefresh(prev => prev + 1);
    };


    const handleProductSearch_Chinese = async (value: string | undefined) => {
        if (!value) return null;
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/products?名称=${value}`);
            return response.data.items[0] as Product;
        } catch (error) {
            console.error('查询产品时出错:', error);
            return null;
        }
    };

    const handleShipperSearch = async (value: string) => {
        const response = await axiosInstance.get(`${server_url}/qingguan/shippersandreceivers?ShipperName=${value}`);
        setShippersAndReceivers(response.data.items);
        // console.log(shippersAndReceivers)
    };
    const fetchExchangeRate = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/api/exchange-rate`);
            setCnUsdRate(response.data.USDCNY)
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        }
    };
    const fetchAllProducts = async (country: string = 'China') => {
        const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&zishui=false&country=${country}&is_hidden=false`);
        setAllProducts(response.data.items);
    }
    const fetchAllPorts = async () => {
        const response = await axiosInstance.get(`${server_url}/qingguan/ports?country=${selectedCountry}`)
        setPortContent(response.data);
    }

    const fetchShippersAndReceivers = async () => {
        const response = await axiosInstance.get(`${server_url}/qingguan/consignee`);
        setShippersAndReceivers(response.data.items);
    };

    const single_weight_calculate = (gross_weight: number, products: SelectedItem[]) => {
        // 找到有single_weight的产品
        const productsWithWeight = products.filter(p => p.single_weight);
        let newSingleWeight = "0";

        if (productsWithWeight.length > 0) {
            // 计算有single_weight产品的总重量
            const weightWithSingleWeight = productsWithWeight.reduce((acc, p) => {
                return acc + (p.quantity || 0) * (p.single_weight || 0);
            }, 0);

            // 计算有single_weight产品的总箱数
            const boxesWithSingleWeight = productsWithWeight.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);

            // 计算总箱数
            const totalBoxes = products.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);

            newSingleWeight = ((gross_weight - weightWithSingleWeight) / (totalBoxes - boxesWithSingleWeight)).toFixed(2);

        } else {
            // 如果没有single_weight，直接计算平均值
            const totalBoxes = products.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);
            newSingleWeight = (gross_weight / totalBoxes).toFixed(2);
        }

        const numericWeight = Number(newSingleWeight);
        // if (numericWeight <= 0 || !isFinite(numericWeight)) {
        //     message.error("单箱重量必须大于0");
        // }

        setNewSingleWeight(numericWeight);
        return newSingleWeight;
    }

    const calculateSingleWeightPure = (gross_weight: number, products: SelectedItem[]): number => {
        const productsWithWeight = products.filter(p => p.single_weight);
        let newSingleWeight = "0";
        if (productsWithWeight.length > 0) {
            const weightWithSingleWeight = productsWithWeight.reduce((acc, p) => {
                return acc + (p.quantity || 0) * (p.single_weight || 0);
            }, 0);
            const boxesWithSingleWeight = productsWithWeight.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);
            const totalBoxes = products.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);
            if (totalBoxes - boxesWithSingleWeight === 0) {
                return 0; // Avoid division by zero
            }
            newSingleWeight = ((gross_weight - weightWithSingleWeight) / (totalBoxes - boxesWithSingleWeight)).toFixed(2);
        } else {
            const totalBoxes = products.reduce((acc, p) => {
                return acc + (p.quantity || 0);
            }, 0);
            if (totalBoxes === 0) {
                return 0; // Avoid division by zero
            }
            newSingleWeight = (gross_weight / totalBoxes).toFixed(2);
        }
        return Number(newSingleWeight);
    }

    // 配置全局message
    useEffect(() => {
        message.config({
            top: 10,
            maxCount: 3,
            duration: 3
        });
    }, []);

    const download_get_excel = async (values: any) => {
        // 验证表单必填字段
        try {
            await executeForm.validateFields();
        } catch (error) {
            message.error('请先完善表单中的必填信息后再生成PDF');
            return;
        }
        
        if (!newSingleWeight || newSingleWeight <= 0 || !isFinite(newSingleWeight)) {
            message.error("单箱重量必须大于0，不能下载");
            return;
        }
        const totalBoxCount = Number(executeForm.getFieldValue('allBoxCount'));
        const selectedItemsBoxCount = selectedItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

        if (totalBoxCount !== selectedItemsBoxCount) {
            message.error('总箱数上下不一致，请检查后再提交！');

            return;
        }

        // 计算服装类货值占比
        const clothingItems = selectedItems.filter(item => {
            const matchedProduct = allProducts.find(p => p.中文品名 === item.name);
            // return matchedProduct && matchedProduct.类别 === '服装类' && !matchedProduct.中文品名.startsWith('(轻小件)');
            return matchedProduct && matchedProduct.类别 === '服装类';
        });
        const clothingValue = clothingItems.reduce((acc, item) =>
            acc + (item.goods_price || 0), 0
        );
        const clothingPercentage = totalCarrierPrice > 0
            ? (clothingValue / totalCarrierPrice) * 100
            : 0;

        // 检查装箱数据
        const clothingItemsNeedVerification = [];
        for (const item of selectedItems) {
            if (!item.name) continue;
            const product = allProducts.find(p => p.中文品名 === item.name);
            if (product && product.类别 === '服装类' && !item.name.startsWith('(轻小件)')) {
                if (newSingleWeight && item.packing != null && item.packing < Math.floor(newSingleWeight) + 1) {
                    clothingItemsNeedVerification.push({
                        name: item.name,
                        packing: item.packing,
                        requiredPacking: Math.floor(newSingleWeight) + 1,
                        single_weight: newSingleWeight,
                    });
                }
            }
        }

        if (clothingItemsNeedVerification.length > 0) {
            Modal.error({
                title: '检查不通过',
                content: (
                    <div>
                        <h4>装箱数据检查不通过</h4>
                        <p>以下服装类产品装箱数据不符合要求:</p>
                        <List
                            dataSource={clothingItemsNeedVerification}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={item.name}
                                        description={`当前一箱件数: ${item.packing}, 要求: ≥ ${item.requiredPacking} (基于单箱重量 ${item.single_weight})`}
                                    />
                                </List.Item>
                            )}
                        />
                        {/* <Button
                            type="primary"
                            onClick={() => {
                                Modal.destroyAll();
                                setTempValues(values);
                                handleGetVerificationCode();
                                setIsVerificationModalVisible(true);
                            }}
                            loading={isVerificationLoading}
                            style={{ marginTop: 16 }}
                        >
                            获取验证码强制下载
                        </Button> */}
                        <Button
                            type="primary"
                            onClick={() => {
                                Modal.destroyAll();
                                handleDownloadExcel(values);
                            }}
                        >
                            强制下载
                        </Button>
                    </div>
                ),
                okText: '关闭',
                zIndex: 1000,
            });
            return;
        }

        // 计算当前值
        const currentValuePerWeight = (totalCarrierPrice / Number(executeForm.getFieldValue('weight'))).toFixed(2);
        const currentTaxPerKg = (
            totalAllYuguTax /
            Number(executeForm.getFieldValue('weight')) *
            Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'))
        ).toFixed(2);

        // 重新获取最新的港口数据
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/ports?country=${selectedCountry}`);
            setPortContent(response.data);

            // 获取选中港口的检查数据
            const selectedPort = response.data.find((p: Port) => p.port_name === values.port);
            if (selectedPort && selectedPort.check_data) {
                // 只考虑enabled为true的条件
                const enabledConditions = selectedPort.check_data.filter((item: { enabled: boolean }) => item.enabled);

                // 获取检查条件
                const valuePerWeightCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值/重量");
                const taxPerKgCondition = enabledConditions.find((item: { name: string }) => item.name === "预估整票税金CNY/Kg");
                const clothingValueCondition = enabledConditions.find((item: { name: string }) => item.name === "服装类货值");

                // 通用比较函数
                const checkCondition = (condition: any, currentValue: number) => {
                    if (!condition) return true;

                    const checkValue = Number(condition.value);

                    switch (condition.operator) {
                        case '>':
                            return currentValue >= checkValue;
                        case '>=':
                            return currentValue >= checkValue;
                        case '<':
                            return currentValue <= checkValue;
                        case '<=':
                            return currentValue <= checkValue;
                        case '==':
                            return currentValue === checkValue;
                        default:
                            return true;
                    }
                };

                // 检查是否满足条件
                const isValuePerWeightOk = checkCondition(valuePerWeightCondition, Number(currentValuePerWeight));
                const isTaxPerKgOk = checkCondition(taxPerKgCondition, Number(currentTaxPerKg));
                const isClothingValueOk = checkCondition(clothingValueCondition, clothingPercentage);

                // 创建确认对话框内容
                const confirmContent = (
                    <div>

                        <p>结果：</p>
                        <p style={{ color: isValuePerWeightOk ? 'green' : 'red' }}>
                            总货值/重量: {currentValuePerWeight} {isValuePerWeightOk ? '(检测通过)' : `(不满足条件: ${valuePerWeightCondition?.operator} ${valuePerWeightCondition?.value})`}
                        </p>
                        <p style={{ color: isTaxPerKgOk ? 'green' : 'red' }}>
                            预估整票税金CNY/Kg: {currentTaxPerKg} {isTaxPerKgOk ? '(检测通过)' : `(不满足条件: ${taxPerKgCondition?.operator} ${taxPerKgCondition?.value})`}
                        </p>
                        <p style={{ color: isClothingValueOk ? 'green' : 'red' }}>
                            服装类货值占比: {clothingPercentage.toFixed(2)}% {isClothingValueOk ? '(检测通过)' : `(不满足条件: ${clothingValueCondition?.operator} ${clothingValueCondition?.value}%)`}
                        </p>

                    </div>
                );

                // 显示确认对话框
                // 检查是否满足继续下载的条件：服装类占比满足条件，并且至少还有一个其他条件满足
                const canDownloadDirectly = isClothingValueOk && (isValuePerWeightOk || isTaxPerKgOk);

                if (!isValuePerWeightOk && !isTaxPerKgOk && !isClothingValueOk) {
                    // 所有指标都不合格，需要验证码
                    Modal.error({
                        title: '检测结果',
                        content: (
                            <div>
                                {confirmContent}
                                <div>
                                    <p style={{ color: 'red', fontWeight: 'bold' }}>所有检测值均不符合要求，需要验证码才能强制下载</p>
                                    {/* <Button
                                        type="primary"
                                        onClick={() => {
                                            setTempValues(values);
                                            handleGetVerificationCode();
                                            setIsVerificationModalVisible(true);
                                        }}
                                        loading={isVerificationLoading}
                                    >
                                        获取验证码强制下载
                                    </Button> */}
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            Modal.destroyAll();
                                            handleDownloadExcel(values);
                                        }}
                                    >
                                        强制下载
                                    </Button>
                                </div>
                            </div>
                        ),
                        okText: '关闭',
                        zIndex: 1000 // 设置较低的zIndex，确保验证码Modal和message能显示在上面
                    });
                    return;
                } else {
                    // 至少有一个指标合格
                    Modal.confirm({
                        title: '检测结果',
                        content: (
                            <div>
                                {confirmContent}
                                <div>
                                    <p style={{ color: canDownloadDirectly ? 'green' : 'orange', fontWeight: 'bold' }}>
                                        {canDownloadDirectly
                                            ? '满足继续下载条件：服装类占比满足要求，且至少一个其他条件满足'
                                            : '不满足继续下载条件，需要验证码才能强制下载'}
                                    </p>
                                    {canDownloadDirectly ? (
                                        <div>
                                            <Button
                                                type="primary"
                                                onClick={() => {
                                                    Modal.destroyAll();
                                                    handleDownloadExcel(values);
                                                }}
                                            >
                                                继续下载
                                            </Button>

                                        </div>
                                    ) : (
                                        // <Button
                                        //     type="primary"
                                        //     onClick={() => {
                                        //         setTempValues(values);
                                        //         handleGetVerificationCode();
                                        //         setIsVerificationModalVisible(true);
                                        //     }}
                                        //     loading={isVerificationLoading}
                                        // >
                                        //     获取验证码强制下载
                                        // </Button>
                                        <Button
                                            type="primary"
                                            onClick={() => {
                                                Modal.destroyAll();
                                                handleDownloadExcel(values);
                                            }}
                                        >
                                            强制下载
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ),
                        okText: '关闭',
                        cancelText: '取消',
                        zIndex: 1000, // 设置较低的zIndex
                        onOk: () => {
                            if (canDownloadDirectly) {
                                handleDownloadExcel(values);
                            }
                        }
                    });
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching latest port data:', error);
            message.error('获取最新港口数据失败');
            return;
        }

        // 如果没有检查数据，直接下载
        handleDownloadExcel(values);
    };

    // 添加实际的下载处理函数
    const handleDownloadExcel = async (values: any, items?: SelectedItem[], totals?: { totalYuguTax: number, totalAllYuguTax: number, totalCarrierPrice: number }) => {
        setLoadingSubmit(true);
        
        // 使用传入的items或默认的selectedItems
        const useItems = items || selectedItems;
        const useTotals = totals || {
            totalYuguTax,
            totalAllYuguTax,
            totalCarrierPrice
        };
        
        const data = {
            totalyugutax: useTotals.totalAllYuguTax.toFixed(2),
            predict_tax_price: (
                useTotals.totalAllYuguTax /
                Number(values.weight) *
                Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'))
            ).toFixed(2),
            shipper_name: values.sender,
            receiver_name: values.receiver,
            port: values.port,
            country: values.country,
            export_country: values.country,
            packing_type: "",
            master_bill_no: values.orderNumber,
            gross_weight: values.weight,
            volume: values.volume,
            execute_type: 'Air',
            product_list: useItems
                .filter(item => item.name !== "")
                .sort((a, b) => {
                    if (a.single_weight && !b.single_weight) return -1;
                    if (!a.single_weight && b.single_weight) return 1;
                    return 0;
                })
                .map(item => ({
                    product_name: item.name,
                    box_num: item.quantity,
                    packing: item.packing,
                    single_price: item.single_price
                }))
        };


        try {
            const response = await axiosInstance.post(`${server_url}/qingguan/process-shipping-data`, data, {
                responseType: 'blob'
            });
            // console.log("全部响应头：", response.headers);

            const contentType = response.headers['content-type'];
            let fileExtension = '';

            switch (contentType) {
                case 'application/json':
                    const reader = new FileReader();
                    reader.onload = () => {
                        const jsonResponse = JSON.parse(reader.result as string);
                        setJsonContent(jsonResponse['content']);
                        setIsModalVisible(true);
                    };
                    reader.readAsText(response.data);
                    break;
                case 'application/pdf':
                    fileExtension = '.pdf';
                    break;
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                    fileExtension = '.xlsx';
                    break;
                case 'application/msword':
                    fileExtension = '.doc';
                    break;
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    fileExtension = '.docx';
                    break;
                case 'application/x-zip-compressed':
                    fileExtension = '.zip';
                    break;
                default:
                    fileExtension = '';
            }

            if (contentType !== 'application/json') {
                const contentDisposition = response.headers['content-disposition'];
                console.log('contentDisposition', contentDisposition)
                let filename = '';
                if (contentDisposition) {
                    // 处理 filename*=utf-8'' 格式
                    const filenameMatch = contentDisposition.match(/filename\*=utf-8''([^;]+)/);
                    if (filenameMatch) {
                        filename = decodeURIComponent(filenameMatch[1]);
                        console.log('filename', filename);
                    } else {
                        // 处理 filename= 格式
                        const simpleMatch = contentDisposition.match(/filename=([^;]+)/);
                        if (simpleMatch) {
                            filename = simpleMatch[1].replace(/["']/g, '');
                            console.log('filename', filename);
                        }
                    }
                }

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename || `${data.master_bill_no} CI&PL${fileExtension}`);
                document.body.appendChild(link);
                link.click();
            }

            // 保存提交历史
            await saveSubmissionHistory(values, useItems, useTotals);

            // 清空表单（仅在使用默认数据时）
            if (!items) {
                executeForm.resetFields();
                setIsChecked(false);
                setSelectedItems([]);
                setSelectedProducts([]); // 清空选中产品
                setOptimizationResult(null); // 清空优化结果
                setOptimizationHistory([]); // 清空优化历史
                executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
                setTotalYuguTax(0);
                setTotalAllYuguTax(0);
                setTotalCarrierPrice(0);
            }
        } catch (error) {
            console.error('Error submitting product data:', error);
        } finally {
            setLoadingSubmit(false);
        }
    };



    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = 'excel_template/清关发票箱单模板 - Air.xlsx'; // 替换为实际的模板文件路径
        link.download = '清关发票箱单模板 - Air.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };





    const applySubmissionHistory = (historyEntry: SubmissionHistoryEntry) => {
        // 创建selectedItems的深拷贝，确保每个对象都是全新的
        const newSelectedItems = historyEntry.selectedItems.map(item => ({
            ...item,
            key: Date.now() + Math.random() // 确保每个item都有新的唯一key
        }));

        executeForm.setFieldsValue(historyEntry.formValues);
        setSelectedItems(newSelectedItems);

        const items = newSelectedItems;
        const formValues = historyEntry.formValues;

        let total = items.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        const all_goods_price = items.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);

        const result = all_goods_price * 0.003464;
        const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);

        setTotalYuguTax(total);
        setTotalCarrierPrice(all_goods_price);
        setTotalAllYuguTax(total + min_total);
        single_weight_calculate(Number(formValues.weight), items);

        if (formValues.rate_cn_us) {
            setCnUsdRate(formValues.rate_cn_us);
        }

        if (formValues.fda_report) {
            setIsChecked(formValues.fda_report);
        }

        setIsSubmissionHistoryModalVisible(false);
        message.success('历史记录已应用');
    };

    const deleteSubmissionHistory = async (id: string) => {
        try {
            await axiosInstance.delete(`${server_url}/qingguan/cumstom_clear_history_original_summary/${id}`);
            setSubmissionHistory(prev => prev.filter(item => item._id !== id));
            message.success('历史记录已删除');
        } catch (error) {
            console.error('Error deleting submission history:', error);
            message.error('删除历史记录失败');
        }
    };

    // 获取优化结果
    const handleOptimization = async () => {
        try {
            setIsOptimizing(true);
            
            // 准备产品数据 - 根据接口规范，products_data 可以为空
            let productsData: any[] = [];
            
            if (selectedProducts.length > 0) {
                // 如果选择了产品，则准备产品数据
                productsData = selectedProducts.map(productName => {
                    const product = allProducts.find(p => p.中文品名 === productName);
                    if (!product) return null;
                    
                    return {
                        name: product.中文品名,
                        price: Number(product.单价) || 0,
                        pcs_per_box: Number(product.件箱) || 1,
                        tax_rate: (Number(product.Duty) + calculateTotalJiazheng(product)) || 0,
                        single_weight: product.single_weight || 0,
                        min_weight_per_box: product.single_weight_range?.min_weight_per_box || 0,
                        max_weight_per_box: product.single_weight_range?.max_weight_per_box || 0

                    };
                }).filter(Boolean);
            }
            // 如果没有选择产品，products_data 为空数组，后端会自动从API获取
            
            // 获取当前选中的港口的 expansion_factor
            const selectedPortName = executeForm.getFieldValue('port');
            const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
            const explosionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
            
            const requestData: PackingOptimizationRequest = {
                ...optimizationParams,
                products_data: productsData,
                expansion_factor: explosionFactor // 携带 expansion_factor 参数
            };
            
            const response = await axiosInstance.post(`${server_url}/qingguan/packing_selection_optimize`, requestData);
            
            // 检查返回结果状态
            if (response.data.status === 'Infeasible' || !response.data.success) {
                Modal.warning({
                    title: '优化无解',
                    content: (
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
                                <h4 style={{ color: '#fa8c16', margin: 0, marginBottom: 8 }}>🚫 无法找到满足条件的组合</h4>
                                <p style={{ margin: 0, color: '#8c6e3f' }}>当前参数配置下无法找到符合要求的产品包装组合</p>
                            </div>
                            
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ margin: 0, marginBottom: 8, color: '#1890ff' }}>💡 建议调整以下参数：</h4>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    <li>减少每个产品的最少箱数</li>
                                    <li>调整货值/重量比率或税金/重量比率限制</li>
                                    <li>选择更多产品参与优化</li>
                                </ul>
                            </div>
                            
                            <div style={{ padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <p style={{ margin: 0, color: '#52c41a', fontWeight: 'bold' }}>✨ 提示：</p>
                                <p style={{ margin: 0, color: '#389e0d' }}>您可以调整上方的优化参数后重新尝试，或者手动添加产品进行包装</p>
                            </div>
                        </div>
                    ),
                    width: 600,
                    okText: '我知道了',
                    okButtonProps: { type: 'primary' },
                    zIndex: 1001
                });
                return;
            }
            
            // 保存新获取的优化结果到历史记录
            setOptimizationHistory(prev => [response.data, ...prev.slice(0, 9)]); // 最多保存10个历史记录
            
            setOptimizationResult(response.data);
            setIsOptimizationModalVisible(true);
            message.success('优化结果获取成功');
        } catch (error) {
            console.error('优化失败:', error);
            message.error('优化失败，请重试');
        } finally {
            setIsOptimizing(false);
        }
    };

    // 应用优化结果并直接生成PDF
    const applyOptimizationResult = async () => {
        if (!optimizationResult) return;
        
        // 验证表单必填字段
        try {
            await executeForm.validateFields();
        } catch (error) {
            message.error('请先完善表单中的必填信息后再生成PDF');
            return;
        }
        
        setLoadingSubmit(true); // 设置loading状态
        
        const newSelectedItems: SelectedItem[] = optimizationResult.selected_products.map((product, index) => {
            const originalProduct = allProducts.find(p => p.中文品名 === product.name);
            if (!originalProduct) return null;
            
            const key = Date.now() + index;
            const taxRate = Number(originalProduct.Duty);
            const totalJiazheng = calculateTotalJiazheng(originalProduct);
            const yuguTaxMoneyUsd = calculateYuguTaxMoneyUsd(product.boxes, originalProduct, product.pieces_per_box);
            
            return {
                key,
                name: product.name,
                quantity: product.boxes,
                packing: product.pieces_per_box,
                tax_rate: taxRate,
                total_jiazheng: totalJiazheng,
                yugu_tax_money_usd: yuguTaxMoneyUsd,
                huomian_deadline: originalProduct.豁免截止日期说明,
                danxiangshuijin: Number(originalProduct.一箱税金) || 0,
                renzheng: originalProduct.认证,
                goods_price: product.value_usd,
                single_price: Number(originalProduct.单价),
                single_weight: originalProduct.single_weight,
                other_rate: originalProduct.other_rate || { unit: '', value: 0 }
            };
        }).filter(Boolean) as SelectedItem[];
        
        // 更新总价值和税金
        const total = newSelectedItems.reduce((acc, item) => {
            return acc + (item.yugu_tax_money_usd || 0);
        }, 0);
        
        const allGoodsPrice = optimizationResult.summary.total_value_usd;
        const result = allGoodsPrice * 0.003464;
        const minTotal = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
        
        // 临时设置数据以用于PDF生成
        const tempFormValues = {
            ...executeForm.getFieldsValue(),
            weight: optimizationResult.summary.total_weight,
            allBoxCount: optimizationResult.summary.selected_count,
            volume: executeForm.getFieldValue('volume') // 保持用户输入的体积值
        };
        
        // 计算单箱重量
        const singleWeight = single_weight_calculate(optimizationResult.summary.total_weight, newSelectedItems);
        
        try {
            // 直接调用生成PDF，传入优化后的数据
            await handleDownloadExcel(tempFormValues, newSelectedItems, {
                totalYuguTax: total,
                totalAllYuguTax: total + minTotal,
                totalCarrierPrice: allGoodsPrice
            });
            
            // 只有成功生成PDF后才关闭Modal和清空数据
            setIsOptimizationModalVisible(false);
            
            // 清空表单和状态
            executeForm.resetFields();
            setIsChecked(false);
            setSelectedItems([]);
            setSelectedProducts([]); // 清空选中产品
            setOptimizationResult(null); // 清空优化结果
            setOptimizationHistory([]); // 清空优化历史
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
            setTotalYuguTax(0);
            setTotalAllYuguTax(0);
            setTotalCarrierPrice(0);
            
            message.success('PDF生成完成');
        } catch (error) {
            console.error('PDF生成失败:', error);
            message.error('PDF生成失败，请重试');
        } finally {
            setLoadingSubmit(false); // 无论成功失败都要取消loading状态
        }
    };







    // 修改显示历史记录modal的处理函数
    const showSubmissionHistory = async () => {
        try {
            setIsSubmissionHistoryModalVisible(true);
            const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_original_summary/?type=空运`);
            if (response.data) {
                setSubmissionHistory(response.data || []);
            }
        } catch (error) {
            console.error('Error loading submission history:', error);
            message.error('加载提交历史失败');
        }
    };

    // 添加保存提交历史的函数
    const saveSubmissionHistory = async (formValues: any, selectedItems: SelectedItem[], totals?: { totalYuguTax: number, totalAllYuguTax: number, totalCarrierPrice: number }) => {
        try {
            const useTotals = totals || {
                totalYuguTax,
                totalAllYuguTax, 
                totalCarrierPrice
            };
            
            const newHistoryEntry: Omit<SubmissionHistoryEntry, '_id'> = {
                formValues: {
                    ...formValues,
                    rate_cn_us: CnUsdRate || executeForm.getFieldValue('rate_cn_us'),
                    totalYuguTax: useTotals.totalYuguTax,
                    totalAllYuguTax: useTotals.totalAllYuguTax,
                    totalCarrierPrice: useTotals.totalCarrierPrice
                },
                selectedItems: selectedItems.map(item => ({
                    ...item,
                    key: item.key
                })),
                timestamp: new Date().toISOString(),
                type: '空运'
            };

            const response = await axiosInstance.post(`${server_url}/qingguan/cumstom_clear_history_original_summary/?type=空运`, newHistoryEntry);

            if (response.data && response.data.id) {
                const savedEntry = { ...newHistoryEntry, _id: response.data.id };
                setSubmissionHistory(prev => {
                    const updated = [savedEntry, ...prev];
                    return updated.slice(0, 5);
                });
            }
        } catch (error) {
            console.error('Error saving submission history:', error);
            message.error('保存提交历史失败');
        }
    };

    return (
        <div className={styles.container}>

            <div className={styles.formContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 className={styles.title} style={{ textAlign: 'center', flexGrow: 1 }}>货运订单</h1>
                    <Space>
                        <Button icon={<HistoryOutlined />} onClick={showSubmissionHistory}>
                            提交历史
                        </Button>
                        <Button type="primary" onClick={downloadTemplate}>下载模板</Button>
                    </Space>
                </div>
                <Form className={styles.form} form={executeForm} onFinish={download_get_excel}>
                    <Form.Item
                        label="FDA申报"
                        name="fda_report"
                        valuePropName="checked"
                        rules={[{ required: false }]}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
                            {isChecked && (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography.Text strong style={{ color: 'red', marginLeft: 8 }}>
                                        请提交FDA信息给管理员+单独绑定FDA工厂地址
                                    </Typography.Text>
                                    <Typography.Text strong style={{ color: 'blue', marginLeft: 8 }}>
                                        +提单收货人必须是SOLIMOES TRADING INC
                                    </Typography.Text>
                                </div>
                            )}
                        </div>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="出口国"
                                name="country"
                                rules={[{ required: true, message: '请选择出口国' }]}
                            >
                                <Select
                                    style={{ width: '100%' }}
                                    placeholder="请选择出口国"
                                    onChange={(value) => {
                                        setSelectedCountry(value);
                                        executeForm.setFieldsValue({ country: value });
                                    }}
                                >
                                    <Select.Option value="China">中国</Select.Option>
                                    <Select.Option value="Vietnam">越南</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item
                                label="港口"
                                name="port"
                                rules={[{ required: false }]}
                            >
                                <Select
                                    showSearch
                                    style={{ width: '100%' }}
                                    placeholder="选择或搜索港口"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        typeof option?.children === 'string' && (option.children as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                    onChange={handlePortChange}
                                >
                                    {PortContent.map((port) => (
                                        <Select.Option key={port.id} value={port.port_name}>
                                            {port.port_name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="无特殊情况：清关+提货"
                                name="special_qingguan_tihuo"
                                rules={[{ required: false }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="发货人"
                                name="sender"
                                rules={[{ required: true, message: '发货人是必填项' }]}
                            >
                                <Select
                                    showSearch
                                    style={{ width: '100%' }}
                                    placeholder="选择或搜索发货人"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        typeof option?.children === 'string' && (option.children as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedSender}
                                >
                                    {shippersAndReceivers.map((receiver) => {
                                        if (receiver.类型 === '发货人' && receiver.hide === '0' && receiver.关税类型 === '包税') {
                                            return (
                                                <Select.Option key={receiver.id} value={receiver.发货人}>
                                                    {receiver.发货人}
                                                </Select.Option>
                                            );
                                        }
                                        return null;
                                    })}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="收货人"
                                name="receiver"
                                rules={[{ required: true, message: '收货人是必填项' }]}
                            >
                                <Select
                                    showSearch
                                    style={{ width: '100%' }}
                                    placeholder="选择或搜索收货人"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        typeof option?.children === 'string' && (option.children as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedReceiver}
                                >
                                    {shippersAndReceivers.map((receiver) => {
                                        if (receiver.类型 === '收货人' && receiver.hide === '0' && receiver.关税类型 === '包税') {
                                            return (
                                                <Select.Option key={receiver.id} value={receiver.发货人}>
                                                    {receiver.发货人}
                                                </Select.Option>
                                            );
                                        }
                                        return null;
                                    })}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="主单号"
                                name="orderNumber"
                                rules={[
                                    { required: true, message: '主单号是必填项' },
                                    {
                                        pattern: /^[a-zA-Z0-9\-_\s]+$/,
                                        message: '主单号只能包含字母、数字、横线、下划线和空格'
                                    },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            // 检查是否包含Windows文件名不允许的字符
                                            const invalidChars = /[<>:"/\\|?*]/;
                                            if (invalidChars.test(value)) {
                                                return Promise.reject(new Error('主单号不能包含以下字符: < > : " / \\ | ? *'));
                                            }
                                            // 检查长度限制
                                            if (value.length > 50) {
                                                return Promise.reject(new Error('主单号长度不能超过50个字符'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input
                                    placeholder="请输入主单号（仅支持字母、数字、横线、下划线和空格）"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // 实时过滤不允许的字符
                                        const filteredValue = value.replace(/[<>:"/\\|?*]/g, '');
                                        if (filteredValue !== value) {
                                            e.target.value = filteredValue;
                                            executeForm.setFieldsValue({ orderNumber: filteredValue });
                                            message.warning('已自动移除不允许的特殊字符');
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="人民币美金汇率"
                                name="rate_cn_us"
                            >
                                <Input type='number'
                                    value={CnUsdRate !== null ? CnUsdRate.toString() : executeForm.getFieldValue('rate_cn_us')}
                                    onChange={(e) => {
                                        const value = e.target.value ? parseFloat(e.target.value) : null;
                                        setCnUsdRate(value);
                                        executeForm.setFieldsValue({ rate_cn_us: value });
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Volume(CBM)"
                                name="volume"
                                rules={[{ required: true, message: 'Volume是必填项' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* 包装优化配置 */}
                    <Card 
                        title={
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <CalculatorOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                <span>包装优化配置</span>
                            </div>
                        } 
                        style={{ 
                            marginBottom: 16,
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        headStyle={{
                            backgroundColor: '#f8feff',
                            borderBottom: '1px solid #e8f4f8'
                        }}
                    >
                        <div style={{ 
                            padding: '8px 0',
                            borderRadius: 6,
                            backgroundColor: '#f0f8ff',
                            border: '1px solid #d1e7dd',
                            marginBottom: 16
                        }}>
                            <p style={{ 
                                margin: '8px 16px',
                                color: '#0c5aa6',
                                fontSize: '14px',
                                fontWeight: 500
                            }}>
                                🎯 智能优化系统将根据您的参数配置，自动选择最优的产品组合和箱数分配
                            </p>
                            <p style={{ 
                                margin: '4px 16px 8px 16px',
                                color: '#0c5aa6',
                                fontSize: '12px'
                            }}>
                                💡 提示：如果不选择具体产品，系统将使用所有可用产品进行智能优化
                            </p>
                        </div>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    label={
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ color: '#1890ff', fontWeight: 500 }}>选择产品进行优化</span>
                                                <span style={{ 
                                                    marginLeft: 8, 
                                                    fontSize: '12px', 
                                                    color: '#666',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '2px 6px',
                                                    borderRadius: 4
                                                }}>
                                                    已选择 {selectedProducts.length} 个产品
                                                </span>
                                            </div>
                                            {selectedProducts.length > 0 && (
                                                <Button 
                                                    type="link" 
                                                    size="small"
                                                    onClick={() => setSelectedProducts([])}
                                                    style={{ 
                                                        color: '#ff4d4f',
                                                        fontSize: '12px',
                                                        padding: 0,
                                                        height: 'auto'
                                                    }}
                                                >
                                                    ✖ 一键清空
                                                </Button>
                                            )}
                                        </div>
                                    }
                                    name="optimization_products"
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="请选择要进行包装优化的产品（可选，空选时会使用所有产品）"
                                        value={selectedProducts}
                                        onChange={setSelectedProducts}
                                        showSearch
                                        allowClear
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option?.label?.props?.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{
                                            borderRadius: 6
                                        }}
                                        maxTagCount={3}
                                        maxTagTextLength={15}
                                        options={allProducts.map((product) => ({
                                            value: product.中文品名,
                                            label:
                                                <span style={{ whiteSpace: 'normal', wordWrap: 'break-word', wordBreak: 'break-all' }}>
                                                    {product.中文品名}
                                                </span>
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        
                        <Form form={optimizationForm} layout="vertical">
                            <div style={{ 
                                backgroundColor: '#fafbfc', 
                                padding: 16, 
                                borderRadius: 6, 
                                border: '1px solid #e8e8e8',
                                marginBottom: 16
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#1890ff', fontSize: '14px' }}>
                                    🎢 目标参数设置
                                </h4>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item
                                            label="目标总重量 (kg)(GrossWeight)"
                                            name="W_target"
                                            initialValue={optimizationParams.W_target}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={0.1}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                onChange={(value) => setOptimizationParams(prev => ({ ...prev, W_target: value || 0 }))}
                                                placeholder="输入目标重量"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="目标总箱数"
                                            name="B_target"
                                            initialValue={optimizationParams.B_target}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={1}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                onChange={(value) => setOptimizationParams(prev => ({ ...prev, B_target: value || 0 }))}
                                                placeholder="输入目标箱数"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="选择的产品数量 (k)"
                                            name="k"
                                            initialValue={optimizationParams.k}
                                        >
                                            <InputNumber
                                                min={1}
                                                max={10}
                                                step={1}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                onChange={(value) => setOptimizationParams(prev => ({ ...prev, k: value || 3 }))}
                                                placeholder="1-10"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>
                            
                            <div style={{ 
                                backgroundColor: '#f9f9f9', 
                                padding: 16, 
                                borderRadius: 6, 
                                border: '1px solid #e8e8e8',
                                marginBottom: 16
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <h4 style={{ margin: 0, color: '#52c41a', fontSize: '14px' }}>
                                        📊 比率控制参数
                                    </h4>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={showAdvancedRatioParams ? <EyeOutlined /> : <EditOutlined />}
                                        onClick={() => setShowAdvancedRatioParams(!showAdvancedRatioParams)}
                                        style={{
                                            color: '#52c41a',
                                            fontSize: '12px',
                                            height: 'auto',
                                            padding: '2px 6px'
                                        }}
                                        title={showAdvancedRatioParams ? '隐藏高级参数' : '显示高级参数'}
                                    >
                                        {showAdvancedRatioParams ? '隐藏' : '高级'}
                                    </Button>
                                </div>
                                <Row gutter={16} align="top">
                                    {showAdvancedRatioParams && (
                                        <>
                                            <Col span={8}>
                                        <Form.Item
                                            label={
                                                <div style={{ minHeight: '40px' }}>
                                                    <span>货值/重量最低比率 (USD/kg)</span>
                                                    {(() => {
                                                        const selectedPortName = executeForm.getFieldValue('port');
                                                        const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                        const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                        if (expansionFactor && expansionFactor !== 1) {
                                                            return (
                                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                                    原始值: {optimizationParams.alpha} × 膨胀系数: {expansionFactor}
                                                                </div>
                                                            );
                                                        }
                                                        return <div style={{ height: '16px' }}></div>;
                                                    })()}
                                                </div>
                                            }
                                            name="alpha"
                                            initialValue={optimizationParams.alpha}
                                        >
                                            <InputNumber
                                                key={`alpha-${portBasedRefresh}`}
                                                min={0}
                                                step={0.01}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                value={(() => {
                                                    const selectedPortName = executeForm.getFieldValue('port');
                                                    const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                    const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                    if (expansionFactor && expansionFactor !== 0) {
                                                        return optimizationParams.alpha * expansionFactor;
                                                    }
                                                    return optimizationParams.alpha;
                                                })()}
                                                onChange={(value) => {
                                                    const selectedPortName = executeForm.getFieldValue('port');
                                                    const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                    const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                    if (expansionFactor && expansionFactor !== 0) {
                                                        // 将显示值转换回原始值存储
                                                        const originalValue = (value || 0) / expansionFactor;
                                                        setOptimizationParams(prev => ({ ...prev, alpha: originalValue }));
                                                    } else {
                                                        setOptimizationParams(prev => ({ ...prev, alpha: value || 0 }));
                                                    }
                                                }}
                                                placeholder="最低比率"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label={
                                                <div style={{ minHeight: '40px' }}>
                                                    <span>税金/重量最高比率 (CNY/kg)</span>
                                                    {(() => {
                                                        const selectedPortName = executeForm.getFieldValue('port');
                                                        const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                        const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                        if (expansionFactor && expansionFactor !== 1) {
                                                            return (
                                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                                    原始值: {optimizationParams.beta_cny} × 膨胀系数: {expansionFactor}
                                                                </div>
                                                            );
                                                        }
                                                        return <div style={{ height: '16px' }}></div>;
                                                    })()}
                                                </div>
                                            }
                                            name="beta_cny"
                                            initialValue={optimizationParams.beta_cny}
                                        >
                                            <InputNumber
                                                key={`beta-cny-${portBasedRefresh}`}
                                                min={0}
                                                step={0.01}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                value={(() => {
                                                    const selectedPortName = executeForm.getFieldValue('port');
                                                    const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                    const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                    if (expansionFactor && expansionFactor !== 0) {
                                                        return optimizationParams.beta_cny * expansionFactor;
                                                    }
                                                    return optimizationParams.beta_cny;
                                                })()}
                                                onChange={(value) => {
                                                    const selectedPortName = executeForm.getFieldValue('port');
                                                    const selectedPort = PortContent.find(p => p.port_name === selectedPortName);
                                                    const expansionFactor = selectedPort?.expansion_factor ? parseFloat(selectedPort.expansion_factor.toString()) : null;
                                                    if (expansionFactor && expansionFactor !== 0) {
                                                        // 将显示值转换回原始值存储
                                                        const originalValue = (value || 0) / expansionFactor;
                                                        setOptimizationParams(prev => ({ ...prev, beta_cny: originalValue }));
                                                    } else {
                                                        setOptimizationParams(prev => ({ ...prev, beta_cny: value || 0 }));
                                                    }
                                                }}
                                                placeholder="最高比率"
                                            />
                                        </Form.Item>
                                    </Col>
                                        </>
                                    )}
                                    <Col span={showAdvancedRatioParams ? 8 : 24}>
                                        <Form.Item
                                            label={
                                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'flex-start' }}>
                                                    <span>USD to CNY 汇率</span>
                                                </div>
                                            }
                                            name="exchange_rate"
                                            initialValue={optimizationParams.exchange_rate}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={0.01}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                onChange={(value) => setOptimizationParams(prev => ({ ...prev, exchange_rate: value || 7.22 }))}
                                                placeholder="汇率"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>
                            
                            <div style={{ 
                                backgroundColor: '#fff7e6', 
                                padding: 16, 
                                borderRadius: 6, 
                                border: '1px solid #ffd591'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#fa8c16', fontSize: '14px' }}>
                                    ⚙️ 其他参数
                                </h4>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="每个产品最少箱数"
                                            name="min_boxes_per_product"
                                            initialValue={optimizationParams.min_boxes_per_product}
                                        >
                                            <InputNumber
                                                min={1}
                                                step={1}
                                                style={{ width: '100%', borderRadius: 4 }}
                                                onChange={(value) => setOptimizationParams(prev => ({ ...prev, min_boxes_per_product: value || 20 }))}
                                                placeholder="最少箱数"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 30 }}>
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    icon={<CalculatorOutlined />}
                                                    loading={isOptimizing}
                                                    onClick={handleOptimization}
                                                    style={{ 
                                                        flex: 1,
                                                        height: 44,
                                                        borderRadius: 6,
                                                        fontSize: '16px',
                                                        fontWeight: 500,
                                                        background: 'linear-gradient(135deg, #1890ff, #40a9ff)',
                                                        border: 'none',
                                                        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                                                    }}
                                                >
                                                    {isOptimizing ? '正在优化...' : '🚀 获取优化结果'}
                                                </Button>
                                                {optimizationHistory.length > 0 && (
                                                    <Button
                                                        type="default"
                                                        size="large"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => setIsOptimizationHistoryModalVisible(true)}
                                                        style={{
                                                            height: 44,
                                                            borderRadius: 6,
                                                            width: 44,
                                                            minWidth: 44,
                                                            padding: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="查看优化历史"
                                                    />
                                                )}
                                            </div>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>
                        </Form>
                    </Card>
                </Form>





            <Modal title="错误" visible={isModalVisible} onOk={() => {
                setIsModalVisible(false);
            }} onCancel={() => {
                setIsModalVisible(false);
            }}>
                <pre>{JSON.stringify(jsonContent, null, 2)}</pre>
            </Modal>
            <Modal title="提单log" width={1080}
                visible={isTiDanLogModalVisible} onOk={() => {
                    setTiDanLogModalVisible(false);
                }} onCancel={() => {
                    setTiDanLogModalVisible(false);
                }}>
                <TiDanLog></TiDanLog>
            </Modal>
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                            width: 40, 
                            height: 40, 
                            backgroundColor: '#f6ffed', 
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                        }}>
                            <CalculatorOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>🎉 包装优化结果</div>
                            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>智能算法为您找到了最优解</div>
                        </div>
                    </div>
                }
                visible={isOptimizationModalVisible}
                onCancel={() => setIsOptimizationModalVisible(false)}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => setIsOptimizationModalVisible(false)}
                        style={{ borderRadius: 6 }}
                    >
                        取消
                    </Button>,
                    <Button 
                        key="apply" 
                        type="primary" 
                        onClick={applyOptimizationResult}
                        loading={loadingsubmit}
                        style={{ 
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #52c41a, #73d13d)',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                        }}
                    >
                        ✨ 生成PDF
                    </Button>
                ]}
                width={1200}
                bodyStyle={{ padding: '24px 24px 16px' }}
                style={{ top: 20 }}
            >
                {optimizationResult && (
                    <div>
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#1890ff' }}>🎯 优化参数</span>
                                </div>
                            } 
                            size="small" 
                            style={{ 
                                marginBottom: 16,
                                borderRadius: 8,
                                border: '1px solid #e8f4f8',
                                backgroundColor: '#fafbfc'
                            }}
                            headStyle={{
                                backgroundColor: '#f0f8ff',
                                borderBottom: '1px solid #e8f4f8'
                            }}
                        >
                            <Row gutter={16}>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                                            {optimizationResult.parameters.W_target}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>目标总重量 (kg)</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                                            {optimizationResult.parameters.B_target}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>目标总箱数</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                                            {optimizationResult.parameters.k}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>最多选择产品数</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                                            {optimizationResult.parameters.min_boxes_per_product}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>每个产品最少箱数</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fa8c16' }}>
                                            {optimizationResult.parameters.alpha}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>货值/重量最低比率 (USD/kg)</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: 12 }}>
                                        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fa8c16' }}>
                                            {optimizationResult.parameters.beta_cny}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 12 }}>税金/重量最高比率 (CNY/kg)</div>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                        
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#52c41a' }}>📈 优化结果汇总</span>
                                </div>
                            } 
                            size="small" 
                            style={{ 
                                marginBottom: 16,
                                borderRadius: 8,
                                border: '1px solid #f6ffed',
                                backgroundColor: '#fcfff4'
                            }}
                            headStyle={{
                                backgroundColor: '#f6ffed',
                                borderBottom: '1px solid #d9f7be'
                            }}
                        >
                            <Row gutter={24}>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                        <div style={{ 
                                            fontSize: 28, 
                                            fontWeight: 'bold', 
                                            color: '#52c41a',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.total_weight}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>总重量 (kg)</div>
                                        
                                        <div style={{ 
                                            fontSize: 24, 
                                            fontWeight: 'bold', 
                                            color: '#1890ff',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.total_value_usd.toFixed(2)}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13 }}>总货值 (USD)</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                        <div style={{ 
                                            fontSize: 28, 
                                            fontWeight: 'bold', 
                                            color: '#fa8c16',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.total_tax_cny.toFixed(2)}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>总税金 (CNY)</div>
                                        
                                        <div style={{ 
                                            fontSize: 24, 
                                            fontWeight: 'bold', 
                                            color: '#722ed1',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.selected_count}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13 }}>选中产品数</div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                        <div style={{ 
                                            fontSize: 20, 
                                            fontWeight: 'bold', 
                                            color: '#13c2c2',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.value_per_weight_usd.toFixed(3)}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>货值/重量比率 (USD/kg)</div>
                                        
                                        <div style={{ 
                                            fontSize: 20, 
                                            fontWeight: 'bold', 
                                            color: '#eb2f96',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.tax_per_weight_cny.toFixed(3)}
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13 }}>税金/重量比率 (CNY/kg)</div>
                                    </div>
                                </Col>
                            </Row>
                            
                            <Divider style={{ margin: '16px 0' }} />
                            
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div style={{ 
                                        padding: 12, 
                                        backgroundColor: optimizationResult.summary.value_ratio_ok ? '#f6ffed' : '#fff2e8',
                                        borderRadius: 6,
                                        border: `1px solid ${optimizationResult.summary.value_ratio_ok ? '#b7eb8f' : '#ffbb96'}`,
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ 
                                            fontSize: 16, 
                                            fontWeight: 'bold',
                                            color: optimizationResult.summary.value_ratio_ok ? '#52c41a' : '#fa541c',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.value_ratio_ok ? '✅' : '❌'} 货值比率检查
                                        </div>
                                        <div style={{ 
                                            color: optimizationResult.summary.value_ratio_ok ? '#389e0d' : '#d4380d',
                                            fontSize: 14
                                        }}>
                                            {optimizationResult.summary.value_ratio_ok ? '通过' : '未通过'}
                                        </div>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div style={{ 
                                        padding: 12, 
                                        backgroundColor: optimizationResult.summary.tax_ratio_ok ? '#f6ffed' : '#fff2e8',
                                        borderRadius: 6,
                                        border: `1px solid ${optimizationResult.summary.tax_ratio_ok ? '#b7eb8f' : '#ffbb96'}`,
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ 
                                            fontSize: 16, 
                                            fontWeight: 'bold',
                                            color: optimizationResult.summary.tax_ratio_ok ? '#52c41a' : '#fa541c',
                                            marginBottom: 4
                                        }}>
                                            {optimizationResult.summary.tax_ratio_ok ? '✅' : '❌'} 税金比率检查
                                        </div>
                                        <div style={{ 
                                            color: optimizationResult.summary.tax_ratio_ok ? '#389e0d' : '#d4380d',
                                            fontSize: 14
                                        }}>
                                            {optimizationResult.summary.tax_ratio_ok ? '通过' : '未通过'}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                        
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ color: '#722ed1' }}>📦 选中产品详情</span>
                                </div>
                            } 
                            size="small"
                            style={{
                                borderRadius: 8,
                                border: '1px solid #f9f0ff',
                                backgroundColor: '#fefbff'
                            }}
                            headStyle={{
                                backgroundColor: '#f9f0ff',
                                borderBottom: '1px solid #efdbff'
                            }}
                        >
                            <Table
                                dataSource={optimizationResult.selected_products}
                                pagination={false}
                                size="small"
                                scroll={{ x: 800 }}
                                style={{
                                    borderRadius: 6,
                                    overflow: 'hidden'
                                }}
                                rowClassName={(record, index) => 
                                    index % 2 === 0 ? 'row-light' : 'row-dark'
                                }
                                columns={[
                                    {
                                        title: '🏷️ 产品名称',
                                        dataIndex: 'name',
                                        key: 'name',
                                        width: 180,
                                        render: (text: string) => (
                                            <div style={{ 
                                                fontWeight: 500, 
                                                color: '#262626',
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-word'
                                            }}>
                                                {text}
                                            </div>
                                        )
                                    },
                                    {
                                        title: '📦 箱数',
                                        dataIndex: 'boxes',
                                        key: 'boxes',
                                        width: 80,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 16, 
                                                fontWeight: 'bold', 
                                                color: '#1890ff',
                                                textAlign: 'center'
                                            }}>
                                                {value}
                                            </div>
                                        )
                                    },
                                    {
                                        title: '⚖️ 每箱重量',
                                        dataIndex: 'weight_per_box',
                                        key: 'weight_per_box',
                                        width: 120,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                fontWeight: 500, 
                                                color: '#52c41a'
                                            }}>
                                                {value.toFixed(3)} kg
                                            </div>
                                        )
                                    },
                                    {
                                        title: '📊 总重量',
                                        dataIndex: 'total_weight',
                                        key: 'total_weight',
                                        width: 120,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold', 
                                                color: '#52c41a'
                                            }}>
                                                {value.toFixed(2)} kg
                                            </div>
                                        )
                                    },
                                    {
                                        title: '💰 货值',
                                        dataIndex: 'value_usd',
                                        key: 'value_usd',
                                        width: 120,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold', 
                                                color: '#1890ff'
                                            }}>
                                                ${value.toFixed(2)}
                                            </div>
                                        )
                                    },
                                    {
                                        title: '💸 税金',
                                        dataIndex: 'tax_cny',
                                        key: 'tax_cny',
                                        width: 120,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold', 
                                                color: '#fa8c16'
                                            }}>
                                                ¥{value.toFixed(2)}
                                            </div>
                                        )
                                    },
                                    {
                                        title: '📎 每箱件数',
                                        dataIndex: 'pieces_per_box',
                                        key: 'pieces_per_box',
                                        width: 100,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                color: '#666'
                                            }}>
                                                {value}
                                            </div>
                                        )
                                    },
                                    {
                                        title: '📎 总件数',
                                        dataIndex: 'pieces',
                                        key: 'pieces',
                                        width: 100,
                                        align: 'center' as const,
                                        render: (value: number) => (
                                            <div style={{ 
                                                fontSize: 14, 
                                                fontWeight: 500,
                                                color: '#722ed1'
                                            }}>
                                                {value}
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Modal>

            <Modal
                title="提交历史"
                visible={isSubmissionHistoryModalVisible}
                onCancel={() => setIsSubmissionHistoryModalVisible(false)}
                footer={null}
                width={800}
            >
                <List
                    dataSource={submissionHistory}
                    renderItem={(item: SubmissionHistoryEntry) => (
                        <List.Item
                            actions={[
                                <Button key="apply" type="primary" onClick={() => applySubmissionHistory(item)}>应用</Button>,
                                <Button key="delete" danger onClick={() => deleteSubmissionHistory(item._id || '')}>删除</Button>
                            ]}
                        >
                            <List.Item.Meta
                                title={`主单号: ${item.formValues.orderNumber || 'N/A'}`}
                                description={`保存于: ${new Date(item.timestamp).toLocaleString()}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <Modal
                title="优化历史记录"
                visible={isOptimizationHistoryModalVisible}
                onCancel={() => setIsOptimizationHistoryModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsOptimizationHistoryModalVisible(false)}>
                        关闭
                    </Button>
                ]}
                width={1200}
                bodyStyle={{ padding: '24px' }}
            >
                {optimizationHistory.length > 0 ? (
                    <List
                        dataSource={optimizationHistory}
                        renderItem={(item, index) => (
                            <List.Item
                                key={index}
                                actions={[
                                    <Button 
                                        key="apply" 
                                        type="primary" 
                                        onClick={() => {
                                            setOptimizationResult(item);
                                            setIsOptimizationHistoryModalVisible(false);
                                            setIsOptimizationModalVisible(true);
                                            message.success('已应用选中的优化结果');
                                        }}
                                    >
                                        应用此结果
                                    </Button>
                                ]}
                            >
                                <Card
                                    size="small"
                                    style={{ width: '100%', marginBottom: 8 }}
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>优化结果 #{index + 1}</span>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                选中产品数: {item.summary.selected_count} | 总重量: {item.summary.total_weight}kg
                                            </div>
                                        </div>
                                    }
                                >
                                    <Row gutter={16}>
                                        <Col span={6}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                                                    {item.summary.total_value_usd.toFixed(2)}
                                                </div>
                                                <div style={{ color: '#666', fontSize: 12 }}>总货值 (USD)</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fa8c16' }}>
                                                    {item.summary.total_tax_cny.toFixed(2)}
                                                </div>
                                                <div style={{ color: '#666', fontSize: 12 }}>总税金 (CNY)</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ 
                                                    fontSize: 16, 
                                                    fontWeight: 'bold', 
                                                    color: item.summary.value_ratio_ok ? '#52c41a' : '#ff4d4f' 
                                                }}>
                                                    {item.summary.value_per_weight_usd.toFixed(3)}
                                                </div>
                                                <div style={{ color: '#666', fontSize: 12 }}>货值/重量 (USD/kg)</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ 
                                                    fontSize: 16, 
                                                    fontWeight: 'bold', 
                                                    color: item.summary.tax_ratio_ok ? '#52c41a' : '#ff4d4f' 
                                                }}>
                                                    {item.summary.tax_per_weight_cny.toFixed(3)}
                                                </div>
                                                <div style={{ color: '#666', fontSize: 12 }}>税金/重量 (CNY/kg)</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </List.Item>
                        )}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        暂无优化历史记录
                    </div>
                )}
            </Modal>

            </div>
        </div>
    );
};


export default ExecuteAirNew;
