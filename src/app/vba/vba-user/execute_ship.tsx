"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, InputNumber, Checkbox, Typography, message, Row, Col, Space, List } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import moment from 'moment';
import withAuth from '@/components/withAuth';
// types.ts
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import TiDanLog from './customs_clear_tidan';
export interface SelectedItem {
    key: number;
    name: string;
    quantity: number;
    single_price: number;
    packing: number
    single_weight: number
    tax_rate?: number
    jiazheng?: number
    jiazheng0204?: number
    total_jiazheng?: number
    goods_price?: number;
    yugu_tax_money_usd?: number | null;
    other_rate: {
        unit: string;
        value: number;
    }

}


export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string; // 对应 Duty(%)
    加征: string; // 对应 加征%
    加征0204: string;
    加征代码: string;
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
    single_weight: number
    other_rate: {
        unit: string;
        value: number;
    }
}



export interface Port {
    id?: number; // 可选字段，因为在创建新记录时，id 可能尚未分配
    port_name: string;
    sender_name: string;
    receiver_name: string;
}

export interface PackingType {
    id: number | string;
    packing_type: string;
    sender_name: string;
    receiver_name: string;
    remarks: string;
    check_remarks?: string;
    check_data?: { name: string; value: string }[];
}

export interface ShipperReceiver {
    id?: number;
    中文?: string;
    发货人?: string;
    发货人详细地址?: string;
    类型: string;
    备注: string;
    hide: string

}

export interface ShippingRequest {
    sender: string;
    receiver: string;
    orderNumber: string;
    weight: number;
    volume: number;
    itemName: SelectedItem[];
}
interface HaiyunZishui {
    id: number;
    zishui_name: string;
    sender: string;
    receiver: string;
}

interface AdjustmentResult {
    id: number;
    items: SelectedItem[];
    metrics: {
        valuePerWeight: number;
        taxPerKg: number;
        totalAllTaxUSD?: number;
        singleBoxWeight?: number;
    };
    distribution: number[];
}

const { TabPane } = Tabs;
const { confirm } = Modal;


// const server_url = "http://localhost:9008";
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;
// console.log(server_url)
interface SubmissionHistoryEntry {
    _id?: string; // MongoDB的_id
    formValues: any;
    selectedItems: SelectedItem[];
    timestamp: string;
    type?: string;
    user?: string;
}

