'use client';
import { useState } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { MenuOutlined, KeyOutlined } from '@ant-design/icons';
import MenuManagement from './menu';
import PermissionItemManagement from './permission_item';

const MenuAndPermissionPage = () => {
  const [activeTab, setActiveTab] = useState('menu');

  const tabItems: TabsProps['items'] = [
    {
      key: 'menu',
      label: (
        <span className="flex items-center gap-2">
          <MenuOutlined />
          菜单管理
        </span>
      ),
      children: <MenuManagement />,
    },
    {
      key: 'permission',
      label: (
        <span className="flex items-center gap-2">
          <KeyOutlined />
          权限项管理
        </span>
      ),
      children: <PermissionItemManagement />,
    },
  ];

  return (
    <div className="max-w-full mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">菜单与权限管理</h1>
        <p className="text-gray-500 mt-1">管理系统菜单结构和权限项</p>
      </div>

      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default MenuAndPermissionPage;
