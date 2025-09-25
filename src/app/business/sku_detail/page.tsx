'use client';
import React, { useState } from 'react';
import { Tabs } from 'antd';
import styles from "@/styles/Home.module.css";
import SkuDetail from './detail';
const { TabPane } = Tabs;

const SeaPiceCard = () => {
  const [activeTab, setActiveTab] = useState('sku_detail');

  return (
    <div style={{ width: '100%' }}>
      <Tabs className={styles.tabs} defaultActiveKey="admin" onChange={(key) => setActiveTab(key)}>
        <TabPane tab="sku详情管理" key="sku_detail">
          <SkuDetail />
        </TabPane>
       
       
      </Tabs>
    </div>
  );
}

export default SeaPiceCard;
