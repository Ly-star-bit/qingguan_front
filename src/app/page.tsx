"use client"; // 添加这个指令

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, useAppDispatch } from '@/store/store';
import { setUser as updateUser } from '@/store/userSlice';
interface User {
  username: string;
  accessToken: string;
  tokenType: string;
  role: string;
}
const Home = () => {
  // const router = useRouter();
  const userName = useSelector((state: RootState) => state.user.name);

  // 使用 useAppDispatch 获取 dispatch 函数
  const dispatch = useAppDispatch();
  // useEffect(() => {
  //   router.push('/vba');
  // }, [router]);
  useEffect(() =>{
    const storedUser = localStorage.getItem('user');
    if (storedUser) {

        const parsedUser: User = JSON.parse(storedUser);
        if(parsedUser){
          console.log(parsedUser)
          dispatch(updateUser(parsedUser.username))

        }

  }
  })
    // 监听 userName 变化
  useEffect(() => {
      console.log('userName updated:', userName);
    }, [userName]);

  return null;
};

export default Home;
