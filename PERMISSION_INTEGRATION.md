# 权限集成说明文档

## 概述
本文档说明如何使用 Casbin 策略接口来控制用户对空运/海运、起运地(startland)和目的地(destination)的访问权限。

## 实现文件

### 1. permissionService.ts (`src/utils/permissionService.ts`)
权限服务工具，提供以下功能：

#### 核心函数

```typescript
// 获取用户的空运和海运路线权限
getUserRoutePermissions(username: string): Promise<{
  air: RoutePermission[];
  sea: RoutePermission[];
}>

// 从权限列表中提取唯一的起运地
getUniqueStartlands(permissions: RoutePermission[]): string[]

// 从权限列表中提取唯一的目的地
getUniqueDestinations(permissions: RoutePermission[]): string[]

// 检查用户是否有特定路线的权限
hasRoutePermission(
  permissions: RoutePermission[],
  startland: string,
  destination: string
): boolean
```

#### Casbin 策略接口调用

```typescript
// POST /policies/filter
filterPolicies(
  filters: FilterCondition[],
  skip: number = 0,
  limit: number = 100
): Promise<CasbinResponse>
```

**请求示例**：
```json
{
  "filters": [
    {"field": "v0", "value": "air_china2usa_qingguan", "operator": "eq"},
    {"field": "v1", "value": "/qingguan/products/", "operator": "eq"},
    {"field": "v4", "value": "allow", "operator": "eq"}
  ],
  "skip": 0,
  "limit": 100
}
```

**响应格式**：
```json
{
  "total": 1,
  "skip": 0,
  "limit": 100,
  "data": [
    {
      "ptype": "p",
      "v0": "air_china2usa_qingguan",
      "v1": "/qingguan/products/",
      "v2": "GET",
      "v3": "[{\"startland\":\"China\",\"destination\":\"America\"}]",
      "v4": "allow",
      "v5": "获取产品列表"
    }
  ]
}
```

#### 字段说明
- **v0**: 用户名/角色
- **v1**: 接口路径
  - `/qingguan/products/` - 空运产品
  - `/qingguan/products_sea/` - 海运产品
- **v2**: HTTP 方法
- **v3**: 路线权限（JSON 格式）
  - `startland`: 起运地 (China, Vietnam 等)
  - `destination`: 目的地 (America, Canada, Vietnam 等)
- **v4**: 权限类型 (allow/deny)
- **v5**: 权限描述

### 2. ProductSearchUnified.tsx 组件更新

#### 新增功能
1. **权限加载**：组件加载时自动获取用户权限
2. **动态选项**：根据权限动态生成起运地和目的地下拉选项
3. **权限验证**：查询产品前验证用户是否有权限访问该路线
4. **智能切换**：切换运输类型时自动更新可用选项

#### 使用流程
```
用户登录
  ↓
加载用户权限 (getUserRoutePermissions)
  ↓
解析 v3 字段获取路线权限
  ↓
根据运输类型过滤可用选项
  ↓
用户选择起运地和目的地
  ↓
验证权限 (hasRoutePermission)
  ↓
调用产品接口
```

## 环境变量配置

在 `.env` 或 `.env.local` 文件中配置 Casbin 服务地址：

```env
NEXT_PUBLIC_CASBIN_URL=http://localhost:8000
```

## 权限策略示例

### 空运权限示例
```json
{
  "v0": "user123",
  "v1": "/qingguan/products/",
  "v3": "[{\"startland\":\"China\",\"destination\":\"America\"},{\"startland\":\"Vietnam\",\"destination\":\"America\"}]",
  "v4": "allow"
}
```
表示用户 `user123` 可以查询：
- 中国到美国的空运产品
- 越南到美国的空运产品

### 海运权限示例
```json
{
  "v0": "user123",
  "v1": "/qingguan/products_sea/",
  "v3": "[{\"startland\":\"China\",\"destination\":\"America\"}]",
  "v4": "allow"
}
```
表示用户 `user123` 可以查询：
- 中国到美国的海运产品

## 测试说明

1. **配置权限策略**：在 Casbin 中为用户配置权限策略
2. **登录测试账号**：使用配置了权限的账号登录
3. **验证下拉选项**：检查起运地和目的地下拉框只显示有权限的选项
4. **测试切换**：切换运输类型，验证选项是否正确更新
5. **权限验证**：尝试查询产品，验证权限检查是否生效

## 错误处理

- **权限加载失败**：显示错误提示 "加载权限失败"
- **无权限访问**：显示警告提示 "您没有查询此路线的权限"
- **空权限列表**：下拉框被禁用，显示为空

## 注意事项

1. v3 字段支持单个对象或数组格式
2. startland 和 destination 必须精确匹配（区分大小写）
3. 权限策略中 v4 必须为 "allow" 才会被识别为有效权限
4. 切换运输类型会自动更新可用选项并切换到第一个有效值
