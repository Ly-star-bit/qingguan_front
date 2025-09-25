'use client';

import React, { useEffect, useRef } from 'react';

type DocumentViewerProps = {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  buffer?: ArrayBuffer;  // 新增：文档的 ArrayBuffer 数据
  fileName?: string;     // 新增：文件名（需要包含扩展名，如 .docx）
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  width = '100%', 
  height = '800px', 
  style,
  buffer,
  fileName = 'document.docx' // 默认文件名
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const defaultStyles: React.CSSProperties = {
    border: 'none',
    ...style,
  };

  useEffect(() => {
    // 如果提供了 buffer，等待 iframe 加载完成后发送数据
    if (buffer) {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const handleIframeLoad = () => {
        // 发送数据到 iframe
        iframe.contentWindow?.postMessage({
          type: 'RENDER_BUFFER',
          data: {
            buffer: buffer,
            fileName: fileName
          }
        }, '*');
      };

      // 如果 iframe 已经加载完成
      if (iframe.contentWindow?.document.readyState === 'complete') {
        handleIframeLoad();
      } else {
        // 如果 iframe 还在加载中，等待加载完成
        iframe.addEventListener('load', handleIframeLoad);
        return () => iframe.removeEventListener('load', handleIframeLoad);
      }
    }
  }, [buffer, fileName]);

  return (
    <iframe
      ref={iframeRef}
      src="/document/index.html"
      width={width}
      height={height}
      style={defaultStyles}
      title="Document Viewer"
    />
  );
};

export default DocumentViewer;