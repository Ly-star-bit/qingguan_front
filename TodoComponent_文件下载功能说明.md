# TodoComponent 文件下载功能更新

## 修改内容

### 1. 接口扩展

#### TaskStep 接口新增属性：
```typescript
interface TaskStep {
  // ... 原有属性
  fileUrl?: string;           // 文件下载URL
  downloadBaseUrl?: string;   // 下载基础URL
}
```

#### TodoComponentProps 接口新增属性：
```typescript
interface TodoComponentProps {
  // ... 原有属性
  downloadBaseUrl?: string;   // 下载基础URL，默认 '/api/download'
}
```

### 2. 功能增强

#### 智能文件检测
组件会自动检测步骤结果中的文件信息，支持以下字段：

**文件名字段**（优先级较高）：
- `result.file_name`
- `result.fileName`
- `result.filename`
- `result.file`

**URL字段**（当没有文件名字段时）：
- `result.file_url`
- `result.fileUrl`
- `result.document_url`
- `result.documentUrl`
- `result.url`

**直接文件名**：
- 或者 `result` 本身就是文件名（包含扩展名）

#### 双模式操作支持
组件现在支持同时显示"查看结果"和"下载文件"按钮：
- **包含文件的JSON结果**：同时显示两个按钮
- **纯JSON数据**：只显示"查看结果"按钮
- **纯文件结果**：只显示"下载文件"按钮

#### 自动URL生成
当检测到文件时，会自动生成下载URL：

**文件名字段方式**：
```
downloadURL = downloadBaseUrl + '/' + fileName
```

**URL字段方式**：
- 如果是完整URL（http://或https://）：直接使用
- 如果是相对路径：`backendUrl + urlValue`

示例：
```json
// 情况1：文件名字段
{
  "result": {
    "file_name": "report.xlsx"
  }
}
// 生成URL: downloadBaseUrl + "/report.xlsx"

// 情况2：URL字段（相对路径）
{
  "result": {
    "document_url": "/files/acceptance_2454fa3c.pdf"
  }
}
// 生成URL: "http://localhost:8085/files/acceptance_2454fa3c.pdf"

// 情况3：URL字段（完整URL）
{
  "result": {
    "file_url": "https://example.com/files/report.xlsx"
  }
}
// 直接使用: "https://example.com/files/report.xlsx"
```

#### 真实文件下载
替换了模拟下载，实现真正的文件下载功能：
- 创建临时下载链接
- 设置正确的文件名
- 在新窗口打开（防止下载失败时的错误显示）
- 自动清理DOM元素

## 使用方法

### 基础使用
```tsx
<TodoComponent
  apiEndpoint="/api/my-task"
  title="我的任务"
  downloadBaseUrl="/api/download"  // 可选，默认 '/api/download'
/>
```

### 完整配置
```tsx
<TodoComponent
  apiEndpoint="/api/advanced-task"
  title="高级任务"
  downloadBaseUrl="http://localhost:8085/api/files"
  enableFileUpload={true}
  enableApiParams={true}
  apiParams={{
    defaultParam: 'value',
    userId: 123
  }}
/>
```

## 后端API要求

### 步骤结果格式
当步骤产生文件时，后端应返回包含文件信息的结果：

```json
{
  "task": "task_id",
  "result": {
    "file_name": "report.xlsx",
    "data": "其他数据"
  },
  "message": "文件生成完成"
}
```

或者简单格式：
```json
{
  "task": "task_id", 
  "result": "report.xlsx",
  "message": "文件生成完成"
}
```

### 下载接口
需要提供文件下载接口，支持通过文件名下载：
```
GET /api/download/{fileName}
```

## 示例场景

### 场景1：Excel报表生成
```
步骤1: 数据收集 -> 返回数据结果
步骤2: 报表生成 -> 返回 {"file_name": "monthly_report.xlsx"}
步骤3: 数据清理 -> 返回清理日志
```

用户可以在步骤2完成后点击"下载文件"按钮下载Excel报表。

### 场景2：PDF文档处理
```
步骤1: 文档上传 -> 返回上传状态
步骤2: PDF处理 -> 返回 "processed_document.pdf"
步骤3: 质量检查 -> 返回检查结果
```

用户可以在步骤2完成后下载处理后的PDF文档。

## 注意事项

1. **文件名检测**：组件会智能检测多种文件名字段格式
2. **URL构建**：确保 downloadBaseUrl 和后端下载接口一致
3. **错误处理**：下载失败时会在新窗口显示错误页面
4. **安全性**：建议在后端验证文件访问权限
5. **文件清理**：建议后端定期清理临时文件

## 兼容性

- 向后兼容：未配置 downloadBaseUrl 时使用默认值
- 原有功能：数据结果查看功能保持不变
- 自动适配：根据结果类型自动显示对应的操作按钮