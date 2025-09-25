"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Typography, Button, Avatar } from 'antd';
import { FileOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import ProductSearch from './five_letters_qingguan_hscode';
// import LuckysheetComponent from './luckysheetcomponent';

const { Sider, Content } = Layout;
const { Title } = Typography;

// 定义组件类型
interface DocumentPageProps {
  fileKey: string;
}

// 定义组件
const File2Component: React.FC = () => (
    <iframe
        src="https://www.kdocs.cn/l/cuuO229YP48q"
        width="100%"
        height="600px" // 调整高度以适应你的布局
        style={{ border: 'none' }}
        title="产品材料知识"
    />
);
const File3Component: React.FC = () => (
  <iframe
      src="https://www.kdocs.cn/l/clduKtptRrpH"
      width="100%"
      height="600px" // 调整高度以适应你的布局
      style={{ border: 'none' }}
      title="美国清关认证"
  />
);


const DocumentPage: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<React.FC | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 默认选择第一个组件
    handleMenuClick({ key: 'file1' });
  }, []);

  const handleMenuClick = (e: { key: string }) => {
    setSelectedKey(e.key);
    switch (e.key) {
      case 'file1':
        setSelectedComponent(() => ProductSearch);
        break;
      case 'file2':
        setSelectedComponent(() => File2Component);
        break;
      case 'file3':
        setSelectedComponent(() => File3Component);
        break;
   
      default:
        setSelectedComponent(null);
    }
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    { key: 'file1', icon: <FileOutlined />, label: '5位清关HS' },
    { key: 'file2', icon: <FileOutlined />, label: '产品材料知识' },
    // { key: 'file3', icon: <FileOutlined />, label: 'FDA 文档' },
    { key: 'file3', icon: <FileOutlined />, label: '美国清关认证' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={collapsed ? 48 : 200} // 缩小为 48px，展开为 200px
        style={{
          background: '#fff',
          width: collapsed ? 48 : 200,
          transition: 'width 0.2s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{
            fontSize: '16px',
            width: '100%',
            height: 64,
            borderRadius: collapsed ? '50%' : '0', // 关键：收缩时变成圆形
          }}
        />

        <Menu
          mode="inline"
          defaultSelectedKeys={['file1']}
          style={{ height: '100%', borderRight: 0, display: collapsed ? 'none' : 'block' }}
          onClick={handleMenuClick}
          items={menuItems}
        />
      </Sider>
      <Layout style={{ padding: '24px' }}>
        <Content
          style={{
            background: '#fff',
            padding: 24,
            margin: 0,
            minHeight: 280,
          }}
        >
          {selectedComponent ? (
            <div>
              {/* 渲染选择的组件 */}
              {React.createElement(selectedComponent)}
            </div>
          ) : (
            <Title level={4}>请选择一个文件</Title>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DocumentPage;
