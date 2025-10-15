import React from 'react';
import { Row, Col } from 'antd';
import TodoComponent from './todo_component';

const Fentan_component: React.FC = () => {
  return (
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
  );
};

export default Fentan_component;