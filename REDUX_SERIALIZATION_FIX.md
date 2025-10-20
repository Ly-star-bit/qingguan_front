# Redux 序列化问题修复说明

## 问题描述

Redux store 不允许存储非序列化的值（如 React 元素）。之前的实现将包含 `icon: <SmileOutlined />` 的菜单数据直接存储到 Redux 中，导致以下警告：

```
A non-serializable value was detected in the state, in the path: `menu.filteredMenuData.0.icon.$typeof`
```

## 解决方案

### 核心思路
**分离数据存储和渲染逻辑**：
1. Redux 中只存储**可序列化的数据**（字符串、数字、数组、对象）
2. 渲染时将字符串转换为 React 元素

### 实现细节

#### 1. 定义可序列化的菜单数据结构

```typescript
// src/store/menuSlice.ts
export interface FilteredMenuItem {
  path: string;
  name: string;
  iconName?: string;  // 存储图标名称字符串，而不是 React 元素
  children?: FilteredMenuItem[];
}
```

#### 2. 两个图标映射函数

**存储时：菜单名称 → 图标名称**
```typescript
const getIconNameByMenuName = (name: string): string => {
  const iconMap: { [key: string]: string } = {
    '用户管理': 'TeamOutlined',
    // ...
  };
  return iconMap[name] || 'SmileOutlined';
};
```

**渲染时：图标名称 → React 元素**
```typescript
const getIconByName = (iconName?: string): React.ReactNode => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'TeamOutlined': <TeamOutlined />,
    'SmileOutlined': <SmileOutlined />,
    // ...
  };
  return iconMap[iconName || 'SmileOutlined'] || <SmileOutlined />;
};
```

#### 3. 菜单数据转换流程

```typescript
// 1. 转换为可序列化格式（存储到 Redux）
const convertMenuTree = (...): FilteredMenuItem[] => {
  return items.map(item => ({
    path: item.path,
    name: item.name,
    iconName: getIconNameByMenuName(item.name), // 字符串
    children: ...
  }));
};

// 2. 存储到 Redux
dispatch(setFilteredMenuData(menuData));

// 3. 渲染时转换为 ProLayout 格式（带 React 元素）
const convertToProLayoutFormat = (items: FilteredMenuItem[]): any[] => {
  return items.map(item => ({
    ...item,
    icon: getIconByName(item.iconName), // React 元素
    children: item.children ? convertToProLayoutFormat(item.children) : undefined
  }));
};

// 4. 使用转换后的数据
<ProLayout
  menuDataRender={() => convertToProLayoutFormat(filteredMenuData)}
/>
```

## 修改文件清单

### 1. `src/store/menuSlice.ts`
- ✅ 添加 `FilteredMenuItem` 接口
- ✅ 更新 `MenuState.filteredMenuData` 类型
- ✅ 更新 `setFilteredMenuData` action 类型

### 2. `src/app/layout.tsx`
- ✅ 导入 `FilteredMenuItem` 类型
- ✅ 修改 `convertMenuTree` 函数返回类型
- ✅ 添加 `getIconNameByMenuName` 函数（存储用）
- ✅ 修改 `getIconByName` 函数（渲染用）
- ✅ 添加 `convertToProLayoutFormat` 函数
- ✅ 更新 ProLayout 的 `menuDataRender`

### 3. `src/hooks/useMenu.ts`
- ✅ 导入 `FilteredMenuItem` 类型
- ✅ 更新文档注释

## 数据流图

```
菜单数据
   ↓
convertMenuTree() 
   ↓ (iconName: string)
Redux Store (可序列化)
   ↓
useMenu() / useSelector()
   ↓ (FilteredMenuItem[])
convertToProLayoutFormat()
   ↓ (icon: ReactNode)
ProLayout 渲染
```

## 类型安全

```typescript
// Redux 中存储的数据（可序列化）
interface FilteredMenuItem {
  path: string;
  name: string;
  iconName?: string;        // ✅ 字符串
  children?: FilteredMenuItem[];
}

// 渲染时使用的数据（包含 React 元素）
interface ProLayoutMenuItem {
  path: string;
  name: string;
  icon?: React.ReactNode;   // React 元素
  children?: ProLayoutMenuItem[];
}
```

## 优势

1. ✅ **Redux 兼容**：所有存储的数据都是可序列化的
2. ✅ **类型安全**：TypeScript 类型检查正确
3. ✅ **性能优化**：Redux DevTools 可以正常工作
4. ✅ **可维护性**：数据和渲染逻辑分离
5. ✅ **可测试性**：可以独立测试数据转换逻辑

## 添加新图标

### 1. 在映射中添加图标名称
```typescript
const getIconNameByMenuName = (name: string): string => {
  const iconMap: { [key: string]: string } = {
    '新菜单': 'NewIconOutlined',  // 添加这里
  };
  return iconMap[name] || 'SmileOutlined';
};
```

### 2. 在渲染映射中添加 React 元素
```typescript
const getIconByName = (iconName?: string): React.ReactNode => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'NewIconOutlined': <NewIconOutlined />,  // 添加这里
  };
  return iconMap[iconName || 'SmileOutlined'] || <SmileOutlined />;
};
```

### 3. 确保导入图标组件
```typescript
import { NewIconOutlined } from '@ant-design/icons';
```

## 注意事项

1. **不要直接修改 Redux 中的 filteredMenuData 添加 icon 属性**
2. **始终使用 convertToProLayoutFormat 转换后再渲染**
3. **保持 getIconNameByMenuName 和 getIconByName 的映射一致**
4. **新增图标时要同时更新两个映射函数**

## 验证

修复后，Redux DevTools 中的 `menu.filteredMenuData` 应该只包含：
```json
{
  "path": "/",
  "name": "Home",
  "iconName": "SmileOutlined"  // ✅ 字符串，而不是 React 元素
}
```

不应再出现任何序列化警告！
