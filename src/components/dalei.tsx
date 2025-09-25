import React, { useRef } from 'react';
import { EditableProTable, ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import axiosInstance from '@/utils/axiosInstance';
import { Button, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Search from 'antd/es/input/Search';

type Dalei = {
  id: number;
  属性: string;

  hs_code: string;
  类别: string;

  英文大类: string;
  中文大类: string;
  客供: string;
  备注: string;

};

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

const fetchDalei = async (params: { pageSize?: number; current?: number; hs_code?: string }) => {
  const { pageSize = 10, current = 1, hs_code } = params; // Provide default values
  const response = await axiosInstance.get(`${server_url}/qingguan/dalei/`, {
    params: { pageSize, current, hs_code },
  });
  return {
    data: response.data.items,
    success: true,
    total: response.data.total,
  };
};

const handleAdd = async (fields: Dalei) => {
  const hide = message.loading('正在添加');
  try {
    await axiosInstance.post(`${server_url}/qingguan/dalei/`, fields);
    hide();
    message.success('添加成功');
    return true;
  } catch (error) {
    hide();
    message.error('添加失败，请重试');
    return false;
  }
};

const handleUpdate = async (fields: Partial<Dalei>, currentRow?: Dalei) => {
  const hide = message.loading('正在更新');
  try {
    await axiosInstance.put(`${server_url}/qingguan/dalei/${currentRow?.id}`, fields);
    hide();
    message.success('更新成功');
    return true;
  } catch (error) {
    hide();
    message.error('更新失败，请重试');
    return false;
  }
};

const handleRemove = async (record: Dalei, actionRef: React.MutableRefObject<ActionType | undefined>) => {
    const hide = message.loading('正在删除');
  try {
    await axiosInstance.delete(`${server_url}/qingguan/dalei/${record.id}`);
    hide();
    message.success('删除成功');
    actionRef.current?.reload();
    return true;
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

const DaLei: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [editableKeys, setEditableRowKeys] = React.useState<React.Key[]>([]);

  const columns: ProColumns<Dalei>[] = [
    {
      title:'属性',
      dataIndex: '属性',
      valueType: 'text',
    },
    {
      title: '前6位',
      dataIndex: 'hs_code',
      valueType: 'text',
    },
    {
      title: '类别',
      dataIndex: '类别',
      valueType: 'text',
    },
    {
      title: '英文大类',
      dataIndex: '英文大类',
      valueType: 'text',
    },
    {
      title: '中文大类',
      dataIndex: '中文大类',
      valueType: 'text',
    },
    {
      title: '客供',
      dataIndex: '客供',
      valueType: 'text',
    },
    {
      title: '备注',
      dataIndex: '备注',
      valueType: 'text',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            action?.startEditable?.(record.id);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定要删除这条记录吗？"
          onConfirm={() => handleRemove(record, actionRef)}
          okText="是"
          cancelText="否"
        >
          <a>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  const handleSave = async (
    key: React.Key | React.Key[],
    record: Dalei,
    originRow: Dalei
  ) => {
    if (Array.isArray(key) || key === undefined) {
      return;
    }

    if (originRow.id === 0) {
      // Handle adding new data
      await handleAdd(record);
    } else {
      // Handle updating existing data
      await handleUpdate(record, originRow);
    }
    actionRef.current?.reload();
  };

  const getNewId = () => 0;

  return (
    <>
    <Search
      onSearch={(params) => fetchDalei({ hs_code: params })}
    />
    <ProTable<Dalei>
      headerTitle="大类管理"
      actionRef={actionRef}
      rowKey="id"
      search={false}
      request={(params) => fetchDalei(params)}
      columns={columns}
      editable={{
        type: 'multiple',
        editableKeys,
        onSave: handleSave,
        onChange: setEditableRowKeys,
      }}
      toolBarRender={() => [
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            actionRef.current?.addEditRecord?.({
              id: getNewId(),
              属性:'',
              hs_code: '',
              英文大类: '',
              中文大类: '',
              客供: '',
              备注: '',

            });
          }}
        >
          <PlusOutlined /> 新建
        </Button>,
      ]}
    />


</>
  );
};

export default DaLei;
