# 权限功能修改说明

## 需要替换的函数

### 1. buildPermissionTree 函数（新增）
在 `getPermissionData` 函数后添加此函数

### 2. handlePermission 函数
替换原有的 handlePermission 逻辑，改为加载权限项数据

### 3. fetchUserRoles 函数
修改为返回角色列表

### 4. handlePermissionOk 函数（新增）
替换 handleApiPermissionOk，保存权限项

### 5. handlePermissionSearch 函数
替换 handleApiSearch

### 6. handlePermissionTreeCheck 函数  
替换 handleApiTreeCheck

## API端点变更
- 旧：`/user/get_user_api_permissions`
- 新：`/users/{user_id}/permissions` - 返回 {direct_permissions: [], inherited_permissions: []}

- 旧：`/user/update_user_api_permissions`
- 新：`/users/{user_id}/permissions` - PUT请求，传入 {permission_ids: []}
