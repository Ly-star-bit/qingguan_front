import React, { useEffect, useState } from 'react';
import {jwtDecode} from 'jwt-decode';
import { NextPage } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Menu, message } from 'antd';

interface DecodedToken {
  exp: number;
  sub: string;
  role: string;
  permissions: [string, string, string][];
}

interface User {
  username: string;
  accessToken: string;
  tokenType: string;
  role: string;
}

const withAuth = (WrappedComponent: NextPage) => {
  const Wrapper: NextPage = (props) => {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          const { accessToken, username } = parsedUser;
          const decodedToken: DecodedToken = jwtDecode(accessToken);

          // 检查 token 是否过期
          if (decodedToken.exp * 1000 < Date.now()) {
            localStorage.removeItem('user');
            if (pathname !== '/login') {
              router.push('/login');
            }
          } else {
            setUser(parsedUser);
            // 检查用户名和访问权限
            if (username !== 'admin' && pathname === '/vba-admin') {
              router.push('/vba-user');
            }
          }
        } else {
          // 如果没有存储的用户信息，则重定向到登录页
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (error) {
        // 处理任何解析或验证过程中的错误
        console.error('Error validating token:', error);
        localStorage.removeItem('user');
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    }, [router, pathname]);

    const handleLogout = () => {
      localStorage.removeItem('user');
      message.success('成功退出登录');
      router.push('/login');
    };

    return (
      <div>
        {user && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="logout" onClick={handleLogout}>
                    <LogoutOutlined /> 退出登录
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <div style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: '8px' }} />
                {user.username}
              </div>
            </Dropdown>
          </div>
        )}
        <WrappedComponent {...props} />
      </div>
    );
  };

  return Wrapper;
};

export default withAuth;
