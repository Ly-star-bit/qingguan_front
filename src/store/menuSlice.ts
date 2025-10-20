// store/menuSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MenuTreeItem {
  id: string;
  name: string;
  parent_id: string | null;
  children: MenuTreeItem[] | null;
  path: string;
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  menu_id?: string;
  menu_ids?: string[];
  description?: string;
  dynamic_params?: Record<string, string>;
}

export interface ApiEndpoint {
  id: string;
  ApiGroup: string;
  Method: string;
  Path: string;
  Type: string;
  Description: string;
}

interface MenuState {
  // 用户拥有权限的完整菜单树（所有级别，包括3级及以上）
  menuTree: MenuTreeItem[];
  // 权限项数据
  permissionItems: PermissionItem[];
  // API端点数据
  apiEndpoints: ApiEndpoint[];
  // 加载状态
  isLoading: boolean;
  // 是否已初始化
  isInitialized: boolean;
}

const initialState: MenuState = {
  menuTree: [],
  permissionItems: [],
  apiEndpoints: [],
  isLoading: false,
  isInitialized: false,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    // 设置用户有权限的完整菜单树（所有级别）
    setMenuTree(state, action: PayloadAction<MenuTreeItem[]>) {
      state.menuTree = action.payload;
    },
    
    // 设置权限项
    setPermissionItems(state, action: PayloadAction<PermissionItem[]>) {
      state.permissionItems = action.payload;
    },
    
    // 设置API端点
    setApiEndpoints(state, action: PayloadAction<ApiEndpoint[]>) {
      state.apiEndpoints = action.payload;
    },
    
    // 设置加载状态
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    
    // 设置初始化状态
    setInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },
    
    // 重置菜单状态（用于登出）
    resetMenu(state) {
      state.menuTree = [];
      state.permissionItems = [];
      state.apiEndpoints = [];
      state.isLoading = false;
      state.isInitialized = false;
    },
  },
});

export const {
  setMenuTree,
  setPermissionItems,
  setApiEndpoints,
  setLoading,
  setInitialized,
  resetMenu,
} = menuSlice.actions;

export default menuSlice.reducer;
