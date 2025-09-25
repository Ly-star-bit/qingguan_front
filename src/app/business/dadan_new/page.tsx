"use client";

import React, { useState } from 'react';
import { Tabs } from 'antd';
import DaDanHandComponent from './dadan_hand';
import DaDanComponent from './dadan_auto';
import TrackingNumber17Page from './tracking_number17';
const { TabPane } = Tabs;

const DaDanPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('hand');

  const handleTabChange = (key: string) => {
    setActiveKey(key);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Tabs activeKey={activeKey} onChange={handleTabChange} type="card">
        <TabPane tab="手动打单" key="hand">
          <DaDanHandComponent />
        </TabPane>
        <TabPane tab="自动打单" key="auto">
          <DaDanComponent />
        </TabPane>
        {/* <TabPane tab="快递追踪" key="tracking_number">
          <TrackingNumber17Page />
        </TabPane> */}
      </Tabs>
    </div>
  );
};

export default DaDanPage;
