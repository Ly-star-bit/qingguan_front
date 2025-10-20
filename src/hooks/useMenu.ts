// hooks/useMenu.ts
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import type { MenuTreeItem, PermissionItem, ApiEndpoint } from '@/store/menuSlice';

/**
 * 自定义 Hook：获取菜单相关的全局状态
 * 
 * @returns {Object} 菜单状态对象
 * @property {MenuTreeItem[]} menuTree - 用户有权限的完整菜单树（所有级别，包括3级及以上）
 * @property {PermissionItem[]} permissionItems - 权限项数据
 * @property {ApiEndpoint[]} apiEndpoints - API端点数据
 * @property {boolean} isLoading - 菜单数据是否正在加载
 * @property {boolean} isInitialized - 菜单数据是否已初始化
 */
export const useMenu = () => {
  const menuState = useSelector((state: RootState) => state.menu);
  
  return {
    menuTree: menuState.menuTree,
    permissionItems: menuState.permissionItems,
    apiEndpoints: menuState.apiEndpoints,
    isLoading: menuState.isLoading,
    isInitialized: menuState.isInitialized,
  };
};

/**
 * 根据菜单ID查找菜单项
 * 
 * @param menuId - 菜单ID
 * @param menuTree - 菜单树（可选，默认使用全局状态）
 * @returns 找到的菜单项或 null
 */
export const useFindMenuById = (menuId: string, menuTree?: MenuTreeItem[]): MenuTreeItem | null => {
  const { menuTree: globalMenuTree } = useMenu();
  const tree = menuTree || globalMenuTree;
  
  const findMenu = (id: string, items: MenuTreeItem[]): MenuTreeItem | null => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findMenu(id, item.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findMenu(menuId, tree);
};

/**
 * 获取当前路径对应的菜单项
 * 
 * @param pathname - 当前路径
 * @returns 找到的菜单项或 null
 */
export const useCurrentMenu = (pathname: string): MenuTreeItem | null => {
  const { menuTree } = useMenu();
  
  const findMenuByPath = (path: string, items: MenuTreeItem[]): MenuTreeItem | null => {
    for (const item of items) {
      if (item.path === path) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findMenuByPath(path, item.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findMenuByPath(pathname, menuTree);
};

/**
 * 获取菜单项的所有子菜单（用于显示Tab）
 * 
 * @param menuId - 父菜单ID
 * @returns 子菜单数组
 */
export const useChildMenus = (menuId: string): MenuTreeItem[] => {
  const menu = useFindMenuById(menuId);
  return menu?.children || [];
};

/**
 * 检查用户是否有访问指定菜单的权限
 * 
 * @param menuId - 菜单ID
 * @returns 是否有权限
 */
export const useHasMenuAccess = (menuId: string): boolean => {
  const { allowedMenuIds } = useMenu();
  return allowedMenuIds.includes(menuId);
};
