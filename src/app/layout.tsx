'use client';

import React, { ReactNode, useEffect, useState, Suspense } from 'react';
import { ConfigProvider, Dropdown, Menu, Tabs, Spin, Avatar, Button } from 'antd';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../store/store';
import '../styles/globals.css';
import { SmileOutlined, HeartOutlined, UploadOutlined, UserOutlined, InfoCircleFilled, QuestionCircleFilled, GithubFilled, TeamOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { PageContainer } from '@ant-design/pro-components';
import  { jwtDecode, JwtPayload } from 'jwt-decode';

import axiosInstance from '@/utils/axiosInstance';
import { setUser as updateUser } from '@/store/userSlice';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface MenuTreeItem {
  id: string;
  name: string;
  parent_id: string | null;
  children: MenuTreeItem[] | null;
  path: string;
}

interface DecodedToken {
  exp: number;
  sub: string;
  role: string;
  permissions: [string, string, string, string][];
  menu_ids: string[];
}

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
    case '/user-management/user':
        return React.lazy(() => import('./user-management/user/page'));
    case '/vba/delivery':
        return React.lazy(() => import('./vba/delivery/page'));
    case '/user-management/users':
        return React.lazy(() => import('./user-management/users/page'));
    case '/business/order':
        return React.lazy(() => import('./business/order/page'));
    case '/business/dadan':
        return React.lazy(() => import('./business/dadan/page'));
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

  const [filteredMenuData, setFilteredMenuData] = useState<any[]>([]);
  const [menuTree, setMenuTree] = useState<MenuTreeItem[]>([]);

  // 添加一个 state 来追踪是否已经获取过菜单
  const [menuFetched, setMenuFetched] = useState(false);

  // 获取菜单树
  const fetchMenuTree = async () => {
    try {
      
      const response = await axiosInstance.get(`${server_url}/menu`);
      if (response.data) {
        setMenuTree(response.data);
      }
    } catch (error) {
      console.error('获取菜单失败:', error);
    }
  };

  // 将菜单树转换为 ProLayout 需要的格式
  const convertMenuTree = (menuItems: MenuTreeItem[], allowedMenuIds: string[]): any[] => {
    // 检查是否有通配符权限
    const hasWildcardAccess = allowedMenuIds.includes("*");
    
    return menuItems
      .filter(item => hasWildcardAccess || allowedMenuIds.includes(item.id))
      .map(item => {
        const menuItem = {
          path: item.path,
          name: item.name, 
          icon: getIconByName(item.name),
          children: item.children ? item.children
            .filter(child => hasWildcardAccess || allowedMenuIds.includes(child.id))
            .map(child => ({
              path: child.path,
              name: child.name,
              icon: getIconByName(child.name)
            })) : undefined
        };

        // 如果没有子项，则移除 children 属性
        if (menuItem.children && menuItem.children.length === 0) {
          delete menuItem.children;
        }

        return menuItem;
      });
  };

  // 根据名称获取路径


  // 根据名称获取图标
  const getIconByName = (name: string): React.ReactNode => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Section': <HeartOutlined />,
      '用户管理': <TeamOutlined />,
      '文件制作-管理员': <HeartOutlined />,
      '文件制作-用户': <UploadOutlined />,
      // ... 添加其他图标映射
    };
    return iconMap[name] || <SmileOutlined />;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && !menuFetched) {  // 只在未获取过菜单时执行
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
          // 获取菜单树并转换
          fetchMenuTree().then(() => {
            if (decodedToken.menu_ids) {
              const convertedMenu = convertMenuTree(menuTree, decodedToken.menu_ids);
              setFilteredMenuData([
                {
                  path: '/',
                  name: 'Home',
                  icon: <SmileOutlined />
                },
                ...convertedMenu
              ]);
              setMenuFetched(true);  // 标记菜单已获取
            }
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
  }, [pathname, router]);  // 移除 menuTree 依赖

  // 添加单独的 effect 来处理菜单转换
  useEffect(() => {
    if (menuTree.length > 0 && user) {
      try {
        const decodedToken: DecodedToken = jwtDecode(user.accessToken);
        if (decodedToken.menu_ids) {
          const convertedMenu = convertMenuTree(menuTree, decodedToken.menu_ids);
          setFilteredMenuData([
            {
              path: '/',
              name: 'Home',
              icon: <SmileOutlined />
            },
            ...convertedMenu
          ]);
        }
      } catch (error) {
        console.error('Error converting menu:', error);
      }
    }
  }, [menuTree]);
  

 
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
    setFilteredMenuData([]);
    setMenuTree([]);
    setMenuFetched(false);
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
                  menuDataRender={() => filteredMenuData}
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
