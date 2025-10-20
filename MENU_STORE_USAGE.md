# 菜单全局状态使用指南

## 📦 概述

菜单树数据现在通过 Redux Store 全局管理，可以在整个应用中共享访问。

## 🗂️ 文件结构

```
src/
├── store/
│   ├── store.ts          # Redux store 配置
│   ├── userSlice.ts      # 用户状态管理
│   └── menuSlice.ts      # 菜单状态管理 (新增)
├── hooks/
│   └── useMenu.ts        # 菜单相关自定义 Hooks (新增)
└── app/
    ├── layout.tsx        # 布局组件（初始化菜单数据）
    └── page.tsx          # 首页（使用菜单数据）
```

## 🎯 核心功能

### 1. 菜单状态结构

```typescript
interface MenuState {
  menuTree: MenuTreeItem[];           // 完整的菜单树
  allowedMenuIds: string[];          // 用户可访问的菜单ID
  filteredMenuData: any[];           // 过滤后的菜单（ProLayout格式）
  permissionItems: PermissionItem[]; // 权限项数据
  apiEndpoints: ApiEndpoint[];       // API端点数据
  isLoading: boolean;                // 加载状态
  isInitialized: boolean;            // 是否已初始化
}
```

### 2. 数据流程

```
layout.tsx 初始化
    ↓
并行获取数据 → dispatch(setMenuTree)
              → dispatch(setPermissionItems)
              → dispatch(setApiEndpoints)
    ↓
计算用户权限 → dispatch(setAllowedMenuIds)
    ↓
过滤菜单树 → dispatch(setFilteredMenuData)
    ↓
dispatch(setInitialized(true))
    ↓
全局可用 ✓
```

## 💻 使用方法

### 方法1：使用自定义 Hook（推荐）

```typescript
import { useMenu, useCurrentMenu, useChildMenus } from '@/hooks/useMenu';

function MyComponent() {
  // 获取所有菜单状态
  const { 
    menuTree, 
    allowedMenuIds, 
    filteredMenuData,
    isLoading,
    isInitialized 
  } = useMenu();

  // 获取当前路径对应的菜单
  const currentMenu = useCurrentMenu('/user-management/users');

  // 获取子菜单（用于显示Tab）
  const childMenus = useChildMenus('parent-menu-id');

  if (isLoading) return <Spin />;
  if (!isInitialized) return <div>菜单未初始化</div>;

  return (
    <div>
      <h1>菜单项数量: {menuTree.length}</h1>
      <h2>可访问菜单: {allowedMenuIds.length}</h2>
    </div>
  );
}
```

### 方法2：直接使用 Redux Selector

```typescript
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

function MyComponent() {
  const menuState = useSelector((state: RootState) => state.menu);
  
  return (
    <div>
      {menuState.isInitialized && (
        <p>菜单树: {menuState.menuTree.length} 项</p>
      )}
    </div>
  );
}
```

### 方法3：使用 dispatch 更新状态

```typescript
import { useDispatch } from 'react-redux';
import { setFilteredMenuData, resetMenu } from '@/store/menuSlice';

function MyComponent() {
  const dispatch = useDispatch();

  // 更新菜单数据
  const updateMenu = () => {
    dispatch(setFilteredMenuData(newMenuData));
  };

  // 重置菜单（登出时）
  const handleLogout = () => {
    dispatch(resetMenu());
  };

  return <button onClick={handleLogout}>登出</button>;
}
```

## 🔧 可用的自定义 Hooks

### `useMenu()`
获取完整的菜单状态。

```typescript
const { 
  menuTree,         // 完整菜单树
  allowedMenuIds,   // 允许访问的ID
  filteredMenuData, // 过滤后的菜单
  permissionItems,  // 权限项
  apiEndpoints,     // API端点
  isLoading,        // 加载中
  isInitialized     // 已初始化
} = useMenu();
```

### `useFindMenuById(menuId)`
根据ID查找菜单项。

```typescript
const menu = useFindMenuById('menu-123');
if (menu) {
  console.log(menu.name, menu.path);
}
```

### `useCurrentMenu(pathname)`
获取当前路径对应的菜单。

```typescript
const pathname = usePathname();
const currentMenu = useCurrentMenu(pathname);
```

### `useChildMenus(menuId)`
获取菜单的所有子菜单（用于Tab）。

```typescript
const childMenus = useChildMenus('parent-id');
// 渲染为 Tabs
<Tabs>
  {childMenus.map(child => (
    <TabPane key={child.id} tab={child.name}>
      {/* 子菜单内容 */}
    </TabPane>
  ))}
</Tabs>
```