const ExecuteShip: React.FC = () => {


    const [activeTab, setActiveTab] = useState('execute');
    const [products, setProducts] = useState<Product[]>([]);
    const [shippersAndReceivers, setShippersAndReceivers] = useState<ShipperReceiver[]>([]);
    const [productFilter, setProductFilter] = useState('');
    const [shipperFilter, setShipperFilter] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [shipperPage, setShipperPage] = useState(1);
    const [productPageSize, setProductPageSize] = useState(10); // State to control product page size
    const [shipperPageSize, setShipperPageSize] = useState(10); // State to control shipper page size
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingShipper, setEditingShipper] = useState<ShipperReceiver | null>(null);
    const [isProductModalVisible, setProductModalVisible] = useState(false);
    const [isShipperModalVisible, setShipperModalVisible] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalShippers, setTotalShippers] = useState(0);

    const [executeForm] = Form.useForm();
    const [productForm] = Form.useForm();
    const [shipperForm] = Form.useForm();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    //总预估税金
    const [totalYuguTax, setTotalYuguTax] = useState<number>(0);

    //整票预估税金
    const [totalAllYuguTax, setTotalAllYuguTax] = useState<number>(0);

    //总货值
    const [totalCarrierPrice, setTotalCarrierPrice] = useState<number>(0);


    const [jsonContent, setJsonContent] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    //港口
    const [PortContent, setPortContent] = useState<Port[]>([]);
    const [PackingTypeContent, setPackingTypeContent] = useState<PackingType[]>([]);
    const [selectedSender, setSelectedSender] = useState<string | undefined>();
    const [selectedReceiver, setSelectedReceiver] = useState<string | undefined>();

    //汇率
    const [CnUsdRate, setCnUsdRate] = useState<number | null>(null);
    const [loadingsubmit, setLoadingSubmit] = useState(false);

    //复选框
    const [isChecked, setIsChecked] = useState(false);

    // 自税务
    const [haiyunzishui, setHaiYunZiShui] = useState<HaiyunZishui[]>([]);
    const [newSingleWeight, setNewSingleWeight] = useState<number | null>(null);
    const userName = useSelector((state: RootState) => state.user.name);
    const [isTiDanLogModalVisible, setTiDanLogModalVisible] = useState(false);

    const [selectedForAdjustment, setSelectedForAdjustment] = useState<number[]>([]);
    const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentResult[]>([]);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

    const [isSubmissionHistoryModalVisible, setIsSubmissionHistoryModalVisible] = useState(false);
    const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryEntry[]>([]);

    const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerificationLoading, setIsVerificationLoading] = useState(false);
    const [tempValues, setTempValues] = useState<any>(null);
    const [countdown, setCountdown] = useState<number>(0);

    // 添加范围设置相关状态
    const [adjustmentRanges, setAdjustmentRanges] = useState<{ [key: number]: { min?: number, max?: number } }>({});
    const [isRangeModalVisible, setIsRangeModalVisible] = useState(false);
    const [currentRangeKey, setCurrentRangeKey] = useState<number | null>(null);
    const [rangeForm] = Form.useForm();

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [countdown]);

    const handleGetVerificationCode = async () => {
        if (countdown > 0) {
            message.warning(`请等待${countdown}秒后再试`);
            return;
        }
        try {
            setIsVerificationLoading(true);
            const response = await axiosInstance.post(`${server_url}/qingguan/generate_verification_code`);
            if (response.data.code === 200) {
                message.success('验证码已发送到邮箱');
                setCountdown(60); // 设置60秒倒计时
            } else {
                message.error('获取验证码失败');
            }
        } catch (error) {
            message.error('获取验证码失败');
        } finally {
            setIsVerificationLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        try {
            setIsVerificationLoading(true);
            const formData = new FormData();
            formData.append('verification_code', verificationCode);

            const response = await axiosInstance.post(`${server_url}/qingguan/verify_code`, formData);
            if (response.data.code === 200) {
                message.success('验证成功，正在生成文件...');
                // 关闭所有Modal
                setIsVerificationModalVisible(false);
                Modal.destroyAll(); // 关闭所有modal，包括错误提示的modal
                // 验证成功后下载Excel
                if (tempValues) {
                    handleDownloadExcel(tempValues);
                }
            } else {
                message.error(response.data.message);
            }
        } catch (error) {
            message.error('验证失败');
        } finally {
            setIsVerificationLoading(false);
        }
    };

    useEffect(() => {
        fetchShippersAndReceivers();
    }, [shipperFilter, shipperPage, shipperPageSize]); // Add shipperPageSize as dependency


    // useEffect(() => {
    //     fetchAllProducts('China');
    //     console.log(CnUsdRate)
    // }, []); // Add shipperPageSize as dependency

    useEffect(() => {
        fetchAllProducts();
        fetchHaiYunZiShui();
        fetchExchangeRate();
    }, []);

    useEffect(() => {
        if (CnUsdRate !== undefined) {
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
        }
    }, [CnUsdRate, executeForm]);
    useEffect(() => {
        filterProducts(allProducts, productFilter, productPage, productPageSize);
    }, [productFilter]);
    const handleAddRow = () => {
        setSelectedItems([...selectedItems, { key: Date.now(), name: '', quantity: 0, single_price: 0, packing: 0, single_weight: 0, tax_rate: 0, other_rate: { unit: '', value: 0 } }]);
    };
    const fetchAllPackingType = async (append = false) => {
        const response = await axiosInstance.get(`${server_url}/qingguan/packing_types?country=${executeForm.getFieldValue('export_country')}`)
        setPackingTypeContent((prevPorts) => append ? [...prevPorts, ...response.data] : response.data);

    }
    const filterProducts = (products: Product[], filter: string, page: number, pageSize: number) => {
        let filteredProducts = products;
        if (filter) {
            filteredProducts = products.filter(product => product.中文品名 && product.中文品名.includes(filter));
        }
        const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
        setProducts(paginatedProducts);
    };
    // 计算总加征
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
    const calculateYuguTaxMoneyUsd = (
        quantity: number,
        product: Product | null,
        a_box_num: number | null = null,
        single_price: number | null = null
    ): number | null => {

        if (!product) return null;

        const taxRate = Number(product.Duty);
        const totalJiazheng = calculateTotalJiazheng(product);
        // const jiazheng = Number(product.加征);
        // const jiazheng0204 = Number(product.加征0204);
        // let a_box_tax: number;
        let totalTax: number;
        // 处理四种情况
        if (a_box_num === null && single_price === null) {
            // 情况1: both a_box_num and single_price are null
            totalTax = Number(product.一箱税金) * quantity;
        } else if (a_box_num !== null && single_price === null) {
            // 情况2: a_box_num is not null, single_price is null
            totalTax = Math.round(Number(product.单价) * a_box_num * quantity) * (taxRate + totalJiazheng);
        } else if (a_box_num === null && single_price !== null) {
            // 情况3: a_box_num is null, single_price is not null
            totalTax = Math.round(single_price * Number(product.件箱) * quantity) * (taxRate + totalJiazheng);
        } else if (a_box_num !== null && single_price !== null) {
            // 情况4: both a_box_num and single_price are not null
            totalTax = Math.round(single_price * a_box_num * quantity) * (taxRate + totalJiazheng);
        } else {
            totalTax = 0
        }



        return Math.round((totalTax + Number.EPSILON) * 100) / 100;
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

    const handlePackingTypeChange = (value: string) => {
        const packingType = PackingTypeContent.find(p => p.packing_type === value);
        if (packingType) {
            executeForm.setFieldsValue({
                sender: packingType.sender_name,
                receiver: packingType.receiver_name
            });
        } else {
            executeForm.setFieldsValue({
                sender: undefined,
                receiver: undefined
            });
        }
        let qingguanTihuo = '';
        if (packingType?.remarks) {
            qingguanTihuo = packingType.remarks;
        } else {
            qingguanTihuo = '';
        }
        executeForm.setFieldsValue({ special_qingguan_tihuo: qingguanTihuo });
    };
    const handleZiShuiChange = (zishui_name: string) => {
        haiyunzishui.map((value) => {
            if (value.zishui_name === zishui_name) {
                executeForm.setFieldsValue({
                    sender: value.sender,
                    receiver: value.receiver
                });
            }
        });
    };
    const handleProductSearch_Chinese = async (value: string | undefined) => {
        if (!value) return null;
        try {
            const country = executeForm.getFieldValue('export_country');
            const response = await axiosInstance.get(`${server_url}/qingguan/products_sea?名称=${value}&startland=${country}&destination=America`);
            return response.data.items[0] as Product;
        } catch (error) {
            console.error('查询产品时出错:', error);
            return null;
        }
    };
    const handleSelectChange = async (key: number, value: string, quantity: number) => {
        // const selectedProduct = allProducts.find(product => product.中文品名 === value);
        const selectedProduct = await handleProductSearch_Chinese(value);

        const taxRate = selectedProduct ? Number(selectedProduct.Duty) : undefined;

        const total_jiazheng = selectedProduct ? calculateTotalJiazheng(selectedProduct) : 0;
        const yuguTaxMoneyUsd = calculateYuguTaxMoneyUsd(quantity, selectedProduct || null);
        const huomianDeadline = selectedProduct ? selectedProduct.豁免截止日期说明 : null;
        const danxiangshuijin = selectedProduct ? selectedProduct.一箱税金 : null;
        const renzheng = selectedProduct ? selectedProduct.认证 : null;

        const single_price = selectedProduct ? parseFloat(selectedProduct.单价) : 0;
        const packing = selectedProduct ? Number(selectedProduct.件箱) : 0;
        const single_weight = selectedProduct ? Number(selectedProduct.single_weight) : 0;
        // console.log(selectedItems)
        const goods_price = Number(selectedProduct?.单价) * Number(selectedProduct?.件箱) * Number(quantity)
        const other_rate = selectedProduct?.other_rate || { unit: '', value: 0 };

        const newSelectedItems = selectedItems.map(item =>
            item.key === key
                ? {
                    ...item,
                    name: value,
                    tax_rate: taxRate,

                    total_jiazheng: total_jiazheng,
                    yugu_tax_money_usd: yuguTaxMoneyUsd,
                    huomian_deadline: huomianDeadline,
                    quantity: quantity,// 更新数量
                    danxiangshuijin: danxiangshuijin,
                    renzheng: renzheng,
                    single_price: single_price,
                    packing: packing,
                    single_weight: single_weight,
                    goods_price: goods_price,
                    other_rate: other_rate

                }
                : item
        );
        setSelectedItems(newSelectedItems);
        const total = newSelectedItems.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            const taxRate = item.tax_rate !== undefined ? Number(item.tax_rate) : 0;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        //总货值
        const all_goods_price = newSelectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);
        const result = all_goods_price * 0.003464
        const min_total = result < 33.58 ? 33.58 : (result > 634.62 ? 634.62 : result);
        const other_price = all_goods_price * 0.00125
        single_weight_calculate(Number(executeForm.getFieldValue('weight')), newSelectedItems)
        setTotalCarrierPrice(all_goods_price)
        setTotalAllYuguTax(total + min_total + other_price)
        setTotalYuguTax(total);
        // const specialQingguanTihuo = executeForm.getFieldValue("special_qingguan_tihuo");

        if (renzheng !== undefined && renzheng !== "N FDA") {
            Modal.warning({
                title: "特殊产品",
                content: renzheng,
                onOk() { },
            });
        }



    };

    const handleQuantityChange = (key: number, quantity: number) => {
        //所有的箱数
        const all_box_quantity = selectedItems.reduce((total, item) => total + Number(item.quantity), 0) + quantity;
        const newSelectedItems = selectedItems.map(async (item) => {
            const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
            // const selectedProduct = await handleProductSearch_Chinese(item.name);


            // 重新计算 yijianduozhongkg
            const yijianduozhongkg = (Number(executeForm.getFieldValue("weight")) / all_box_quantity / Number(selectedProduct?.件箱)).toFixed(3);

            if (item.key === key) {
                return {
                    ...item,
                    quantity: quantity || 0,
                    yugu_tax_money_usd: calculateYuguTaxMoneyUsd(quantity, selectedProduct || null),
                    yijianduozhongkg: yijianduozhongkg
                };
            }

            return {
                ...item,
                yijianduozhongkg: yijianduozhongkg
            };
        });


        // 使用Promise.all等待所有异步操作完成后再更新状态
        Promise.all(newSelectedItems).then(resolvedItems => {
            setSelectedItems(resolvedItems);
        }); const total = selectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd || 0), 0);
        setTotalYuguTax(total + 36);
    };
    const handlePackingChange = async (
        key: number,
        quantity: number | null,
        packing: number | null,
        single_price: number | null
    ) => {
        // 将参数默认值设置为 0 或其他合理值
        const adjustedQuantity = quantity || 0;
        const adjustedPacking = packing || 0;
        const adjustedSinglePrice = single_price || 0;

        // 计算总箱数
        const all_box_quantity = selectedItems.reduce((total, item) => total + Number(item.quantity), 0) + adjustedQuantity;

        // 更新选中的项目
        const newSelectedItems = selectedItems.map(async (item) => {
            if (item.key === key) {
                // const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
                const selectedProduct = await handleProductSearch_Chinese(item.name);

                const yuguTaxMoneyUsd = calculateYuguTaxMoneyUsd(adjustedQuantity, selectedProduct, adjustedPacking, adjustedSinglePrice);
                const goods_price = adjustedSinglePrice * adjustedPacking * adjustedQuantity

                // 计算易一件重KG
                const yijianduozhongkg = selectedProduct && selectedProduct.件箱
                    ? (Number(executeForm.getFieldValue("weight")) / all_box_quantity / Number(selectedProduct.件箱)).toFixed(3)
                    : "0.000";

                return {
                    ...item,
                    quantity: adjustedQuantity,
                    yugu_tax_money_usd: yuguTaxMoneyUsd,
                    single_price: adjustedSinglePrice,
                    packing: adjustedPacking,
                    yijianduozhongkg: yijianduozhongkg,
                    goods_price: goods_price

                };
            }
            return item;
        });
        let resolvedItems = await Promise.all(newSelectedItems);
        setSelectedItems(resolvedItems)

        const total = resolvedItems.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            const taxRate = item.tax_rate !== undefined ? Number(item.tax_rate) : 0;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);
        //总货值
        const all_goods_price = resolvedItems.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);

        const result = all_goods_price * 0.003464
        const min_total = result < 33.58 ? 33.58 : (result > 634.62 ? 634.62 : result);
        const other_price = all_goods_price * 0.00125
        single_weight_calculate(Number(executeForm.getFieldValue('weight')), resolvedItems)
        setTotalCarrierPrice(all_goods_price)
        setTotalAllYuguTax(total + min_total + other_price)
        setTotalYuguTax(total);
    };


    const handleSinglePriceChange = (key: number, single_price: number) => {
        setSelectedItems(prevItems =>
            prevItems.map(item =>
                item.key === key
                    ? { ...item, single_price: single_price }
                    : item
            )
        );
    }

    // 处理选择调整产品
    const handleSelectForAdjustment = (key: number) => {
        setSelectedForAdjustment(prev => {
            if (prev.includes(key)) {
                // 如果取消选择，同时清除范围设置
                setAdjustmentRanges(prevRanges => {
                    const newRanges = { ...prevRanges };
                    delete newRanges[key];
                    return newRanges;
                });
                return prev.filter(k => k !== key);
            }
            // 限制只能选择3个产品
            if (prev.length < 3) {
                return [...prev, key];
            }
            message.warning('最多只能选择3个产品进行自动调整');
            return prev;
        });
    };

    // 处理设置调整范围
    const handleSetRange = (key: number) => {
        setCurrentRangeKey(key);
        const existingRange = adjustmentRanges[key];
        if (existingRange) {
            rangeForm.setFieldsValue({
                min: existingRange.min,
                max: existingRange.max
            });
        } else {
            rangeForm.resetFields();
        }
        setIsRangeModalVisible(true);
    };

    // 确认设置范围
    const handleRangeSubmit = () => {
        rangeForm.validateFields().then(values => {
            if (currentRangeKey !== null) {
                const { min, max } = values;

                // 检查至少设置了一个值
                if (min == null && max == null) {
                    message.error('请至少设置最小值或最大值中的一个');
                    return;
                }

                // 如果两个值都设置了，检查大小关系
                if (min != null && max != null && min >= max) {
                    message.error('最小值必须小于最大值');
                    return;
                }

                // 构建范围对象，只保存有值的字段
                const rangeObj: { min?: number, max?: number } = {};
                if (min != null) rangeObj.min = min;
                if (max != null) rangeObj.max = max;

                setAdjustmentRanges(prev => ({
                    ...prev,
                    [currentRangeKey]: rangeObj
                }));

                // 清空调整历史记录，因为范围改变了，之前的历史记录不再适用
                setAdjustmentHistory([]);

                setIsRangeModalVisible(false);
                setCurrentRangeKey(null);
                rangeForm.resetFields();
            }
        });
    };

    // 清除范围设置
    const handleClearRange = (key: number) => {
        setAdjustmentRanges(prev => {
            const newRanges = { ...prev };
            delete newRanges[key];
            return newRanges;
        });

        // 清空调整历史记录，因为范围改变了，之前的历史记录不再适用
        setAdjustmentHistory([]);

        message.success('已清除范围设置和调整历史记录');
    };

    useEffect(() => {
        setAdjustmentHistory([]);
    }, [JSON.stringify(selectedForAdjustment)]);

    const applyHistoryItem = (historyItem: AdjustmentResult) => {
        // This function will take a history item and apply it to the main form.
        // It should behave like what happens when a new solution is found.

        setSelectedItems(historyItem.items.sort((a, b) => a.key - b.key));

        // Also need to recalculate and set totals
        const total = historyItem.items.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        const all_goods_price = historyItem.items.reduce((acc, item) =>
            acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);

        const result = all_goods_price * 0.003464;
        const min_total = result < 33.58 ? 33.58 : (result > 634.62 ? 634.62 : result);
        const other_price = all_goods_price * 0.00125

        setTotalCarrierPrice(all_goods_price);
        setTotalYuguTax(total);
        setTotalAllYuguTax(total + min_total + other_price);

        single_weight_calculate(Number(executeForm.getFieldValue('weight')), historyItem.items);

        setIsHistoryModalVisible(false);
        message.success('已应用历史方案');
    }

    const calculateMetrics = (items: SelectedItem[], weight: number, rate: number) => {
        const totalValue = items.reduce((acc, item) => {
            return acc + (item.goods_price || 0);
        }, 0);
        const valuePerWeight = totalValue / weight;

        const totalTax = items.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        const result = totalValue * 0.003464;
        const mpf = result < 33.58 ? 33.58 : (result > 634.62 ? 634.62 : result);
        const other_price = totalValue * 0.00125
        const totalAllTaxUSD = totalTax + mpf + other_price;
        const taxPerKg = (totalAllTaxUSD / weight) * rate;

        return {
            valuePerWeight: Number(valuePerWeight.toFixed(2)),
            taxPerKg: Number(taxPerKg.toFixed(2)),
            totalValue: Number(totalValue.toFixed(2)),
            totalAllTaxUSD: Number(totalAllTaxUSD.toFixed(2))
        };
    };

    const adjustBoxNumbers = async () => {
        const allBoxCount = Number(executeForm.getFieldValue('allBoxCount'));
        if (!allBoxCount || allBoxCount <= 0) {
            message.error('请先填写一个有效的总箱数。');
            return;
        }

        const k = selectedForAdjustment.length;
        if (k < 2 || k > 3) {
            message.error('请选择2或3个产品进行调整。');
            return;
        }

        const fixedItems = selectedItems.filter(item => !selectedForAdjustment.includes(item.key));
        const fixedBoxes = fixedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalBoxesToAdjust = allBoxCount - fixedBoxes;
        if (totalBoxesToAdjust < 0) {
            message.error('未选中调整的产品的箱数之和已超过总箱数，请检查。');
            return;
        }


        setIsAdjusting(true);
        const weight = Number(executeForm.getFieldValue('weight'));
        const rate = Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'));

        try {
            const packingTypeResponse = await axiosInstance.get(`${server_url}/qingguan/packing_types?country=${executeForm.getFieldValue('export_country')}`);
            setPackingTypeContent(packingTypeResponse.data);

            const selectedPackingType = packingTypeResponse.data.find((p: PackingType) => p.packing_type === executeForm.getFieldValue('packing_type'));

            if (!selectedPackingType || !selectedPackingType.check_data) {
                message.error('未找到装箱类型的检查数据或未选择装箱类型');
                setIsAdjusting(false);
                return;
            }

            // 只考虑enabled为true的条件
            const enabledConditions = selectedPackingType.check_data.filter((item: { enabled: boolean }) => item.enabled);

            // 获取检查条件
            const valuePerWeightCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值/重量");
            const taxPerKgCondition = enabledConditions.find((item: { name: string }) => item.name === "预估整票税金CNY/Kg");
            const ValueCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值");
            const selectedItemsForAdjustment = selectedItems.filter(item => selectedForAdjustment.includes(item.key));
            console.log(ValueCondition)
            if (totalBoxesToAdjust === 0 && selectedItemsForAdjustment.every(item => item.quantity === 0)) {
                message.warning('没有剩余的箱数可以调整。');
                setIsAdjusting(false);
                return;
            }

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

            // 提前获取所有产品信息
            const selectedProducts = await Promise.all(
                selectedItemsForAdjustment.map(item => handleProductSearch_Chinese(item.name))
            );

            const otherItems = fixedItems;
            const foundSolutions: AdjustmentResult[] = [];

            // 智能添加解决方案，只保留最优的10个
            const addSolutionIfBetter = (newSolution: AdjustmentResult) => {
                if (foundSolutions.length < 10) {
                    foundSolutions.push(newSolution);
                } else {
                    // 找到当前最差的方案（totalAllTaxUSD最高的）
                    const worstIndex = foundSolutions.reduce((maxIndex, solution, index) => {
                        const currentWorst = foundSolutions[maxIndex].metrics.totalAllTaxUSD || 0;
                        const current = solution.metrics.totalAllTaxUSD || 0;
                        return current > currentWorst ? index : maxIndex;
                    }, 0);

                    const worstSolution = foundSolutions[worstIndex];
                    const newTax = newSolution.metrics.totalAllTaxUSD || 0;
                    const worstTax = worstSolution.metrics.totalAllTaxUSD || 0;

                    // 如果新方案更好，替换最差的方案
                    if (newTax < worstTax) {
                        foundSolutions[worstIndex] = newSolution;
                    }
                }
            };

            // const minBoxCount = Math.max(Math.round(totalBoxesToAdjust * 0.15), 10);
            const minBoxCount = 10;
            if (k === 2) {
                // 获取两个产品的范围设置
                const selectedKeys = selectedForAdjustment;
                const range1 = adjustmentRanges[selectedKeys[0]];
                const range2 = adjustmentRanges[selectedKeys[1]];

                // 确保范围合理，处理可选的min和max
                const actualMin1 = Math.max(range1?.min ?? minBoxCount, minBoxCount);
                const actualMax1 = Math.min(range1?.max ?? (totalBoxesToAdjust - minBoxCount), totalBoxesToAdjust - minBoxCount);
                const actualMin2 = Math.max(range2?.min ?? minBoxCount, minBoxCount);
                const actualMax2 = Math.min(range2?.max ?? (totalBoxesToAdjust - minBoxCount), totalBoxesToAdjust - minBoxCount);

                if (actualMin1 + actualMin2 > totalBoxesToAdjust || actualMax1 + actualMax2 < totalBoxesToAdjust) {
                    message.error('设置的范围与总箱数不兼容，请调整范围设置');
                    setIsAdjusting(false);
                    return;
                }

                for (let i = actualMin1; i <= actualMax1; i++) {
                    const j = totalBoxesToAdjust - i;
                    if (j < actualMin2 || j > actualMax2) continue;

                    const dist = [i, j];

                    const isInHistory = adjustmentHistory.some(historyEntry =>
                        JSON.stringify(historyEntry.distribution) === JSON.stringify(dist)
                    );

                    if (isInHistory) {
                        continue;
                    }

                    const tempSelectedItems = selectedItemsForAdjustment.map((item, index) => {
                        const quantity = dist[index];
                        const selectedProduct = selectedProducts[index];
                        const packing = item.packing;
                        const single_price = item.single_price;
                        const goods_price = single_price * packing * quantity;
                        const yugu_tax_money_usd = calculateYuguTaxMoneyUsd(quantity, selectedProduct, packing, single_price);
                        return { ...item, quantity, goods_price, yugu_tax_money_usd };
                    });

                    const tempItems = [...otherItems, ...tempSelectedItems];

                    const { valuePerWeight, taxPerKg, totalAllTaxUSD, totalValue } = calculateMetrics(tempItems, weight, rate);
                    const isValuePerWeightOk = checkCondition(valuePerWeightCondition, valuePerWeight);
                    const isTaxPerKgOk = checkCondition(taxPerKgCondition, taxPerKg);
                    const isValueOk = checkCondition(ValueCondition, totalValue);
                    if (isValuePerWeightOk && isTaxPerKgOk && isValueOk) {
                        const singleBoxWeight = calculateSingleWeightPure(weight, tempItems);
                        addSolutionIfBetter({
                            id: Date.now() + foundSolutions.length,
                            items: tempItems,
                            metrics: { valuePerWeight, taxPerKg, totalAllTaxUSD, singleBoxWeight },
                            distribution: dist,
                        });
                    }
                }

            } else if (k === 3) {
                // 获取三个产品的范围设置
                const selectedKeys = selectedForAdjustment;
                const range1 = adjustmentRanges[selectedKeys[0]];
                const range2 = adjustmentRanges[selectedKeys[1]];
                const range3 = adjustmentRanges[selectedKeys[2]];

                // 确保范围合理，处理可选的min和max
                const actualMin1 = Math.max(range1?.min ?? minBoxCount, minBoxCount);
                const actualMax1 = Math.min(range1?.max ?? (totalBoxesToAdjust - 2 * minBoxCount), totalBoxesToAdjust - 2 * minBoxCount);
                const actualMin2 = Math.max(range2?.min ?? minBoxCount, minBoxCount);
                const actualMax2 = Math.min(range2?.max ?? (totalBoxesToAdjust - 2 * minBoxCount), totalBoxesToAdjust - 2 * minBoxCount);
                const actualMin3 = Math.max(range3?.min ?? minBoxCount, minBoxCount);
                const actualMax3 = Math.min(range3?.max ?? (totalBoxesToAdjust - 2 * minBoxCount), totalBoxesToAdjust - 2 * minBoxCount);

                if (actualMin1 + actualMin2 + actualMin3 > totalBoxesToAdjust ||
                    actualMax1 + actualMax2 + actualMax3 < totalBoxesToAdjust) {
                    message.error('设置的范围与总箱数不兼容，请调整范围设置');
                    setIsAdjusting(false);
                    return;
                }

                for (let i = actualMin1; i <= actualMax1; i++) {
                    for (let j = actualMin2; j <= actualMax2; j++) {
                        const l = totalBoxesToAdjust - i - j;
                        if (l < actualMin3 || l > actualMax3) continue;

                        const dist = [i, j, l];
                        const isInHistory = adjustmentHistory.some(historyEntry =>
                            JSON.stringify(historyEntry.distribution) === JSON.stringify(dist)
                        );
                        if (isInHistory) {
                            continue;
                        }

                        const tempSelectedItems = selectedItemsForAdjustment.map((item, index) => {
                            const quantity = dist[index];
                            const selectedProduct = selectedProducts[index];
                            const packing = item.packing;
                            const single_price = item.single_price;
                            const goods_price = single_price * packing * quantity;
                            const yugu_tax_money_usd = calculateYuguTaxMoneyUsd(quantity, selectedProduct, packing, single_price);
                            return { ...item, quantity, goods_price, yugu_tax_money_usd };
                        });

                        const tempItems = [...otherItems, ...tempSelectedItems];

                        const { valuePerWeight, taxPerKg, totalAllTaxUSD, totalValue } = calculateMetrics(tempItems, weight, rate);
                        const isValuePerWeightOk = checkCondition(valuePerWeightCondition, valuePerWeight);
                        const isTaxPerKgOk = checkCondition(taxPerKgCondition, taxPerKg);
                        // console.log('总货值',totalValue)
                        const isValueOk = checkCondition(ValueCondition, totalValue);

                        if (isValuePerWeightOk && isTaxPerKgOk && isValueOk) {
                            const singleBoxWeight = calculateSingleWeightPure(weight, tempItems);
                            addSolutionIfBetter({
                                id: Date.now() + foundSolutions.length,
                                items: tempItems,
                                metrics: { valuePerWeight, taxPerKg, totalAllTaxUSD, singleBoxWeight },
                                distribution: dist,
                            });
                        }
                    }
                }
            }
            if (foundSolutions.length > 0) {
                foundSolutions.sort((a, b) => (a.metrics.totalAllTaxUSD || Infinity) - (b.metrics.totalAllTaxUSD || Infinity));

                const bestSolution = foundSolutions[0];

                setAdjustmentHistory(prev => [...prev, ...foundSolutions]);

                applyHistoryItem(bestSolution);

                message.success(`已找到并保存了 ${foundSolutions.length} 个最优方案，已应用整票税金最低的方案。`);
            } else {
                message.warning('未找到满足条件的箱数组合，您可以再次尝试或手动调整');
            }

        } catch (error) {
            console.error('调整箱数时出错:', error);
            message.error('调整箱数失败');
        } finally {
            setIsAdjusting(false);
        }
    };


    const fetchHaiYunZiShui = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/haiyunzishui`);
            setHaiYunZiShui(response.data)
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };
    const fetchExchangeRate = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/api/exchange-rate`);
            setCnUsdRate(response.data.USDCNY)
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        }
    };
    const fetchProducts = async (append = false) => {
        setLoadingProducts(true);
        const response = await axiosInstance.get(`${server_url}/qingguan/products_sea?skip=${(productPage - 1) * productPageSize}&limit=${productPageSize}&名称=${productFilter}&username=${userName}`);
        setTotalProducts(response.data.total);
        setProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);
        setLoadingProducts(false);

    };
    const fetchAllProducts = async (country: string = 'China') => {
        if (country === 'China') {
            const response = await axiosInstance.get(`${server_url}/qingguan/products_sea/?get_all=true&username=${userName}&startland=${country}&destination=America&zishui=false&is_hidden=false`);
            setAllProducts(response.data.items);
        } else {
            const response = await axiosInstance.get(`${server_url}/qingguan/products_sea/?get_all=true&username=${userName}&startland=${country}&destination=America&is_hidden=false`);
            setAllProducts(response.data.items);
        }
    }
    const fetchAllPorts = async (append = false) => {
        const response = await axiosInstance.get(`${server_url}/qingguan/ports`)
        setPortContent((prevPorts) => append ? [...prevPorts, ...response.data] : response.data);

    }

    const fetchShippersAndReceivers = async () => {
        const response = await axiosInstance.get(`${server_url}/qingguan/consignee`);
        setShippersAndReceivers(response.data.items);
        setTotalShippers(response.data.total);
        // console.log(shippersAndReceivers)
    };




    ;

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
        const min_total = result < 33.58 ? 33.58 : (result > 634.62 ? 634.62 : result);
        const other_price = all_goods_price * 0.00125;

        setTotalYuguTax(total);
        setTotalCarrierPrice(all_goods_price);
        setTotalAllYuguTax(total + min_total + other_price);
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

    const download_get_excel = async (values: any) => {
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
            return matchedProduct && matchedProduct.类别 === '服装类';
        });
        const clothingValue = clothingItems.reduce((acc, item) =>
            acc + (item.goods_price || 0), 0
        );
        const clothingPercentage = totalCarrierPrice > 0
            ? (clothingValue / totalCarrierPrice) * 100
            : 0;

        const needVerificationReasons = [];

        // 检查服装类货值占比


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
            needVerificationReasons.push({
                title: '装箱数据检查不通过',
                description: '以下服装类产品装箱数据不符合要求:',
                items: clothingItemsNeedVerification
            });
        }

        if (needVerificationReasons.length > 0) {
            Modal.error({
                title: '检查不通过',
                content: (
                    <div>
                        {needVerificationReasons.map((reason, index) => (
                            <div key={index} style={{ marginBottom: '16px' }}>
                                <h4>{reason.title}</h4>
                                <p>{reason.description}</p>
                                {reason.items && (
                                    <List
                                        dataSource={reason.items}
                                        renderItem={item => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    title={item.name}
                                                    description={`当前一箱件数: ${item.packing}, 要求: ≥ ${item.requiredPacking} (基于单箱重量 ${item.single_weight})`}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </div>
                        ))}
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

        // 重新获取最新的装箱类型数据
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/packing_types?country=${executeForm.getFieldValue('export_country')}`);
            setPackingTypeContent(response.data);

            // 获取选中装箱类型的检查数据
            const selectedPackingType = response.data.find((p: PackingType) => p.packing_type === values.packing_type);
            if (selectedPackingType && selectedPackingType.check_data) {
                // 只考虑enabled为true的条件
                const enabledConditions = selectedPackingType.check_data.filter((item: { enabled: boolean }) => item.enabled);

                // 获取检查条件
                const valuePerWeightCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值/重量");
                const taxPerKgCondition = enabledConditions.find((item: { name: string }) => item.name === "预估整票税金CNY/Kg");
                const valueCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值");

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
                const isValueOk = checkCondition(valueCondition, totalCarrierPrice);

                // 创建确认对话框内容
                const confirmContent = (
                    <div>
                        {selectedPackingType.check_remarks?.split('\\n').map((line: string, index: number) => (
                            <p key={index}>{line}</p>
                        ))}
                        <p>结果：</p>
                        <p style={{ color: isValuePerWeightOk ? 'green' : 'red' }}>
                            总货值/重量: {currentValuePerWeight} {isValuePerWeightOk ? '(检测通过)' : `(不满足条件: ${valuePerWeightCondition?.operator} ${valuePerWeightCondition?.value})`}
                        </p>
                        <p style={{ color: isTaxPerKgOk ? 'green' : 'red' }}>
                            预估整票税金CNY/Kg: {currentTaxPerKg} {isTaxPerKgOk ? '(检测通过)' : `(不满足条件: ${taxPerKgCondition?.operator} ${taxPerKgCondition?.value})`}
                        </p>
                        <p style={{ color: isValueOk ? 'green' : 'red' }}>
                            总货值: {totalCarrierPrice} {isValueOk ? '(检测通过)' : `(不满足条件: ${valueCondition?.operator} ${valueCondition?.value})`}
                        </p>
                    </div>
                );

                // 检查是否满足继续下载的条件：服装类占比满足条件，并且至少还有一个其他条件满足
                const canDownloadDirectly = isValueOk && (isValuePerWeightOk || isTaxPerKgOk);

                if (!isValuePerWeightOk && !isTaxPerKgOk && !isValueOk) {
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
                                            Modal.destroyAll();
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
                                        //         Modal.destroyAll();
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
            console.error('Error fetching latest packing type data:', error);
            message.error('获取最新装箱类型数据失败');
            return;
        }

        // 如果没有检查数据，直接下载
        handleDownloadExcel(values);
    };

    // 添加实际的下载处理函数
    const handleDownloadExcel = async (values: any) => {
        setLoadingSubmit(true);
        try {
            const data = {
                export_country: executeForm.getFieldValue('export_country'),
                totalyugutax: totalAllYuguTax.toFixed(2),
                predict_tax_price: (
                    totalAllYuguTax /
                    Number(executeForm.getFieldValue('weight')) *
                    Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'))
                ).toFixed(2),
                shipper_name: values.sender,
                receiver_name: values.fda_report ? "SOLIMOES TRADING INC" : values.receiver,
                port: "",
                packing_type: values.packing_type,
                master_bill_no: values.orderNumber,
                gross_weight: values.weight,
                volume: values.volume,
                execute_type: 'Sea',
                product_list: selectedItems
                    .filter(item => item.name !== "")
                    .sort((a, b) => {
                        if (a.single_weight && !b.single_weight) return -1;
                        if (!a.single_weight && b.single_weight) return 1;
                        return 0;
                    })
                    .map(item => ({
                        product_name: item.name,
                        box_num: item.quantity,
                        single_price: item.single_price,
                        packing: item.packing
                    }))
            };

            const response = await axiosInstance.post(`${server_url}/qingguan/process-shipping-data`, data, {
                responseType: 'blob'
            });

            const contentType = response.headers['content-type'];

            if (contentType === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    const jsonResponse = JSON.parse(reader.result as string);
                    setJsonContent(jsonResponse['content']);
                    setIsModalVisible(true);
                };
                reader.readAsText(response.data);
            } else {
                let fileExtension = '';
                // 根据Content-Type设置文件扩展名
                if (contentType === 'application/pdf') {
                    fileExtension = '.pdf';
                } else if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                    fileExtension = '.xlsx';
                } else if (contentType === 'application/vnd.ms-excel') {
                    fileExtension = '.xls';
                }

                const contentDisposition = response.headers['content-disposition'];
                let filename = '';
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename\*=utf-8''([^;]+)/);
                    if (filenameMatch) {
                        filename = decodeURIComponent(filenameMatch[1]);
                    } else {
                        const simpleMatch = contentDisposition.match(/filename=([^;]+)/);
                        if (simpleMatch) {
                            filename = simpleMatch[1].replace(/["']/g, '');
                        }
                    }
                }

                const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename || `${data.master_bill_no} CI&PL${fileExtension}`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                // 保存提交历史
                await saveSubmissionHistory(executeForm.getFieldsValue(true), selectedItems);

                // 清空表单
                executeForm.resetFields();
                setIsChecked(false);
                setSelectedItems([]);
                executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
                setTotalYuguTax(0);
                setTotalAllYuguTax(0);
                setTotalCarrierPrice(0);
            }
        } catch (error) {
            console.error('Error submitting product data:', error);
            message.error('提交数据失败');
        } finally {
            setLoadingSubmit(false);
        }
    };

    // 修改显示历史记录modal的处理函数
    const showSubmissionHistory = async () => {
        try {
            setIsSubmissionHistoryModalVisible(true);
            const response = await axiosInstance.get(`${server_url}/qingguan/cumstom_clear_history_original_summary/?type=海运`);
            if (response.data) {
                setSubmissionHistory(response.data || []);
            }
        } catch (error) {
            console.error('Error loading submission history:', error);
            message.error('加载提交历史失败');
        }
    };

    // 添加保存提交历史的函数
    const saveSubmissionHistory = async (formValues: any, selectedItems: SelectedItem[]) => {
        try {
            const newHistoryEntry: Omit<SubmissionHistoryEntry, '_id'> = {
                formValues: {
                    ...formValues,
                    rate_cn_us: CnUsdRate || executeForm.getFieldValue('rate_cn_us'),
                    totalYuguTax: totalYuguTax,
                    totalAllYuguTax: totalAllYuguTax,
                    totalCarrierPrice: totalCarrierPrice
                },
                selectedItems: selectedItems.map(item => ({
                    ...item,
                    key: item.key
                })),
                timestamp: new Date().toISOString(),
                type: '海运'
            };

            const response = await axiosInstance.post(`${server_url}/qingguan/cumstom_clear_history_original_summary/?type=海运`, newHistoryEntry);

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

    const handleDelete = (key: number) => {
        setSelectedItems(prevData => prevData.filter(item => item.key !== key));
    };


    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = 'excel_template/清关发票箱单模板 - Sea.xlsx'; // 替换为实际的模板文件路径
        link.download = '清关发票箱单模板 - Sea.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const columns = [
        {
            title: '品名',
            dataIndex: 'name',
            width: 150,

            render: (text: string, record: SelectedItem) => (
                <Select
                    value={record.name}

                    showSearch
                    style={{ width: '100%', height: '100%' }}
                    placeholder="选择或搜索品名"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        option?.label?.props?.children.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(value) => handleSelectChange(record.key, value, Number(record.quantity))}
                    options={allProducts.map((product) => ({
                        value: product.中文品名,
                        label:
                            <span style={{ whiteSpace: 'normal', wordWrap: 'break-word', wordBreak: 'break-all' }}>
                                {product.中文品名}
                            </span>
                    }))}
                >
                </Select>

            ),
        },
        {
            title: '箱数',
            dataIndex: 'quantity',
            render: (text: number, record: SelectedItem) => (

                <Input
                    type="number"
                    value={record.quantity}
                    onBlur={(e) => handlePackingChange(record.key, parseInt(e.target.value, 10), record.packing, record.single_price)}
                    onChange={(e) => {
                        const value = e.target.value;
                        const newSelectedItems = selectedItems.map(item =>
                            item.key === record.key ? { ...item, quantity: parseInt(value, 10) } : item
                        );
                        setSelectedItems(newSelectedItems);
                    }}
                    style={{ width: '100%' }}

                />
            ),
        },
        {
            title: '一箱件数',
            dataIndex: 'packing',
            render: (text: number, record: SelectedItem) => {
                // 使用逻辑与(&&)来判断是否只读:
                // 1. 首先检查single_weight是否存在(不为null)
                // 2. 如果存在,再检查是否不为0
                // 两个条件都满足时,isReadOnly为true,表示该字段应该是只读的
                const isReadOnly = (record.single_weight != null && record.single_weight !== 0);
                return (
                    <InputNumber
                        value={record.packing}
                        onBlur={(value) => handlePackingChange(record.key, record.quantity, parseFloat(value.target.value), record.single_price)}
                        onChange={(value) => {
                            const newSelectedItems = selectedItems.map(item =>
                                item.key === record.key ? { ...item, packing: value || 0 } : item
                            );
                            setSelectedItems(newSelectedItems);
                        }}
                        min={0}
                        step={0.1}
                        readOnly={isReadOnly}
                    />
                );
            },
        },
        ...(userName === 'admin' ? [{
            title: '单价',
            dataIndex: 'single_price',
            render: (text: number, record: SelectedItem) => (
                <InputNumber
                    value={record.single_price}
                    onBlur={(value) => handlePackingChange(record.key, record.quantity, record.packing, parseFloat(value.target.value))}
                    onChange={(value) => {
                        const newSelectedItems = selectedItems.map(item =>
                            item.key === record.key ? { ...item, single_price: value || 0 } : item
                        );
                        setSelectedItems(newSelectedItems);
                    }}
                    min={0}
                    step={0.01}
                    style={{ width: '100%' }}
                />
            ),
        }] : []),


        // {
        //     title: '税率',
        //     dataIndex: 'tax_rate',
        //     render: (text: string) => (
        //         <span>{(Number(text) * 100).toFixed(2)}%</span>
        //     ),
        // },
        {
            title: '总税率',
            dataIndex: 'all_tax_rate',
            render: (text: number, record: SelectedItem) => (
                <span>{((Number(record.tax_rate) + Number(record.total_jiazheng)) * 100).toFixed(2)}%</span>
            ),
        },
        // {
        //     title: '加征',
        //     dataIndex: 'jiazheng',
        //     render: (text: string) => (
        //         <span>{(Number(text) * 100).toFixed(2)}%</span>
        //     ),
        // },
        {
            title: '预估税金USD',
            dataIndex: 'yugu_tax_money_usd',
            render: (text: string) => (
                <span>{text}</span>
            ),
        }
        ,
        // {
        //     title: '其它税金',
        //     dataIndex: 'other_rate',
        //     render: (text: { unit: string, value: number }) => (
        //         <span style={{ color: text.value && text.unit ? 'red' : 'inherit' }}>
        //             {text.value} {text.unit}
        //         </span>
        //     ),
        // }
        // ,
        // {
        //     title: '豁免代码',
        //     dataIndex: 'huomian_code',
        //     render: (text: string) => (
        //         <span>{text}</span>
        //     ),

        // },

        {
            title: '豁免截止',
            dataIndex: 'huomian_deadline',
            render: (text: string) => (
                <span>{text}</span>
            ),

        },
        {
            title: '认证?',
            dataIndex: 'renzheng',
            render: (text: string) => (
                <span>{text}</span>
            ),

        },
        {
            title: '选择调整',
            dataIndex: 'adjustment',
            render: (_: any, record: SelectedItem) => (
                <Checkbox
                    checked={selectedForAdjustment.includes(record.key)}
                    onChange={() => handleSelectForAdjustment(record.key)}
                    disabled={selectedForAdjustment.length >= 3 && !selectedForAdjustment.includes(record.key)}
                />
            ),
        },
        {
            title: '设置范围',
            dataIndex: 'range_setting',
            render: (_: any, record: SelectedItem) => {
                const isSelected = selectedForAdjustment.includes(record.key);
                const hasRange = adjustmentRanges[record.key];
                const rangeText = hasRange ?
                    `${hasRange.min ? `≥${hasRange.min}` : ''}${hasRange.min && hasRange.max ? '，' : ''}${hasRange.max ? `≤${hasRange.max}` : ''}箱` : '';
                return (
                    <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                        {isSelected && (
                            <Button
                                size="small"
                                type={hasRange ? "primary" : "default"}
                                onClick={() => handleSetRange(record.key)}
                                style={{ fontSize: '12px', height: '24px' }}
                            >
                                {hasRange ? '修改范围' : '设置范围'}
                            </Button>
                        )}
                        {hasRange && (
                            <div style={{ fontSize: '10px', color: '#666' }}>
                                {rangeText}
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={() => handleClearRange(record.key)}
                                    style={{ padding: '0', marginLeft: '4px', fontSize: '10px' }}
                                >
                                    清除
                                </Button>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: '操作',
            dataIndex: 'operation',
            render: (_: any, record: SelectedItem) => (
                <Button
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        handleDelete(record.key);
                        const newSelectedItems = selectedItems.filter(item => item.key !== record.key);
                        const total = newSelectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd || 0), 0);
                        setTotalYuguTax(total + 36);
                        // 从selectedForAdjustment中移除被删除的key
                        setSelectedForAdjustment(prev => prev.filter(k => k !== record.key));
                    }}
                />
            ),

        },
    ];

    const historyColumns = [
        {
            title: '方案',
            key: 'scheme',
            render: (_: any, record: AdjustmentResult) => `方案 ${adjustmentHistory.findIndex(item => item.id === record.id) + 1}`,
        },
        {
            title: '总货值/重量',
            dataIndex: ['metrics', 'valuePerWeight'],
            render: (value: number) => value ? value.toFixed(2) : 'N/A',
            sorter: {
                compare: (a: AdjustmentResult, b: AdjustmentResult) => a.metrics.valuePerWeight - b.metrics.valuePerWeight,
                multiple: 4,
            },
        },
        {
            title: '预估整票税金CNY/Kg',
            dataIndex: ['metrics', 'taxPerKg'],
            render: (value: number) => value ? value.toFixed(2) : 'N/A',
            sorter: {
                compare: (a: AdjustmentResult, b: AdjustmentResult) => a.metrics.taxPerKg - b.metrics.taxPerKg,
                multiple: 3,
            },
        },
        {
            title: '单箱重量',
            dataIndex: ['metrics', 'singleBoxWeight'],
            render: (value: number) => value ? value.toFixed(2) : 'N/A',
            sorter: {
                compare: (a: AdjustmentResult, b: AdjustmentResult) => (a.metrics.singleBoxWeight || 0) - (b.metrics.singleBoxWeight || 0),
                multiple: 2,
            },
        },
        {
            title: '整票预估税金USD',
            dataIndex: ['metrics', 'totalAllTaxUSD'],
            render: (value: number) => value ? value.toFixed(2) : 'N/A',
            sorter: {
                compare: (a: AdjustmentResult, b: AdjustmentResult) => (a.metrics.totalAllTaxUSD || 0) - (b.metrics.totalAllTaxUSD || 0),
                multiple: 1,
            },
            defaultSortOrder: 'ascend' as const,
        },
        {
            title: '箱数分配',
            dataIndex: 'distribution',
            render: (distribution: number[], record: AdjustmentResult) => {
                const adjustedItems = record.items.filter(i =>
                    selectedForAdjustment.includes(i.key)
                );
                return (
                    <div>
                        {adjustedItems.map((adjItem, idx) => (
                            <div key={adjItem.key}>
                                {`${adjItem.name}: ${distribution[idx]} 箱`}
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: AdjustmentResult) => (
                <Button type="link" onClick={() => applyHistoryItem(record)}>
                    应用此方案
                </Button>
            ),
        },
    ];


    return (
        <div className={styles.container}>
            <Tabs className={styles.tabs} defaultActiveKey="1" onChange={(key) => setActiveTab(key)}>
                <TabPane tab="执行" key="execute">
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
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item
                                        label="出口国"
                                        name="export_country"
                                        rules={[{ required: true, message: '出口国是必填项' }]}
                                    >
                                        <Select onChange={(value) => {
                                            fetchAllProducts(value);
                                            fetchAllPackingType();

                                        }}>
                                            <Select.Option value="China">中国</Select.Option>
                                            <Select.Option value="Vietnam">越南</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
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
                                </Col>
                            </Row>

                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item
                                        label="装箱类型"
                                        name="packing_type"
                                        rules={[{ required: false }]}
                                    >
                                        <Select
                                            showSearch
                                            style={{ width: '100%' }}
                                            placeholder="选择或搜索装箱类型"
                                            optionFilterProp="children"
                                            filterOption={(input, option) => {
                                                if (!option) return false;
                                                return option.label.toLowerCase().includes(input.toLowerCase());
                                            }}
                                            onChange={handlePackingTypeChange}
                                            options={PackingTypeContent.map((item) => ({
                                                value: item.packing_type,
                                                label: item.packing_type
                                            }))}
                                        >
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="自税"
                                        name="zishui"
                                        rules={[{ required: false }]}
                                    >
                                        <Select
                                            showSearch
                                            style={{ width: '100%' }}
                                            placeholder="选择或搜索自税类型"
                                            optionFilterProp="children"
                                            filterOption={(input, option) => {
                                                if (!option) return false;
                                                return option.label.toLowerCase().includes(input.toLowerCase());
                                            }}
                                            onChange={handleZiShuiChange}
                                            options={
                                                haiyunzishui.map((item) => {
                                                    return { "value": item.zishui_name, "label": item.zishui_name }
                                                })
                                            }
                                        >
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label="无特殊情况：清关+提货"
                                name="special_qingguan_tihuo"
                                rules={[{ required: false }]}
                            >
                                <Input />
                            </Form.Item>

                            <Row gutter={24}>
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
                                                if (receiver.类型 === '发货人' && receiver.hide === '0') {
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
                                                if (receiver.类型 === '收货人' && receiver.hide === '0') {
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

                            <Row gutter={24}>
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

                                                // 首先过滤不允许的字符
                                                const filteredValue = value.replace(/[<>:"/\\|?*]/g, '');
                                                if (filteredValue !== value) {
                                                    e.target.value = filteredValue;
                                                    executeForm.setFieldsValue({ orderNumber: filteredValue });
                                                    message.warning('已自动移除不允许的特殊字符');
                                                    return;
                                                }

                                                // 保留原有的00/OO检测功能
                                                if (filteredValue.startsWith('00')) {
                                                    Modal.confirm({
                                                        title: '提示',
                                                        content: '主单号以00开头,是否应该是OO开头?',
                                                        okText: '是',
                                                        cancelText: '否',
                                                        onOk: () => {
                                                            const newValue = 'OO' + filteredValue.slice(2);
                                                            executeForm.setFieldsValue({
                                                                orderNumber: newValue
                                                            });
                                                        }
                                                    });
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

                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item
                                        label="总箱数"
                                        name="allBoxCount"
                                    >
                                        <Input type='number' onWheel={(e) => (e.target as HTMLElement).blur()} />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="Gross weight(KG)"
                                        name="weight"
                                        rules={[{ required: true, message: 'Gross weight是必填项' }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="Volume(CBM)"
                                        name="volume"
                                        rules={[{ required: true, message: 'Volume是必填项' }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>

                            </Row>

                            <Form.Item label="品名" name="itemName">
                                <Table
                                    columns={columns}
                                    dataSource={selectedItems}
                                    pagination={false}
                                    rowKey="key"
                                    footer={() => (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <strong style={{ color: (Number(executeForm.getFieldValue('allBoxCount')) - selectedItems.reduce((acc, item) => acc + (item.quantity || 0), 0)) !== 0 ? 'red' : 'black' }}>
                                                        总箱数差距: {Number(executeForm.getFieldValue('allBoxCount')) - selectedItems.reduce((acc, item) => acc + (item.quantity || 0), 0)} ({Number(executeForm.getFieldValue('allBoxCount')) - selectedItems.reduce((acc, item) => acc + (item.quantity || 0), 0) !== 0 ? '总箱数上下不一致' : '总箱数上下一致'})
                                                    </strong>
                                                    <strong style={{ display: 'block', marginTop: '10px' }}>
                                                        总件数: {selectedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.packing || 0)), 0)}
                                                    </strong>
                                                    <strong style={{ display: 'block', marginTop: '10px' }}>
                                                        服装类占比: {(() => {
                                                            const clothingItems = selectedItems.filter(item => {
                                                                const matchedProduct = allProducts.find(p => p.中文品名 === item.name);
                                                                return matchedProduct && matchedProduct.类别 === '服装类';
                                                            });
                                                            const clothingValue = clothingItems.reduce((acc, item) =>
                                                                acc + (item.goods_price || 0), 0
                                                            );
                                                            const percentage = totalCarrierPrice > 0
                                                                ? ((clothingValue / totalCarrierPrice) * 100).toFixed(2)
                                                                : '0';
                                                            return `${percentage}%`;
                                                        })()}
                                                    </strong>
                                                    <Button type="dashed" onClick={() => { setTiDanLogModalVisible(true) }} style={{ width: '100%', marginTop: '10px' }}>查看提单</Button>
                                                    <Button
                                                        type="primary"
                                                        onClick={adjustBoxNumbers}
                                                        disabled={selectedForAdjustment.length < 2 || isAdjusting}
                                                        loading={isAdjusting}
                                                        style={{ marginTop: '10px' }}
                                                    >
                                                        自动调整选中产品箱数
                                                    </Button>
                                                    <Button
                                                        onClick={() => setIsHistoryModalVisible(true)}
                                                        disabled={adjustmentHistory.length === 0}
                                                        style={{ marginTop: '10px' }}
                                                    >
                                                        查看调整历史
                                                    </Button>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <strong style={{ display: 'block' }}>单箱重量: {newSingleWeight}</strong>

                                                    <strong style={{ display: 'block' }}>总货值/重量: {(totalCarrierPrice / Number(executeForm.getFieldValue('weight'))).toFixed(2)}</strong>

                                                    <strong style={{ display: 'block' }}>总货值 USD: {totalCarrierPrice.toFixed(0)}</strong>
                                                    <strong style={{ display: 'block' }}>总货值 (0.003464)MPF: {(totalCarrierPrice * 0.003464).toFixed(2)}</strong>
                                                    <strong style={{ display: 'block' }}>总预估税金 USD: {totalYuguTax.toFixed(2)}</strong>
                                                    <strong style={{ display: 'block' }}>整票预估税金 USD: {totalAllYuguTax.toFixed(2)}</strong>
                                                    <strong style={{ display: 'block' }}>
                                                        预估整票税金CNY/Kg: {(
                                                            totalAllYuguTax /
                                                            Number(executeForm.getFieldValue('weight')) *
                                                            Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'))
                                                        ).toFixed(2)}
                                                    </strong>
                                                    <Button type="dashed" onClick={handleAddRow} style={{ width: '100%', marginTop: '10px' }}>
                                                        添加品名
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                />
                            </Form.Item>


                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loadingsubmit}>提交</Button>
                            </Form.Item>
                        </Form>


                    </div>
                </TabPane>



            </Tabs>




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
                title="自动调整历史"
                visible={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={null}
                width={800}
            >
                <Table
                    columns={historyColumns}
                    dataSource={adjustmentHistory}
                    rowKey="id"
                    pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50'] }}
                    scroll={{ y: 500 }}
                />
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
                                <Button type="primary" onClick={() => applySubmissionHistory(item)}>应用</Button>,
                                <Button danger onClick={() => deleteSubmissionHistory(item._id || '')}>删除</Button>
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
                title="验证码"
                visible={isVerificationModalVisible}
                onOk={handleVerifyCode}
                onCancel={() => {
                    setIsVerificationModalVisible(false);
                }}
                zIndex={9999}
                maskClosable={false}
                centered
            >
                <div style={{ padding: '20px 0' }}>
                    <Input
                        placeholder="请输入验证码"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        style={{ marginBottom: '15px' }}
                    />
                    <Button
                        type="primary"
                        onClick={handleGetVerificationCode}
                        loading={isVerificationLoading}
                        disabled={countdown > 0}
                        block
                    >
                        {countdown > 0 ? `重新获取(${countdown}s)` : '重新获取验证码'}
                    </Button>
                </div>
            </Modal>
            <Modal
                title="设置调整范围"
                visible={isRangeModalVisible}
                onOk={handleRangeSubmit}
                onCancel={() => {
                    setIsRangeModalVisible(false);
                    setCurrentRangeKey(null);
                    rangeForm.resetFields();
                }}
                okText="确认"
                cancelText="取消"
            >
                <Form form={rangeForm} layout="vertical">
                    <Form.Item
                        label="最小箱数"
                        name="min"
                        rules={[
                            { type: 'number', min: 1, message: '最小箱数必须大于0' }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                            placeholder="请输入最小箱数（可选）"
                        />
                    </Form.Item>
                    <Form.Item
                        label="最大箱数"
                        name="max"
                        rules={[
                            { type: 'number', min: 1, message: '最大箱数必须大于0' }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                            placeholder="请输入最大箱数（可选）"
                        />
                    </Form.Item>
                    <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                        提示：可以只设置最小值或最大值，也可以两者都设置。设置的范围将在自动调整时生效。
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

// export default withAuth(Vba);
export default ExecuteShip;
