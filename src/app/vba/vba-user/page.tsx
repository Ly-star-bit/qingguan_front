"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Table, Button, Form, Input, Modal, Pagination, Tabs, Select, DatePicker, Checkbox, Typography, Dropdown, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css";
import { SelectedItem, Product, ShipperReceiver, ShippingRequest, Port } from "./types";
import moment from 'moment';
import ProductSearchUnified from '@/components/ProductSearchUnified';
import ExecuteShip from '@/app/vba/vba-user/execute_ship';
import withAuth from '@/components/withAuth';
import ExecuteAir from './execute_air';
import { store } from '@/store/store';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import ExecuteCanada from './execute_canada';
import PdfViewDownloadUserAir from './pdf_shenhe_air';
import PdfViewDownloadUserSea from './pdf_shenhe_sea';
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
    const [activeTab, setActiveTab] = useState('productSearch');
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userMenuIds, setUserMenuIds] = useState<string[]>([]);

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

    // 检查是否有任意一个产品查询权限
    const hasProductSearchPermission = 
        userMenuIds.includes('*') || 
        userMenuIds.includes('67f4fb3593ffc42375234412') || 
        userMenuIds.includes('67f4fb4493ffc42375234413') || 
        userMenuIds.includes('6837c78a93bfa2999c3c5db6') || 
        userMenuIds.includes('67f4fb5293ffc42375234414');

    return (
        <div style={{ width: '100%' }}>
            <Tabs className={styles.tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key)} destroyInactiveTabPane>
                {hasProductSearchPermission && (
                    <TabPane tab="产品查询" key="productSearch">
                        <ProductSearchUnified />
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
            </Tabs>
        </div>
    );
};

export default Vba;
