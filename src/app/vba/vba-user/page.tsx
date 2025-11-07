"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Checkbox, Typography, Dropdown, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined, ReloadOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css";
import { SelectedItem, Product, ShipperReceiver, ShippingRequest, Port } from "./types";
import moment from 'moment';
import ProductSearchUnified from '@/components/ProductSearchUnified';
import ExecuteShip from '@/app/vba/vba-user/execute_ship';
import withAuth from '@/components/withAuth';
import ExecuteAir from './execute_air';
import { RootState } from '@/store/store';
import { useSelector } from 'react-redux';
import ExecuteCanada from './execute_canada';
import PdfViewDownloadUserAir from './pdf_shenhe_air';
import PdfViewDownloadUserSea from './pdf_shenhe_sea';
import DocumentViewer from '@/components/office/DocumentViewer';
import { preview } from '@ranui/preview'
import ExecuteAirTidan from './execute_air_tidan';
import TodoComponent from './todo_component';
import ExecuteQingguanFileGenerate from './execute_air_new';
import PdfViewDownloadUserAll from './pdf_shenhe_all';
const { TabPane } = Tabs;
const { confirm } = Modal;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const Vba: React.FC = () => {
    const [activeTab, setActiveTab] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const menuState = useSelector((state: RootState) => state.menu);
    const userName = useSelector((state: RootState) => state.user.name);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    // 获取"文件制作"的tab权限
    const getTabPermissions = (): string[] => {
        try {
            const functionModule = menuState.menuTree?.find((item: any) => item.name === "功能模块");
            if (functionModule && functionModule.children) {
                const userFileMenu = functionModule.children.find((item: any) => item.name === "文件制作-用户");
                if (userFileMenu && userFileMenu.children) {
                    return userFileMenu.children
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
        { 
            key: 'productSearch', 
            permissionKey: 'ProductSearchUnified', 
            tab: '产品查询', 
            component: <ProductSearchUnified key={`productSearch-${refreshKey}`} /> 
        },
        { 
            key: 'execute-air', 
            permissionKey: 'ExecuteAir', 
            tab: '执行-空运', 
            component: <ExecuteAir key={`execute-air-${refreshKey}`} /> 
        },
        { 
            key: 'execute-ship', 
            permissionKey: 'ExecuteShip', 
            tab: '执行-海运', 
            component: <ExecuteShip key={`execute-ship-${refreshKey}`} /> 
        },
        { 
            key: 'execute-canada', 
            permissionKey: 'ExecuteCanada', 
            tab: '执行-加拿大', 
            component: <ExecuteCanada key={`execute-canada-${refreshKey}`} /> 
        },
        { 
            key: 'airtian', 
            permissionKey: 'ExecuteAirTidan', 
            tab: '分舱单制作', 
            component: <ExecuteAirTidan key={`airtian-${refreshKey}`} /> 
        },
        { 
            key: 'todo_card_task', 
            permissionKey: 'TodoComponent', 
            tab: 'todo卡片任务', 
            component: (
                <div style={{ padding: '16px' }} key={`todo_card_task-${refreshKey}`}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                            <TodoComponent
                                apiEndpoint="/fentan/execute"
                                title="分摊任务处理"
                                apiParams={{
                                    task_type: {
                                        type: 'select',
                                        label: '任务类型',
                                        options: [
                                            { label: '上海平政', value: '上海平政' },
                                            { label: 'close分摊', value: 'close分摊' },
                                            { label: '广州航捷', value: '广州航捷' },
                                        ],
                                        defaultValue: '上海平政'
                                    },
                                    
                                }}
                                enableFileUpload={true}
                                enableApiParams={true}
                                columnNames={["日期", "客户", "金额", "备注"]}
                                downloadBaseUrl="/fentan/"
                            />
                        </Col>
                    </Row>
                </div>
            )
        },
        { 
            key: 'qingguan_pdf_generate', 
            permissionKey: 'ExecuteQingguanFileGenerate', 
            tab: '清关文件生成', 
            component: <ExecuteQingguanFileGenerate key={`qingguan_pdf_generate-${refreshKey}`} /> 
        },
        { 
            key: 'pdf_shenhe_all', 
            permissionKey: 'PdfViewDownloadUserAll', 
            tab: 'pdf审核文件', 
            component: <PdfViewDownloadUserAll key={`pdf_shenhe_all-${refreshKey}`} /> 
        },
    ];

    // 获取有权限的tabs
    const authorizedTabs = tabConfigs.filter(config => hasTabPermission(config.permissionKey));

    // 调试信息
    useEffect(() => {
        const permissions = getTabPermissions();
        // console.log(menuState)
        console.log('Tab Permissions:', permissions);
        console.log('Authorized Tabs:', authorizedTabs.map(t => t.key));
    }, [menuState]);

    // 设置默认的activeTab为第一个有权限的tab
    useEffect(() => {
        if (!activeTab && authorizedTabs.length > 0) {
            setActiveTab(authorizedTabs[0].key);
        }
    }, [authorizedTabs, activeTab]);

    return (
        <div style={{ width: '100%' }}>
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
                {authorizedTabs.map(config => (
                    <TabPane tab={config.tab} key={config.key}>
                        {config.component}
                    </TabPane>
                ))}
            </Tabs>
        </div>
    );
};

export default Vba;
