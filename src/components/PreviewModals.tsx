import React, { useRef, useState, useEffect } from 'react';
import { Modal, Image, Typography, Spin, Alert, Button } from 'antd';
import { PDFElement } from '@/components/PDF';
import { type IPdfElement } from '@chainlit/react-client';
import { FileType, detectFileType, getFileTypeDisplayName, isPreviewSupported } from '@/utils/fileTypeUtils';

const { Text, Paragraph } = Typography;

interface PDFPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  previewElement: IPdfElement | null;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ 
  visible, 
  onClose, 
  previewElement 
}) => {
  return (
    <Modal
      title="PDF预览"
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: 10 }}
      bodyStyle={{ 
        height: 'calc(100vh - 100px)',
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {previewElement && (
        <div style={{ height: '100%', width: '100%' }}>
          <PDFElement
            element={previewElement}
          />
        </div>
      )}
    </Modal>
  );
};

interface ExcelPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  excelPreviewData: ArrayBuffer | null;
  currentPreviewFile: string;
  serverUrl: string;
}

export const ExcelPreviewModal: React.FC<ExcelPreviewModalProps> = ({
  visible,
  onClose,
  excelPreviewData,
  currentPreviewFile,
  serverUrl
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (visible && excelPreviewData && iframeLoaded) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'loadExcel',
            fileData: excelPreviewData,
            fileName: currentPreviewFile
          }, '*');
        }, 100);
      }
    }
    return () => {
      setIframeLoaded(false);
    };
  }, [visible, excelPreviewData, currentPreviewFile, iframeLoaded]);

  return (
    <Modal
      title="Excel预览"
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: 20 }}
      bodyStyle={{ height: 'calc(90vh - 108px)', padding: 0, overflow: 'hidden' }}
      destroyOnClose={true}
    >
      {excelPreviewData && (
        <div style={{ width: '100%', height: '100%' }}>
          <iframe
            ref={iframeRef}
            key={currentPreviewFile}
            src={`${serverUrl}/luckysheet-preview`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            onLoad={() => {
              setIframeLoaded(true);
            }}
          />
        </div>
      )}
    </Modal>
  );
};

interface ImagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  onClose,
  imageUrl,
  title = "图片预览"
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: 20 }}
      bodyStyle={{ 
        padding: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '20px'
      }}>
        <Image
          src={imageUrl}
          alt="图片预览"
          style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 108px)' }}
          preview={false} // 禁用内置预览，因为我们已经在Modal中
        />
      </div>
    </Modal>
  );
};

// 更高级的图片预览组件，支持缩放、旋转等功能
export const AdvancedImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  onClose,
  imageUrl,
  title = "图片预览"
}) => {
  // 使用Ant Design的Image.PreviewGroup组件实现高级预览功能
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // 当Modal打开时自动显示预览
  React.useEffect(() => {
    if (visible) {
      setPreviewVisible(true);
    } else {
      setPreviewVisible(false);
    }
  }, [visible]);

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: 20 }}
      bodyStyle={{ 
        padding: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '20px'
      }}>
        <Image.PreviewGroup
          preview={{
            visible: previewVisible,
            onVisibleChange: (vis) => {
              setPreviewVisible(vis);
              if (!vis) {
                onClose();
              }
            },
            countRender: () => null, // 隐藏计数器
          }}
        >
          <Image
            src={imageUrl}
            alt="图片预览"
            style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 108px)' }}
          />
        </Image.PreviewGroup>
      </div>
    </Modal>
  );
};

// 文本预览组件
interface TextPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  textContent: string;
  fileName?: string;
  title?: string;
}

export const TextPreviewModal: React.FC<TextPreviewModalProps> = ({
  visible,
  onClose,
  textContent,
  fileName,
  title
}) => {
  const modalTitle = title || `文本预览${fileName ? ` - ${fileName}` : ''}`;

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: 20 }}
      styles={{
        body: {
          height: 'calc(90vh - 108px)',
          padding: '16px',
          overflow: 'auto'
        }
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        <Text>{textContent}</Text>
      </div>
    </Modal>
  );
};

// Word文档预览组件（暂时显示不支持预览的提示）
interface WordPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  fileName?: string;
  title?: string;
  downloadUrl?: string;
}

export const WordPreviewModal: React.FC<WordPreviewModalProps> = ({
  visible,
  onClose,
  fileName,
  title,
  downloadUrl
}) => {
  const modalTitle = title || `Word文档${fileName ? ` - ${fileName}` : ''}`;

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'document.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      width="60%"
      footer={null}
      style={{ top: 20 }}
    >
      <div style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <Alert
          message="Word文档预览"
          description="当前不支持Word文档的在线预览，请下载文件后使用相应软件打开。"
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />
        {downloadUrl && (
          <Button type="primary" onClick={handleDownload}>
            下载文档
          </Button>
        )}
      </div>
    </Modal>
  );
};

// Excel预览内容组件（用于通用预览组件内部）
interface ExcelPreviewContentProps {
  data: ArrayBuffer;
  fileName: string;
  serverUrl: string;
}

