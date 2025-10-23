"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '@/store/store';
import { setUser as updateUser } from '@/store/userSlice';
interface User {
  username: string;
  accessToken: string;
  tokenType: string;
  role: string;
}
const Home = () => {
  const dispatch = useAppDispatch();
  const userName = useSelector((state: RootState) => state.user.name);
  const menuState = useSelector((state: RootState) => state.menu);

  // 监听用户名和菜单状态变化
  useEffect(() => {
    console.log('User:', userName);
    console.log('Menu Tree:', JSON.stringify(menuState.menuTree));
    console.log('Menu initialized:', menuState.isInitialized);
  }, [userName, menuState]);

  // 递归计算菜单项总数
  const countMenuItems = (items: any[]): number => {
    return items.reduce((count, item) => {
      let total = 1; // 当前项
      if (item.children && item.children.length > 0) {
        total += countMenuItems(item.children);
      }
      return count + total;
    }, 0);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">欢迎</h1>
      {userName && <p>当前用户: {userName}</p>}
      {menuState.isInitialized && menuState.menuTree.length > 0 && (
        <div className="mt-4">
          <p>用户菜单树已加载</p>
          <p>一级菜单: {menuState.menuTree.length} 个</p>
          <p>总菜单项: {countMenuItems(menuState.menuTree)} 个（包含所有层级）</p>
        </div>
      )}
      {menuState.isLoading && <p>加载中...</p>}
    </div>
  );
};

export default Home;
