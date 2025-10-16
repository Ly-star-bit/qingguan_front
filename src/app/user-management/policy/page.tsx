'use client';
import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Typography, Tag, Row, Col, Popconfirm, Switch, Spin, Tooltip, Segmented } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axiosInstance from '@/utils/axiosInstance';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Policy {
  ptype: 'p' | 'g' | 'g2';  // Casbin策略类型
  sub: string;              // p策略: 主体/用户, g策略: 用户
  obj: string;              // p策略: 资源/对象, g策略: 角色
  act?: string;             // p策略: 行为/动作
  eft?: string;             // p策略: 效果 (allow/deny)
  attrs?: Record<string, any>; // p策略: 属性约束 (如 start, dest, type)
  description?: string;     // 策略描述
}

interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Type: string;
  Description: string;
}

interface User {
  id: string;
  username: string;
  status: number;
  last_login: string | null;
  last_ip: string | null;
}

interface SearchParams {
  ptype: string;
  sub: string;
  obj: string;
  act: string;
  eft: string;
  description: string;
}

// 为表单处理后的值增加类型定义，包含可选的 batchEndpoints 和 attrs
interface FormProcessedValues {
  ptype: 'p' | 'g' | 'g2';
  sub: string;
  obj: string;
  act?: string;
  eft?: string;
  attrs?: Record<string, any>;
  description?: string;
  batchEndpoints?: string[];
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const PolicyPage = () => {
  const [data, setData] = useState<Policy[]>([]);
  const [filteredData, setFilteredData] = useState<Policy[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resources, setResources] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [apiGroups, setApiGroups] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState<'p' | 'g' | 'g2'>('p');
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(20);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]); // 存储所有用户数据
  const [showAllData, setShowAllData] = useState(false); // 控制是否显示所有数据
  const [selectedBatchEndpoints, setSelectedBatchEndpoints] = useState<string[]>([]); // 手动保存选中的接口
  const isEditingG = editingPolicy?.ptype === 'g';
  const isEditingP = editingPolicy?.ptype === 'p';
  const [pCreateMode, setPCreateMode] = useState<'single' | 'batch'>('single');
  const [viewRoleVisible, setViewRoleVisible] = useState(false);
  const [viewRoleName, setViewRoleName] = useState<string>('');
  const [viewRolePolicies, setViewRolePolicies] = useState<Policy[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [viewRoleRowKeys, setViewRoleRowKeys] = useState<string[]>([]);
  const [addEndpointsVisible, setAddEndpointsVisible] = useState(false);
  const [addTableSelectedKeys, setAddTableSelectedKeys] = useState<string[]>([]);
  const [addFilterGroup, setAddFilterGroup] = useState<string | undefined>(undefined);
  const [addFilterMethods, setAddFilterMethods] = useState<string[]>(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD']);
  const [viewRoleSearch, setViewRoleSearch] = useState<string>('');
  const [roleEndpoints, setRoleEndpoints] = useState<string[]>([]);
  const [policyTypeFilter, setPolicyTypeFilter] = useState<'all' | 'p' | 'g'>('all');
  const filteredAddEndpoints = useMemo(() => {
    const currentSet = new Set(roleEndpoints);
    const methodsSet = new Set(addFilterMethods);
    return apiEndpoints
      .filter(api => !currentSet.has(api.Path))
      .filter(api => !addFilterGroup || api.ApiGroup === addFilterGroup)
      .filter(api => methodsSet.has(api.Method));
  }, [apiEndpoints, roleEndpoints, addFilterGroup, addFilterMethods]);

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '未登录';
    return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss');
  };

  const fetchPolicies = async (policyType: 'all' | 'p' | 'g' = policyTypeFilter) => {
    try {
      const params: any = {};
      if (policyType !== 'all') {
        params.policy_type = policyType;
      }
      const response = await axiosInstance.get(`${server_url}/casbin/policies`, { params });
      const { p_policies, g_policies } = response.data;
      
      // 合并p策略和g策略
      const policies: Policy[] = [
        ...(p_policies || []).map((p: any) => ({
          ptype: 'p',
          sub: p.sub,
          obj: p.obj,
          act: p.act,
          eft: p.eft || 'allow',
          attrs: p.attrs || {},
          description: p.description || '',
        })),
        ...(g_policies || []).map((g: any) => ({
          ptype: 'g',
          sub: g.user,
          obj: g.role,
          description: g.description || '',
        }))
      ];

      // 去重（避免切换筛选后出现重复）
      const keyOf = (r: Policy) => `${r.ptype}-${r.sub}-${r.obj}-${r.act || ''}`;
      const uniquePolicies = Array.from(new Map(policies.map(p => [keyOf(p), p])).values());

      // 本地再次按类型收敛，避免后端返回包含其他类型导致穿透
      const finalPolicies = policyType === 'all' 
        ? uniquePolicies 
        : uniquePolicies.filter(p => p.ptype === policyType);

      setData(finalPolicies);
      setFilteredData(finalPolicies);
      
      // 提取唯一的主体、资源和行为
      const uniqueSubjects = Array.from(new Set([
        ...((p_policies || []).map((p: any) => p.sub)),
        ...((g_policies || []).map((g: any) => g.user))
      ])).sort() as string[];

      const uniqueResources = Array.from(new Set([
        ...((p_policies || []).map((p: any) => p.obj)),
        ...((g_policies || []).map((g: any) => g.role))
      ])).sort() as string[];

      const uniqueActions = Array.from(new Set(
        (p_policies || []).map((p: any) => p.act)
      )).sort() as string[];
      
      setSubjects(uniqueSubjects);
      setResources(uniqueResources);
      setActions(uniqueActions);
    } catch (error) {
      message.error('获取策略数据失败');
    }
  };

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
      
      // 更新资源列表，包含API端点的路径
      const apiPaths = allEndpoints.map(api => api.Path);
      setResources(prev => Array.from(new Set([...prev, ...apiPaths])));
      
      // 更新行为列表，包含API端点的方法
      const apiMethods = Array.from(new Set(allEndpoints.map(api => api.Method)));
      setActions(prev => Array.from(new Set([...prev, ...apiMethods])));
      
    } catch (error) {
      message.error('获取API端点数据失败');
    }
  };

  // 获取已有角色列表（来自分组策略g）
  const fetchGroups = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/casbin/policies/groups`);
      const groups: string[] = Array.from(new Set(
        (response.data || []).map((g: any[]) => g[1]).filter((v: any) => typeof v === 'string')
      ));
      setRoles(groups);
    } catch (error) {
      message.error('获取角色列表失败');
    }
  };

  const fetchUsers = async (page = 1, pageSize = 20, fetchAll = true) => {
    try {
      setIsLoadingUsers(true);
      const response = await axiosInstance.get(`${server_url}/users/`, {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          all_data: fetchAll
        }
      });
      
      const userData = response.data.users;
      if (fetchAll) {
        setAllUsers(userData);
        setUsers(userData); // 当获取所有数据时，也更新当前显示的用户列表
      } else {
        setUsers(userData);
      }
      setUserTotal(response.data.total);
      
      // 更新主体列表，包含用户名
      const usernames = userData.map((user: User) => user.username);
      setSubjects(prev => Array.from(new Set([...prev, ...usernames])));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 获取角色的所有权限策略
  const fetchRolePolicies = async (role: string) => {
    try {
      const response = await axiosInstance.get(`${server_url}/casbin/policies/get_role_policies`, {
        params: { role }
      });
      // 确保返回的数据包含 attrs 字段
      return (response.data || []).map((p: any) => ({
        ...p,
        attrs: p.attrs || {}
      }));
    } catch (error) {
      message.error('获取角色权限策略失败');
      return [];
    }
  };

  const handleViewRole = async (role: string) => {
    const policies = await fetchRolePolicies(role) as Policy[];
    setViewRoleName(role);
    setViewRolePolicies(policies);
    const eps = Array.from(
      new Set<string>(
        policies
          .map((p: Policy) => p.obj)
          .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
      )
    );
    setRoleEndpoints(eps);
    setViewRoleRowKeys([]);
    setViewRoleSearch('');
    setAddTableSelectedKeys([]);
    setAddFilterGroup(undefined);
    setAddFilterMethods(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD']);
    setViewRoleVisible(true);
  };

  // 将角色接口策略持久化到后端
  const persistRolePolicies = async (policies: Policy[]) => {
    if (!viewRoleName) return;
    try {
      setIsUpdatingRole(true);
      const payload = {
        user: '',
        group: viewRoleName,
        description: '',
        policies: policies.map(p => ({
          ptype: 'p',
          sub: viewRoleName,
          obj: p.obj,
          act: p.act,
          attrs: p.attrs || {},
          eft: p.eft || 'allow',
          description: p.description || ''
        }))
      };
      await axiosInstance.put(`${server_url}/casbin/policies/groups`, payload);
      message.success('角色接口权限更新成功');
      const refreshed = await fetchRolePolicies(viewRoleName);
      setViewRolePolicies(refreshed);
      setRoleEndpoints(Array.from(new Set(refreshed.map((p: Policy) => p.obj).filter(Boolean))));
      fetchPolicies(policyTypeFilter);
    } catch (e) {
      message.error('更新角色接口权限失败');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleSaveRoleEndpoints = async () => {
    if (!viewRoleName) return;
    try {
      setIsUpdatingRole(true);
      const policiesPayload = roleEndpoints.map((endpointPath) => {
        const apiEndpoint = apiEndpoints.find(api => api.Path === endpointPath);
        return {
          ptype: 'p',
          sub: viewRoleName,
          obj: endpointPath,
          act: apiEndpoint?.Method || 'GET',
          attrs: {},
          eft: 'allow',
          description: apiEndpoint?.Description || ''
        };
      });

      const payload = {
        user: '',
        group: viewRoleName,
        description: '',
        policies: policiesPayload,
      };

      await axiosInstance.put(`${server_url}/casbin/policies/groups`, payload);
      message.success('角色接口权限更新成功');
      // 刷新展示数据
      const refreshed = await fetchRolePolicies(viewRoleName);
      setViewRolePolicies(refreshed);
      fetchPolicies();
      setViewRoleVisible(false);
    } catch (error) {
      message.error('更新角色接口权限失败');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // 初始加载时获取所有用户数据
  useEffect(() => {
    fetchPolicies('all');
    fetchApiEndpoints();
    fetchUsers(1, 20, true); // 获取所有用户数据
    fetchGroups();
  }, []);

  // 分页变化时只更新显示的数据
  useEffect(() => {
    if (!showAllData) {
      const start = (userPage - 1) * userPageSize;
      const end = start + userPageSize;
      setUsers(allUsers.slice(start, end));
    }
  }, [userPage, userPageSize, showAllData, allUsers]);

  useEffect(() => {
    // 切换筛选时清理搜索中的ptype，避免冲突
    try { searchForm.setFieldsValue({ ptype: undefined }); } catch {}
    fetchPolicies(policyTypeFilter);
  }, [policyTypeFilter]);

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ 
      ptype: 'p',
      batchEndpoints: [] // 设置默认值
    }); // 设置默认策略类型
    setSelectedPolicyType('p');
    setSelectedBatchEndpoints([]); // 重置选中的接口
    setPCreateMode('single');
    setEditingPolicy(null);
    setIsModalVisible(true);
    // 获取管理员的资源和行为作为参考
    // fetchUserResourcesAndActions("admin"); // This line is removed
  };

  const handleEdit = (record: Policy) => {
    const loadRolePolicies = async () => {
      if (record.ptype === 'g') {
        // 如果是编辑角色，获取该角色的所有权限策略
        const rolePolicies = await fetchRolePolicies(record.obj);
        console.log('[handleEdit] 获取到的角色策略:', rolePolicies);
        // 提取所有的接口路径
        const endpoints = rolePolicies.map((p: Policy) => p.obj);
        console.log('[handleEdit] 提取的接口路径:', endpoints);

        // 先设置基本字段
        form.setFieldsValue({
          ...record,
        });

        // 等待一下确保表单已经渲染
        setTimeout(() => {
          // 再设置 batchEndpoints
          form.setFieldsValue({
            batchEndpoints: endpoints
          });
          setSelectedBatchEndpoints(endpoints);
          console.log('[handleEdit] 设置后的表单值:', form.getFieldsValue());
        }, 100);

      } else {
        form.setFieldsValue({
          ...record,
          batchEndpoints: []
        });
        setSelectedBatchEndpoints([]);
      }
    };

    loadRolePolicies();
    setSelectedPolicyType(record.ptype);
    setEditingPolicy(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Policy) => {
    try {
      if (record.ptype === 'g') {
        // 删除g策略
        await axiosInstance.delete(`${server_url}/casbin/policies/groups`, { 
          data: {
            user: record.sub,
            group: record.obj,
            description: record.description
          }
        });
        message.success('用户角色关系删除成功');
        fetchGroups();
      } else {
        // 删除p策略
        await axiosInstance.delete(`${server_url}/casbin/policies`, { 
          data: {
            sub: record.sub,
            obj: record.obj,
            act: record.act,
            attrs: record.attrs || {},
            eft: record.eft,
            description: record.description
          }
        });
        message.success('访问策略删除成功');
      }
      fetchPolicies();
    } catch (error) {
      message.error('策略删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const rawValues = await form.validateFields() as Partial<FormProcessedValues>;
      
      // 处理数组值（因为使用了mode="tags"）
      const processedValues: FormProcessedValues = {
        ...(rawValues as FormProcessedValues),
        sub: Array.isArray(rawValues.sub) ? rawValues.sub[0] as string : (rawValues.sub as string),
        obj: Array.isArray(rawValues.obj) ? rawValues.obj[0] as string : (rawValues.obj as string)
      };

      // 显式读取表单中的所有值与 batchEndpoints，避免因条件渲染或校验过滤导致的缺失
      const allFormValues = form.getFieldsValue()


      if (editingPolicy) {
        // 更新策略
        if (editingPolicy.ptype === 'g') {
          // 仅更新g策略的继承关系（先删除旧关系，再创建新关系），不修改任何接口策略
          await axiosInstance.delete(`${server_url}/casbin/policies/groups`, { 
            data: {
              user: editingPolicy.sub,
              group: editingPolicy.obj,
              description: editingPolicy.description
            }
          });
          const gPolicyNew = {
            ptype: 'g',
            user: processedValues.sub,
            group: processedValues.obj,
            description: processedValues.description || `用户 ${processedValues.sub} 具有 ${processedValues.obj} 角色`
          };
          await axiosInstance.post(`${server_url}/casbin/policies/groups`, gPolicyNew);
          message.success('用户角色关系更新成功');
          fetchGroups();
        } else {
          // 更新p策略
          const updateData = [{
            old_ptype: 'p',
            old_sub: editingPolicy.sub,
            old_obj: editingPolicy.obj,
            old_act: editingPolicy.act,
            old_attrs: editingPolicy.attrs || {},
            old_eft: editingPolicy.eft,
            old_description: editingPolicy.description,
            new_ptype: 'p',
            new_sub: processedValues.sub,
            new_obj: processedValues.obj,
            new_act: processedValues.act,
            new_attrs: processedValues.attrs || {},
            new_eft: processedValues.eft,
            new_description: processedValues.description,
          }];
          await axiosInstance.put(`${server_url}/casbin/policies`, updateData);
          message.success('访问策略更新成功');
        }
      } else {
        // 创建新策略
        if (processedValues.ptype === 'g' ) {
          // 仅创建g策略（用户-角色关系），不创建任何p策略
          try {
            const gPolicy = {
              ptype: 'g',
              user: processedValues.sub,
              group: processedValues.obj,
              description: processedValues.description || `用户 ${processedValues.sub} 具有 ${processedValues.obj} 角色`
            };
            await axiosInstance.post(`${server_url}/casbin/policies/groups`, gPolicy);
            message.success('角色关系创建成功');
            fetchGroups();
          } catch (error) {
            message.error('创建角色关系失败');
            console.log(error);
            return; 
          }
        } else {
          // p策略创建：支持批量和单个
          const batchEndpoints: string[] = selectedBatchEndpoints || [];

          if (batchEndpoints.length > 0) {
            let successCount = 0;
            for (const endpointPath of batchEndpoints) {
              const apiEndpoint = apiEndpoints.find(api => api.Path === endpointPath);
              if (apiEndpoint) {
                try {
                  const pPolicy = {
                    ptype: 'p',
                    sub: processedValues.sub,
                    obj: endpointPath,
                    act: apiEndpoint.Method,
                    attrs: processedValues.attrs || {},
                    eft: processedValues.eft || 'allow',
                    description: processedValues.description || `${processedValues.sub} - ${apiEndpoint.Description || endpointPath}`
                  };
                  await axiosInstance.post(`${server_url}/casbin/policies`, pPolicy);
                  successCount++;
                } catch (error) {
                  console.warn('策略可能已存在:', endpointPath);
                }
              }
            }
            message.success(`成功批量创建 ${successCount} 个访问策略`);
                     } else {
             // 单个创建（支持通配符）
             await axiosInstance.post(`${server_url}/casbin/policies`, {
               ...processedValues,
               obj: Array.isArray(processedValues.obj) ? processedValues.obj[0] : processedValues.obj,
               act: Array.isArray(processedValues.act) ? processedValues.act[0] : processedValues.act,
               attrs: processedValues.attrs || {},
             });
             message.success('策略创建成功');
           }
        }
      }
      setIsModalVisible(false);
      fetchPolicies();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue() as SearchParams;
    const filtered = data.filter(item => {
      const matchPtype = !values.ptype || item.ptype === values.ptype;
      const matchSub = !values.sub || item.sub.toLowerCase().includes(values.sub.toLowerCase());
      const matchObj = !values.obj || item.obj?.toLowerCase().includes(values.obj.toLowerCase());
      const matchAct = !values.act || item.act?.toLowerCase().includes(values.act.toLowerCase());
      const matchEft = !values.eft || item.eft === values.eft;
      const matchDescription = !values.description || item.description?.toLowerCase().includes(values.description.toLowerCase());
      return matchPtype && matchSub && matchObj && matchAct && matchEft && matchDescription;
    });
    setFilteredData(filtered);
  };

  const resetSearch = () => {
    searchForm.resetFields();
    setFilteredData(data);
  };

  const handleReloadPolicies = async () => {
    try {
      await axiosInstance.post(`${server_url}/casbin/policies/reload`);
      message.success('策略重新加载成功');
      fetchPolicies(policyTypeFilter); // 重新获取策略列表（保持当前筛选）
    } catch (error) {
      message.error('策略重新加载失败');
    }
  };

    const columns: ColumnsType<Policy> = [
    {
      title: '策略类型',
      dataIndex: 'ptype',
      key: 'ptype',
      width: 90,
      render: (ptype) => (
        <Tag color={ptype === 'p' ? 'blue' : 'green'}>
          {ptype}
        </Tag>
      ),
    },
          {
      title: '主体/用户/角色',
      dataIndex: 'sub',
      key: 'sub',
      // width: 120,
      ellipsis: false,
      render: (text, record) => (
        <Tooltip title={text}>
          <Tag color={record.ptype === 'p' ? 'blue' : 'purple'} style={{ whiteSpace: 'normal', height: 'auto' }}>
            {text}
          </Tag>
        </Tooltip>
      ),
    },
          {
      title: '资源/API',
      dataIndex: 'obj',
      key: 'obj',
      ellipsis: false,
      render: (text, record) => {
        if (record.ptype === 'p') {
          // 查找对应的API端点
          const apiEndpoint = apiEndpoints.find(api => api.Path === text);
          if (apiEndpoint) {
            return (
              <Tooltip title={`${apiEndpoint.Method} ${text}${apiEndpoint.Description ? `\n${apiEndpoint.Description}` : ''}`}>
                <div className="flex items-center gap-1 truncate">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-sm truncate">{text}</code>
                </div>
              </Tooltip>
            );
          } else {
            return (
              <Tooltip title={text}>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-sm truncate block">{text}</code>
              </Tooltip>
            );
          }
        } else {
          // g策略显示角色信息（可点击查看接口权限）
          const isApiGroup = apiGroups.includes(text);
          return (
            <Tooltip title={`点击查看角色 ${text} 的接口权限`}>
              <div className="flex items-center gap-1 truncate">
                <Button type="link" size="small" className="px-0" onClick={() => handleViewRole(text)}>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-sm truncate">{text}</code>
                </Button>
                {isApiGroup && <span className="text-gray-500 text-xs whitespace-nowrap">(API组)</span>}
              </div>
            </Tooltip>
          );
        }
      },
    },
    {
      title: '行为/动作',
      dataIndex: 'act',
      key: 'act',
      width: 100,
      render: (text, record) => (
        record.ptype === 'p' ? (
          <Tag color="processing">
            {text}
          </Tag>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      title: '效果',
      dataIndex: 'eft',
      key: 'eft',
      width: 80,
      render: (eft, record) => (
        record.ptype === 'p' ? (
          eft === 'allow' ? 
            <Tag color="success" icon={<CheckCircleOutlined />}>允许</Tag> : 
            <Tag color="error" icon={<CloseCircleOutlined />}>拒绝</Tag>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      title: '属性约束',
      dataIndex: 'attrs',
      key: 'attrs',
      width: 160,
      ellipsis: true,
      render: (attrs, record) => (
        record.ptype === 'p' && attrs && Object.keys(attrs).length > 0 ? (
          <Tooltip title={JSON.stringify(attrs, null, 2)}>
            <div className="flex flex-wrap gap-1">
              {Object.entries(attrs).map(([key, value]) => (
                <Tag key={key} color="cyan" className="text-xs">
                  {key}: {String(value)}
                </Tag>
              ))}
            </div>
          </Tooltip>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description) => (
        <Tooltip title={description || '无描述'}>
          <span className="text-gray-600 truncate block">{description || '无描述'}</span>
        </Tooltip>
      ),
    },
    {
      title: '域',
      dataIndex: 'domain',
      key: 'domain',
      width: 100,
      render: (domain) => (
        <Tooltip title={domain || '默认'}>
          <Tag className="truncate block" style={{ maxWidth: '100%' }}>{domain || '默认'}</Tag>
        </Tooltip>
      ),
    },
          {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} className="flex flex-nowrap">
          
          <Tooltip title="编辑">
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="px-2"
            />
          </Tooltip>
          <Popconfirm
            title="确定删除这个策略吗？"
            description="此操作无法撤销"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
                className="px-2"
              />
            </Tooltip>
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
              <Title level={3} style={{ margin: 0 }}>策略管理</Title>
            </Col>
            <Col>
              <Space>
                <Segmented
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '仅 p', value: 'p' },
                    { label: '仅 g', value: 'g' },
                  ]}
                  value={policyTypeFilter}
                  onChange={(val) => setPolicyTypeFilter(val as 'all' | 'p' | 'g')}
                />
                <Tooltip title="重新加载策略">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReloadPolicies}
                  />
                </Tooltip>
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
                  添加策略
                </Button>
              </Space>
            </Col>
          </Row>

          {showAdvancedSearch && (
            <Card className="mb-4" bodyStyle={{ padding: '20px' }}>
              <Form
                form={searchForm}
                layout="vertical"
                onFinish={handleSearch}
              >
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Form.Item name="ptype" label="策略类型">
                      <Select allowClear placeholder="请选择策略类型" size="large">
                        <Select.Option value="p">p策略 (基本策略)</Select.Option>
                        <Select.Option value="g">g策略 (分组策略)</Select.Option>
                        <Select.Option value="g2">g2策略 (分组策略)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="sub" label="主体/用户">
                      <Select 
                        allowClear 
                        placeholder="请选择或输入主体/用户"
                        showSearch
                        size="large"
                        filterOption={(input, option) => {
                          if (!option) return false;
                          const label = option.children?.toString().toLowerCase() || '';
                          const value = option.value?.toString().toLowerCase() || '';
                          return label.includes(input.toLowerCase()) || value.includes(input.toLowerCase());
                        }}
                      >
                        <Select.OptGroup label="系统用户">
                          {users.map(user => (
                            <Select.Option key={user.id} value={user.username}>
                              <div className="flex items-center gap-2">
                                <Tag color={user.status === 1 ? 'green' : 'red'}>
                                  {user.username}
                                </Tag>
                              </div>
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                        <Select.OptGroup label="其他主体">
                          {subjects.filter(subject => !users.some(user => user.username === subject)).map(subject => (
                            <Select.Option key={subject} value={subject}>
                              {subject}
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="obj" label="资源/对象">
                      <Select 
                        allowClear 
                        placeholder="请选择或输入资源/对象"
                        showSearch
                        size="large"
                        optionFilterProp="children"
                        filterOption={(input, option) => {
                          const label = option?.children?.toString().toLowerCase() || '';
                          const value = option?.value?.toString().toLowerCase() || '';
                          return label.includes(input.toLowerCase()) || value.includes(input.toLowerCase());
                        }}
                      >
                        <Select.OptGroup label="API端点">
                          {apiEndpoints.map(api => (
                            <Select.Option key={api.id} value={api.Path}>
                              <div className="flex items-center gap-1">
                                <Tag color="blue">{api.Method}</Tag>
                                <span className="text-sm">{api.Path}</span>
                              </div>
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                        <Select.OptGroup label="角色（已有）">
                          {roles.map(role => (
                            <Select.Option key={role} value={role}>
                              <Tag color="purple">{role}</Tag>
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                        <Select.OptGroup label="API组">
                          {apiGroups.map(group => (
                            <Select.Option key={group} value={group}>
                              <Tag color="green">{group}</Tag>
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="act" label="行为/动作">
                      <Select allowClear placeholder="请选择行为/动作" size="large">
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].map(method => (
                          <Select.Option key={method} value={method}>
                            <Tag color={
                              method === 'GET' ? 'green' :
                              method === 'POST' ? 'blue' :
                              method === 'PUT' ? 'orange' :
                              method === 'DELETE' ? 'red' : 'default'
                            }>
                              {method}
                            </Tag>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="eft" label="效果">
                      <Select allowClear placeholder="请选择效果" size="large">
                        <Select.Option value="allow">
                          <Tag color="success" icon={<CheckCircleOutlined />}>允许</Tag>
                        </Select.Option>
                        <Select.Option value="deny">
                          <Tag color="error" icon={<CloseCircleOutlined />}>拒绝</Tag>
                        </Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="description" label="描述">
                      <Input placeholder="请输入描述关键词" allowClear size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item>
                      <Space size="middle">
                        <Button onClick={resetSearch} size="large">
                          重置
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} size="large">
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
          dataSource={filteredData}
          rowKey={(record) => `${record.ptype}-${record.sub}-${record.obj}-${record.act}`}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条策略`,
          }}
          className="shadow-sm"
          scroll={{ x: 1200 }}
          size="middle"
        />

        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              {editingPolicy ? "编辑策略" : "添加策略"}
            </Title>
          }
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            className="mt-4"
            preserve={true} 
            onValuesChange={(changedValues) => {
              if (changedValues.ptype) {
                setSelectedPolicyType(changedValues.ptype);
              }
            }}
          >
            {/* p策略创建方式选择（仅新增p策略时显示） */}
            {selectedPolicyType === 'p' && !editingPolicy && (
              <Form.Item label="创建方式">
                <Space>
                  <Button type={pCreateMode === 'single' ? 'primary' : 'default'} onClick={() => { setPCreateMode('single'); setSelectedBatchEndpoints([]); }}>
                    单条
                  </Button>
                  <Button type={pCreateMode === 'batch' ? 'primary' : 'default'} onClick={() => { setPCreateMode('batch'); form.setFieldsValue({ obj: undefined, act: undefined }); }}>
                    批量
                  </Button>
                </Space>
              </Form.Item>
            )}
            <Form.Item
              name="ptype"
              label="策略类型"
              rules={[{ required: true, message: '请选择策略类型' }]}
            >
              <Select placeholder="请选择策略类型">
                <Select.Option value="p">p策略 (基本策略)</Select.Option>
                <Select.Option value="g">g策略 (分组策略)</Select.Option>
                <Select.Option value="g2">g2策略 (分组策略)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="description"
              label="策略描述"
            >
              <Input.TextArea 
                placeholder="请输入策略描述（选择API端点时会自动填充）"
                rows={2}
                showCount
                maxLength={200}
              />
            </Form.Item>
            <Form.Item
              name="sub"
              label={selectedPolicyType === 'p' ? "主体/用户" : "用户"}
              rules={[{ required: true, message: '请选择主体/用户' }]}
            >
              <Select
                mode="tags"
                showSearch
                allowClear
                placeholder={selectedPolicyType === 'p' ? "选择主体/用户" : "选择用户"}
                filterOption={(input, option) => {
                  if (!option) return false;
                  return (option.value?.toString().toLowerCase().includes(input.toLowerCase()) || false) ||
                         (option.label?.toString().toLowerCase().includes(input.toLowerCase()) || false);
                }}
                loading={isLoadingUsers}
                notFoundContent={isLoadingUsers ? <Spin size="small" /> : null}
                dropdownRender={(menu) => (
                  <div>
                    {isLoadingUsers && (
                      <div style={{ padding: '8px', textAlign: 'center' }}>
                        <Spin size="small" />
                        <span className="text-xs text-gray-500 ml-2">加载中...</span>
                      </div>
                    )}
                    {menu}
                    <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <span className="text-xs text-gray-500">
                            共 {userTotal} 个用户
                          </span>
                        </Col>
                        <Col>
                          <Space>
                            <Switch
                              size="small"
                              checked={showAllData}
                              onChange={(checked) => {
                                setShowAllData(checked);
                                if (checked) {
                                  setUsers(allUsers);
                                } else {
                                  const start = (userPage - 1) * userPageSize;
                                  const end = start + userPageSize;
                                  setUsers(allUsers.slice(start, end));
                                }
                              }}
                              checkedChildren="全部"
                              unCheckedChildren="分页"
                              disabled={isLoadingUsers}
                            />
                            {!showAllData && (
                              <Select
                                size="small"
                                value={userPageSize}
                                onChange={(value) => {
                                  setUserPageSize(value);
                                  setUserPage(1);
                                }}
                                disabled={isLoadingUsers}
                              >
                                <Select.Option value={10}>10条/页</Select.Option>
                                <Select.Option value={20}>20条/页</Select.Option>
                                <Select.Option value={50}>50条/页</Select.Option>
                              </Select>
                            )}
                          </Space>
                        </Col>
                      </Row>
                      {!showAllData && (
                        <Row justify="center" style={{ marginTop: '8px' }}>
                          <Space>
                            <Button
                              size="small"
                              disabled={userPage === 1 || isLoadingUsers}
                              onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            >
                              上一页
                            </Button>
                            <span className="text-xs">
                              第 {userPage} 页
                            </span>
                            <Button
                              size="small"
                              disabled={userPage * userPageSize >= userTotal || isLoadingUsers}
                              onClick={() => setUserPage(p => p + 1)}
                            >
                              下一页
                            </Button>
                          </Space>
                        </Row>
                      )}
                    </div>
                  </div>
                )}
              >
                <Select.OptGroup label="系统用户">
                  {users.map(user => (
                    <Select.Option key={user.id} value={user.username}>
                      <div className="flex justify-between items-center">
                        <span>
                          <Tag color={user.status === 1 ? 'green' : 'red'}>
                            {user.username}
                          </Tag>
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.last_login ? `最后登录: ${formatDateTime(user.last_login)}` : '未登录'}
                          {user.last_ip && ` (${user.last_ip})`}
                        </span>
                      </div>
                    </Select.Option>
                  ))}
                </Select.OptGroup>
                <Select.OptGroup label="其他主体">
                  {subjects.filter(subject => !users.some(user => user.username === subject)).map(subject => (
                    <Select.Option key={subject} value={subject}>
                      {subject}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              </Select>
            </Form.Item>
            <Form.Item
              name="obj"
              label={selectedPolicyType === 'p' ? "资源/对象" : "角色"}
              rules={
                selectedPolicyType === 'p'
                  ? ((isEditingP || pCreateMode === 'single') ? [{ required: true, message: '请选择资源/对象' }] : [])
                  : [{ required: true, message: '请选择角色' }]
              }
            >
                              {selectedPolicyType === 'p' ? (
                 <Select
                   mode="tags"
                   showSearch
                   allowClear
                   placeholder="选择或输入资源路径（支持通配符，如 /api/*）"
                   optionFilterProp="children"
                   filterOption={(input, option) =>
                     (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ||
                     (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                   }
                   onChange={(value) => {
                     const selectedValue = Array.isArray(value) ? (value[value.length - 1] as string) : (value as string);
                     if (selectedValue) {
                       const apiEndpoint = apiEndpoints.find(api => api.Path === selectedValue);
                       if (apiEndpoint) {
                         form.setFieldsValue({
                           description: apiEndpoint.Description,
                           act: apiEndpoint.Method
                         });
                       }
                     }
                   }}
                   disabled={!isEditingP && selectedPolicyType === 'p' && pCreateMode === 'batch'}
                 >
                  <Select.OptGroup label="API端点">
                    {apiEndpoints.map(api => (
                      <Select.Option 
                        key={api.id} 
                        value={api.Path}
                        label={`${api.Method} ${api.Path}`}
                      >
                        <Tag color="blue">{api.Method}</Tag>
                        <code className="text-sm ml-2">{api.Path}</code>
                        <span className="text-xs text-gray-500 ml-2">({api.ApiGroup})</span>
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                  <Select.OptGroup label="其他资源">
                    {resources.filter(resource => !apiEndpoints.some(api => api.Path === resource)).map(resource => (
                      <Select.Option key={resource} value={resource}>
                        {resource}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                </Select>
              ) : (
                <Select
                  showSearch
                  allowClear
                  placeholder="选择角色"
                >
                  <Select.OptGroup label="角色（主体/用户/角色）">
                    {subjects.map(subject => (
                      <Select.Option key={subject} value={subject}>
                        <Tag color="purple">{subject}</Tag>
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                </Select>
              )}
            </Form.Item>
            {selectedPolicyType === 'p' && (
              <>
                                 <Form.Item
                   name="act"
                   label="行为/动作"
                   rules={(isEditingP || pCreateMode === 'single') ? [{ required: true, message: '请选择行为/动作' }] : []}
                 >
                   <Select
                     mode="tags"
                     showSearch
                     allowClear
                     placeholder="选择或输入方法（支持 * 通配）"
                     disabled={!isEditingP && pCreateMode === 'batch'}
                     onFocus={() => {
                       const selectedObj = form.getFieldValue('obj');
                       if (selectedObj) {
                         const relatedMethod = apiEndpoints.find(api => api.Path === (Array.isArray(selectedObj) ? selectedObj[0] : selectedObj))?.Method;
                         if (relatedMethod) {
                           setActions(prev => Array.from(new Set([...prev, relatedMethod])));
                         }
                       }
                     }}
                   >
                     <Select.OptGroup label="HTTP方法">
                       {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', '*'].map(method => (
                         <Select.Option key={method} value={method}>
                           <Tag color={
                             method === 'GET' ? 'green' :
                             method === 'POST' ? 'blue' :
                             method === 'PUT' ? 'orange' :
                             method === 'DELETE' ? 'red' : 'default'
                           }>
                             {method}
                           </Tag>
                         </Select.Option>
                       ))}
                     </Select.OptGroup>
                     <Select.OptGroup label="其他行为">
                       {actions.filter(action => !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', '*'].includes(action)).map(action => (
                         <Select.Option key={action} value={action}>
                           {action}
                         </Select.Option>
                       ))}
                     </Select.OptGroup>
                   </Select>
                 </Form.Item>
                <Form.Item
                  name="eft"
                  label="效果"
                  initialValue="allow"
                  rules={[{ required: true, message: '请选择效果' }]}
                >
                  <Select placeholder="请选择效果">
                    <Select.Option value="allow">允许</Select.Option>
                    <Select.Option value="deny">拒绝</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="attrs"
                  label="属性约束 (JSON)"
                  tooltip="用于基于属性的访问控制，如：起运地(start)、目的地(dest)、类型(type) 等"
                  getValueFromEvent={(e) => {
                    try {
                      const value = e.target.value.trim();
                      if (!value) return {};
                      return JSON.parse(value);
                    } catch {
                      return e.target.value;
                    }
                  }}
                  getValueProps={(value) => {
                    if (typeof value === 'object' && value !== null) {
                      return { value: JSON.stringify(value, null, 2) };
                    }
                    return { value: value || '' };
                  }}
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (!value || value === '') {
                          return Promise.resolve();
                        }
                        try {
                          if (typeof value === 'string') {
                            JSON.parse(value);
                          }
                          return Promise.resolve();
                        } catch (e) {
                          return Promise.reject('请输入有效的 JSON 格式');
                        }
                      }
                    }
                  ]}
                >
                  <Input.TextArea
                    placeholder='例如: {"start": "CN", "dest": "US", "type": "sea"}'
                    rows={3}
                    allowClear
                  />
                </Form.Item>
              </>
            )}
            
            {/* 批量接口选择字段：仅在新增 p 策略并选择“批量”时显示 */}
            <Form.Item
              name="batchEndpoints"
              label="批量选择接口"
              initialValue={[]}
              hidden={!( !isEditingP && selectedPolicyType === 'p' && pCreateMode === 'batch')}
              rules={(!isEditingP && selectedPolicyType === 'p' && pCreateMode === 'batch') ? [
                {
                  validator: async () => {
                    if (selectedBatchEndpoints.length === 0) {
                      return Promise.reject('请至少选择一个接口');
                    }
                    return Promise.resolve();
                  }
                }
              ] : []}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                value={selectedBatchEndpoints}
                placeholder={(!isEditingP && selectedPolicyType === 'p' && pCreateMode === 'batch') ? "选择要批量添加的接口（可多选）" : ""}
                optionFilterProp="children"
                onChange={(value) => {
                  setSelectedBatchEndpoints(value || []);
                }}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ||
                  (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                <Select.OptGroup label="API端点">
                  {apiEndpoints.map(api => (
                    <Select.Option
                      key={api.id}
                      value={api.Path}
                      label={`${api.Method} ${api.Path}`}
                    >
                      <Tag color="blue">{api.Method}</Tag>
                      <code className="text-sm ml-2">{api.Path}</code>
                      <span className="text-xs text-gray-500 ml-2">({api.ApiGroup})</span>
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              </Select>
              {selectedPolicyType === 'p' && pCreateMode === 'batch' && (
                <div className="mt-2 text-xs text-gray-500">
                  提示：选择多个接口后，将为该主体批量创建对应的p策略；若未选择批量接口，则按上方资源/动作单条创建
                </div>
              )}
            </Form.Item>
            {(selectedPolicyType === 'g2') && (
              <Form.Item
                name="domain"
                label="域"
              >
                <Input placeholder="请输入域" />
              </Form.Item>
            )}
          </Form>
        </Modal>

        {/* 查看角色接口 Modal */}
        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              角色接口：{viewRoleName}
            </Title>
          }
          open={viewRoleVisible}
          onOk={handleSaveRoleEndpoints}
          onCancel={() => setViewRoleVisible(false)}
          width={720}
          confirmLoading={isUpdatingRole}
        >
          <div className="mb-3">
            <Row justify="space-between" align="middle" gutter={8}>
              <Col flex="auto">
                <Input
                  allowClear
                  placeholder="搜索方法/路径/描述"
                  value={viewRoleSearch}
                  onChange={(e) => setViewRoleSearch(e.target.value)}
                />
              </Col>
              <Col>
                <Space>
                  <Button onClick={() => setAddEndpointsVisible(true)} type="primary">添加接口</Button>
                  <Button
                    danger
                    disabled={viewRoleRowKeys.length === 0}
                    onClick={async () => {
                      try {
                        setIsUpdatingRole(true);
                        const toDelete = new Set(viewRoleRowKeys as string[]);
                        const selectedPolicies = viewRolePolicies.filter(p => toDelete.has(`${p.obj}::${p.act}`));
                        const results = await Promise.allSettled(
                          selectedPolicies.map(p =>
                            axiosInstance.delete(`${server_url}/casbin/policies`, {
                              data: {
                                sub: viewRoleName,
                                obj: p.obj,
                                act: p.act,
                                attrs: p.attrs || {},
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
                        const refreshed = await fetchRolePolicies(viewRoleName);
                        setViewRolePolicies(refreshed);
                        setRoleEndpoints(Array.from(new Set(refreshed.map((p: Policy) => p.obj).filter(Boolean))));
                        fetchPolicies(policyTypeFilter);
                        setViewRoleRowKeys([]);
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
            dataSource={viewRolePolicies.filter(p => {
              const q = viewRoleSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                (p.obj || '').toLowerCase().includes(q) ||
                (p.act || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
              );
            })}
            rowSelection={{
              selectedRowKeys: viewRoleRowKeys,
              onChange: (keys) => setViewRoleRowKeys(keys as string[]),
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
          title={<Title level={5} style={{ margin: 0 }}>为角色添加接口：{viewRoleName}</Title>}
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
                  sub: viewRoleName,
                  obj: ep,
                  act: api?.Method || 'GET',
                  eft: 'allow',
                  description: api?.Description || ''
                };
              });
              setViewRolePolicies(prev => [...prev, ...additions]);
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

export default PolicyPage;
