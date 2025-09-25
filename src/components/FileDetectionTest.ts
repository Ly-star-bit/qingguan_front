/**
 * 根据用户提供的实际数据测试文件检测功能
 */

// 测试数据1：大货上传任务 - 包含file_name字段
const testResult1 = {
  "task": "dahuo_upload",
  "message": "大货上传完成",
  "result": {
    "upload_id": "upload_2454fa3c",
    "file_name": "dahuo_2454fa3c.xlsx",     // ✅ 会被检测到
    "record_count": 1250,
    "file_url": "/files/dahuo_2454fa3c.xlsx"
  }
};
// 预期：resultType = 'file', fileName = 'dahuo_2454fa3c.xlsx'
// 下载URL：downloadBaseUrl + '/dahuo_2454fa3c.xlsx'

// 测试数据2：受理任务 - 只包含document_url字段
const testResult2 = {
  "task": "shouli",
  "message": "受理完成",
  "result": {
    "application_id": "app_2454fa3c",
    "acceptance_number": "SL202312012454fa",
    "status": "approved",
    "document_url": "/files/acceptance_2454fa3c.pdf"  // ✅ 现在会被检测到
  }
};
// 预期：resultType = 'file', fileName = 'acceptance_2454fa3c.pdf'
// 下载URL：'http://localhost:8085/files/acceptance_2454fa3c.pdf'

// 测试数据3：登录任务 - 无文件信息
const testResult3 = {
  "task": "login",
  "message": "登录成功",
  "result": {
    "user_id": "user_12345",
    "username": "test_user",
    "token": "abc123xyz",
    "expires_in": 3600
  }
};
// 预期：resultType = 'data' （显示查看结果按钮）

/**
 * 文件检测逻辑说明：
 * 
 * 1. 优先检测文件名字段：['file_name', 'fileName', 'filename', 'file']
 * 2. 如果没找到文件名，检测URL字段：['file_url', 'fileUrl', 'document_url', 'documentUrl', 'url']
 * 3. 从URL中提取文件名，并处理相对路径和绝对路径
 * 4. 最后检查result本身是否是文件名
 * 
 * 修复前问题：
 * - 只能检测到第1个任务（dahuo_upload），因为它有file_name字段
 * - 第3个任务（shouli）的document_url字段无法被检测到
 * 
 * 修复后效果：
 * - 第1个任务：通过file_name字段检测，使用downloadBaseUrl拼接
 * - 第3个任务：通过document_url字段检测，使用backendUrl拼接
 * - 第2个任务：仍然显示查看结果，因为它只包含普通数据
 */

export {
  testResult1,
  testResult2, 
  testResult3
};