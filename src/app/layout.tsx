'use client';

import React, { ReactNode, useEffect, useState, Suspense } from 'react';
import { ConfigProvider, Dropdown, Menu, Tabs, Spin, Avatar, Button } from 'antd';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from '../store/store';
import '../styles/globals.css';
import { SmileOutlined, HeartOutlined, UploadOutlined, UserOutlined, InfoCircleFilled, QuestionCircleFilled, GithubFilled, TeamOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { PageContainer } from '@ant-design/pro-components';
import  { jwtDecode, JwtPayload } from 'jwt-decode';

import axiosInstance from '@/utils/axiosInstance';
import { setUser as updateUser } from '@/store/userSlice';
import {
  setMenuTree,
  setPermissionItems,
  setApiEndpoints,
  setLoading,
  setInitialized,
  resetMenu,
  type MenuTreeItem,
  type PermissionItem,
  type ApiEndpoint
} from '@/store/menuSlice';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

// MenuTreeItem 现在从 menuSlice 导入

interface DecodedToken {
  exp: number;
  sub: string;
  role: string;
  permissions: [string, string, string, string][];
  menu_ids: string[];
}

// PermissionItem 和 ApiEndpoint 现在从 menuSlice 导入

interface User {
  username: string;
  accessToken: string;
  tokenType: string;
  role: string;
}
const ProLayout = dynamic(
  () => import("@ant-design/pro-layout").then((com) => com.ProLayout),
  { ssr: false }
);



const loadComponent = (path: string) => {
  switch (path) {
    case '/vba/vba-admin':
      return React.lazy(() => import('./vba/vba-admin/page'));
    case '/vba/vba-user':
      return React.lazy(() => import('./vba/vba-user/page'));
    case '/vba/document':
        return React.lazy(() => import('./vba/document/page'));

    case '/vba/lax':
      return React.lazy(() => import('./vba/lax/page'));
    case '/user-management/policy':
        return React.lazy(() => import('./user-management/policy/page'));
    case '/user-management/roles':
        return React.lazy(() => import('./user-management/roles/page'));
    // case '/user-management/user':
    //     return React.lazy(() => import('./user-management/user/page'));
    case '/vba/delivery':
        return React.lazy(() => import('./vba/delivery/page'));
    case '/user-management/users':
        return React.lazy(() => import('./user-management/users/page'));
    case '/business/order':
        return React.lazy(() => import('./business/order/page'));
    case '/business/dadan':
        return React.lazy(() => import('./business/dadan/page'));
    case '/business/fentan':
        return React.lazy(() => import('./business/fentan/page'));
    case '/business/dadan_new':
        return React.lazy(() => import('./business/dadan_new/page'));
    case '/business/fba_box_list':
        return React.lazy(() => import('./business/fba_box_list/page'));
    case '/business/cargo_tracking':
        return React.lazy(() => import('./business/cargo_tracking/page'));
    case '/business/sea_price_card':
        return React.lazy(() => import('./business/sea_price_card/page'));
    case '/business/sku_detail':
        return React.lazy(() => import('./business/sku_detail/page'));
    case '/user-management/menu':
        return React.lazy(() => import('./user-management/menu/page'));
    case '/user-management/api_endpoint':
        return React.lazy(() => import('./user-management/api_endpoint/page'));
    case '/user-management/api_keys':
        return React.lazy(() => import('./user-management/api_keys/page'));

    default:
      return React.lazy(() => import('./page'));
  }
};

const AppContent = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const [user, setUser] = useState<User | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<string>('1');
  const [tabs, setTabs] = useState<{ key: string, title: string, content: ReactNode }[]>([
    { 
      key: '1', 
      title: '首页', 
      content: (
        <PageContainer 
          header={{ 
            title: false,
            breadcrumb: {}
          }}
        >
        </PageContainer>
      ) 
    }
  ]);

  const [cachedComponents, setCachedComponents] = useState<{ [key: string]: ReactNode }>({
    '1': (
        <PageContainer 
            header={{ 
                title: false,
                breadcrumb: {}
            }}
        >
        </PageContainer>
    ),
});

  // 从 Redux store 获取菜单相关状态
  const menuState = useSelector((state: RootState) => state.menu);
  const {
    menuTree,        // 用户有权限的完整菜单树（所有级别）
    permissionItems,
    apiEndpoints,
    isLoading,
    isInitialized
  } = menuState;
  
  // 局部状态：用于侧边栏显示的菜单数据（1-2级）
  const [sidebarMenuData, setSidebarMenuData] = useState<any[]>([]);

  // 获取完整菜单树（所有菜单项）
  const fetchAllMenus = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/menu`);
      return response.data || [];
    } catch (error) {
      console.error('获取菜单失败:', error);
      return [];
    }
  };

  // 获取权限项数据
  const fetchPermissionItems = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/permission_item`);
      dispatch(setPermissionItems(response.data || []));
    } catch (error) {
      console.error('获取权限项失败:', error);
    }
  };

  // 获取API端点数据
  const fetchApiEndpoints = async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/api_endpoints`);
      const endpointsData = response.data;
      const allEndpoints: ApiEndpoint[] = [];
      Object.entries(endpointsData).forEach(([group, endpoints]) => {
        (endpoints as ApiEndpoint[]).forEach(endpoint => {
          allEndpoints.push(endpoint);
        });
      });
      dispatch(setApiEndpoints(allEndpoints));
    } catch (error) {
      console.error('获取API端点失败:', error);
    }
  };

  // 获取用户的角色列表
  const fetchUserRoles = async (username: string): Promise<string[]> => {
    try {
      const g2Response = await axiosInstance.get(`${server_url}/casbin/policies`, {
        params: { policy_type: 'g' }
      });
      const g2Policies = g2Response.data?.g_policies || [];
      const userRoles = g2Policies
        .filter((g: any) => g.user === username)
        .map((g: any) => g.role);
      return userRoles;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      return [];
    }
  };

  // 根据用户权限计算允许访问的菜单ID列表
  const calculateAllowedMenuIds = async (username: string, allMenus: MenuTreeItem[]): Promise<string[]> => {
    try {
      // 特殊处理：admin 用户拥有所有菜单访问权限
      if (username === 'admin') {
        const getAllMenuIds = (items: MenuTreeItem[]): string[] => {
          let ids: string[] = [];
          items.forEach(item => {
            ids.push(item.id);
            if (item.children && item.children.length > 0) {
              ids = ids.concat(getAllMenuIds(item.children));
            }
          });
          return ids;
        };
        return getAllMenuIds(allMenus);
      }

      // 获取用户的直接策略和角色
      const [userPoliciesResponse, userRoles] = await Promise.all([
        axiosInstance.get(`${server_url}/casbin/policies/get_user_policies`, {
          params: { username }
        }),
        fetchUserRoles(username)
      ]);

      const directPolicies = userPoliciesResponse.data || [];
      const allowDirectPolicies = directPolicies.filter((p: any) => p.eft === 'allow');

      // 获取所有角色的策略
      const rolePoliciesPromises = userRoles.map(roleName =>
        axiosInstance.get(`${server_url}/casbin/policies/get_role_policies`, {
          params: { role: roleName }
        })
      );
      const rolePoliciesResponses = await Promise.allSettled(rolePoliciesPromises);
      
      let allRolePolicies: any[] = [];
      rolePoliciesResponses.forEach(result => {
        if (result.status === 'fulfilled') {
          const policies = result.value.data || [];
          allRolePolicies = allRolePolicies.concat(policies.filter((p: any) => p.eft === 'allow'));
        }
      });

      // 合并直接策略和角色策略
      const allPolicies = [...allowDirectPolicies, ...allRolePolicies];

      // 提取父级策略（无 attrs）
      const parentPolicies = allPolicies.filter((p: any) => {
        const attrs = p.attrs || {};
        return Object.keys(attrs).length === 0;
      });

      // 收集所有有权限的权限项ID
      const permissionIdSet = new Set<string>();

      permissionItems.forEach(perm => {
        const apiEndpoint = apiEndpoints.find(api => api.id === perm.code);
        if (!apiEndpoint) return;

        // 检查是否有完全匹配的策略
        const exactMatch = allPolicies.find((p: any) => {
          if (apiEndpoint.Path !== p.obj || apiEndpoint.Method !== p.act) {
            return false;
          }
          const policyAttrs = p.attrs || {};
          const permAttrs = perm.dynamic_params || {};
          return JSON.stringify(policyAttrs) === JSON.stringify(permAttrs);
        });

        if (exactMatch) {
          permissionIdSet.add(perm.id);
          return;
        }

        // 检查是否有父级权限
        const permAttrs = perm.dynamic_params || {};
        if (Object.keys(permAttrs).length > 0) {
          const hasParentPolicy = parentPolicies.some((p: any) =>
            apiEndpoint.Path === p.obj && apiEndpoint.Method === p.act
          );

          if (hasParentPolicy) {
            permissionIdSet.add(perm.id);
          }
        }
      });

      // 从有权限的权限项中提取 menu_ids
      const menuIdSet = new Set<string>();
      permissionItems.forEach(perm => {
        if (permissionIdSet.has(perm.id)) {
          const menuIdList = perm.menu_ids || (perm.menu_id ? [perm.menu_id] : []);
          menuIdList.forEach(menuId => menuIdSet.add(menuId));
        }
      });

      // 添加所有父菜单ID（确保有子菜单权限时，父菜单也显示）
      const addParentMenuIds = (menuId: string) => {
        const findParent = (id: string, items: MenuTreeItem[]): string | null => {
          for (const item of items) {
            if (item.id === id && item.parent_id) {
              return item.parent_id;
            }
            if (item.children) {
              const found = findParent(id, item.children);
              if (found) return found;
            }
          }
          return null;
        };

        let currentId: string | null = menuId;
        while (currentId) {
          const parentId = findParent(currentId, allMenus);
          if (parentId) {
            menuIdSet.add(parentId);
            currentId = parentId;
          } else {
            break;
          }
        }
      };

      Array.from(menuIdSet).forEach(addParentMenuIds);

      return Array.from(menuIdSet);
    } catch (error) {
      console.error('计算允许的菜单ID失败:', error);
      return [];
    }
  };

  // 根据用户权限过滤菜单树（保留所有级别）
  const filterMenuTreeByPermission = (menuItems: MenuTreeItem[], allowedMenuIds: string[]): MenuTreeItem[] => {
    const hasWildcardAccess = allowedMenuIds.includes("*");
    
    const filterItems = (items: MenuTreeItem[]): MenuTreeItem[] => {
      return items
        .filter(item => hasWildcardAccess || allowedMenuIds.includes(item.id))
        .map(item => {
          const filtered: MenuTreeItem = { ...item };
          
          if (item.children && item.children.length > 0) {
            const filteredChildren = filterItems(item.children);
            filtered.children = filteredChildren.length > 0 ? filteredChildren : null;
          }
          
          return filtered;
        });
    };
    
    return filterItems(menuItems);
  };
  
  // 为侧边栏转换菜单树（只显示 1-2 级，3 级作为 tab）
  const convertMenuTreeForSidebar = (menuItems: MenuTreeItem[], depth: number = 0): any[] => {
    return menuItems.map(item => {
      const menuItem: any = {
        path: item.path,
        name: item.name,
        icon: getIconByName(getIconNameByMenuName(item.name)),
      };

      // 只处理到第 2 层
      if (item.children && item.children.length > 0 && depth < 1) {
        const children = convertMenuTreeForSidebar(item.children, depth + 1);
        if (children.length > 0) {
          menuItem.children = children;
        }
      }

      return menuItem;
    });
  };

  // 根据名称获取路径


  // 根据名称获取图标名称（存储到 Redux）
  const getIconNameByMenuName = (name: string): string => {
    const iconMap: { [key: string]: string } = {
      'Section': 'HeartOutlined',
      '用户管理': 'TeamOutlined',
      '文件制作-管理员': 'HeartOutlined',
      '文件制作-用户': 'UploadOutlined',
      // ... 添加其他图标映射
    };
    return iconMap[name] || 'SmileOutlined';
  };

  // 根据图标名称获取 React 元素（渲染时使用）
  const getIconByName = (iconName?: string): React.ReactNode => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'HeartOutlined': <HeartOutlined />,
      'TeamOutlined': <TeamOutlined />,
      'UploadOutlined': <UploadOutlined />,
      'SmileOutlined': <SmileOutlined />,
      // ... 添加其他图标
    };
    return iconMap[iconName || 'SmileOutlined'] || <SmileOutlined />;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && !isInitialized) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        const { accessToken } = parsedUser;
        const decodedToken: DecodedToken = jwtDecode(accessToken);
        
        if (decodedToken.exp * 1000 < Date.now()) {
          localStorage.removeItem('user');
          if (pathname !== '/login') {
            router.push('/login');
          }
        } else {
          dispatch(updateUser(parsedUser.username));
          setUser(parsedUser);
          dispatch(setLoading(true));
          
          // 并行获取所有需要的数据
          Promise.all([
            fetchAllMenus(),
            fetchPermissionItems(),
            fetchApiEndpoints()
          ]).then(([allMenus]) => {
            // allMenus 是完整的菜单树，需要根据用户权限过滤
            // 过滤逻辑在下面的 useEffect 中处理
            dispatch(setInitialized(true));
            dispatch(setLoading(false));
          }).catch(error => {
            console.error('获取初始数据失败:', error);
            dispatch(setLoading(false));
          });
        }
      } catch (error) {
        console.error('Invalid token or user:', error);
        localStorage.removeItem('user');
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    } else if (!storedUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router, isInitialized]);

  // 当所有数据加载完成后，根据用户权限过滤并存储菜单树
  useEffect(() => {
    const buildMenu = async () => {
      if (!isInitialized || !user || permissionItems.length === 0 || apiEndpoints.length === 0) {
        return;
      }
      
      try {
        const decodedToken: DecodedToken = jwtDecode(user.accessToken);
        const username = decodedToken.sub;
        
        // 获取完整菜单树
        const allMenus = await fetchAllMenus();
        
        // 计算允许访问的菜单ID
        const allowedMenuIds = await calculateAllowedMenuIds(username, allMenus);
        
        // 根据权限过滤菜单树（保留所有级别）
        const filteredTree = filterMenuTreeByPermission(allMenus, allowedMenuIds);
        
        // 存储到 Redux（完整的树结构）
        dispatch(setMenuTree(filteredTree));
        
        // 为侧边栏转换（只显示 1-2 级）
        const sidebarMenu = convertMenuTreeForSidebar(filteredTree);
        setSidebarMenuData([
          {
            path: '/',
            name: 'Home',
            icon: getIconByName('SmileOutlined')
          },
          ...sidebarMenu
        ]);
      } catch (error) {
        console.error('构建菜单失败:', error);
      }
    };

    buildMenu();
  }, [isInitialized, user, permissionItems, apiEndpoints]);
  

 
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setTabs([{ 
      key: '1', 
      title: '首页', 
      content: (
          <PageContainer 
              header={{ 
                  title: false,
                  breadcrumb: {}
              }}
          >
          </PageContainer>
      ) 
    }]);
    setActiveTabKey('1');
    setCachedComponents({
      '1': (
          <PageContainer 
              header={{ 
                  title: false,
                  breadcrumb: {}
              }}
          >
          </PageContainer>
      ),
    });
    // 重置菜单状态
    dispatch(resetMenu());
    router.push('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="1">Profile</Menu.Item>
      <Menu.Item key="2" onClick={handleLogout}>Logout</Menu.Item>
    </Menu>
  );

  const addTab = (title: string, path: string) => {
    const existingTab = tabs.find(tab => tab.key === path);
    if (!existingTab) {
        const LazyComponent = loadComponent(path);
        const component = (
            <Suspense fallback={<Spin />}>
                <PageContainer 
                    header={{ 
                        title: false,
                        breadcrumb: {}  // 空对象会隐藏面包屑
                    }}
                >
                    <LazyComponent/>
                </PageContainer>
            </Suspense>
        );
        setCachedComponents({
            ...cachedComponents,
            [path]: component,
        });
        setTabs([...tabs, { key: path, title, content: component }]);
    }
    setActiveTabKey(path);
  };

  const removeTab = (targetKey: string) => {
    const newTabs = tabs.filter(tab => tab.key !== targetKey);
    setTabs(newTabs);
    if (activeTabKey === targetKey && newTabs.length > 0) {
      setActiveTabKey(newTabs[newTabs.length - 1].key);
    } else if (newTabs.length === 0) {
      setActiveTabKey('1');
    }
    
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const refreshTab = (targetKey: string) => {
    // 创建新的组件实例以强制整个Tab刷新
    const LazyComponent = loadComponent(targetKey);
    const component = (
      <Suspense fallback={<Spin />}>
        <PageContainer>
          <LazyComponent key={Date.now()} />
        </PageContainer>
      </Suspense>
    );
    
    // 更新缓存的组件
    setCachedComponents({
      ...cachedComponents,
      [targetKey]: component,
    });
    
    // 更新tabs数组中的对应tab
    setTabs(tabs.map(tab => 
      tab.key === targetKey 
        ? { ...tab, content: component } 
        : tab
    ));
  };

  const menuItemRender = (item: any, dom: any) => (
    <div onClick={() => addTab(item.name, item.path)}>{dom}</div>
  );



  const isLoginPage = pathname === '/login';

  return (
    <html lang="en">
      <body>
        <ConfigProvider>
          <div className="container">
            <header className="header">
              {user ? `Welcome, ${user.username}` : ''}
            </header>
            <main className="main">
              {isLoginPage ? (
                <>{children}</>
              ) : (
                <ProLayout
                  title="管理"
                  layout="mix"
                  location={{
                    pathname: pathname,
                  }}
                  menuItemRender={menuItemRender}
                  menuDataRender={() => sidebarMenuData}
                  avatarProps={{
                    src: "https://avatars1.githubusercontent.com/u/8186664?s=460&v=4",
                    size: "large",
                    icon:  <UserOutlined /> ,
                    render: (avatarProps, defaultDom) => (
                      <Dropdown overlay={userMenu} trigger={['click']}>
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <Avatar
                            size={avatarProps.size}
                            src={avatarProps.src}
                            icon={avatarProps.icon}
                          />
                          {user && (
                            <span style={{ marginLeft: 8 }}>
                              {user.username}
                            </span>
                          )}
                        </div>
                      </Dropdown>
                    ),
                  }}
                  actionsRender={(props) => {
                    if (props.isMobile) return [];
                    return [
                      <InfoCircleFilled key="InfoCircleFilled" />,
                      <QuestionCircleFilled key="QuestionCircleFilled" />,
                      <GithubFilled key="GithubFilled" />,
                    ];
                  }}
                >
                  <Tabs
                    hideAdd
                    onChange={handleTabChange}
                    activeKey={activeTabKey}
                    type="editable-card"
                    onEdit={(targetKey, action) => action === 'remove' && removeTab(targetKey as string)}
                  >
                    {tabs.map(tab => (
                      <Tabs.TabPane 
                        tab={
                          <span>
                            {tab.title}
                            {tab.key !== '1' && activeTabKey === tab.key && (
                              <ReloadOutlined 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  refreshTab(tab.key);
                                }}
                                style={{ marginLeft: 8 }}
                              />
                            )}
                          </span>
                        } 
                        key={tab.key} 
                        closable={tab.key !== '1'}
                      >
                        {cachedComponents[tab.key]}
                      </Tabs.TabPane>
                    ))}
                  </Tabs>
                </ProLayout>
              )}
            </main>
          </div>
        </ConfigProvider>
      </body>
    </html>
  );
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <Provider store={store}>
      <AppContent>{children}</AppContent>
    </Provider>
  );
};

export default RootLayout;
