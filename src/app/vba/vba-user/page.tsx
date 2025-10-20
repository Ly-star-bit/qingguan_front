"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Checkbox, Typography, Dropdown, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css";
import { SelectedItem, Product, ShipperReceiver, ShippingRequest, Port } from "./types";
import moment from 'moment';
// import ProductSearch from '../../../components/ProductSearch';
import ProductSearch from '@/components/ProductSearch';
import ExecuteShip from '@/app/vba/vba-user/execute_ship';
import withAuth from '@/components/withAuth';
import ExecuteAir from './execute_air';
import { store } from '@/store/store';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import ProductSearchCanada from '@/components/ProductSearchCanada';
import ExecuteCanada from './execute_canada';
import PdfViewDownloadUserAir from './pdf_shenhe_air';
import PdfViewDownloadUserSea from './pdf_shenhe_sea';
import ProductSearchVietnam from '@/components/ProductSearchVietnam';
import DocumentViewer from '@/components/office/DocumentViewer';
import { preview } from '@ranui/preview'
import ExecuteAirTidan from './execute_air_tidan';
import TodoComponent from './todo_component';
import ExecuteAirNew from './execute_air_new';
const { TabPane } = Tabs;
const { confirm } = Modal;

interface DecodedToken {
    exp: number;
    sub: string;
    role: string;
    permissions: [string, string, string, string][];
    menu_ids: string[];
}

interface User {
    username: string;
    accessToken: string;
    tokenType: string;
    role: string;
}

// const server_url = "http://localhost:9008";
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const Vba: React.FC = () => {
    const [activeTab, setActiveTab] = useState('productSearchGroup');
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userMenuIds, setUserMenuIds] = useState<string[]>([]);
    const [activeSearchTab, setActiveSearchTab] = useState('productSearch');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            const { accessToken } = parsedUser;
            const decodedToken: DecodedToken = jwtDecode(accessToken);
            const permissions = decodedToken.permissions.map(permission => permission[1]);
            setUserPermissions(permissions);
            setUserMenuIds(decodedToken.menu_ids);
        }
    }, []);

    const renderTabPanes = () => {
        const menu_items = [
            { key: 'productSearch', label: '中国出口美国', menuId: '67f4fb3593ffc42375234412' },
            { key: 'productSearchSea', label: '中国出口美国-海运', menuId: '67f4fb4493ffc42375234413' },
            { key: 'productSearchSeaVietnam', label: '越南出口美国-海运', menuId: '6837c78a93bfa2999c3c5db6' },
            { key: 'productSearchCanada', label: '中国出口加拿大', menuId: '67f4fb5293ffc42375234414' },
        ].filter(item => userMenuIds.includes('*') || userMenuIds.includes(item.menuId));
        // console.log(userMenuIds);
        return (
            <>
                {menu_items.length > 0 && (
                    <TabPane
                        tab={
                            <Dropdown
                                menu={{
                                    items: menu_items.map(({ key, label }) => ({ key, label })),
                                    onClick: (e) => setActiveSearchTab(e.key),
                                    selectedKeys: [activeSearchTab],
                                }}
                                trigger={['hover', 'click']}
                            >
                                <span>{menu_items.find(item => item.key === activeSearchTab)?.label || 'All产品查询'} <DownOutlined /></span>
                            </Dropdown>
                        }
                        key="productSearchGroup"
                    >
                        {activeSearchTab === 'productSearch' && (userMenuIds.includes('*') || userMenuIds.includes('67f4fb3593ffc42375234412')) && <ProductSearch data={[]} transport_type="空运" />}
                        {activeSearchTab === 'productSearchSea' && (userMenuIds.includes('*') || userMenuIds.includes('67f4fb4493ffc42375234413')) && <ProductSearch data={[]} transport_type="海运" />}
                        {activeSearchTab === 'productSearchCanada' && (userMenuIds.includes('*') || userMenuIds.includes('67f4fb5293ffc42375234414')) && <ProductSearchCanada data={[]} />}
                        {activeSearchTab === 'productSearchSeaVietnam' && (userMenuIds.includes('*') || userMenuIds.includes('6837c78a93bfa2999c3c5db6')) && <ProductSearchVietnam data={[]} transport_type="海运" />}
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('67ca68082e8a2a3084b6fadc')) && (
                    <TabPane tab="执行-空运" key="execute-air">
                        <ExecuteAir />
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('67ca68392e8a2a3084b6fadd')) && (
                    <TabPane tab="执行-海运" key="execute-ship">
                        <ExecuteShip />
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('6802040b1aca4c9055634870')) && (
                    <TabPane tab="执行-加拿大" key="execute-canada">
                        <ExecuteCanada />
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('6819c8cba05671c34b3b6ed9')) && (
                    <TabPane tab="清关历史记录-空运" key="pdf-shenhe-air">
                        <PdfViewDownloadUserAir />
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('6835781893bfa2999c3c5db2')) && (
                    <TabPane tab="清关历史记录-海运" key="pdf-shenhe-sea">
                        <PdfViewDownloadUserSea />
                    </TabPane>
                )}
                {(userMenuIds.includes('*') || userMenuIds.includes('68a2f3997139a7a29cd7f126')) && (
                    <TabPane tab="分舱单制作" key="airtian">
                        <ExecuteAirTidan></ExecuteAirTidan>
                    </TabPane>
                )}
                <TabPane tab="todo卡片" key="todo_card_task">
                    <div style={{ padding: '16px' }}>
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
                                        }
                                    }}
                                    enableFileUpload={true}
                                    enableApiParams={true}
                                    downloadBaseUrl="/fentan/"
                                />
                            </Col>
                        </Row>
                    </div>
                </TabPane>

                <TabPane tab="清关文件生成" key="qingguan_pdf_generate">
                    <ExecuteAirNew />
                </TabPane>
            </>
        );
    };

    return (
        <div style={{ width: '100%' }}>
            <Tabs className={styles.tabs} defaultActiveKey="productSearchGroup" onChange={(key) => setActiveTab(key)} destroyInactiveTabPane>
                {renderTabPanes()}
            </Tabs>
        </div>
    );
};

export default Vba;
