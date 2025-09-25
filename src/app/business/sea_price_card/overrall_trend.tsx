import { useState, useEffect } from 'react';
import { Table, Card, Typography, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import './overrall_trend.css';

const { Title } = Typography;

const OverallTrend = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 创建获取列配置的函数
  const getColumns = (data: any[]) => {
    if (!data.length) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      title: () => (
        <div style={{ 
          width: '150px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          textAlign: 'center'
        }}>
          {key}
        </div>
      ),
      dataIndex: key,
      key: key,
      render: (text: any, record: any, index: number) => {
        // 如果是时间相关字段，直接返回文本
        if (key === '时间' || key === '失效时间') {
          return text;
        }
        
        // 如果是数字类型，进行比较和着色
        if (typeof text === 'number') {
          const formattedValue = Number(text).toFixed(2);
          
          // 获取下一行数据（时间上的上一个时间段）
          const nextRow = data[index + 1];
          if (!nextRow) {
            return formattedValue;
          }

          const prevValue = nextRow[key];
          if (typeof prevValue !== 'number') {
            return formattedValue;
          }

          // 计算颜色
          let color = undefined;
          if (text > prevValue) {
            color = '#52c41a'; // 绿色
          } else if (text < prevValue) {
            color = '#ff4d4f'; // 红色
          }

          return <span style={{ color }}>{formattedValue}</span>;
        }
        return text;
      }
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/price_card/get_west_usa_grouped');
      
      if (response.data?.data?.groups && response.data.data.groups.length > 0) {
        const groups = response.data.data.groups;
        
        // 按时间和失效时间双重排序
        const sortedData = groups.sort((a: any, b: any) => {
          // 首先按时间降序
          const timeCompare = new Date(b.时间).getTime() - new Date(a.时间).getTime();
          if (timeCompare !== 0) {
            return timeCompare;
          }
          // 如果时间相同，则按失效时间降序
          return new Date(b.失效时间).getTime() - new Date(a.失效时间).getTime();
        });

        setData(sortedData);
        // 在设置数据后立即更新列配置
        setColumns(getColumns(sortedData));
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card 
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={4}>美西仓库价格趋势</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Table 
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: true }}
        rowKey={(record) => record.时间 + record.失效时间}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />
    </Card>
  );
};

export default OverallTrend;
