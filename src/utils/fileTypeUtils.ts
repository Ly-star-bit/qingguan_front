/**
 * 文件类型工具函数
 * 用于检测和分类不同类型的文件
 */

// 支持的文件类型枚举
export enum FileType {
  PDF = 'pdf',
  EXCEL = 'excel',
  IMAGE = 'image',
  TEXT = 'text',
  WORD = 'word',
  UNKNOWN = 'unknown'
}

// 文件扩展名到类型的映射
const EXTENSION_TO_TYPE: Record<string, FileType> = {
  // PDF
  '.pdf': FileType.PDF,
  
  // Excel
  '.xlsx': FileType.EXCEL,
  '.xls': FileType.EXCEL,
  '.csv': FileType.EXCEL,
  
  // 图片
  '.jpg': FileType.IMAGE,
  '.jpeg': FileType.IMAGE,
  '.png': FileType.IMAGE,
  '.gif': FileType.IMAGE,
  '.bmp': FileType.IMAGE,
  '.webp': FileType.IMAGE,
  '.svg': FileType.IMAGE,
  '.ico': FileType.IMAGE,
  
  // 文本
  '.txt': FileType.TEXT,
  '.json': FileType.TEXT,
  '.xml': FileType.TEXT,
  '.html': FileType.TEXT,
  '.htm': FileType.TEXT,
  '.css': FileType.TEXT,
  '.js': FileType.TEXT,
  '.ts': FileType.TEXT,
  '.jsx': FileType.TEXT,
  '.tsx': FileType.TEXT,
  '.md': FileType.TEXT,
  '.log': FileType.TEXT,
  
  // Word
  '.doc': FileType.WORD,
  '.docx': FileType.WORD,
};

// MIME类型到文件类型的映射
const MIME_TO_TYPE: Record<string, FileType> = {
  // PDF
  'application/pdf': FileType.PDF,
  
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileType.EXCEL,
  'application/vnd.ms-excel': FileType.EXCEL,
  'text/csv': FileType.EXCEL,
  
  // 图片
  'image/jpeg': FileType.IMAGE,
  'image/jpg': FileType.IMAGE,
  'image/png': FileType.IMAGE,
  'image/gif': FileType.IMAGE,
  'image/bmp': FileType.IMAGE,
  'image/webp': FileType.IMAGE,
  'image/svg+xml': FileType.IMAGE,
  'image/x-icon': FileType.IMAGE,
  
  // 文本
  'text/plain': FileType.TEXT,
  'application/json': FileType.TEXT,
  'text/xml': FileType.TEXT,
  'application/xml': FileType.TEXT,
  'text/html': FileType.TEXT,
  'text/css': FileType.TEXT,
  'application/javascript': FileType.TEXT,
  'text/javascript': FileType.TEXT,
  'text/markdown': FileType.TEXT,
  
  // Word
  'application/msword': FileType.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileType.WORD,
};

/**
 * 根据文件名获取文件扩展名
 * @param fileName 文件名
 * @returns 文件扩展名（小写，包含点）
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * 根据文件名检测文件类型
 * @param fileName 文件名
 * @returns 文件类型
 */
export function getFileTypeByName(fileName: string): FileType {
  const extension = getFileExtension(fileName);
  return EXTENSION_TO_TYPE[extension] || FileType.UNKNOWN;
}

/**
 * 根据MIME类型检测文件类型
 * @param mimeType MIME类型
 * @returns 文件类型
 */
export function getFileTypeByMime(mimeType: string): FileType {
  return MIME_TO_TYPE[mimeType.toLowerCase()] || FileType.UNKNOWN;
}

/**
 * 综合检测文件类型（优先使用MIME类型，其次使用文件名）
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 文件类型
 */
export function detectFileType(fileName: string, mimeType?: string): FileType {
  if (mimeType) {
    const typeByMime = getFileTypeByMime(mimeType);
    if (typeByMime !== FileType.UNKNOWN) {
      return typeByMime;
    }
  }
  
  return getFileTypeByName(fileName);
}

/**
 * 检查文件是否为图片类型
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 是否为图片
 */
export function isImageFile(fileName: string, mimeType?: string): boolean {
  return detectFileType(fileName, mimeType) === FileType.IMAGE;
}

/**
 * 检查文件是否为PDF类型
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 是否为PDF
 */
export function isPdfFile(fileName: string, mimeType?: string): boolean {
  return detectFileType(fileName, mimeType) === FileType.PDF;
}

/**
 * 检查文件是否为Excel类型
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 是否为Excel
 */
export function isExcelFile(fileName: string, mimeType?: string): boolean {
  return detectFileType(fileName, mimeType) === FileType.EXCEL;
}

/**
 * 检查文件是否为文本类型
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 是否为文本
 */
export function isTextFile(fileName: string, mimeType?: string): boolean {
  return detectFileType(fileName, mimeType) === FileType.TEXT;
}

/**
 * 检查文件是否为Word类型
 * @param fileName 文件名
 * @param mimeType MIME类型（可选）
 * @returns 是否为Word
 */
export function isWordFile(fileName: string, mimeType?: string): boolean {
  return detectFileType(fileName, mimeType) === FileType.WORD;
}

/**
 * 获取文件类型的显示名称
 * @param fileType 文件类型
 * @returns 显示名称
 */
export function getFileTypeDisplayName(fileType: FileType): string {
  const displayNames: Record<FileType, string> = {
    [FileType.PDF]: 'PDF文档',
    [FileType.EXCEL]: 'Excel表格',
    [FileType.IMAGE]: '图片',
    [FileType.TEXT]: '文本文件',
    [FileType.WORD]: 'Word文档',
    [FileType.UNKNOWN]: '未知文件类型'
  };
  
  return displayNames[fileType];
}

/**
 * 检查文件类型是否支持预览
 * @param fileType 文件类型
 * @returns 是否支持预览
 */
export function isPreviewSupported(fileType: FileType): boolean {
  return [FileType.PDF, FileType.EXCEL, FileType.IMAGE, FileType.TEXT].includes(fileType);
}
