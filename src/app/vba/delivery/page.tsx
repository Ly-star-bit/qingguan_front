"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, Button } from 'antd';
import styles from "@/styles/Home.module.css";
import dynamic from 'next/dynamic';
import FedexRemoteAddressChecker from './fedex';
import UpsRemoteAddressChecker from './ups';
import DaDanComponent from './dadan';
import TrackingNumber17Page from '@/app/business/dadan_new/tracking_number17';
import { jwtDecode } from 'jwt-decode';
import ExecuteShip from '../vba-user/execute_ship';

const { TabPane } = Tabs;
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
// 动态导入 Fedex 组件，禁用 SSR
const FedexRemoteAddressCheckerDynamic = dynamic(
    () => import('./fedex'),
    { ssr: false }
);

const RemoteAddressChecker: React.FC = () => {
    const [activeKey, setActiveKey] = useState('fedex');
    const [userMenuIds, setUserMenuIds] = useState<string[]>([]);



    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            const { accessToken } = parsedUser;
            const decodedToken: DecodedToken = jwtDecode(accessToken);
            const permissions = decodedToken.permissions.map(permission => permission[1]);
            setUserMenuIds(decodedToken.menu_ids);
        }
    }, []);
    const onChange = (key: string) => {
        setActiveKey(key);
    };

    const handleDownloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/excel_template/批量查询偏远地址模板.xlsx'; // 模板文件路径
        link.download = '批量查询偏远地址模板.xlsx'; // 下载的文件名
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ width: '100%' }}>
            
            <Tabs
                className={styles.tabs}
                activeKey={activeKey}
                onChange={onChange}
                destroyInactiveTabPane
                tabBarExtraContent={<Button type="primary" onClick={handleDownloadTemplate}
                
                
                >
                下载偏远地址模板

            </Button>}
            >
                <TabPane tab="Fedex" key="fedex">
                    <FedexRemoteAddressCheckerDynamic />
                </TabPane>
                <TabPane tab="UPS" key="ups">
                    <UpsRemoteAddressChecker />
                </TabPane>
                {/* <TabPane tab="打单" key="dadan">
                    <DaDanComponent />
                </TabPane> */}
                {(userMenuIds.includes('*') || userMenuIds.includes('686b3798a5afadf9a07a6fc4')) && (
                    <TabPane tab="快递追踪" key="tracking_number">
                    <TrackingNumber17Page />
                    </TabPane>
                )}

                {/* <TabPane tab="执行海运" key="execute-ship">
                <ExecuteShip />
                </TabPane> */}
            </Tabs>
        </div>
    );
};

export default RemoteAddressChecker;
