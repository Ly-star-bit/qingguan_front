import { type IPdfElement } from '@chainlit/react-client';
import { Modal } from 'antd';

interface Props {
  element: IPdfElement;
  visible?: boolean;
  onClose?: () => void;
}

const PDFElement = ({ element, visible = true, onClose }: Props) => {
  if (!element.url) {
    return null;
  }
  
  const viewerUrl = `/pdfjs-5.3.93/web/viewer.html?file=${encodeURIComponent(
    element.url
  )}`;
  const url = element.page ? `${viewerUrl}#page=${element.page}` : viewerUrl;

  // 如果是内联显示模式，直接渲染 iframe
  if (element.display === 'inline') {
    return (
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <iframe
          className={`${element.display}-pdf border-none`}
          src={url}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    );
  }

  // 如果是模态框显示模式，使用 Modal 组件
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
      zIndex={2000}
    >
      <div style={{ height: '100%', width: '100%' }}>
        <iframe
          className={`${element.display}-pdf border-none`}
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    </Modal>
  );
};

export { PDFElement };