const ExcelPreviewContent: React.FC<ExcelPreviewContentProps> = ({ data, fileName, serverUrl }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (data && iframeLoaded) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'loadExcel',
            fileData: data,
            fileName: fileName
          }, '*');
        }, 100);
      }
    }
    return () => {
      setIframeLoaded(false);
    };
  }, [data, fileName, iframeLoaded]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        key={fileName}
        src={`${serverUrl}/luckysheet-preview`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        onLoad={() => {
          setIframeLoaded(true);
        }}
      />
    </div>
  );
};

// 通用文件预览组件的数据接口
export interface UniversalPreviewData {
  fileName: string;
  fileType?: FileType;
  mimeType?: string;
  // PDF预览数据
  pdfElement?: IPdfElement;
  // Excel预览数据
  excelData?: ArrayBuffer;
  serverUrl?: string;
  // 图片预览数据
  imageUrl?: string;
  // 文本预览数据
  textContent?: string;
  // Word文档下载链接
  downloadUrl?: string;
}

// 通用文件预览组件
interface UniversalFilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: UniversalPreviewData | null;
  title?: string;
}

export const UniversalFilePreviewModal: React.FC<UniversalFilePreviewModalProps> = ({
  visible,
  onClose,
  data,
  title
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检测文件类型
  const fileType = data ? (data.fileType || detectFileType(data.fileName, data.mimeType)) : FileType.UNKNOWN;

  // 检查是否支持预览
  const supported = isPreviewSupported(fileType);

  const modalTitle = title || `${getFileTypeDisplayName(fileType)}预览 - ${data?.fileName || ''}`;

  useEffect(() => {
    if (visible && data) {
      setError(null);
      setLoading(false);
    }
  }, [visible, data]);

  // 渲染不同类型的预览内容
  const renderPreviewContent = () => {
    if (!data) return null;

    if (!supported) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Alert
            message="不支持的文件类型"
            description={`当前不支持 ${getFileTypeDisplayName(fileType)} 类型文件的在线预览。`}
            type="warning"
            showIcon
            style={{ marginBottom: '20px' }}
          />
          {data.downloadUrl && (
            <Button
              type="primary"
              onClick={() => {
                const link = document.createElement('a');
                link.href = data.downloadUrl!;
                link.download = data.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              下载文件
            </Button>
          )}
        </div>
      );
    }

    switch (fileType) {
      case FileType.PDF:
        if (!data.pdfElement) {
          return (
            <Alert
              message="PDF预览数据缺失"
              description="无法加载PDF预览数据，请检查文件是否存在。"
              type="error"
              showIcon
            />
          );
        }
        return (
          <div style={{ height: '100%', width: '100%' }}>
            <PDFElement element={data.pdfElement} />
          </div>
        );

      case FileType.EXCEL:
        if (!data.excelData || !data.serverUrl) {
          return (
            <Alert
              message="Excel预览数据缺失"
              description="无法加载Excel预览数据，请检查文件是否存在。"
              type="error"
              showIcon
            />
          );
        }
        return <ExcelPreviewContent data={data.excelData} fileName={data.fileName} serverUrl={data.serverUrl} />;

      case FileType.IMAGE:
        if (!data.imageUrl) {
          return (
            <Alert
              message="图片预览数据缺失"
              description="无法加载图片预览数据，请检查文件是否存在。"
              type="error"
              showIcon
            />
          );
        }
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <Image
              src={data.imageUrl}
              alt={data.fileName}
              style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 108px)' }}
              preview={false}
            />
          </div>
        );

      case FileType.TEXT:
        if (!data.textContent) {
          return (
            <Alert
              message="文本预览数据缺失"
              description="无法加载文本预览数据，请检查文件是否存在。"
              type="error"
              showIcon
            />
          );
        }
        return (
          <div style={{
            width: '100%',
            height: '100%',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: '16px',
            overflow: 'auto'
          }}>
            <Text>{data.textContent}</Text>
          </div>
        );

      default:
        return (
          <Alert
            message="未知文件类型"
            description="无法识别文件类型，无法进行预览。"
            type="warning"
            showIcon
          />
        );
    }
  };

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      width="90%"
      footer={null}
      style={{ top: fileType === FileType.PDF ? 10 : 20 }}
      styles={{
        body: {
          height: fileType === FileType.PDF ? 'calc(100vh - 100px)' : 'calc(90vh - 108px)',
          padding: fileType === FileType.TEXT ? 0 : fileType === FileType.IMAGE ? 0 : 0,
          overflow: fileType === FileType.TEXT ? 'hidden' : 'hidden'
        }
      }}
      destroyOnClose={true}
      zIndex={2000} // Highest z-index to ensure tax document previews are always on top
    >
      <Spin spinning={loading}>
        {error ? (
          <Alert
            message="预览失败"
            description={error}
            type="error"
            showIcon
          />
        ) : (
          renderPreviewContent()
        )}
      </Spin>
    </Modal>
  );
};



