"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Typography, Tag, Row, Col, Popconfirm, Switch, Spin, Tooltip, Segmented, Tree } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Role {
  id: string;
  role_name: string;
  description?: string;
  permissions?: string[];
  status: number;
  created_at: string;
  updated_at: string;
}

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Type: string;
  Description: string;
}

interface Policy {
  ptype: 'p' | 'g' | 'g2';
  sub: string;
  obj: string;
  act?: string;
  eft?: string;
  description?: string;
}

interface MenuItem {
  id: string;
  name: string;
  parent_id?: string;
  path?: string;
  api_endpoint_ids?: string[];
  custom_api_paths?: string[];
  api_endpoints?: ApiEndpoint[];
  children?: MenuItem[];
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const RoleManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [apiGroups, setApiGroups] = useState<string[]>([]);
  // const actionRef = useRef<ActionType>();

  const [roleTotal, setRoleTotal] = useState(0);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(20);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [showAllData, setShowAllData] = useState(false);
  const [searchForm] = Form.useForm();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [roleViewVisible, setRoleViewVisible] = useState(false);
  const [roleViewName, setRoleViewName] = useState<string>('');
  const [roleViewPolicies, setRoleViewPolicies] = useState<Policy[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleViewRowKeys, setRoleViewRowKeys] = useState<string[]>([]);
  const [addEndpointsVisible, setAddEndpointsVisible] = useState(false);
  const [addTableSelectedKeys, setAddTableSelectedKeys] = useState<string[]>([]);
  const [addFilterGroup, setAddFilterGroup] = useState<string | undefined>(undefined);
  const [addFilterMethods, setAddFilterMethods] = useState<string[]>(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD']);
  const [roleViewSearch, setRoleViewSearch] = useState<string>('');
  const [roleEndpoints, setRoleEndpoints] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<string[]>([]);
  const actionRef = useRef<any>();
  
  const filteredAddEndpoints = useMemo(() => {
    const currentSet = new Set(roleEndpoints);
    const methodsSet = new Set(addFilterMethods);
    return apiEndpoints
      .filter(api => !currentSet.has(api.Path))
      .filter(api => !addFilterGroup || api.ApiGroup === addFilterGroup)
      .filter(api => methodsSet.has(api.Method));
  }, [apiEndpoints, roleEndpoints, addFilterGroup, addFilterMethods]);

  const fetchRoles = async (page = 1, pageSize = 20, fetchAll = true) => {
    try {
      setIsLoadingRoles(true);
      const response = await axiosInstance.get(`${server_url}/roles/`, {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          all_data: fetchAll
        }
      });
      
      const roleData = response.data.roles;
      if (fetchAll) {
        setAllRoles(roleData);
        setRoles(roleData); // 当获取所有数据时，也更新当前显示的角色列表
      } else {
        setRoles(roleData);
      }
      setRoleTotal(response.data.total);
      
    } catch (error) {
      message.error('获取角色列表失败');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // 获取API端点数据
  const fetchApiEndpoints = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/api_endpoints`);
      const endpointsData = response.data;
      
      // 将分组数据转换为平面数组
      const allEndpoints: ApiEndpoint[] = [];
      const groups: string[] = [];
      
      Object.entries(endpointsData).forEach(([group, endpoints]) => {
        groups.push(group);
        (endpoints as ApiEndpoint[]).forEach(endpoint => {
          allEndpoints.push(endpoint);
        });
      });
      
      setApiEndpoints(allEndpoints);
      setApiGroups(groups);
    } catch (error) {
      message.error('获取API端点数据失败');
    }
  };

  // 获取菜单数据
  const fetchMenuItems = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      message.error('获取菜单数据失败');
    }
  };

  // 获取角色的所有权限策略
  const fetchRolePolicies = async (role: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/casbin/policies/get_role_policies`, {
        params: { role }
      });
      return response.data;
    } catch (error) {
      message.error('获取角色权限策略失败');
      return [];
    }
  };

  // 查看角色权限
  const handleViewRole = async (role: string) => {
    const allPolicies = await fetchRolePolicies(role) as Policy[];
    // 只显示 eft 为 'allow' 的policy
    const policies = allPolicies.filter((p: Policy) => p.eft === 'allow');
    setRoleViewName(role);
    setRoleViewPolicies(policies);
    const eps = Array.from(
      new Set<string>(
        policies
          .map((p: Policy) => p.obj)
          .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
      )
    );
    setRoleEndpoints(eps);
    setRoleViewRowKeys([]);
    setRoleViewSearch('');
    setAddTableSelectedKeys([]);
    setAddFilterGroup(undefined);
    setAddFilterMethods(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD']);
    setRoleViewVisible(true);
  };



  // 初始加载时获取所有角色数据
  useEffect(() => {
    fetchRoles(1, 20, true); // 获取所有角色数据
    fetchApiEndpoints();
    fetchMenuItems();
  }, []);

  // 分页变化时只更新显示的数据
  useEffect(() => {
    if (!showAllData) {
      const start = (rolePage - 1) * rolePageSize;
      const end = start + rolePageSize;
      setRoles(allRoles.slice(start, end));
    }
  }, [rolePage, rolePageSize, showAllData, allRoles]);

  const handleAdd = () => {
    setEditingRole(null);
    setSelectedMenuKeys([]);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = async (record: Role) => {
    setEditingRole(record);
    form.setFieldsValue({ ...record });
    
    // 直接从 permissions 获取菜单ID
    setSelectedMenuKeys(record.permissions || []);
    
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`${server_url}/roles/${id}`);
      message.success('角色删除成功');
      fetchRoles();
      if (actionRef.current) {
        actionRef.current.reload();
      }
    } catch (error) {
      message.error('角色删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 将选中的菜单ID放入permissions字段
      const payload = {
        ...values,
        permissions: selectedMenuKeys
      };
      
      if (editingRole) {
        await axiosInstance.put(`${server_url}/roles/${editingRole.id}/`, payload);
        message.success('角色更新成功');
      } else {
        await axiosInstance.post(`${server_url}/roles/`, payload);
        message.success('角色创建成功');
      }
      
      // 根据选中的菜单获取对应的API端点，为角色创建/更新policy
      if (values.role_name) {
        try {
          // 收集所有菜单的api_endpoint_ids的辅助函数
          const collectApiEndpointIds = (menuKeys: string[]): Set<string> => {
            const flatMenus: MenuItem[] = [];
            const flattenMenus = (menus: MenuItem[]) => {
              menus.forEach(menu => {
                flatMenus.push(menu);
                if (menu.children && menu.children.length > 0) {
                  flattenMenus(menu.children);
                }
              });
            };
            flattenMenus(menuItems);
            
            const ids = new Set<string>();
            menuKeys.forEach(menuId => {
              const menu = flatMenus.find(m => m.id === menuId);
              if (menu && menu.api_endpoint_ids && menu.api_endpoint_ids.length > 0) {
                menu.api_endpoint_ids.forEach(id => ids.add(id));
              }
            });
            return ids;
          };
          
          // 新选中的菜单对应的端点ID
          const newApiEndpointIds = collectApiEndpointIds(selectedMenuKeys);
          const newSelectedEndpoints = apiEndpoints.filter(api => newApiEndpointIds.has(api.id));
          
          // 获取已存在的策略（如果是编辑模式）
          let existingPolicies: Policy[] = [];
          if (editingRole) {
            existingPolicies = await fetchRolePolicies(values.role_name) as Policy[];
          }
          
          const existingPolicyMap = new Map(
            existingPolicies.map(p => [`${p.obj}::${p.act}`, p])
          );
          
          // 收集需要创建的新策略
          const policiesToCreate: any[] = [];
          // 收集需要更新的策略（deny -> allow）
          const policiesToUpdate: any[] = [];
          
          for (const endpoint of newSelectedEndpoints) {
            const key = `${endpoint.Path}::${endpoint.Method}`;
            const existing = existingPolicyMap.get(key);
            
            if (!existing) {
              // 策略不存在，需要创建
              policiesToCreate.push({
                ptype: 'p',
                sub: values.role_name,
                obj: endpoint.Path,
                act: endpoint.Method,
                eft: 'allow',
                description: endpoint.Description || `${values.role_name} - ${endpoint.Path}`
              });
            } else if (existing.eft === 'deny') {
              // 策略存在但是deny，需要更新为allow
              policiesToUpdate.push({
                old_ptype: 'p',
                old_sub: values.role_name,
                old_obj: endpoint.Path,
                old_act: endpoint.Method,
                old_eft: 'deny',
                old_description: existing.description || endpoint.Description || `${values.role_name} - ${endpoint.Path}`,
                new_ptype: 'p',
                new_sub: values.role_name,
                new_obj: endpoint.Path,
                new_act: endpoint.Method,
                new_eft: 'allow',
                new_description: endpoint.Description || `${values.role_name} - ${endpoint.Path}`
              });
            }
          }
          
          // 处理被取消的菜单：将对应的policy设置为deny
          if (editingRole && editingRole.permissions) {
            const oldApiEndpointIds = collectApiEndpointIds(editingRole.permissions);
            const removedEndpointIds = Array.from(oldApiEndpointIds).filter(id => !newApiEndpointIds.has(id));
            const removedEndpoints = apiEndpoints.filter(api => removedEndpointIds.includes(api.id));
            
            for (const endpoint of removedEndpoints) {
              const key = `${endpoint.Path}::${endpoint.Method}`;
              const existing = existingPolicyMap.get(key);
              
              if (existing && existing.eft === 'allow') {
                // 策略存在且是allow，需要更新为deny
                policiesToUpdate.push({
                  old_ptype: 'p',
                  old_sub: values.role_name,
                  old_obj: endpoint.Path,
                  old_act: endpoint.Method,
                  old_eft: 'allow',
                  old_description: existing.description || endpoint.Description || `${values.role_name} - ${endpoint.Path}`,
                  new_ptype: 'p',
                  new_sub: values.role_name,
                  new_obj: endpoint.Path,
                  new_act: endpoint.Method,
                  new_eft: 'deny',
                  new_description: endpoint.Description || `${values.role_name} - ${endpoint.Path}`
                });
              }
            }
          }
          
          // 批量创建新策略
          let createCount = 0;
          if (policiesToCreate.length > 0) {
            for (const policy of policiesToCreate) {
              try {
                await axiosInstance.post(`${server_url}/casbin/policies`, policy);
                createCount++;
              } catch (error) {
                console.warn('创建策略失败:', policy.obj);
              }
            }
          }
          
          // 批量更新策略
          let updateCount = 0;
          if (policiesToUpdate.length > 0) {
            try {
              await axiosInstance.put(`${server_url}/casbin/policies`, policiesToUpdate);
              updateCount = policiesToUpdate.length;
            } catch (error) {
              console.error('批量更新策略失败:', error);
            }
          }
          
          // 显示结果消息
          const messages: string[] = [];
          if (createCount > 0) {
            messages.push(`创建 ${createCount} 个新权限`);
          }
          if (updateCount > 0) {
            messages.push(`更新 ${updateCount} 个权限`);
          }
          if (messages.length > 0) {
            message.success(`已为角色 ${values.role_name} ${messages.join('，')}`);
          }
        } catch (error) {
          console.error('处理接口权限失败:', error);
          message.warning('角色保存成功，但接口权限处理失败');
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setSelectedMenuKeys([]);
      fetchRoles();
      if (actionRef.current) {
        actionRef.current.reload();
      }
    } catch (error) {
      message.error('角色保存失败');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setSelectedMenuKeys([]);
  };

  // 将菜单转换为树形结构数据
  const convertMenuToTreeData = (menus: MenuItem[]): any[] => {
    return menus.map(menu => ({
      title: menu.name,
      key: menu.id,
      children: menu.children && menu.children.length > 0 ? convertMenuToTreeData(menu.children) : []
    }));
  };

  // 将角色接口策略持久化到后端
  const persistRolePolicies = async (policies: Policy[]) => {
    if (!roleViewName) return;
    try {
      setIsUpdatingRole(true);
      const payload = {
        user: '',
        group: roleViewName,
        description: '',
        policies: policies.map(p => ({
          ptype: 'p',
          sub: roleViewName,
          obj: p.obj,
          act: p.act,
          eft: p.eft || 'allow',
          description: p.description || ''
        }))
      };
      await axiosInstance.put(`${server_url}/casbin/policies/groups`, payload);
      message.success('角色接口权限更新成功');
      const allRefreshed = await fetchRolePolicies(roleViewName);
      const refreshed = allRefreshed.filter((p: Policy) => p.eft === 'allow');
      setRoleViewPolicies(refreshed);
      setRoleEndpoints(Array.from(new Set(refreshed.map((p: Policy) => p.obj).filter(Boolean))));
      fetchRoles();
    } catch (e) {
      message.error('更新角色接口权限失败');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleSaveRoleEndpoints = async () => {
    if (!roleViewName) return;
    try {
      setIsUpdatingRole(true);
      const policiesPayload = roleEndpoints.map((endpointPath) => {
        const apiEndpoint = apiEndpoints.find(api => api.Path === endpointPath);
        return {
          ptype: 'p',
          sub: roleViewName,
          obj: endpointPath,
          act: apiEndpoint?.Method || 'GET',
          eft: 'allow',
          description: apiEndpoint?.Description || ''
        };
      });

      const payload = {
        user: '',
        group: roleViewName,
        description: '',
        policies: policiesPayload,
      };

      await axiosInstance.put(`${server_url}/casbin/policies/groups`, payload);
      message.success('角色接口权限更新成功');
      // 刷新展示数据
      const allRefreshed = await fetchRolePolicies(roleViewName);
      const refreshed = allRefreshed.filter((p: Policy) => p.eft === 'allow');
      setRoleViewPolicies(refreshed);
      fetchRoles();
      setRoleViewVisible(false);
    } catch (error) {
      message.error('更新角色接口权限失败');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '角色名称',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (text, record) => (
        <div className="flex items-center gap-1">
          <TeamOutlined className="text-gray-500" />
          <span>{text}</span>
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description) => (
        <Tooltip title={description || '无描述'}>
          <span className="text-gray-600 truncate block">{description || '无描述'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        status === 1 ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>启用</Tag> : 
          <Tag color="error" icon={<CloseCircleOutlined />}>禁用</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => {
        if (text && typeof text === 'string') {
          return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
        return 'N/A';
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => {
        if (text && typeof text === 'string') {
          return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
        return 'N/A';
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleViewRole(record.role_name)}>查看接口</Button>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定删除这个角色吗？"
            description="此操作无法撤销"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <div className="mb-6">
          <Row justify="space-between" align="middle" className="mb-4">
            <Col>
              <Title level={3} style={{ margin: 0 }}>角色管理</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  高级搜索
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  添加角色
                </Button>
              </Space>
            </Col>
          </Row>

          {showAdvancedSearch && (
            <Card className="mb-4" bodyStyle={{ padding: '16px' }}>
              <Form
                form={searchForm}
                layout="horizontal"
                onFinish={() => {}}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="role_name" label="角色名称">
                      <Input placeholder="请输入角色名称" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="status" label="状态">
                      <Select placeholder="请选择状态">
                        <Select.Option value={1}>启用</Select.Option>
                        <Select.Option value={0}>禁用</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="description" label="描述">
                      <Input placeholder="请输入描述关键词" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item wrapperCol={{ offset: 0 }}>
                      <Space>
                        <Button onClick={() => {
                          searchForm.resetFields();
                          fetchRoles(1, 20, true);
                        }}>
                          重置
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                          搜索
                        </Button>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          pagination={{
            current: showAllData ? 1 : rolePage,
            pageSize: showAllData ? roleTotal : rolePageSize,
            total: roleTotal,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条角色`,
            onChange: (page, pageSize) => {
              if (!showAllData) {
                setRolePage(page);
                setRolePageSize(pageSize || 20);
              }
            },
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          className="shadow-sm"
          scroll={{ x: 800 }}
          size="middle"
        />

        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              {editingRole ? "编辑角色" : "添加角色"}
            </Title>
          }
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="role_name"
              label="角色名称"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" />
            </Form.Item>
            <Form.Item
              name="description"
              label="描述"
            >
              <Input.TextArea 
                placeholder="请输入角色描述" 
                rows={3}
              />
            </Form.Item>
            <Form.Item
              label="菜单权限"
              extra="选择该角色可以访问的菜单，系统将自动创建对应的API接口权限"
            >
              <Tree
                checkable
                checkedKeys={selectedMenuKeys}
                onCheck={(checked) => {
                  setSelectedMenuKeys(checked as string[]);
                }}
                treeData={convertMenuToTreeData(menuItems)}
                defaultExpandAll={false}
                showLine
                style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}
              />
            </Form.Item>
            <Form.Item
              name="status"
              label="状态"
              initialValue={1}
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="启用" 
                unCheckedChildren="禁用"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 查看角色接口 Modal */}
        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              角色接口：{roleViewName}
            </Title>
          }
          open={roleViewVisible}
          onOk={handleSaveRoleEndpoints}
          onCancel={() => setRoleViewVisible(false)}
          width={720}
          confirmLoading={isUpdatingRole}
        >
          <div className="mb-3">
            <Row justify="space-between" align="middle" gutter={8}>
              <Col flex="auto">
                <Input
                  allowClear
                  placeholder="搜索方法/路径/描述"
                  value={roleViewSearch}
                  onChange={(e) => setRoleViewSearch(e.target.value)}
                />
              </Col>
              <Col>
                <Space>
                  <Button onClick={() => setAddEndpointsVisible(true)} type="primary">添加接口</Button>
                  <Button
                    danger
                    disabled={roleViewRowKeys.length === 0}
                    onClick={async () => {
                      try {
                        setIsUpdatingRole(true);
                        const toDelete = new Set(roleViewRowKeys as string[]);
                        const selectedPolicies = roleViewPolicies.filter(p => toDelete.has(`${p.obj}::${p.act}`));
                        const results = await Promise.allSettled(
                          selectedPolicies.map(p =>
                            axiosInstance.delete(`${server_url}/casbin/policies`, {
                              data: {
                                sub: roleViewName,
                                obj: p.obj,
                                act: p.act,
                                eft: p.eft || 'allow',
                                description: p.description || ''
                              }
                            })
                          )
                        );
                        const successCount = results.filter(r => r.status === 'fulfilled').length;
                        const failCount = results.length - successCount;
                        if (successCount > 0) message.success(`成功删除 ${successCount} 条接口权限`);
                        if (failCount > 0) message.warning(`${failCount} 条删除失败，请重试`);
                        const allRefreshed = await fetchRolePolicies(roleViewName);
                        const refreshed = allRefreshed.filter((p: Policy) => p.eft === 'allow');
                        setRoleViewPolicies(refreshed);
                        setRoleEndpoints(Array.from(new Set(refreshed.map((p: Policy) => p.obj).filter(Boolean))));
                        fetchRoles();
                        setRoleViewRowKeys([]);
                      } catch (e) {
                        message.error('删除失败');
                      } finally {
                        setIsUpdatingRole(false);
                      }
                    }}
                  >
                    删除所选
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
          <Table
            dataSource={roleViewPolicies.filter(p => {
              const q = roleViewSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                (p.obj || '').toLowerCase().includes(q) ||
                (p.act || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
              );
            })}
            rowSelection={{
              selectedRowKeys: roleViewRowKeys,
              onChange: (keys) => setRoleViewRowKeys(keys as string[]),
              preserveSelectedRowKeys: true
            }}
            rowKey={(r) => `${r.obj}::${r.act}`}
            pagination={false}
            size="small"
            columns={[
              { title: '主体/角色', dataIndex: 'sub', key: 'sub', width: 160, render: (text: string) => <Tag color="purple">{text}</Tag> },
              { title: '方法', dataIndex: 'act', key: 'act', width: 100, render: (text: string) => <Tag color="blue">{text}</Tag> },
              { title: '接口路径', dataIndex: 'obj', key: 'obj', render: (text: string) => <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{text}</code> },
              { title: '描述', dataIndex: 'description', key: 'description', width: 160, ellipsis: true, render: (description: string) => (
  <Tooltip title={description || '无描述'}>
    <span className="text-gray-600 truncate block">{description || '无描述'}</span>
  </Tooltip>
)},
            ]}
          />
        </Modal>

        {/* 添加接口 - 穿梭框 */}
        <Modal
          title={<Title level={5} style={{ margin: 0 }}>为角色添加接口：{roleViewName}</Title>}
          open={addEndpointsVisible}
          onOk={() => {
            const adding = new Set(addTableSelectedKeys);
            const toAdd = Array.from(adding).filter((ep): ep is string => typeof ep === 'string' && !roleEndpoints.includes(ep));
            if (toAdd.length > 0) {
              // 更新 endpoints
              setRoleEndpoints(prev => Array.from(new Set([...prev, ...toAdd])));
              // 同步更新表格展示的 policies
              const additions: Policy[] = toAdd.map(ep => {
                const api = apiEndpoints.find(a => a.Path === ep);
                return {
                  ptype: 'p',
                  sub: roleViewName,
                  obj: ep,
                  act: api?.Method || 'GET',
                  eft: 'allow',
                  description: api?.Description || ''
                };
              });
              setRoleViewPolicies(prev => [...prev, ...additions]);
            }
            setAddTableSelectedKeys([]);
            setAddEndpointsVisible(false);
          }}
          onCancel={() => setAddEndpointsVisible(false)}
          width={800}
        >
          <Row gutter={8} className="mb-3">
            <Col span={8}>
              <Select
                allowClear
                placeholder="按API组过滤"
                value={addFilterGroup}
                onChange={(v) => setAddFilterGroup(v)}
                style={{ width: '100%' }}
              >
                {apiGroups.map(g => (
                  <Select.Option key={g} value={g}>{g}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={16}>
              <Select
                mode="multiple"
                placeholder="过滤HTTP方法"
                value={addFilterMethods}
                onChange={(v) => setAddFilterMethods(v)}
                style={{ width: '100%' }}
              >
                {['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD'].map(m => (
                  <Select.Option key={m} value={m}>{m}</Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Table
            dataSource={filteredAddEndpoints}
            rowKey={(r) => r.Path}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10,20,50,100] }}
            size="small"
            rowSelection={{
              selectedRowKeys: addTableSelectedKeys,
              onChange: (keys) => setAddTableSelectedKeys(keys as string[]),
              getCheckboxProps: (record) => ({ value: record.Path })
            }}
            columns={[
              { title: '方法', dataIndex: 'Method', key: 'method', width: 100, render: (m: string) => <Tag color={m==='GET'?'green':m==='POST'?'blue':m==='PUT'?'orange':m==='DELETE'?'red':'default'}>{m}</Tag> },
              { title: '接口路径', dataIndex: 'Path', key: 'path', render: (t: string) => <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{t}</code> },
              { title: '描述', dataIndex: 'Description', key: 'desc', width: 160, ellipsis: true, render: (description: string) => (
  <Tooltip title={description || '无描述'}>
    <span className="text-gray-600 truncate block">{description || '无描述'}</span>
  </Tooltip>
)},
              { title: '分组', dataIndex: 'ApiGroup', key: 'group', width: 140, render: (g: string) => <Tag color="purple">{g}</Tag> },
            ]}
          />
        </Modal>
      </Card>
    </div>
  );
};

export default RoleManagement;