### `useHasMenuAccess(menuId)`
检查用户是否有访问权限。

```typescript
const hasAccess = useHasMenuAccess('menu-123');
if (!hasAccess) {
  return <div>无权访问</div>;
}
```

## 🎨 实际应用场景

### 场景1：显示面包屑导航

```typescript
import { useCurrentMenu } from '@/hooks/useMenu';
import { Breadcrumb } from 'antd';

function BreadcrumbNav() {
  const pathname = usePathname();
  const currentMenu = useCurrentMenu(pathname);

  if (!currentMenu) return null;

  return (
    <Breadcrumb>
      <Breadcrumb.Item>首页</Breadcrumb.Item>
      {currentMenu.parent_id && <Breadcrumb.Item>父级</Breadcrumb.Item>}
      <Breadcrumb.Item>{currentMenu.name}</Breadcrumb.Item>
    </Breadcrumb>
  );
}
```

### 场景2：二级页面显示三级Tab

```typescript
import { useChildMenus } from '@/hooks/useMenu';
import { Tabs } from 'antd';

function SecondLevelPage({ menuId }: { menuId: string }) {
  const childMenus = useChildMenus(menuId);

  return (
    <Tabs>
      {childMenus.map(child => (
        <Tabs.TabPane key={child.id} tab={child.name}>
          <ComponentForMenu path={child.path} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}
```

### 场景3：权限控制

```typescript
import { useHasMenuAccess } from '@/hooks/useMenu';

function ProtectedComponent({ menuId }: { menuId: string }) {
  const hasAccess = useHasMenuAccess(menuId);

  if (!hasAccess) {
    return <div>您没有权限访问此功能</div>;
  }

  return <div>受保护的内容</div>;
}
```

### 场景4：动态侧边栏

```typescript
import { useMenu } from '@/hooks/useMenu';
import { Menu } from 'antd';

function DynamicSidebar() {
  const { filteredMenuData, isLoading } = useMenu();

  if (isLoading) return <Spin />;

  return (
    <Menu mode="inline" items={filteredMenuData} />
  );
}
```

## 🔄 Redux Actions

### 设置数据

```typescript
import { 
  setMenuTree,
  setAllowedMenuIds,
  setFilteredMenuData,
  setPermissionItems,
  setApiEndpoints
} from '@/store/menuSlice';

dispatch(setMenuTree(menuData));
dispatch(setAllowedMenuIds(['id1', 'id2']));
```

### 控制状态

```typescript
import { setLoading, setInitialized, resetMenu } from '@/store/menuSlice';

dispatch(setLoading(true));      // 设置加载状态
dispatch(setInitialized(true));  // 标记已初始化
dispatch(resetMenu());           // 重置所有状态（登出）
```

## ⚡ 性能优化

1. **数据缓存**：菜单数据在 Redux store 中缓存，避免重复请求
2. **选择器优化**：使用 `useSelector` 只订阅需要的数据
3. **初始化标记**：`isInitialized` 防止重复初始化
4. **按需加载**：只在需要时才计算和过滤菜单

## 🚨 注意事项

1. **初始化时机**：菜单数据在 `layout.tsx` 中初始化，其他组件需要等待 `isInitialized` 为 `true`
2. **权限更新**：用户权限变化时，需要重新计算 `allowedMenuIds` 和 `filteredMenuData`
3. **登出处理**：登出时必须调用 `dispatch(resetMenu())` 清空菜单数据
4. **Admin特殊处理**：admin 用户可以访问所有菜单，无需权限检查

## 📝 类型定义

```typescript
// 完整类型定义见：
// src/store/menuSlice.ts - MenuState, MenuTreeItem, PermissionItem, ApiEndpoint
// src/hooks/useMenu.ts - Hook 返回类型
```

## 🎯 最佳实践

1. ✅ 优先使用自定义 Hook (`useMenu`, `useCurrentMenu` 等)
2. ✅ 在组件中检查 `isInitialized` 和 `isLoading` 状态
3. ✅ 使用 `useHasMenuAccess` 进行权限控制
4. ✅ 登出时调用 `resetMenu()` 清理状态
5. ❌ 避免在组件中直接修改 menuState
6. ❌ 不要在多个地方重复初始化菜单数据

## 🔗 相关文件

- Redux Store: `src/store/menuSlice.ts`
- 自定义 Hooks: `src/hooks/useMenu.ts`
- 布局组件: `src/app/layout.tsx`
- 首页示例: `src/app/page.tsx`
