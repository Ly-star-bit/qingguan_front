'use client';
import React, { useState } from 'react';
import { Tabs } from 'antd';
import AdminUse from './admin_use';
import styles from "@/styles/Home.module.css";
import PriceCardArchive from './price_card_archive';
import OverallTrend from './overrall_trend';
const { TabPane } = Tabs;

const SeaPiceCard = () => {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div style={{ width: '100%' }}>
      <Tabs className={styles.tabs} defaultActiveKey="admin" onChange={(key) => setActiveTab(key)}>
        <TabPane tab="海运价格卡管理" key="admin">
          <AdminUse />
        </TabPane>
        <TabPane tab="海运价格卡归档" key="archive">
          <PriceCardArchive />
        </TabPane>
        <TabPane tab="美西仓库价格趋势" key="trend">
          <OverallTrend />
        </TabPane>
      </Tabs>
    </div>
  );
}

export default SeaPiceCard;
