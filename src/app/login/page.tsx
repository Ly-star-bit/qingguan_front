'use client';

import {
    AlipayOutlined,
    LockOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    LoginFormPage,
    ProConfigProvider,
    ProFormCheckbox,
    ProFormText,
} from '@ant-design/pro-components';
import { Button, Divider, Space, Tabs, message, theme } from 'antd';
import type { CSSProperties } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import { useDispatch } from 'react-redux';
import { setUser as updateUser } from '@/store/userSlice';

type LoginType = 'account';

const iconStyles: CSSProperties = {
    color: 'rgba(0, 0, 0, 0.2)',
    fontSize: '18px',
    verticalAlign: 'middle',
    cursor: 'pointer',
};
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9008';

const Page = () => {
    const [loginType, setLoginType] = useState<LoginType>('account');
    const { token } = theme.useToken();
    const router = useRouter();
    const dispatch = useDispatch();

    // 添加初始化用户状态的 effect


    // 用axios替换fetch
    const handleSubmit = async (values: { username: string; password: string }) => {
        try {
            const response = await axiosInstance.post(
                `${NEXT_PUBLIC_API_URL}/login`,
                {
                    username: values.username,
                    password: values.password,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // withCredentials: true, // 如有需要可加
                }
            );
            // 登录成功
            const data = response.data;
            // 假设返回的数据包含access_token和token_type
            const userData = {
                username: values.username,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                tokenType: data.token_type,
            };
            localStorage.setItem('user', JSON.stringify(userData));
            
            // 设置 Redux 全局状态
            dispatch(updateUser(values.username));
            
            message.success('登录成功！');
            console.log({
                username: values.username,
                accessToken: data.access_token,
                tokenType: data.token_type,
            });
            if (values.username === "admin") {
                router.push('/');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            // 处理错误
            if (error.response) {
                // 服务器有响应
                if (error.response.status === 403) {
                    message.error(error.response.data?.detail || '无权限');
                } else {
                    message.error('用户名或密码错误');
                }
            } else {
                // 其他错误
                message.error('发生错误，请重试。');
            }
        }
    };

    // const handleSubmit = async (values: { username: string; password: string }) => {
    //   try {
    //     // 模拟服务器响应
    //     const mockResponse = (username: string, password: string) => {
    //       if (username === 'admin' && password === 'admin123456') {
    //         return {
    //           ok: true,
    //           json: async () => ({
    //             access_token: 'mockAccessToken',
    //             token_type: 'Bearer',
    //             role: 'admin',
    //           }),
    //         };
    //       } else {
    //         return {
    //           ok: false,
    //           json: async () => ({
    //             message: 'Invalid username or password',
    //           }),
    //         };
    //       }
    //     };

    //     // 使用模拟响应代替真实请求
    //     const response = mockResponse(values.username, values.password);

    //     if (response.ok) {
    //       const data: { access_token: string; token_type: string; role: string } = await response.json() as { access_token: string; token_type: string; role: string };
    //       // 假设返回的数据包含access_token和token_type
    //       localStorage.setItem('user', JSON.stringify({ username: values.username, accessToken: data.access_token, tokenType: data.token_type, role: data.role }));
    //       message.success('Login successful!');
    //       router.push('/');
    //     } else {
    //       const errorData: { message: string } = await response.json() as { message: string };
    //       message.error(errorData.message || 'Invalid username or password');
    //     }
    //   } catch (error) {
    //     message.error('An error occurred. Please try again.');
    //   }
    // };

    return (
        <div
            style={{
                backgroundColor: 'white',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <LoginFormPage
                backgroundImageUrl="login_file/fmt.webp"
                //   logo="https://github.githubassets.com/favicons/favicon.png"
                backgroundVideoUrl="login_file/jXRBRK_VAwoAAAAAAAAAAAAAK4eUAQBr.mp4"
                title="文件制作登录"
                containerStyle={{
                    backgroundColor: 'rgba(0, 0, 0,0.65)',
                    backdropFilter: 'blur(4px)',
                }}
                onFinish={handleSubmit}
            >
                <Tabs
                    centered
                    activeKey={loginType}
                    onChange={(activeKey) => setLoginType(activeKey as LoginType)}
                >
                    <Tabs.TabPane key={'account'} tab={'账号密码登录'} />
                </Tabs>
                {loginType === 'account' && (
                    <>
                        <ProFormText
                            name="username"
                            fieldProps={{
                                size: 'large',
                                prefix: (
                                    <UserOutlined
                                        style={{
                                            color: token.colorText,
                                        }}
                                        className={'prefixIcon'}
                                    />
                                ),
                            }}
                            placeholder={'用户名: admin or user'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入用户名!',
                                },
                            ]}
                        />
                        <ProFormText.Password
                            name="password"
                            fieldProps={{
                                size: 'large',
                                prefix: (
                                    <LockOutlined
                                        style={{
                                            color: token.colorText,
                                        }}
                                        className={'prefixIcon'}
                                    />
                                ),
                            }}
                            placeholder={'密码: ant.design'}
                            rules={[
                                {
                                    required: true,
                                    message: '请输入密码！',
                                },
                            ]}
                        />
                    </>
                )}

                <div
                    style={{
                        marginBlockEnd: 24,
                    }}
                >
                    <ProFormCheckbox noStyle name="autoLogin">
                        自动登录
                    </ProFormCheckbox>
                    <a
                        style={{
                            float: 'right',
                        }}
                    >
                        忘记密码
                    </a>
                </div>
            </LoginFormPage>
        </div>
    );
};

const LoginPage = () => {
    return (
        <ProConfigProvider dark>
            <Page />
        </ProConfigProvider>
    );
};

// Adding display name
LoginPage.displayName = "LoginPage";

export default LoginPage;