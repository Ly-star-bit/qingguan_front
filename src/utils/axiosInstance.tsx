import axios from 'axios';
import { message } from 'antd';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085", // Replace with your API base URL
  timeout: 60000, // Optional: Set a timeout for requests
  // headers: {
  //   'Content-Type': 'application/json',
  // },
});

// Request interceptor to add the access token to the Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      const accessToken = parsedUser.accessToken;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle errors and refresh tokens if needed
axiosInstance.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;
    // access_token 过期
    if (
      error.response &&
      error.response.data &&
      error.response.data.detail === "令牌已过期" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // 正在刷新，队列等待
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const user = localStorage.getItem('user');
      if (user) {
        const parsedUser = JSON.parse(user);
        const refreshToken = parsedUser.refreshToken;
        try {
          const res = await axios.post(
            process.env.NEXT_PUBLIC_BACKEND_URL + '/refresh',
            { refresh_token: refreshToken }
          );
          const newAccessToken = res.data.access_token;
          // 更新本地 access_token
          parsedUser.accessToken = newAccessToken;
          localStorage.setItem('user', JSON.stringify(parsedUser));
          axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
          processQueue(null, newAccessToken);
          isRefreshing = false;
          // 重试原请求
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
          return axiosInstance(originalRequest);
        } catch (err: any) {
          processQueue(err, null);
          isRefreshing = false;
          // refresh_token 也失效，跳转登录
          if (
            err.response &&
            err.response.data &&
            err.response.data.detail === "Refresh token expired"
          ) {
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
          return Promise.reject(err);
        }
      }
    }
    // 检查是否系统已封禁
    if (error.response && 
        error.response.data && 
        error.response.data.detail === "系统已封禁") {
      message.error("管理员正在处理中，系统暂时不能使用");
    }
    // 检查是否没有权限
    if (error.response &&
        error.response.data &&
        error.response.data.detail === "没有权限") {
      message.error("别看了，没有授权");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
