"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Spin, message, Button, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import TodoComponent from './todo_component';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

interface TodoTask {
  id: string;
  title: string;
  apiEndpoint: string;
  apiParams?: Record<string, string | ApiParamConfig>;
  enableFileUpload?: boolean;
  enableApiParams?: boolean;
  downloadBaseUrl?: string;
}

interface ApiParamConfig {
  type?: 'text' | 'select';
  label?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string;
  value?: string;
}

const Todos: React.FC = () => {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${server_url}/api/todos/tasks`);
      if (response.data && Array.isArray(response.data)) {
        setTasks(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setTasks(response.data.data);
      } else {
        message.error('任务数据格式不正确');
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      message.error('获取任务列表失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleRefresh = () => {
    fetchTasks();
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>任务中心</h2>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '400px'
        }}>
          <Spin size="large" tip="加载任务列表中..." />
        </div>
      ) : tasks.length === 0 ? (
        <Empty 
          description="暂无任务"
          style={{ marginTop: '80px' }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {tasks.map((task) => (
            <Col 
              key={task.id} 
              xs={24} 
              sm={24} 
              md={12} 
              lg={8} 
              xl={6}
            >
              <TodoComponent
                title={task.title}
                apiEndpoint={task.apiEndpoint}
                apiParams={task.apiParams}
                enableFileUpload={task.enableFileUpload || false}
                enableApiParams={task.enableApiParams || false}
                downloadBaseUrl={task.downloadBaseUrl || '/api/download'}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default Todos;
