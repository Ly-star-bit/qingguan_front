import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Input, Modal, message, Select, Card, Row, Col, Space, Spin, InputNumber, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css";
import axiosInstance from '@/utils/axiosInstance';
import moment from 'moment';

const { confirm } = Modal;
const { Option } = Select;
const { TextArea } = Input;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Tariff {
    id: string;
    start_land: string;
    destination: string;
    category: string | string[];
    tariff_type: string;
    tariff_rate: number;
    description?: string;
    created_at: string;
    updated_at: string;
}

const TariffManagement: React.FC = () => {
    const [tariffs, setTariffs] = useState<Tariff[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [tariffTypes, setTariffTypes] = useState<string[]>([]);

    const [tariffForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    useEffect(() => {
        fetchAllTariffs();
        fetchCategories();
        fetchTariffTypes();
    }, []);

    const fetchAllTariffs = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/tariff/list/all`);
            setTariffs(response.data);
        } catch (error: any) {
            if (error.response?.status === 404) {
                setTariffs([]);
                message.info('暂无关税数据');
            } else {
                message.error('获取关税列表失败');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (startland?: string, destination?: string) => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/tariff/categories/list`);
            setCategories(response.data);
        } catch (error) {
            console.log('暂无类别数据');
        }
    };

    const fetchProductCategories = async (startland: string, destination: string) => {
        try {
            const response = await axiosInstance.get(
                `${server_url}/qingguan/products/categories/list?startland=${startland}&destination=${destination}`
            );
            return response.data.categories || [];
        } catch (error) {
            console.log('获取产品类别失败');
            return [];
        }
    };

    const fetchTariffTypes = async () => {
        try {
            const response = await axiosInstance.get(`${server_url}/qingguan/tariff/tariff-types/list`);
            setTariffTypes(response.data);
        } catch (error) {
            console.log('暂无关税类型数据');
        }
    };

    const handleAdd = () => {
        setEditingTariff(null);
        tariffForm.resetFields();
        setCategories([]);
        setIsModalVisible(true);
    };

    const handleEdit = async (record: Tariff) => {
        setEditingTariff(record);

        // 先加载产品类别列表
        const cats = await fetchProductCategories(record.start_land, record.destination);
        setCategories(cats);

        // 确保category是数组格式
        let categoryValue = record.category;
        if (typeof categoryValue === 'string') {
            categoryValue = [categoryValue];
        }

        tariffForm.setFieldsValue({
            start_land: record.start_land,
            destination: record.destination,
            category: categoryValue,
            tariff_type: record.tariff_type,
            tariff_rate: record.tariff_rate * 100, // 转换为百分比显示
            description: record.description
        });

        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: '确定要删除此关税规则吗？',
            onOk: async () => {
                try {
                    await axiosInstance.delete(`${server_url}/qingguan/tariff/${id}`);
                    message.success('删除成功');
                    fetchAllTariffs();
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    const handleSubmit = async (values: any) => {
        confirm({
            title: '确认',
            icon: <ExclamationCircleOutlined />,
            content: editingTariff ? '确定要修改此关税规则吗？' : '确定要添加此关税规则吗？',
            onOk: async () => {
                try {
                    const submitData = {
                        start_land: values.start_land,
                        destination: values.destination,
                        category: values.category,
                        tariff_type: values.tariff_type,
                        tariff_rate: values.tariff_rate / 100, // 转换为小数
                        description: values.description || ''
                    };

                    if (editingTariff) {
                        await axiosInstance.put(`${server_url}/qingguan/tariff/${editingTariff.id}`, submitData);
                        message.success('修改成功');
                    } else {
                        await axiosInstance.post(`${server_url}/qingguan/tariff/create`, submitData);
                        message.success('添加成功');
                    }

                    setIsModalVisible(false);
                    tariffForm.resetFields();
                    fetchAllTariffs();
                    fetchCategories();
                    fetchTariffTypes();
                } catch (error: any) {
                    if (error.response?.status === 409) {
                        message.error('关税规则已存在');
                    } else {
                        message.error(editingTariff ? '修改失败' : '添加失败');
                    }
                }
            }
        });
    };

    const handleSearch = async (values: any) => {
        const { start_land, destination, category, tariff_type } = values;

        // 如果所有搜索条件都为空，则获取全部数据
        if (!start_land && !destination && !category && !tariff_type) {
            fetchAllTariffs();
            return;
        }

        setLoading(true);
        try {
            const response = await axiosInstance.post(`${server_url}/qingguan/tariff/query`, {
                start_land: start_land || null,
                destination: destination || null,
                category: category || null,
                tariff_type: tariff_type || null
            });
            setTariffs(response.data);
            message.success(`找到 ${response.data.length} 条记录`);
        } catch (error: any) {
            if (error.response?.status === 404) {
                setTariffs([]);
                message.info('未找到匹配的关税规则');
            } else {
                message.error('查询失败');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        searchForm.resetFields();
        fetchAllTariffs();
    };

    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            width: 60,
            render: (_: any, __: any, index: number) => index + 1
        },
        {
            title: '出发国家',
            dataIndex: 'start_land',
            key: 'start_land',
            width: 100
        },
        {
            title: '目的国家',
            dataIndex: 'destination',
            key: 'destination',
            width: 100
        },
        {
            title: '产品大类',
            dataIndex: 'category',
            key: 'category',
            width: 200,
            render: (category: string | string[]) => {
                const categories = Array.isArray(category) ? category : [category];
                const filtered = categories.filter(Boolean);

                if (filtered.length === 0) return '-';

                return (
                    <div style={{
                        maxHeight: '80px',
                        overflow: 'auto',
                        paddingRight: '4px'
                    }}>
                        <Space size="small" wrap>
                            {filtered.map((cat, idx) => (
                                <Tag key={idx} color="blue">
                                    {cat}
                                </Tag>
                            ))}
                        </Space>
                    </div>
                );
            }
        },

        {
            title: '关税类型',
            dataIndex: 'tariff_type',
            key: 'tariff_type',
            width: 120
        },
        {
            title: '税率',
            dataIndex: 'tariff_rate',
            key: 'tariff_rate',
            width: 100,
            render: (rate: number) => `${(rate * 100).toFixed(2)}%`
        },
        {
            title: '备注说明',
            dataIndex: 'description',
            key: 'description',
            width: 200,
            ellipsis: true
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            render: (text: string) => moment(text).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 150,
            render: (text: string) => moment(text).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right' as const,
            render: (_: any, record: Tariff) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>加征关税管理</h1>

            {/* 搜索区域 */}
            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={searchForm}
                    onFinish={handleSearch}
                    layout="vertical"
                >
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item label="出发国家" name="start_land">
                                <Input placeholder="如：USA, China" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="目的国家" name="destination">
                                <Input placeholder="如：CN, USA" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="产品大类" name="category">
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="请选择产品大类"
                                    options={categories.map(cat => ({ label: cat, value: cat }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="关税类型" name="tariff_type">
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="请选择关税类型"
                                    options={tariffTypes.map(type => ({ label: type, value: type }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row justify="end">
                        <Space>
                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                查询
                            </Button>
                            <Button onClick={handleReset}>
                                重置
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                新增关税
                            </Button>
                        </Space>
                    </Row>
                </Form>
            </Card>

            {/* 表格区域 */}
            <Spin spinning={loading}>
                <Table
                    className={styles.table}
                    dataSource={tariffs}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    scroll={{ x: 1500 }}
                />
            </Spin>

            {/* 新增/编辑模态框 */}
            <Modal
                title={editingTariff ? '编辑关税规则' : '新增关税规则'}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    tariffForm.resetFields();
                    setEditingTariff(null);
                }}
                onOk={() => tariffForm.submit()}
                width={600}
            >
                <Form
                    form={tariffForm}
                    onFinish={handleSubmit}
                    layout="vertical"
                    onValuesChange={async (changedValues) => {
                        // 当起运地或目的地改变时，重新获取产品类别
                        if (changedValues.start_land !== undefined || changedValues.destination !== undefined) {
                            const startLand = tariffForm.getFieldValue('start_land');
                            const destination = tariffForm.getFieldValue('destination');

                            if (startLand && destination) {
                                const cats = await fetchProductCategories(startLand, destination);
                                setCategories(cats);
                                // 清空已选择的类别
                                tariffForm.setFieldsValue({ category: undefined });
                            }
                        }
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="出发国家"
                                name="start_land"
                                rules={[{ required: true, message: '请输入出发国家' }]}
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="请选择出发国家"
                                >
                                    <Option value="China">China</Option>
                                    <Option value="Vietnam">Vietnam</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="目的国家"
                                name="destination"
                                rules={[{ required: true, message: '请输入目的国家' }]}
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="请选择目的国家"
                                >
                                    <Option value="America">America</Option>
                                    <Option value="Canada">Canada</Option>
                                    <Option value="Europe">Europe</Option>
                                    <Option value="Australia">Australia</Option>
                                    <Option value="England">England</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="产品大类"
                                name="category"
                                rules={[{ required: true, message: '请输入产品大类' }]}
                            >
                                <Select
                                    mode="tags"
                                    showSearch
                                    allowClear
                                    placeholder="请先选择起运地和目的地"
                                    options={[
                                        { label: '*全部', value: '*全部' },
                                        ...categories.map(cat => ({ label: cat, value: cat }))
                                    ]}
                                    disabled={categories.length === 0}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="关税类型"
                                name="tariff_type"
                                rules={[{ required: true, message: '请输入关税类型' }]}
                            >
                                <Input placeholder="请输入关税类型，如：加征_301" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="税率 (%)"
                        name="tariff_rate"
                        rules={[
                            { required: true, message: '请输入税率' },
                            { type: 'number', min: 0, max: 100, message: '税率范围为0-100' }
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            placeholder="请输入税率，如：25 表示 25%"
                            min={0}
                            max={100}
                            step={0.01}
                        />
                    </Form.Item>

                    <Form.Item
                        label="备注说明"
                        name="description"
                    >
                        <TextArea
                            rows={4}
                            placeholder="请输入备注说明..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TariffManagement;
