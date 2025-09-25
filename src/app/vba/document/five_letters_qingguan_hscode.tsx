import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Form, AutoComplete, Input, message, Modal, Button } from 'antd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Box from '@mui/material/Box';
import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

export interface five_letters_hscode {
  id: string;
  ReferenceNumber: string;
  Goods: string;
  chinese_goods: string;
  类别: string;
  客供: string;
  备注: string;
}

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

const FiveLettersHscode: React.FC = () => {
  const [fiveLettersHscode, setFiveLettersHscode] = useState<five_letters_hscode[]>([]);
  const [filteredFiveLettersHscode, setFilteredFiveLettersHscode] = useState<five_letters_hscode[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const userName = useSelector((state: RootState) => state.user.name);

  const fetchFiveLettersHscode = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${server_url}/5_letters_hscode/?get_all=true`);
      setFiveLettersHscode(response.data.items);
      setFilteredFiveLettersHscode(response.data.items);
    } catch (error: any) {
      console.error('Failed to fetch products', error);
    }
  }, []);

  useEffect(() => {
    fetchFiveLettersHscode();
  }, [userName, fetchFiveLettersHscode]);

  const handleSelectChange = (value: string | undefined) => {
    if (!value || value.trim() === '') {
      setFilteredFiveLettersHscode(fiveLettersHscode);
    } else {
      const filtered = fiveLettersHscode.filter(p => p.chinese_goods.includes(value));
      setFilteredFiveLettersHscode(filtered);
    }
  };

  const handleHSCodeChange = (value: string | undefined) => {
    if (!value || value.trim() === '') {
      setFilteredFiveLettersHscode(fiveLettersHscode);
    } else {
      const filtered = fiveLettersHscode.filter(p => p.ReferenceNumber.includes(value));
      setFilteredFiveLettersHscode(filtered);
    }
  };
  const handleDeleteClick = (id: string) => async () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条数据吗?',
      onOk: async () => {
        try {
          const response = await axiosInstance.delete(`${server_url}/5_letters_hscode/${id}`);

          const deletedItem = response.data;

          setFiveLettersHscode(prevRows => prevRows.filter(row => row.id !== deletedItem.id));
          setFilteredFiveLettersHscode(prevRows => prevRows.filter(row => row.id !== deletedItem.id));
          message.success('删除成功');

        } catch (error: any) {
          console.error('删除操作失败:', error);
          message.error(error.response?.data?.detail || error.message || '删除失败');
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const handleEditClick = (id: string) => () => {
    const rowToEdit = fiveLettersHscode.find(row => row.id === id);
    if (rowToEdit) {
      editForm.setFieldsValue(rowToEdit);
      setEditRowId(id);
      setEditModalVisible(true);
    }
  };
  const handleSaveClick = async () => {
    try {
      const values = await editForm.validateFields();
      const id = editRowId;

      // 将undefined值转换为空字符串
      for (const key in values) {
        if (values[key] === undefined) {
          values[key] = '';
        }
      }

      const formData = new FormData();
      for (const key in values) {
        formData.append(key, values[key]);
      }


      const response = await axiosInstance.put(`${server_url}/5_letters_hscode/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedItem = response.data;

      setFiveLettersHscode(prevRows =>
        prevRows.map(row => (row.id === id ? { ...row, ...updatedItem } : row))
      );
      setFilteredFiveLettersHscode(prevRows =>
        prevRows.map(row => (row.id === id ? { ...row, ...updatedItem } : row))
      );

      setEditModalVisible(false);
      setEditRowId(null);
      message.success('更新成功');

    } catch (error: any) {
      console.error('更新操作失败:', error);
      message.error(error.response?.data?.detail || error.message || '更新失败');
    }
  };

  const handleCancelClick = () => {
    setEditModalVisible(false);
    setEditRowId(null);
  };

  const handleCreateClick = () => {
    setCreateModalVisible(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();

      // 将undefined值转换为空字符串
      for (const key in values) {
        if (values[key] === undefined) {
          values[key] = '';
        }
      }

      const formData = new FormData();
      for (const key in values) {
        formData.append(key, values[key]);
      }

      const response = await axiosInstance.post(`${server_url}/5_letters_hscode/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newItem = response.data;

      setFiveLettersHscode(prevRows => [...prevRows, newItem]);
      setFilteredFiveLettersHscode(prevRows => [...prevRows, newItem]);

      setCreateModalVisible(false);
      createForm.resetFields();
      message.success('创建成功');

    } catch (error: any) {
      console.error('创建操作失败:', error);
      message.error(error.response?.data?.detail || error.message || '创建失败');
    }
  };

  const handleCancelCreate = () => {
    setCreateModalVisible(false);
    createForm.resetFields();
  };


  const columns: GridColDef<five_letters_hscode>[] = [
    {
      field: 'ReferenceNumber',
      headerName: 'HSCode',
      width: 150,
    },
    {
      field: 'Goods',
      headerName: '英文',
      width: 300,
    },
    {
      field: 'chinese_goods',
      headerName: '中文',
      width: 200,
    },
    {
      field: '类别',
      headerName: '类别',
      width: 150,
    },
    {
      field: '客供',
      headerName: '客供',
      width: 100,
    },
    {
      field: '备注',
      headerName: '备注',
      width: 200,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        return [
          <GridActionsCellItem
            key={`edit-${id}`}
            icon={<EditIcon />}
            label="Edit"
            onClick={handleEditClick(id as string)}

          />,
          <GridActionsCellItem
            key={`delete-${id}`}
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(id as string)}
          />,
        ];
      },
    },
  ];

  return (
    <div>
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="选择中文品名">
          <AutoComplete
            style={{ width: 200 }}
            onChange={handleSelectChange}
            placeholder="输入中文品名"
            allowClear
            options={fiveLettersHscode.map(product => ({
              value: product.chinese_goods,
              label: product.chinese_goods,
            }))}
          >
            <Input />
          </AutoComplete>
        </Form.Item>
        <Form.Item label="选择ReferenceNumber">
          <AutoComplete
            style={{ width: 200 }}
            onChange={handleHSCodeChange}
            placeholder="输入ReferenceNumber"
            allowClear
            options={fiveLettersHscode.map(product => ({
              value: product.ReferenceNumber,
              label: product.ReferenceNumber,
            }))}
          >
            <Input />
          </AutoComplete>
        </Form.Item>
      </Form>
      <Button type="primary" onClick={handleCreateClick} style={{ marginBottom: 16 }}>
        新增数据
      </Button>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredFiveLettersHscode}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: pageSize,
              },
            },
          }}
          pageSizeOptions={[10, 20, 30, 40, fiveLettersHscode.length]}
          onPaginationModelChange={(params) => setPageSize(params.pageSize)}
        />
      </Box>
      <Modal
        title="编辑"
        open={editModalVisible}
        onOk={handleSaveClick}
        onCancel={handleCancelClick}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="ReferenceNumber" label="HSCode">
            <Input />
          </Form.Item>
          <Form.Item name="Goods" label="英文">
            <Input />
          </Form.Item>
          <Form.Item name="chinese_goods" label="中文">
            <Input />
          </Form.Item>
          <Form.Item name="类别" label="类别">
            <Input />
          </Form.Item>
          <Form.Item name="客供" label="客供">
            <Input />
          </Form.Item>
          <Form.Item name="备注" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增数据"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={handleCancelCreate}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="ReferenceNumber" label="HSCode">
            <Input />
          </Form.Item>
          <Form.Item name="Goods" label="英文">
            <Input />
          </Form.Item>
          <Form.Item name="chinese_goods" label="中文">
            <Input />
          </Form.Item>
          <Form.Item name="类别" label="类别">
            <Input />
          </Form.Item>
          <Form.Item name="客供" label="客供">
            <Input />
          </Form.Item>
          <Form.Item name="备注" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FiveLettersHscode;