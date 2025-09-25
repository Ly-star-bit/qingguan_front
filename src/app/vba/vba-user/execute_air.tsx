"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Checkbox, Typography, message, InputNumber, Row, Col, List, Space } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import { SelectedItem, Product, ShipperReceiver, ShippingRequest, Port } from "./types"
import moment from 'moment';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import TiDanLog from './customs_clear_tidan';

const { confirm } = Modal;

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
const ExecuteAir: React.FC = () => {


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

    const [totalYuguTax, setTotalYuguTax] = useState<number>(0);
    //整票预估税金
    const [totalAllYuguTax, setTotalAllYuguTax] = useState<number>(0);
    const [totalCarrierPrice, setTotalCarrierPrice] = useState<number>(0);

    const [jsonContent, setJsonContent] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [isTiDanLogModalVisible, setTiDanLogModalVisible] = useState(false);


    //港口
    const [PortContent, setPortContent] = useState<Port[]>([]);
    const [selectedSender, setSelectedSender] = useState<string | undefined>();
    const [selectedReceiver, setSelectedReceiver] = useState<string | undefined>();

    //出口国
    const [selectedCountry, setSelectedCountry] = useState<string | undefined>();

    //汇率
    const [CnUsdRate, setCnUsdRate] = useState<number | null>(null);
    const [loadingsubmit, setLoadingSubmit] = useState(false);

    //单箱重量
    const [newSingleWeight, setNewSingleWeight] = useState<number | null>(null);
    //复选框
    const [isChecked, setIsChecked] = useState(false);

    const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerificationLoading, setIsVerificationLoading] = useState(false);
    const [tempValues, setTempValues] = useState<any>(null);

    const [countdown, setCountdown] = useState<number>(0);

    const userName = useSelector((state: RootState) => state.user.name);

    const [selectedForAdjustment, setSelectedForAdjustment] = useState<number[]>([]);
    const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentResult[]>([]);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

    const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryEntry[]>([]);
    const [isSubmissionHistoryModalVisible, setIsSubmissionHistoryModalVisible] = useState(false);

    // 添加范围设置相关状态
    const [adjustmentRanges, setAdjustmentRanges] = useState<{ [key: number]: { min?: number, max?: number } }>({});
    const [isRangeModalVisible, setIsRangeModalVisible] = useState(false);
    const [currentRangeKey, setCurrentRangeKey] = useState<number | null>(null);
    const [rangeForm] = Form.useForm();

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
        fetchProducts();
    }, [productPage, productPageSize]); // Add productPageSize as dependency

    useEffect(() => {
        fetchShippersAndReceivers();
    }, [shipperFilter, shipperPage, shipperPageSize]); // Add shipperPageSize as dependency


    useEffect(() => {
        if (selectedCountry) {
            fetchAllProducts(selectedCountry);
            fetchAllPorts()

        }
        console.log(CnUsdRate)
    }, [selectedCountry]);

    useEffect(() => {
        fetchExchangeRate()
    }, []); // Add shipperPageSize as dependency
    useEffect(() => {
        if (CnUsdRate !== undefined) {
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
        }
    }, [CnUsdRate, executeForm]);
    useEffect(() => {
        filterProducts(allProducts, productFilter, productPage, productPageSize);
    }, [productFilter]);
    const handleAddRow = () => {
        setSelectedItems([...selectedItems, {
            key: Date.now(),
            name: '',
            tax_rate: 0,
            yugu_tax_money_usd: 0,
            huomian_deadline: '',
            danxiangshuijin: 0,
            renzheng: "",
            quantity: 0,
            goods_price: 0,
            other_rate: {
                unit: '',
                value: 0
            }
        }]);
    };
    const other_rate_money = () => {
        const newSelectedItems = selectedItems
            .filter(item => item.name !== "")
            // .filter(item => item.other_rate && item.other_rate.unit != "")
            .sort((a, b) => {
                if (a.single_weight && !b.single_weight) return -1;
                if (!a.single_weight && b.single_weight) return 1;
                return 0;
            });
        console.log(`newSelectedItems: ${newSelectedItems}`);

        let accumalatedOtherRateMoney = 0;
        let accumulatedGrossWeight = 0;
        let accumulatedVolume = 0;
        const totalWeight = Number(executeForm.getFieldValue('weight'));
        const totalVolume = Number(executeForm.getFieldValue('volume'));
        console.log(`totalWeight: ${totalWeight}, totalVolume: ${totalVolume}`);
        let numProducts = newSelectedItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

        let avgVolume = totalVolume / numProducts;
        let avgGrossWeight = 0;
        for (let idx = 0; idx < newSelectedItems.length; idx++) {
            const productRecord = newSelectedItems[idx];


            const boxNum = (productRecord.quantity ?? 0);
            // const other_rate_unit = productRecord.other_rate.unit ?? '';
            // const other_rate_value = productRecord.other_rate.value ?? 0;
            let grossWeightForProduct = 0;
            let volumeForProduct = 0;


            //计算当前产品的grossweight和volume
            if (idx === newSelectedItems.length - 1) {
                grossWeightForProduct = parseFloat((totalWeight - accumulatedGrossWeight).toFixed(2));
                volumeForProduct = parseFloat((totalVolume - accumulatedVolume).toFixed(2));
            } else {
                if (productRecord.single_weight) {
                    grossWeightForProduct = productRecord.single_weight * boxNum;
                    numProducts -= boxNum;
                    avgGrossWeight = (totalWeight - grossWeightForProduct) / numProducts;
                } else {
                    grossWeightForProduct = parseFloat((avgGrossWeight * boxNum).toFixed(2));
                    accumulatedGrossWeight += grossWeightForProduct;
                }
                volumeForProduct = parseFloat((avgVolume * boxNum).toFixed(2));
                accumulatedVolume += volumeForProduct;
            }
            console.log(`${productRecord.name}    grossWeightForProduct: ${grossWeightForProduct}, volumeForProduct: ${volumeForProduct}`);
            if (!productRecord.other_rate) {
                continue;
            }
            const other_rate_unit = productRecord.other_rate.unit ?? '';
            const other_rate_value = productRecord.other_rate.value ?? 0;
            console.log(`other_rate_unit: ${other_rate_unit}, other_rate_value: ${other_rate_value}`);

            if (other_rate_unit == '/kg') {
                const other_ratemoney_per_kg = other_rate_value * grossWeightForProduct;
                accumalatedOtherRateMoney += other_ratemoney_per_kg;

            }
            else if (other_rate_unit == '/cbm') {
                const other_ratemoney_per_cbm = other_rate_value * volumeForProduct;
                accumalatedOtherRateMoney += other_ratemoney_per_cbm;
            }
            else if (other_rate_unit == '/件') {
                const other_ratemoney_per_piece = other_rate_value * boxNum;
                accumalatedOtherRateMoney += other_ratemoney_per_piece;
            }
        }

        return accumalatedOtherRateMoney
    }

    const filterProducts = (products: Product[], filter: string, page: number, pageSize: number) => {
        let filteredProducts = products;
        if (filter) {
            filteredProducts = products.filter(product => product.中文品名 && product.中文品名.includes(filter));
        }
        const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
        setProducts(paginatedProducts);
    };
    const calculateYuguTaxMoneyUsd = (quantity: number, product: Product | undefined, customPacking?: number, mannual_single_price?: number): number | null => {
        if (!product) return null;
        const taxRate = Number(product.Duty);
        const totalJiazheng = calculateTotalJiazheng(product);
        // 使用自定义的packing值或产品默认的件箱值
        const packing = customPacking !== undefined ? customPacking : Number(product.件箱);
        // result2 年后可能修改
        let result = 0;
        if (mannual_single_price) {
            result = Math.round(quantity * (packing * mannual_single_price)) * (taxRate + totalJiazheng);
            //  console.log(`${quantity} * ${packing} * ${mannual_single_price} * ${taxRate + totalJiazheng} = ${result}`)
        } else {
            result = Math.round(quantity * (packing * Number(product.单价))) * (taxRate + totalJiazheng);
            //  console.log(`${quantity} * ${packing} * ${Number(product.单价)} * ${taxRate + totalJiazheng} = ${result}`)
        }
        // const result = quantity * (Number(product.件箱) * Number(product.单价)) * (taxRate + jiazheng);
        // console.log(`result: ${result}`)
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

    };
    const handleSelectChange = async (key: number, value: string, quantity: number) => {
        const selectedProduct = await handleProductSearch_Chinese(value);
        // 更新allProducts中对应的产品
        const productIndex = allProducts.findIndex(p => p.中文品名 === value);
        if (productIndex !== -1 && selectedProduct) {
            allProducts[productIndex] = selectedProduct;
        }


        const taxRate = selectedProduct ? Number(selectedProduct.Duty) : undefined;
        const totalJiazheng = selectedProduct ? calculateTotalJiazheng(selectedProduct) : 0;
        const packing = selectedProduct ? Number(selectedProduct.件箱) : 0;
        const yuguTaxMoneyUsd = calculateYuguTaxMoneyUsd(quantity, selectedProduct || undefined, packing);
        const huomianDeadline = selectedProduct ? selectedProduct.豁免截止日期说明 : undefined;
        const danxiangshuijin = selectedProduct ? selectedProduct.一箱税金 : undefined;
        const renzheng = selectedProduct ? selectedProduct.认证 : undefined;
        const goods_price = Number(selectedProduct?.单价) * packing * Number(quantity)
        const single_weight = selectedProduct ? selectedProduct.single_weight : undefined;
        const other_rate = selectedProduct?.other_rate || { unit: '', value: 0 };

        // console.log(selectedItems)
        const newSelectedItems = selectedItems.map(item =>
            item.key === key
                ? {
                    ...item,
                    name: value,
                    tax_rate: taxRate,
                    total_jiazheng: totalJiazheng,
                    yugu_tax_money_usd: yuguTaxMoneyUsd,
                    huomian_deadline: huomianDeadline,
                    quantity: quantity,// 更新数量
                    danxiangshuijin: Number(danxiangshuijin),
                    renzheng: renzheng,
                    goods_price: goods_price,
                    single_price: Number(selectedProduct?.单价),
                    single_weight: single_weight,
                    packing: packing,
                    other_rate: other_rate
                }
                : item
        );
        // console.log(newSelectedItems)
        setSelectedItems(newSelectedItems);
        //
        let total = newSelectedItems.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            const taxRate = item.tax_rate !== undefined ? Number(item.tax_rate) : 0;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);
        //总货值
        const all_goods_price = newSelectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);
        const result = all_goods_price * 0.003464
        const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
        single_weight_calculate(Number(executeForm.getFieldValue('weight')), newSelectedItems)
        setTotalCarrierPrice(all_goods_price)

        setTotalYuguTax(total);
        setTotalAllYuguTax(total + min_total)
        if (renzheng !== undefined && renzheng !== "N FDA") {
            Modal.warning({
                title: "特殊产品",
                content: renzheng,
                onOk() { },
            });
        }

    };

    const handleQuantityChange = async (key: number, quantity: number) => {
        if (quantity < 0) {
            // 可以选择在这里显示一个错误提示，或者不更新数量
            message.error(`总数量不能小于0`);
            return;
        }
        //所有的箱数
        const all_box_quantity = selectedItems.reduce((total, item) => {
            if (item.key !== key) {
                return total + Number(item.quantity);
            }
            return total;
        }, 0) + quantity;

        let newSelectedItems = selectedItems.map(async (item) => {

            const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
            // const selectedProduct = await handleProductSearch_Chinese(item.name);
            // 使用自定义packing值或产品默认值
            const packing = item.packing !== undefined ? item.packing : (selectedProduct ? Number(selectedProduct.件箱) : 0);
            const mannual_single_price = item.single_price !== undefined ? item.single_price : (selectedProduct ? Number(selectedProduct.单价) : 0);
            const goods_price = selectedProduct ? mannual_single_price * packing * (item.key === key ? quantity : (item.quantity || 0)) : 0;

            // 重新计算 yijianduozhongkg
            // 如果 selectedProduct 有 single_weight，则使用这个默认的重量
            const yijianduozhongkg = selectedProduct?.single_weight
                ? selectedProduct.single_weight.toFixed(3)
                : (Number(executeForm.getFieldValue("weight")) / all_box_quantity / packing).toFixed(3);

            if (item.key === key) {
                return {
                    ...item,
                    quantity: quantity || 0,
                    yugu_tax_money_usd: calculateYuguTaxMoneyUsd(quantity, selectedProduct || undefined, packing, mannual_single_price),
                    yijianduozhongkg: yijianduozhongkg,
                    goods_price: goods_price,
                    // 保持原有的packing值
                    // packing: packing
                };
            }

            return {
                ...item,
                yijianduozhongkg: yijianduozhongkg
            };
        });
        let resolvedItems = await Promise.all(newSelectedItems);
        setSelectedItems(resolvedItems)


        let total = resolvedItems.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            const taxRate = item.tax_rate !== undefined ? Number(item.tax_rate) : 0;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);
        // total += other_rate_money()
        //总货值
        let all_goods_price = 0;
        resolvedItems.forEach(item => {
            const price = (item as SelectedItem & { goods_price: number | null }).goods_price || 0;
            console.log(`${item.name} 的货值: ${price} USD`);
            all_goods_price += price;
        });
        const result = all_goods_price * 0.003464
        const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
        single_weight_calculate(Number(executeForm.getFieldValue('weight')), resolvedItems)
        setTotalCarrierPrice(all_goods_price)
        console.log('all_goods_price', all_goods_price)

        setTotalYuguTax(total);
        setTotalAllYuguTax(total + min_total)
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
    const fetchProducts = async (append = false) => {
        setLoadingProducts(true);
        const response = await axiosInstance.get(`${server_url}/qingguan/products?skip=${(productPage - 1) * productPageSize}&limit=${productPageSize}&名称=${productFilter}&username=${userName}&zishui=false&is_hidden=false`);
        setTotalProducts(response.data.total);
        setProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);
        setLoadingProducts(false);

    };
    const fetchAllProducts = async (country: string = 'China') => {
        const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&zishui=false&country=${country}&is_hidden=false`);
        setAllProducts((prevProducts) => response.data.items);
    }
    const fetchAllPorts = async (append = false) => {
        const response = await axiosInstance.get(`${server_url}/qingguan/ports?country=${selectedCountry}`)
        setPortContent((prevPorts) => append ? [...prevPorts, ...response.data] : response.data);

    }

    const fetchShippersAndReceivers = async () => {
        const response = await axiosInstance.get(`${server_url}/qingguan/consignee`);
        setShippersAndReceivers(response.data.items);
        setTotalShippers(response.data.total);
        // console.log(shippersAndReceivers)
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
    const handleDownloadExcel = async (values: any) => {
        setLoadingSubmit(true);
        const data = {
            totalyugutax: totalAllYuguTax.toFixed(2),
            predict_tax_price: (
                totalAllYuguTax /
                Number(executeForm.getFieldValue('weight')) *
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
            await saveSubmissionHistory(executeForm.getFieldsValue(true), selectedItems);

            // 清空表单
            executeForm.resetFields();
            setIsChecked(false);
            setSelectedItems([]);
            setSelectedForAdjustment([]); // 添加这一行
            setAdjustmentHistory([]); // 也建议清空调整历史
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
            setTotalYuguTax(0);
            setTotalAllYuguTax(0);
            setTotalCarrierPrice(0);
        } catch (error) {
            console.error('Error submitting product data:', error);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleDelete = async (key: number) => {
        const index = selectedItems.findIndex(item => item.key === key);
        if (index > -1) {
            selectedItems.splice(index, 1);
            setSelectedItems([...selectedItems]);
            // 从selectedForAdjustment中移除被删除的key
            setSelectedForAdjustment(prev => prev.filter(k => k !== key));
            console.log('删除后的数据:', selectedItems);
        }
        console.log(selectedItems)
    };

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = 'excel_template/清关发票箱单模板 - Air.xlsx'; // 替换为实际的模板文件路径
        link.download = '清关发票箱单模板 - Air.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePackingChange = (key: number, packingValue: number | null, single_price: number | null) => {
        if (packingValue === null || packingValue < 0) {
            message.error(`件箱数不能小于0`);
            return;
        }
        if (single_price === null || single_price < 0) {
            message.error(`单价不能小于0`);
            return;
        }


        const updatedItems = selectedItems.map(async (item) => {
            if (item.key === key) {
                const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
                const quantity = item.quantity || 0;
                // const mannual_single_price = item.single_price !== undefined ? item.single_price : (selectedProduct ? Number(selectedProduct.单价) : 0);

                const goods_price = single_price ? single_price * packingValue * quantity : Number(selectedProduct?.单价) * packingValue * quantity;

                // 使用更新后的calculateYuguTaxMoneyUsd函数，传入自定义packing值
                const yuguTaxMoneyUsd = calculateYuguTaxMoneyUsd(quantity, selectedProduct || undefined, packingValue, single_price);

                return {
                    ...item,
                    packing: packingValue,
                    single_price: single_price,
                    goods_price: goods_price,
                    yugu_tax_money_usd: yuguTaxMoneyUsd
                };
            }
            return item;
        });

        Promise.all(updatedItems).then(resolvedItems => {
            setSelectedItems(resolvedItems);

            // 更新总税金和总货值
            const total = resolvedItems.reduce((acc, item) => {
                const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
                return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
            }, 0);

            const all_goods_price = resolvedItems.reduce((acc, item) =>
                acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);
            const result = all_goods_price * 0.003464;
            const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
            single_weight_calculate(Number(executeForm.getFieldValue('weight')), resolvedItems)
            setTotalCarrierPrice(all_goods_price)

            setTotalYuguTax(total);
            setTotalAllYuguTax(total + min_total)
        });
    };

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
        // 清空调整历史记录，因为范围改变了
        setAdjustmentHistory([]);
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
        const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);

        setTotalCarrierPrice(all_goods_price);
        setTotalYuguTax(total);
        setTotalAllYuguTax(total + min_total);

        single_weight_calculate(Number(executeForm.getFieldValue('weight')), historyItem.items);

        setIsHistoryModalVisible(false);
        message.success('已应用历史方案');
    }

    const calculateMetrics = (items: SelectedItem[], weight: number, rate: number) => {


        const totalValue = items.reduce((acc, item) => {
            // console.log(`${item.name}-${item.quantity}箱-${item.goods_price}USD`);
            return acc + (item.goods_price || 0);
        }, 0);
        const valuePerWeight = totalValue / weight;

        const totalTax = items.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        const result = totalValue * 0.003464;
        const mpf = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
        const totalAllTaxUSD = totalTax + mpf;
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
            const response = await axiosInstance.get(`${server_url}/qingguan/ports?country=${selectedCountry}`);
            const selectedPort = response.data.find((p: Port) => p.port_name === executeForm.getFieldValue('port'));

            if (!selectedPort || !selectedPort.check_data) {
                message.error('未找到港口检查数据');
                setIsAdjusting(false);
                return;
            }

            // 只考虑enabled为true的条件
            const enabledConditions = selectedPort.check_data.filter((item: { enabled: boolean }) => item.enabled);

            // 获取检查条件
            const valuePerWeightCondition = enabledConditions.find((item: { name: string }) => item.name === "总货值/重量");
            const taxPerKgCondition = enabledConditions.find((item: { name: string }) => item.name === "预估整票税金CNY/Kg");
            const clothingValueCondition = enabledConditions.find((item: { name: string }) => item.name === "服装类货值");
            const selectedItemsForAdjustment = selectedItems.filter(item => selectedForAdjustment.includes(item.key));

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

            // 检查是否满足继续下载的条件：服装类占比满足条件，并且至少还有一个其他条件满足
            const checkDownloadConditions = (valuePerWeightOk: boolean, taxPerKgOk: boolean, clothingValueOk: boolean) => {
                return clothingValueOk && valuePerWeightOk && taxPerKgOk;
            };

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

                // 第一个产品从actualMin1开始递增到actualMax1
                for (let i = actualMin1; i <= actualMax1; i++) {
                    const j = totalBoxesToAdjust - i;

                    // 检查第二个产品的箱数是否在范围内
                    if (j < actualMin2 || j > actualMax2) {
                        continue;
                    }

                    const dist = [i, j];

                    // 新增：检查该组合是否已在历史记录中
                    const isInHistory = adjustmentHistory.some(historyEntry =>
                        JSON.stringify(historyEntry.distribution) === JSON.stringify(dist)
                    );

                    if (isInHistory) {
                        continue; // 如果是已经找到过的组合，则跳过
                    }

                    const tempSelectedItems = await Promise.all(selectedItemsForAdjustment.map(async (item, index) => {
                        const quantity = dist[index];
                        const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
                        const packing = item.packing !== undefined ? item.packing : (selectedProduct ? Number(selectedProduct.件箱) : 0);
                        const mannual_single_price = item.single_price !== undefined ? item.single_price : (selectedProduct ? Number(selectedProduct.单价) : 0);
                        const goods_price = selectedProduct ? mannual_single_price * packing * quantity : 0;
                        const yugu_tax_money_usd = calculateYuguTaxMoneyUsd(quantity, selectedProduct || undefined, packing, mannual_single_price);
                        return { ...item, quantity, goods_price, yugu_tax_money_usd };
                    }));

                    const tempItems = [...otherItems, ...tempSelectedItems];

                    const { valuePerWeight, taxPerKg, totalAllTaxUSD } = calculateMetrics(tempItems, weight, rate);

                    // 检查是否满足条件
                    const isValuePerWeightOk = checkCondition(valuePerWeightCondition, Number(valuePerWeight));
                    const isTaxPerKgOk = checkCondition(taxPerKgCondition, Number(taxPerKg));
                    const isClothingValueOk = checkCondition(clothingValueCondition, Number(clothingPercentage));

                    if (checkDownloadConditions(isValuePerWeightOk, isTaxPerKgOk, isClothingValueOk)) {
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

                if (actualMin1 + actualMin2 + actualMin3 > totalBoxesToAdjust) {
                    message.error('设置的最小范围总和超过了总箱数，请调整范围设置');
                    setIsAdjusting(false);
                    return;
                }

                // 三个产品，两个嵌套循环
                for (let i = actualMin1; i <= actualMax1; i++) {
                    for (let j = actualMin2; j <= actualMax2; j++) {
                        const l = totalBoxesToAdjust - i - j;

                        // 检查第三个产品的箱数是否在范围内
                        if (l < actualMin3 || l > actualMax3) continue;

                        const dist = [i, j, l];

                        // 新增：检查该组合是否已在历史记录中
                        const isInHistory = adjustmentHistory.some(historyEntry =>
                            JSON.stringify(historyEntry.distribution) === JSON.stringify(dist)
                        );
                        if (isInHistory) {
                            continue; // 如果是已经找到过的组合，则跳过
                        }

                        const tempSelectedItems = await Promise.all(selectedItemsForAdjustment.map(async (item, index) => {
                            const quantity = dist[index];
                            const selectedProduct = allProducts.find(product => product.中文品名 === item.name);
                            const packing = item.packing !== undefined ? item.packing : (selectedProduct ? Number(selectedProduct.件箱) : 0);
                            const mannual_single_price = item.single_price !== undefined ? item.single_price : (selectedProduct ? Number(selectedProduct.单价) : 0);
                            const goods_price = selectedProduct ? mannual_single_price * packing * quantity : 0;
                            const yugu_tax_money_usd = calculateYuguTaxMoneyUsd(quantity, selectedProduct || undefined, packing, mannual_single_price);
                            return { ...item, quantity, goods_price, yugu_tax_money_usd };
                        }));

                        const tempItems = [...otherItems, ...tempSelectedItems];

                        const { valuePerWeight, taxPerKg, totalAllTaxUSD } = calculateMetrics(tempItems, weight, rate);

                        // 检查是否满足条件
                        const isValuePerWeightOk = checkCondition(valuePerWeightCondition, Number(valuePerWeight));
                        const isTaxPerKgOk = checkCondition(taxPerKgCondition, Number(taxPerKg));
                        const isClothingValueOk = checkCondition(clothingValueCondition, Number(clothingPercentage));

                        if (checkDownloadConditions(isValuePerWeightOk, isTaxPerKgOk, isClothingValueOk)) {
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
                // 挑选税金最低的方案
                foundSolutions.sort((a, b) => (a.metrics.totalAllTaxUSD || Infinity) - (b.metrics.totalAllTaxUSD || Infinity));
                const bestSolution = foundSolutions[0];

                // 应用最佳方案
                setSelectedItems(bestSolution.items.sort((a, b) => a.key - b.key));

                // 更新历史记录
                setAdjustmentHistory(prev => [...prev, ...foundSolutions]);

                // 计算并更新所有相关状态
                const total = bestSolution.items.reduce((acc, item) => {
                    const yugu_tax_money = (item as SelectedItem & { yugu_tax_money_usd: number | null }).yugu_tax_money_usd;
                    return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
                }, 0);

                const all_goods_price = bestSolution.items.reduce((acc, item) =>
                    acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);

                const result = all_goods_price * 0.003464;
                const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);

                // 更新所有状态
                setTotalCarrierPrice(all_goods_price);
                setTotalYuguTax(total);
                setTotalAllYuguTax(total + min_total);

                // 计算并更新单箱重量
                single_weight_calculate(Number(executeForm.getFieldValue('weight')), bestSolution.items);

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
                    onBlur={(e) => handleQuantityChange(record.key, parseInt(e.target.value, 10))}
                    onChange={(e) => {
                        const value = e.target.value;
                        const newSelectedItems = selectedItems.map(item =>
                            item.key === record.key ? { ...item, quantity: parseInt(value, 10) } : item
                        );
                        setSelectedItems(newSelectedItems);
                    }}
                />
            ),
        },
        {
            title: '一箱件数',
            dataIndex: 'packing',
            render: (text: number, record: SelectedItem) => {
                const isReadOnly = record.single_weight != null && record.single_weight !== 0
                return (
                    <InputNumber
                        value={record.packing}
                        onChange={(value) => {
                            handlePackingChange(record.key, value || 0, Number(record.single_price));
                        }}
                        min={0}
                        step={1}
                        readOnly={isReadOnly}
                    />
                );
            },
        },
        // 单价列只在管理员时显示
        ...(userName === 'admin' ? [{
            title: '单价',
            dataIndex: 'single_price',
            render: (text: number, record: SelectedItem) => (
                <InputNumber
                    value={record.single_price}
                    onChange={(value) => {
                        handlePackingChange(record.key, Number(record.packing), value || 0);
                    }}
                    min={0}
                    step={0.01}
                    style={{ width: '100%' }}
                />
            ),
        }] : []),
        {
            title: '总税率',
            dataIndex: 'all_tax_rate',
            render: (text: number, record: SelectedItem) => (
                <span>{((Number(record.tax_rate) + Number(record.total_jiazheng)) * 100).toFixed(2)}%</span>
            ),
        },
        {
            title: '预估税金USD',
            dataIndex: 'yugu_tax_money_usd',
            render: (text: string) => (
                <span>{text}</span>
            ),
        },
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
                        handleQuantityChange(record.key, 0);
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
                                                服装类货值占比: {(() => {
                                                    const clothingItems = selectedItems.filter(item => {
                                                        const matchedProduct = allProducts.find(p => p.中文品名 === item.name);
                                                        // return matchedProduct && matchedProduct.类别 === '服装类' && !matchedProduct.中文品名.startsWith('(轻小件)');
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
                                            <Button
                                                type="primary"
                                                onClick={adjustBoxNumbers}
                                                disabled={selectedForAdjustment.length < 1 || isAdjusting}
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


export default ExecuteAir;
