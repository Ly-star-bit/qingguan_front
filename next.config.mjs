/** @type {import('next').NextConfig} */
import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });
import path from 'path'; // 引入 path 模块

const nextConfig = {
    swcMinify: true,
    // webpack: (config) => {
    //     config.resolve.alias.canvas = false;
    //     return config;
    // },
    //distDir: 'build',
    eslint: {
        // 如果你想暂时忽略 ESLint 警告
        ignoreDuringBuilds: true,
    },
    typescript: {
        // 如果你想暂时忽略 TypeScript 错误
        ignoreBuildErrors: true,
    }
};

export default nextConfig;