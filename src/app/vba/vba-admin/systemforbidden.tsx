"use client";

import React, { useState, useEffect } from 'react';
import { Switch, message } from 'antd';
import axiosInstance from '@/utils/axiosInstance';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const SystemForbidden: React.FC = () => {
    const [systemForbidden, setSystemForbidden] = useState(false);

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

    return (
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
    );
};

export default SystemForbidden;
