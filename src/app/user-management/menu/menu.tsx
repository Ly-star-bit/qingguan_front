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
  InputNumber,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import axiosInstance from '@/utils/axiosInstance';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  icon?: string;
  sort_order?: number;
  description?: string;
  children?: MenuItem[];
}

const MenuManagement = () => {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [flattenedMenuOptions, setFlattenedMenuOptions] = useState<{ label: string; value: string }[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const menuResponse = await axiosInstance.get('/menu');
      const menuResult = menuResponse.data;
      setMenuData(menuResult);
    } catch (error) {
      message.error('获取菜单数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    setFlattenedMenuOptions(flattenMenuItems(menuData));
  }, [menuData]);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record: MenuItem) => {
    form.setFieldsValue({
      ...record,
      parent_id: record.parent_id || undefined,
    });
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/menu/${id}`);
      message.success('删除成功');
      fetchMenuData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingId) {
        await axiosInstance.put(`/menu/${editingId}`, values);
      } else {
        await axiosInstance.post('/menu', values);
      }
      setIsModalVisible(false);
      message.success(`${editingId ? '更新' : '添加'}成功`);
      fetchMenuData();
    } catch (error) {
      message.error(`${editingId ? '更新' : '添加'}失败`);
    }
  };

  const flattenMenuItems = (items: MenuItem[]): { label: string; value: string }[] => {
    let result: { label: string; value: string }[] = [];
    
    const traverse = (menuItems: MenuItem[], depth = 0) => {
      menuItems.forEach(item => {
        result.push({
          label: `${'　'.repeat(depth)}${item.name}`,
          value: item.id,
        });
        
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
          </div>
        ),
        key: item.id,
        children: item.children ? convertMenuToTreeData(item.children) : [],
      };
    });
  };

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

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
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
                  collectKeys(menuData);
                  setExpandedKeys(allKeys);
                }
              }}
            >
              {expandedKeys.length > 0 ? '全部收起' : '全部展开'}
            </Button>
          </div>
          {menuData.length > 0 ? (
            <Tree
              treeData={convertMenuToTreeData(menuData)}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  const menuItem = findMenuItem(menuData, selectedKeys[0] as string);
                  setSelectedNode(menuItem);
                } else {
                  setSelectedNode(null);
                }
              }}
              showLine={{ showLeafIcon: false }}
              defaultExpandAll={false}
              style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}
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
                    <Tag color="blue">菜单</Tag>
                  </h2>
                  {selectedNode.path && (
                    <p className="text-gray-500 mt-1">路径: {selectedNode.path}</p>
                  )}
                  {selectedNode.description && (
                    <p className="text-gray-500 mt-1">描述: {selectedNode.description}</p>
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

              {/* 菜单信息 */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">基本信息</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-gray-500 w-24">菜单ID:</span>
                      <span className="text-gray-800">{selectedNode.id}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-500 w-24">菜单名称:</span>
                      <span className="text-gray-800">{selectedNode.name}</span>
                    </div>
                    {selectedNode.path && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">前端路径:</span>
                        <code className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{selectedNode.path}</code>
                      </div>
                    )}
                    {selectedNode.icon && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">图标:</span>
                        <span className="text-gray-800">{selectedNode.icon}</span>
                      </div>
                    )}
                    {selectedNode.sort_order !== undefined && (
                      <div className="flex">
                        <span className="text-gray-500 w-24">排序:</span>
                        <span className="text-gray-800">{selectedNode.sort_order}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 子菜单信息 */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-base font-semibold text-blue-800 mb-2">
                      子菜单信息
                    </h3>
                    <p className="text-blue-700">
                      该菜单包含 {selectedNode.children.length} 个子菜单项
                    </p>
                  </div>
                )}
              </div>
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

      {/* Modal */}
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
              placeholder="选择父级菜单（可选）"
              allowClear
              options={flattenedMenuOptions
                .filter(option => editingId ? option.value !== editingId : true)
              }
            />
          </Form.Item>

          <Form.Item name="path" label="前端路径">
            <Input placeholder="/user/list" />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Input placeholder="UserOutlined" />
          </Form.Item>

          <Form.Item name="sort_order" label="排序">
            <InputNumber placeholder="0" min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="菜单描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuManagement;
