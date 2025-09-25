"use client";

import React from 'react';
import TodoComponent from '@/app/vba/vba-user/todo_component';

/**
 * TodoComponent 使用示例
 * 展示如何配置文件下载功能
 */
const TodoComponentExample: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>TodoComponent 文件下载功能示例</h2>
      
      {/* 基础示例 - 使用默认下载URL */}
      <div style={{ marginBottom: '30px' }}>
        <h3>基础示例（默认下载URL: /api/download）</h3>
        <TodoComponent
          apiEndpoint="/api/some-task"
          title="基础任务组件"
          apiParams={{ param1: 'value1' }}
        />
      </div>

      {/* 自定义下载URL示例 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>自定义下载URL示例</h3>
        <TodoComponent
          apiEndpoint="/api/another-task"
          title="自定义下载URL任务"
          downloadBaseUrl="/api/files/download"
          enableFileUpload={true}
          enableApiParams={true}
        />
      </div>

      {/* 完整配置示例 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>完整配置示例</h3>
        <TodoComponent
          apiEndpoint="/api/advanced-task"
          title="高级任务组件"
          downloadBaseUrl="http://localhost:8085/api/download"
          enableFileUpload={true}
          enableApiParams={true}
          apiParams={{
            defaultParam: 'defaultValue',
            userId: 123
          }}
        />
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h4>使用说明：</h4>
        <ul>
          <li><strong>downloadBaseUrl</strong>: 设置文件下载的基础URL，默认为 '/api/download'</li>
          <li><strong>文件检测</strong>: 组件会自动检测步骤结果中的文件信息，支持以下字段：
            <ul>
              <li>result.file_name</li>
              <li>result.fileName</li>
              <li>result.filename</li>
              <li>result.file</li>
              <li>或者 result 本身就是文件名（包含扩展名）</li>
            </ul>
          </li>
          <li><strong>下载URL生成</strong>: 最终下载URL = downloadBaseUrl + '/' + fileName</li>
          <li><strong>示例</strong>: 
            <ul>
              <li>downloadBaseUrl: "/api/download"</li>
              <li>fileName: "report.xlsx"</li>
              <li>最终URL: "/api/download/report.xlsx"</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TodoComponentExample;