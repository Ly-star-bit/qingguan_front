"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, InputNumber, Checkbox, Typography, message, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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
    single_weight:number
    tax_rate?:number
    jiazheng?:number
    jiazheng0204?:number
    total_jiazheng?:number
    other_rate:{
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
    single_weight:number
    other_rate:{
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
  
const { TabPane } = Tabs;
const { confirm } = Modal;


// const server_url = "http://localhost:9008";
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;
// console.log(server_url)
const ExecuteCanada: React.FC = () => {


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
    const [selectedSender, setSelectedSender] = useState<string | undefined>();
    const [selectedReceiver, setSelectedReceiver] = useState<string | undefined>();

    //汇率
    const [CnUsdRate, setCnUsdRate] = useState<number | null>(null);
    const [loadingsubmit, setLoadingSubmit] = useState(false);

    //复选框
    const [isChecked, setIsChecked] = useState(false);

    // 自税务
    const [haiyunzishui, setHaiYunZiShui] = useState<HaiyunZishui[]>([]);

    const userName = useSelector((state: RootState) => state.user.name);
    const [isTiDanLogModalVisible, setTiDanLogModalVisible] = useState(false);

    // useEffect(() => {
    //     fetchProducts();
    // }, [productPage, productPageSize]); // Add productPageSize as dependency

    useEffect(() => {
        fetchShippersAndReceivers();
    }, [shipperFilter, shipperPage, shipperPageSize]); // Add shipperPageSize as dependency


    useEffect(() => {
        fetchAllProducts();
    }, []); // Add shipperPageSize as dependency

    useEffect(() => {
        fetchAllPorts()
        // 设置默认币种
        // executeForm.setFieldsValue({ currency_type: 'USD' });
        fetchExchangeRate()
        fetchHaiYunZiShui()
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
        setSelectedItems([...selectedItems, { key: Date.now(), name: '', quantity: 0, single_price: 0, packing: 0,single_weight:0,tax_rate:0 ,other_rate:{unit:'',value:0}}]);
    };
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
        // const totalJiazheng = calculateTotalJiazheng(product);
        const totalJiazheng = 0;
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

    const handlePortChange = (value: string) => {
        if (value === '整柜') {
            executeForm.setFieldsValue({
                sender: 'GANZHOU XUANTAI TRADING CO., LTD.',
                receiver: 'SOLIMOES TRADING INC'
            });
        } else if (value === '拼箱') {
            executeForm.setFieldsValue({
                sender: 'GANZHOU XUANTAI TRADING CO., LTD.',
                receiver: 'AMAZON.COM SERVICES, INC.'
            });
        }


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
    const handleProductSearch_Chinese = async (value: string | undefined)=> {
        if (!value) return null;
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/products?名称=${value}&country=Canada`);
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
                   
                    total_jiazheng:total_jiazheng,
                    yugu_tax_money: yuguTaxMoneyUsd,
                    huomian_deadline: huomianDeadline,
                    quantity: quantity,// 更新数量
                    danxiangshuijin: danxiangshuijin,
                    renzheng: renzheng,
                    single_price: single_price,
                    packing: packing,
                    single_weight:single_weight,
                    goods_price: goods_price,
                    other_rate:other_rate

                }
                : item
        );
        setSelectedItems(newSelectedItems);
        // 计算总预估关税（只包含关税部分）
        const total_duty = newSelectedItems.reduce((acc, item) => {
            const 货值 = Number(item.quantity) * Number(item.packing) * Number(item.single_price);
            const 税金 = Number(item.tax_rate) * 货值;
            return acc + 税金;
        }, 0);

        // 计算总GST
        const total_gst = newSelectedItems.reduce((acc, item) => {
            const 货值 = Number(item.quantity) * Number(item.packing) * Number(item.single_price);
            return acc + (货值 * 0.05);
        }, 0);

        //总货值
        const all_goods_price = newSelectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);
        const result = all_goods_price * 0.003464
        const min_total = result < 32.71 ? 32.71 : (result > 634.62 ? 634.62 : result);
        const other_price = all_goods_price * 0.00125
        setTotalCarrierPrice(all_goods_price)
        setTotalAllYuguTax(total_duty + total_gst + min_total + other_price)
        console.log(`total_duty:${total_duty}`)
        setTotalYuguTax(total_duty);
        // const specialQingguanTihuo = executeForm.getFieldValue("special_qingguan_tihuo");


            
    
    
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
                    yugu_tax_money: yuguTaxMoneyUsd,
                    single_price: adjustedSinglePrice,
                    packing: adjustedPacking,
                    yijianduozhongkg: yijianduozhongkg,
                    goods_price:goods_price

                };
            }
            return item;
        });
        let resolvedItems = await Promise.all(newSelectedItems);
        setSelectedItems(resolvedItems)

        // 计算总预估关税
        const total_duty = resolvedItems.reduce((acc, item) => {
            const yugu_tax_money = (item as SelectedItem & { yugu_tax_money: number | null }).yugu_tax_money;
            return acc + (yugu_tax_money !== null ? yugu_tax_money : 0);
        }, 0);

        //总货值
        const all_goods_price = resolvedItems.reduce((acc, item) => acc + ((item as SelectedItem & { goods_price: number | null }).goods_price || 0), 0);
        
        // 计算总GST (所有商品的货值*0.05的总和)
        const total_gst = resolvedItems.reduce((acc, item) => {
            const goods_price = item.single_price * item.packing * item.quantity;
            return acc + (goods_price * 0.05);
        }, 0);

        setTotalCarrierPrice(all_goods_price);
        setTotalAllYuguTax(total_duty + total_gst); // 整票预估税金 = 总预估关税 + 总GST
        console.log(`total_duty_packingchange:${total_duty}`)
        setTotalYuguTax(total_duty);
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
            // 获取当前币种
            const currencyType = executeForm.getFieldValue('currency_type') || 'USD';
            const rateType = currencyType === 'USD' ? 'USDCNY' : 'CADCNY';
            
            const response = await axiosInstance.get(`${server_url}/qingguan/api/exchange-rate?rate_type=${rateType}`);
            setCnUsdRate(response.data.USDCNY)
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        }
    };
    const fetchProducts = async (append = false) => {
        setLoadingProducts(true);
        const response = await axiosInstance.get(`${server_url}/qingguan/products?skip=${(productPage - 1) * productPageSize}&limit=${productPageSize}&名称=${productFilter}&username=${userName}&country=Canada`);
        setTotalProducts(response.data.total);
        setProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);
        setLoadingProducts(false);

    };
    const fetchAllProducts = async (append = false) => {
        const response = await axiosInstance.get(`${server_url}/qingguan/products/?get_all=true&username=${userName}&country=Canada`);
        setAllProducts((prevProducts) => append ? [...prevProducts, ...response.data.items] : response.data.items);

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



    const download_get_excel = async (values: any) => {
        // 检查总箱数是否一致
        const totalBoxCount = Number(executeForm.getFieldValue('allBoxCount'));
        const selectedItemsBoxCount = selectedItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
        
        if (totalBoxCount !== selectedItemsBoxCount) {
            message.error('总箱数上下不一致，请检查后再提交！');
            return;
        }

        setLoadingSubmit(true); // 结束加载
        const data = {
            //总预估税金
            totalyugutax:totalAllYuguTax.toFixed(2),
            //预估整票税金CNY/Kg

            predict_tax_price:(
                totalAllYuguTax /
                Number(executeForm.getFieldValue('weight')) *
                Number(CnUsdRate || executeForm.getFieldValue('rate_cn_us'))
            ).toFixed(2),
            currency_type:executeForm.getFieldValue('currency_type'),
            packing_type:"",
            execute_type:"Air",
            import_country:"Canada",
            shipper_name: values.sender,
            receiver_name: values.fda_report ? "SOLIMOES TRADING INC" : values.receiver,
            port:"",
            master_bill_no: values.orderNumber,
            gross_weight: values.weight,
            volume: values.volume,
            product_list: selectedItems
                .filter(item => item.name !== "")
                .sort((a, b) => {
                    // 如果 a.yijianduozhongkg 不为空，b.yijianduozhongkg 为空，a 排在前面
                    if (a.single_weight && !b.single_weight) {
                        return -1;
                    }
                    // 如果 b.yijianduozhongkg 不为空，a.yijianduozhongkg 为空，b 排在前面
                    if (!a.single_weight && b.single_weight) {
                        return 1;
                    }
                    // 如果两者都不为空或都为空，保持原来的顺序
                    return 0;
                })
                .map(item => ({
                    product_name: item.name,
                    box_num: item.quantity,
                    single_price: item.single_price,
                    packing: item.packing

                }))
        };

        try {
            const response = await axiosInstance.post(`${server_url}/qingguan/process-shipping-data`, data, {
                responseType: 'blob' // 处理文件下载
            });

            const contentType = response.headers['content-type'];
            let fileExtension = '';

            // 根据 Content-Type 设置文件扩展名
            switch (contentType) {
                case 'application/json':
                    const reader = new FileReader();
                    reader.onload = () => {
                        const jsonResponse = JSON.parse(reader.result as string);
                        // console.log('JSON response:', jsonResponse);
                        setJsonContent(jsonResponse['content']);
                        setIsModalVisible(true);
                        // 处理 JSON 响应
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
                // 可以根据需要添加更多文件类型
                default:
                    fileExtension = '';
            }
            if (contentType === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    const jsonResponse = JSON.parse(reader.result as string);
                    // console.log('JSON response:', jsonResponse);
                    setJsonContent(jsonResponse['content']);
                    setIsModalVisible(true);
                    // 处理 JSON 响应
                };
                reader.readAsText(response.data);
            } else {
                const contentDisposition = response.headers['content-disposition'];
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
                        }
                    }
                }
                // 创建下载链接
                console.log(`${data.master_bill_no} CI&PL${fileExtension}`)
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename || `${data.master_bill_no} CI&PL${fileExtension}`);
                document.body.appendChild(link);
                link.click();
            }

            // 清空表单
            executeForm.resetFields();
            setIsChecked(false);
            setSelectedItems([]); // 清空 selectedItems
            executeForm.setFieldsValue({ rate_cn_us: CnUsdRate });
            setTotalYuguTax(0);
            setTotalAllYuguTax(0)
            setTotalCarrierPrice(0)
        } catch (error) {
            console.error('Error submitting product data:', error);
        }
        finally {
            setLoadingSubmit(false); // 结束加载
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
            render: (text: string, record: SelectedItem) => (
                <Select
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
                const isReadOnly = record.single_weight != null && record.single_weight !== 0;
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
        {
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
        },


        {
            title: '税率',
            dataIndex: 'all_tax_rate',
            render: (text: number, record: SelectedItem) => (
                <span>{((Number(record.tax_rate) * 100).toFixed(2))}%</span>
            ),
        },

        {
            title: '预估关税',
            dataIndex: 'yugu_tax_money',
            render: (text: string, record: SelectedItem) => {
                const 货值 = Number(record.quantity) * Number(record.packing) * Number(record.single_price);
                const 税金 = Number(record.tax_rate) * 货值;
                return (
                    <span>{税金.toFixed(2)}</span>
                );
            },
        }
        ,

        {
            title: '预估GST',
            dataIndex: 'yugu_gst_money',
            render: (text: string, record: SelectedItem) => {
                const 货值 = Number(record.quantity) * Number(record.packing) * Number(record.single_price);
                return (
                    <span>{((货值 ) * 0.05 ).toFixed(2)}</span>
                );
            },
        },

        {
            title: '认证?',
            dataIndex: 'renzheng',
            render: (text: string) => (
                <span>{text}</span>
            ),

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
                        const total = newSelectedItems.reduce((acc, item) => acc + ((item as SelectedItem & { yugu_tax_money: number | null }).yugu_tax_money || 0), 0);
                        setTotalYuguTax(total );
                    }}
                />
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
                            <Button type="primary" onClick={downloadTemplate}>下载模板</Button>
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
                            
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item
                                        label="发货人"
                                        name="sender"
                                        rules={[{ required: true, message: '发货人是必填项' }]}
                                        initialValue="Shengjia Technology"
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
                                            defaultValue="Shengjia Technology"
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
                                        initialValue="LIHONG INTERNATIONAL INC."
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
                                            defaultValue="LIHONG INTERNATIONAL INC."
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
                                <Col span={8}>
                                    <Form.Item
                                        label="主单号"
                                        name="orderNumber"
                                        rules={[{ required: true, message: '主单号是必填项' }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="币种"
                                        name="currency_type"
                                        rules={[{ required: true, message: '币种是必填项' }]}
                                    >
                                        <Select defaultValue="USD" onChange={(value) => {
                                            const rateType = value === 'USD' ? 'USDCNY' : 'CADCNY';
                                            axiosInstance.get(`${server_url}/qingguan/api/exchange-rate?rate_type=${rateType}`)
                                                .then(response => {
                                                    setCnUsdRate(response.data.USDCNY);
                                                    executeForm.setFieldsValue({ rate_cn_us: response.data.USDCNY });
                                                })
                                                .catch(error => {
                                                    console.error('Error fetching exchange rate:', error);
                                                });
                                        }}>
                                            <Select.Option value="USD">美金</Select.Option>
                                            <Select.Option value="CAD">加币</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="汇率"
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
                                                    <Button type="dashed" onClick={() => { setTiDanLogModalVisible(true) }} style={{ width: '100%', marginTop: '10px' }}>查看提单</Button>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <strong style={{ display: 'block' }}>单箱重量: {(Number(executeForm.getFieldValue('weight')) / Number(executeForm.getFieldValue('allBoxCount'))).toFixed(2)}</strong>

                                                <strong style={{ display: 'block' }}>总货值/重量: {(totalCarrierPrice/Number(executeForm.getFieldValue('weight'))).toFixed(2)}</strong>

                                                    <strong style={{ display: 'block' }}>总货值 {executeForm.getFieldValue('currency_type') === 'USD' ? 'USD' : 'CAD'}: {totalCarrierPrice.toFixed(0)}</strong>
                                                    <strong style={{ display: 'block' }}>总GST: {selectedItems.reduce((acc, item) => {
                                                        const goods_price = item.single_price * item.packing * item.quantity;
                                                        return acc + (goods_price * 0.05);
                                                    }, 0).toFixed(2)}</strong>
                                                    <strong style={{ display: 'block' }}>总预估关税 {executeForm.getFieldValue('currency_type') === 'USD' ? 'USD' : 'CAD'}: {totalYuguTax.toFixed(2)}</strong>
                                                    <strong style={{ display: 'block' }}>整票预估税金 {executeForm.getFieldValue('currency_type') === 'USD' ? 'USD' : 'CAD'}: {totalAllYuguTax.toFixed(2)}</strong>
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
        </div>
    );
};

// export default withAuth(Vba);
export default ExecuteCanada;
