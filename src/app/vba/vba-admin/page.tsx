"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Dropdown, Switch, message } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined, ReloadOutlined } from '@ant-design/icons';
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
import AirAllProductTable from './AirAllProductTable';
import SeaAllProductTable from './SeaAllProductTable';
import TariffManagement from './TariffManagement';
import dynamic from 'next/dynamic';
import { RootState } from '@/store/store';
import { useSelector } from 'react-redux';

const SystemForbidden = dynamic(() => import('./systemforbidden'), { ssr: false });

const { TabPane } = Tabs;
const { confirm } = Modal;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;
    
const Vba: React.FC = () => {

    // --- 状态重构 ---
    // 1. 主选项卡状态
    const [activeTab, setActiveTab] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // 2. 每个下拉菜单内部的子选项状态
    const [activeAirProduct, setActiveAirProduct] = useState('productData');
    const [activeSeaProduct, setActiveSeaProduct] = useState('productDataSea');
    const [activeSearch, setActiveSearch] = useState('productSearch');
    const menuState = useSelector((state: RootState) => state.menu);
    const userName = useSelector((state: RootState) => state.user.name);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    // 获取"文件制作-管理员"的tab权限
    const getTabPermissions = (): string[] => {
        try {
            const functionModule = menuState.menuTree?.find((item: any) => item.name === "功能模块");
            if (functionModule && functionModule.children) {
                const adminFileMenu = functionModule.children.find((item: any) => item.name === "文件制作-管理员");
                if (adminFileMenu && adminFileMenu.children) {
                    return adminFileMenu.children
                        .filter((child: any) => child.path && child.path.startsWith('tab-'))
                        .map((child: any) => child.path.replace('tab-', ''));
                }
            }
        } catch (error) {
            console.error('获取tab权限失败:', error);
        }
        return [];
    };

    // 检查是否有某个tab的权限
    const hasTabPermission = (tabKey: string): boolean => {
        const permissions = getTabPermissions();
        return permissions.includes(tabKey);
    };

    // Tab配置映射
    const tabConfigs = [
        { key: 'AirProduct', permissionKey: 'AirAllProductTable', tab: '空运产品', component: <AirAllProductTable key={`AirProduct-${refreshKey}`} /> },
        { key: 'SeaProduct', permissionKey: 'SeaAllProductTable', tab: '海运产品', component: <SeaAllProductTable key={`SeaProduct-${refreshKey}`} /> },
        { key: 'ConsigneeData', permissionKey: 'ConsigneeTable', tab: '收发货人', component: <ConsigneeTable key={`ConsigneeData-${refreshKey}`} /> },
        { key: 'FactoryData', permissionKey: 'FactoryTable', tab: '工厂数据', component: <FactoryTable key={`FactoryData-${refreshKey}`} /> },
        { key: 'PortData', permissionKey: 'PortsPage', tab: '港口数据', component: <PortsPage key={`PortData-${refreshKey}`} /> },
        { key: 'PackingType', permissionKey: 'PackingTypeTable', tab: '装箱类型', component: <PackingTypeTable key={`PackingType-${refreshKey}`} /> },
        { key: 'HaiyunZishui', permissionKey: 'HaiyunZishuiPage', tab: '海运自税', component: <HaiyunZishuiPage key={`HaiyunZishui-${refreshKey}`} /> },
        { key: 'TariffManagement', permissionKey: 'TariffManagement', tab: '加征关税管理', component: <TariffManagement key={`TariffManagement-${refreshKey}`} /> },
        { key: 'pdf_history', permissionKey: 'PdfViewDownload', tab: 'pdf历史记录', component: <PdfViewDownload key={`pdf_history-${refreshKey}`} /> },
        { key: 'system', permissionKey: 'SystemForbidden', tab: '系统管理', component: <SystemForbidden key={`system-${refreshKey}`} /> },
    ];

    // 获取有权限的tabs
    const authorizedTabs = tabConfigs.filter(config => hasTabPermission(config.permissionKey));

    // 调试信息
    useEffect(() => {
        const permissions = getTabPermissions();
        console.log('Tab Permissions:', permissions);
        console.log('Authorized Tabs:', authorizedTabs.map(t => t.key));
    }, [menuState]);

    // --- 菜单项定义 (保持不变) ---

 

    // --- 数据获取和处理函数 (保持不变) ---

    // 设置默认的activeTab为第一个有权限的tab
    useEffect(() => {
        if (!activeTab && authorizedTabs.length > 0) {
            setActiveTab(authorizedTabs[0].key);
        }
    }, [authorizedTabs, activeTab]);

    
    return (
        <>
            <Head>
                <title>About Us</title>
                <meta name="description" content="Learn more about us on this page." />
            </Head>
            <div style={{ width: '100%' }}>
                {/* 使用 activeKey 控制主选项卡 */}
                <Tabs 
                    className={styles.tabs} 
                    activeKey={activeTab} 
                    onChange={(key) => setActiveTab(key)} 
                    destroyInactiveTabPane
                    tabBarExtraContent={
                        <Button 
                            type="text" 
                            icon={<ReloadOutlined />} 
                            onClick={handleRefresh}
                            title="刷新当前页面"
                        />
                    }
                >
                    {/* 根据权限动态渲染tabs */}
                    {authorizedTabs.map(config => (
                        <TabPane tab={config.tab} key={config.key}>
                            {config.component}
                        </TabPane>
                    ))}
                </Tabs>
            </div>
        </>
    );
};

export default Vba;