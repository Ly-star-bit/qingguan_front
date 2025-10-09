'use client';
import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tree,
  Empty,
  Tag,
  Space,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import axiosInstance from '@/utils/axiosInstance';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  api_endpoint_ids?: string[];
  custom_api_paths?: string[]; // Allow custom API paths (including wildcards)
  api_endpoints?: ApiEndpoint[];
  children?: MenuItem[];
}

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Description: string;
}

const MenuPage = () => {
  const [data, setData] = useState<MenuItem[]>([]);
  const [flattenedMenuOptions, setFlattenedMenuOptions] = useState<{ label: string; value: string }[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const menuResponse = await axiosInstance.get('/menu');
      const menuResult = menuResponse.data;
      setData(menuResult);

      const apiResponse = await axiosInstance.get('/api_endpoints');
      const apiResult = apiResponse.data;
      const flatApiEndpoints = Object.entries(apiResult).reduce((acc: ApiEndpoint[], [group, endpoints]) => {
        return acc.concat(endpoints as ApiEndpoint[]);
      }, []);
      setApiEndpoints(flatApiEndpoints);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update the flattened menu options whenever data changes
    setFlattenedMenuOptions(flattenMenuItems(data));
  }, [data]);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: MenuItem) => {
    // Combine endpoint IDs and custom paths for the form field
    const selections = [];
    
    if (record.api_endpoint_ids) {
      selections.push(...record.api_endpoint_ids);
    }
    
    if (record.custom_api_paths) {
      selections.push(...record.custom_api_paths);
    }
    
    form.setFieldsValue({
      ...record,
      parent_id: record.parent_id || undefined,
      api_endpoints_selection: selections,
    });
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/menu/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Process the api_endpoints_selection field to separate IDs from custom paths
      if (values.api_endpoints_selection) {
        // Separate endpoint IDs from custom paths
        const endpointIds = values.api_endpoints_selection.filter((item:any) => 
          apiEndpoints.some(ep => ep.id === item)
        );
        
        const customPaths = values.api_endpoints_selection.filter((item:any) => 
          !apiEndpoints.some(ep => ep.id === item)
        );
        
        // Set endpoint IDs to api_endpoint_ids field
        if (endpointIds.length > 0) {
          values.api_endpoint_ids = endpointIds;
        } else {
          values.api_endpoint_ids = undefined;
        }
        
        // Set custom paths to a new field (if needed by backend)
        if (customPaths.length > 0) {
          values.custom_api_paths = customPaths;
        } else {
          values.custom_api_paths = undefined;
        }
      } else {
        values.api_endpoint_ids = undefined;
        values.custom_api_paths = undefined;
      }

      // Remove the original field since we've processed it
      delete values.api_endpoints_selection;

      if (editingId) {
        await axiosInstance.put(`/menu/${editingId}`, values);
      } else {
        await axiosInstance.post('/menu', values);
      }
      setIsModalVisible(false);
      message.success(`${editingId ? '更新' : '添加'}成功`);
      fetchData();
    } catch (error) {
      message.error(`${editingId ? '更新' : '添加'}失败`);
    }
  };

  const flattenMenuItems = (items: MenuItem[]): { label: string; value: string }[] => {
    let result: { label: string; value: string }[] = [];
    
    const traverse = (menuItems: MenuItem[], depth = 0) => {
      menuItems.forEach(item => {
        // Add the current item to the result
        result.push({
          label: `${'　'.repeat(depth)}${item.name}`, // Add indentation using special space character
          value: item.id,
        });
        
        // Recursively process children if they exist
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      });
    };
    
    traverse(items);
    return result;
  };

  const convertMenuToTreeData = (items: MenuItem[]): DataNode[] => {
    return items.map(item => {
      // 计算API数量：优先使用 api_endpoints，其次使用 api_endpoint_ids
      const apiCount = item.api_endpoints?.length || item.api_endpoint_ids?.length || 0;
      
      return {
        title: (
          <div className="flex items-center gap-2">
            <span>
              {item.children && item.children.length > 0 ? 
                <FolderOutlined style={{ color: '#faad14' }} /> : 
                <FileOutlined style={{ color: '#1890ff' }} />
              }
            </span>
            <span className="font-medium">{item.name}</span>
            {item.path && (
              <span className="text-gray-400 text-xs">({item.path})</span>
            )}
            {apiCount > 0 && (
              <Tag color="blue" className="ml-1">{apiCount} API</Tag>
            )}
          </div>
        ),
        key: item.id,
        children: item.children ? convertMenuToTreeData(item.children) : [],
      };
    });
  };

  // 查找菜单项
  const findMenuItem = (items: MenuItem[], id: string): MenuItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findMenuItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const groupedApiOptions = apiEndpoints.reduce((acc, endpoint) => {
    const group = endpoint.ApiGroup || '其他';
    if (!acc[group]) acc[group] = [];
    acc[group].push(endpoint);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">菜单管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          添加菜单
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧树形菜单 */}
        <div className="col-span-5 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">菜单结构</h2>
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                if (expandedKeys.length > 0) {
                  setExpandedKeys([]);
                } else {
                  const allKeys: string[] = [];
                  const collectKeys = (items: MenuItem[]) => {
                    items.forEach(item => {
                      allKeys.push(item.id);
                      if (item.children) collectKeys(item.children);
                    });
                  };
                  collectKeys(data);
                  setExpandedKeys(allKeys);
                }
              }}
            >
              {expandedKeys.length > 0 ? '全部收起' : '全部展开'}
            </Button>
          </div>
          {data.length > 0 ? (
            <Tree
              treeData={convertMenuToTreeData(data)}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  const menuItem = findMenuItem(data, selectedKeys[0] as string);
                  if (menuItem) {
                    // 根据 api_endpoint_ids 填充完整的 api_endpoints 数据
                    if (menuItem.api_endpoint_ids && menuItem.api_endpoint_ids.length > 0) {
                      const fullEndpoints = menuItem.api_endpoint_ids
                        .map(id => apiEndpoints.find(ep => ep.id === id))
                        .filter((ep): ep is ApiEndpoint => ep !== undefined);
                      setSelectedNode({
                        ...menuItem,
                        api_endpoints: fullEndpoints
                      });
                    } else {
                      setSelectedNode(menuItem);
                    }
                  }
                } else {
                  setSelectedNode(null);
                }
              }}
              showLine={{ showLeafIcon: false }}
              defaultExpandAll={false}
              style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
            />
          ) : (
            <Empty 
              description="暂无菜单数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>

        {/* 右侧详情面板 */}
        <div className="col-span-7 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {selectedNode ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {selectedNode.children && selectedNode.children.length > 0 ? 
                      <FolderOutlined style={{ color: '#faad14' }} /> : 
                      <FileOutlined style={{ color: '#1890ff' }} />
                    }
                    {selectedNode.name}
                  </h2>
                  {selectedNode.path && (
                    <p className="text-gray-500 mt-1">路径: {selectedNode.path}</p>
                  )}
                </div>
                <Space>
                  <Button 
                    type="primary"
                    icon={<EditOutlined />} 
                    onClick={() => handleEdit(selectedNode)}
                  >
                    编辑
                  </Button>
                  <Button 
                    danger
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDelete(selectedNode.id)}
                  >
                    删除
                  </Button>
                </Space>
              </div>

              {/* API端点列表 */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  关联的API端点 ({selectedNode.api_endpoints?.length || 0})
                </h3>
                {selectedNode.api_endpoints && selectedNode.api_endpoints.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNode.api_endpoints.map((api, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <Tag 
                          color={
                            api.Method === 'GET' ? 'green' :
                            api.Method === 'POST' ? 'blue' :
                            api.Method === 'PUT' ? 'orange' :
                            api.Method === 'DELETE' ? 'red' :
                            'default'
                          }
                          className="font-mono"
                        >
                          {api.Method}
                        </Tag>
                        <code className="flex-1 text-sm bg-white px-2 py-1 rounded border border-gray-200">
                          {api.Path}
                        </code>
                        {api.Description && (
                          <span className="text-gray-500 text-sm">{api.Description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty 
                    description="该菜单未关联任何API端点"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>

              {/* 自定义API路径 */}
              {selectedNode.custom_api_paths && selectedNode.custom_api_paths.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-gray-700 mb-3">
                    自定义API路径 ({selectedNode.custom_api_paths.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedNode.custom_api_paths.map((path, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <Tag color="purple">自定义</Tag>
                        <code className="flex-1 text-sm bg-white px-2 py-1 rounded border border-gray-200">
                          {path}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 子菜单信息 */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-base font-semibold text-blue-800 mb-2">
                    子菜单信息
                  </h3>
                  <p className="text-blue-700">
                    该菜单包含 {selectedNode.children.length} 个子菜单项
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Empty 
                description="请从左侧选择一个菜单项以查看详情"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        title={editingId ? '编辑菜单' : '添加菜单'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingId ? '更新' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="输入菜单名称" />
          </Form.Item>

          <Form.Item name="parent_id" label="父级菜单">
            <Select
              placeholder="选择父级菜单"
              allowClear
              options={flattenedMenuOptions
                .filter(option => editingId ? option.value !== editingId : true) // Exclude current item when editing to prevent circular reference
              }
            />
          </Form.Item>

          <Form.Item name="path" label="前端路径">
            <Input placeholder="/user/list" />
          </Form.Item>

          <Form.Item 
            name="api_endpoints_selection" 
            label="关联API端点"
            help="可以选择现有端点或输入自定义路径（支持通配符，如: /qingguan/products/*）"
          >
            <Select
              mode="tags"
              placeholder="选择或输入API端点"
              showSearch
              tokenSeparators={[',']}
              filterOption={(input, option) => {
                const ep = apiEndpoints.find(api => api.id === option?.value);
                if (ep) {
                  return (
                    (ep?.Path?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Description?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.Method?.toLowerCase().includes(input.toLowerCase())) ||
                    (ep?.ApiGroup?.toLowerCase().includes(input.toLowerCase()))
                  );
                }
                // For custom input that's not in the options list
                return true;
              }}
              options={apiEndpoints.map(ep => ({
                label: (
                  <div className="flex items-center">
                    <Tag 
                      color={
                        ep.Method === 'GET' ? 'green' :
                        ep.Method === 'POST' ? 'blue' :
                        ep.Method === 'PUT' ? 'orange' :
                        'red'
                      }
                    >
                      {ep.Method}
                    </Tag>
                    {ep.Path} - {ep.Description}
                  </div>
                ),
                value: ep.id, // Use ID for existing endpoints
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuPage;