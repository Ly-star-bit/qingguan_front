"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Dropdown, Switch, message } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import { SelectedItem, Product, ShipperReceiver, ShippingRequest, Port } from "./types"
import moment from 'moment';
import FactoryTable from './FactoryTable';
import ConsigneeTable from './ConsigneeTable';
import ProductSearch from '../../../components/ProductSearch';
import PortsPage from './PortsTable';
import Head from 'next/head';
import DaLei from '@/components/dalei';
import withAuth from '@/components/withAuth';
import XLSX from 'xlsx';
import ProductTable from './ProductTable';
import IpWhiteListPage from './IpWhiteList';
import PdfViewDownload from './newpdfile';
import HaiyunZishuiPage from './HaiyunZishui';
import ProductTableCanada from './ProductTableCanada';
import ProductTableEurope from './ProductTableEurope';
import ProductTableEngland from './productDataEngland';
import ProductSearchCanada from '@/components/ProductSearchCanada';
import ProductTableAustralia from './productDataAustralia';
import axiosInstance from '@/utils/axiosInstance';
import ProductDataVietnam from './productDataVietnam';
import PackingTypeTable from './PackingTypeTable';
import AllProductTable from './AllProductTable';
const { TabPane } = Tabs;
const { confirm } = Modal;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const Vba: React.FC = () => {

    // --- 状态重构 ---
    // 1. 主选项卡状态
    const [activeTab, setActiveTab] = useState('AllProduct');

    // 2. 每个下拉菜单内部的子选项状态
    const [activeAirProduct, setActiveAirProduct] = useState('productData');
    const [activeSeaProduct, setActiveSeaProduct] = useState('productDataSea');
    const [activeSearch, setActiveSearch] = useState('productSearch');
    
    // 系统管理状态
    const [systemForbidden, setSystemForbidden] = useState(false);

    // --- 菜单项定义 (保持不变) ---
    const productAirItems = [
        { key: 'productData', label: '中国出口美国' },
        { key: 'productDataCanada', label: '中国出口Canada' },
        { key: 'productDataVietnam', label: '越南出口美国' },

        { key: 'productDataEurope', label: '产品数据源库Europe' },
        { key: 'productDataEngland', label: '产品数据源库England' },
        { key: 'productDataAustralia', label: '产品数据源库Australia' }
    ];

    const productSeaItems = [
        { key: 'productDataSea', label: '中国出口美国-海运' },
        { key: 'productDataSeaVietnam', label: '越南出口美国-海运' },
    ];



    // --- 数据获取和处理函数 (保持不变) ---
    const fetchSystemForbiddenStatus = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/system/forbidden/status/`);
            setSystemForbidden(response.data.forbidden);
        } catch (error) {
            message.error('获取系统状态失败');
        }
    };

    const handleSystemForbiddenChange = async (checked: boolean) => {
        try {
            const formData = new URLSearchParams();
            formData.append('forbidden', checked.toString());
            
            await axiosInstance.post(`${server_url}/system/forbidden/`, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            setSystemForbidden(checked);
            message.success(checked ? '系统已封禁' : '系统已解封');
        } catch (error) {
            message.error('操作失败');
        }
    };

    useEffect(() => {
        fetchSystemForbiddenStatus();
    }, []);

    // --- 渲染辅助函数 ---
    // 根据子选项状态渲染对应的组件，使 JSX 更简洁
    const renderAirProductComponent = () => {
        switch(activeAirProduct) {
            case 'productData': return <ProductTable />;
            case 'productDataCanada': return <ProductTableCanada />;
            case 'productDataEurope': return <ProductTableEurope />;
            case 'productDataEngland': return <ProductTableEngland />;
            case 'productDataAustralia': return <ProductTableAustralia />;
            case 'productDataVietnam': return <ProductDataVietnam transport_type="空运" />;
            default: return <ProductTable />; // 默认视图
        }
    };

    const renderSeaProductComponent = () => {
        switch(activeSeaProduct) {
            case 'productDataSea': return <ProductTable transport_type='海运' />;
            case 'productDataSeaVietnam': return <ProductDataVietnam transport_type='海运' />;
            default: return <ProductTable transport_type='海运' />;
        }
    };

    const renderSearchComponent = () => {
        switch(activeSearch) {
            case 'productSearch': return <ProductSearch data={[]} transport_type="空运" />;
            case 'productSearchSea': return <ProductSearch data={[]} transport_type="海运" />;
            case 'productSearchCanada': return <ProductSearchCanada data={[]} />;
            default: return <ProductSearch data={[]} transport_type="空运" />;
        }
    };

    return (
        <>
            <Head>
                <title>About Us</title>
                <meta name="description" content="Learn more about us on this page." />
            </Head>
            <div style={{ width: '100%' }}>
                {/* 使用 activeKey 控制主选项卡 */}
                <Tabs className={styles.tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key)} destroyInactiveTabPane>
                    {/* <TabPane
                        tab={
                            <Dropdown
                                menu={{
                                    items: productAirItems,
                                    // Dropdown只更新自己的子状态，不影响主Tab状态
                                    onClick: (e) => setActiveAirProduct(e.key),
                                    selectedKeys: [activeAirProduct],
                                }}
                                trigger={['hover', 'click']}
                            >
                                <span>{productAirItems.find(item => item.key === activeAirProduct)?.label || '空运_产品数据源库'} <DownOutlined /></span>
                            </Dropdown>
                        }
                        // 为主TabPane使用一个独立的、描述性的key
                        key="airProducts"
                    >
                        {renderAirProductComponent()}
                    </TabPane> */}
                    
                     <TabPane tab="全部产品" key="AllProduct">
                        <AllProductTable></AllProductTable>
                    </TabPane>
                    {/* <TabPane
                        tab={
                            <Dropdown
                                menu={{
                                    items: productSeaItems,
                                    onClick: (e) => setActiveSeaProduct(e.key),
                                    selectedKeys: [activeSeaProduct],
                                }}
                                trigger={['hover', 'click']}
                            >
                                <span>{productSeaItems.find(item => item.key === activeSeaProduct)?.label || '海运_产品数据源库'} <DownOutlined /></span>
                            </Dropdown>
                        }
                        // 独立的key
                        key="seaProducts"
                    >
                        {renderSeaProductComponent()}
                    </TabPane> */}

                  

                    {/* 其他没有下拉菜单的 TabPane 保持不变 */}
                    <TabPane tab="收发货人" key="ConsigneeData">
                        <ConsigneeTable />
                    </TabPane>
                    <TabPane tab="工厂数据" key="FactoryData">
                        <FactoryTable />
                    </TabPane>
                    <TabPane tab="港口数据" key="PortData">
                        <PortsPage />
                    </TabPane>
                    <TabPane tab="装箱类型" key="PackingType">
                        <PackingTypeTable />
                    </TabPane>
                    <TabPane tab="海运自税" key="HaiyunZishui">
                        <HaiyunZishuiPage />
                    </TabPane>
                    <TabPane tab="ip白名单" key="ipwhitelist">
                        <IpWhiteListPage />
                    </TabPane>
                    <TabPane tab="pdf历史记录" key="pdf_history">
                        <PdfViewDownload />
                    </TabPane>
                    <TabPane tab="系统管理" key="system">
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <h3>系统封禁状态</h3>
                                <Switch
                                    checked={systemForbidden}
                                    onChange={handleSystemForbiddenChange}
                                    checkedChildren="已封禁"
                                    unCheckedChildren="未封禁"
                                />
                            </div>
                        </div>
                    </TabPane>
                </Tabs>
            </div>
        </>
    );
};

export default Vba;