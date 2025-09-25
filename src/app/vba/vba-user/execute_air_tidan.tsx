
"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Form, Button, Input, Modal, Select, DatePicker, Checkbox, Typography, message, InputNumber, Row, Col, Space, Upload, FormInstance, Tooltip, AutoComplete } from 'antd'; // 1. 引入 AutoComplete
import { DeleteOutlined, PlusOutlined, UploadOutlined, HistoryOutlined, SyncOutlined, FullscreenOutlined } from '@ant-design/icons';
import styles from "@/styles/Home.module.css"
import { ShipperReceiver } from "./types" // Removed unused types
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const { Option } = Select;

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

interface SubmissionHistoryEntry {
    _id?: string;
    formValues: any;
    timestamp: string;
    type?: string;
    user?: string;
}

// ============== Start of SubOrderFields Component ==============
interface SubOrderFieldsProps {
    form: FormInstance;
    name: number;
    restField: any;
    remove: (index: number) => void;
    shippersAndReceivers: ShipperReceiver[];
}

const SubOrderFields: React.FC<SubOrderFieldsProps> = ({ form, name, restField, remove, shippersAndReceivers }) => {
    const subOrderType = Form.useWatch(['subOrders', name, 'type'], form);
    const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
    const [fullscreenContent, setFullscreenContent] = useState('');
    
    // Effect to sync modal content with form field when modal is open
    useEffect(() => {
        if (isFullscreenModalOpen) {
            const formValue = form.getFieldValue(['subOrders', name, 'natureOfName']) || '';
            if (formValue !== fullscreenContent) {
                setFullscreenContent(formValue);
            }
        }
    }, [isFullscreenModalOpen, form, name, fullscreenContent]);

    const normFile = (e: any) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    const extractInfoFromClipboard = async () => {
        try {
            if (!navigator.clipboard) {
                message.error('您的浏览器不支持剪切板API，请在完整文本内容框中手动粘贴内容，然后点击"解析文本框内容"按钮');
                return;
            }
            const text = await navigator.clipboard.readText();
            if (!text) {
                message.error('剪切板中没有内容，请先复制相关信息');
                return;
            }
            parseAndSetInfo(text, form, name);
        } catch (error: any) {
            console.error('读取剪切板失败:', error);
            if (error.name === 'NotAllowedError') {
                message.info('由于浏览器安全限制，无法直接读取剪切板。\n请按以下步骤操作：\n1. 在下方的"完整文本内容"框中按Ctrl+V粘贴内容\n2. 点击"解析文本框内容"按钮\n或者：刷新页面后再次尝试点击此按钮');
            } else if (error.name === 'NotFoundError') {
                message.error('剪切板中没有内容，请先复制相关信息');
            } else {
                message.info('无法读取剪切板。\n请在下方的"完整文本内容"框中按Ctrl+V粘贴内容，\n然后点击"解析文本框内容"按钮');
            }
        }
    };

    const parseAndSetInfo = (text: string, form: FormInstance, name: number) => {
        const shipperMatch = text.match(/SHIPPER:\s*([\s\S]*?)(?:\n\s*\n|CNEE:|进口商信息:)/i);
        let shipperInfo = shipperMatch ? shipperMatch[1].trim() : '';

        let importerInfo = '';
        const companyMatch = text.match(/Company:\s*([^\n\r]+)/i);
        const addressMatch = text.match(/Address:\s*([^\n\r]+)/i);
        const einMatch = text.match(/EIN.*?:\s*([^\n\r]+)/i);
        const company = companyMatch ? companyMatch[1].trim() : '';
        const address = addressMatch ? addressMatch[1].trim() : '';
        const ein = einMatch ? einMatch[1].trim() : '';
        if (company || address || ein) {
            importerInfo = `${company}\n${address}\n${ein}`.trim();
        }

        const currentSubOrders = form.getFieldValue('subOrders') || [];
        const newSubOrders = [...currentSubOrders];

        if (!newSubOrders[name]) newSubOrders[name] = {};
        
        if (shipperInfo) {
            newSubOrders[name].sender = shipperInfo;
        }
        if (importerInfo) {
            newSubOrders[name].receiver = importerInfo;
        }
        
        form.setFieldsValue({ subOrders: newSubOrders });

        let resultMessage = '信息提取成功！';
        const details = [];
        if (shipperInfo) details.push('发货人信息');
        if (importerInfo) details.push('进口商信息');
        
        if (details.length > 0) {
            resultMessage += ` 已提取: ${details.join(', ')}`;
        } else {
            resultMessage += ' 未找到标准格式信息，请检查剪切板内容格式';
        }
        message.success(resultMessage);
    };

    const parseTextContent = (name: number, form: FormInstance) => {
        try {
            const fullText = form.getFieldValue(['subOrders', name, 'fullText']) || '';
            if (!fullText) {
                message.info('请先在完整文本内容框中粘贴需要解析的内容');
                return;
            }
            parseAndSetInfo(fullText, form, name);
        } catch (error) {
            console.error('解析文本内容失败:', error);
            message.error('解析文本内容失败，请检查内容格式');
        }
    };

    const handleFullscreenModalOk = () => {
        // Save the content to form before closing
        const currentSubOrders = form.getFieldValue('subOrders') || [];
        const newSubOrders = [...currentSubOrders];
        if (!newSubOrders[name]) newSubOrders[name] = {};
        newSubOrders[name].natureOfName = fullscreenContent;
        form.setFieldsValue({ subOrders: newSubOrders });
        setIsFullscreenModalOpen(false);
    };

    const handleFullscreenModalCancel = () => {
        // Revert to original form value when canceling
        const originalContent = form.getFieldValue(['subOrders', name, 'natureOfName']) || '';
        setFullscreenContent(originalContent);
        setIsFullscreenModalOpen(false);
    };

    const handleFullscreenContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setFullscreenContent(newContent);
    };

    return (
        <>
            <Modal
                title="Nature of Name - 全屏编辑"
                open={isFullscreenModalOpen}
                onOk={handleFullscreenModalOk}
                onCancel={handleFullscreenModalCancel}
                width="90%"
                style={{ top: 20 }}
                footer={[
                    <Button key="back" onClick={handleFullscreenModalCancel}>
                        关闭
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleFullscreenModalOk}>
                        保存
                    </Button>,
                ]}
            >
                <Input.TextArea
                    value={fullscreenContent}
                    onChange={handleFullscreenContentChange}
                    placeholder="请输入Nature of Name信息"
                    autoSize={{ minRows: 15, maxRows: 30 }}
                    style={{ fontSize: '14px' }}
                />
            </Modal>
        <div style={{
            border: '1px solid #d9d9d9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            position: 'relative',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #f0f0f0'
            }}>
                <Typography.Text strong style={{ fontSize: '16px', color: '#1890ff' }}>分单 {name + 1}</Typography.Text>
                <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    style={{ color: 'red' }}
                />
            </div>
            <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'type']} label="类型" rules={[{ required: true, message: '请选择类型' }]} initialValue="包税">
                        <Select onChange={(value) => {
                            // 当类型切换时，清空分单数据
                            const currentSubOrders = form.getFieldValue('subOrders') || [];
                            const newSubOrders = [...currentSubOrders];
                            if (!newSubOrders[name]) newSubOrders[name] = {};
                            
                            // 保留类型和分单号，清空其他字段
                            const preservedFields = ['subOrderNumber', 'type'];
                            Object.keys(newSubOrders[name]).forEach(key => {
                                if (!preservedFields.includes(key)) {
                                    delete newSubOrders[name][key];
                                }
                            });
                            
                            // 设置新的类型值
                            newSubOrders[name].type = value;
                            
                            form.setFieldsValue({ subOrders: newSubOrders });
                        }}>
                            <Option value="包税">包税</Option>
                            <Option value="自税">自税</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'subOrderNumber']} label="分单号" rules={[{ required: true, message: '请输入分单号' }]}>
                        <Input placeholder="分单号" />
                    </Form.Item>
                </Col>
                
                {/* 2. 发货人: 将 Select 替换为 AutoComplete */}
                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'sender']} label="发货人" rules={[{ required: true, message: '请输入发货人' }]}>
                        <Form.Item noStyle dependencies={[['subOrders', name, 'sender']]}>
                            {() => {
                                const senderValue = form.getFieldValue(['subOrders', name, 'sender']);
                                const  fendan_guanshui_type = form.getFieldValue(['subOrders', name, 'type']);
                                // console.log('fendan_guanshui_type:',fendan_guanshui_type)
                                const senderOptions = shippersAndReceivers
                                    .filter(item => item.类型 === '发货人' && item.hide === '0' && item.关税类型=== fendan_guanshui_type)
                                    .map(item => ({ value: item.发货人 }));

                                return (
                                    <Tooltip title={senderValue} placement="top">
                                        <AutoComplete
                                            value={form.getFieldValue(['subOrders', name, 'sender'])}
                                            options={senderOptions}
                                            style={{ width: '100%' }}
                                            placeholder="请输入或选择发货人"
                                            filterOption={(inputValue, option) =>
                                                option!.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            allowClear
                                            onChange={(value) => {
                                                const currentSubOrders = form.getFieldValue('subOrders') || [];
                                                const newSubOrders = [...currentSubOrders];
                                                if (!newSubOrders[name]) newSubOrders[name] = {};
                                                newSubOrders[name].sender = value;
                                                form.setFieldsValue({ subOrders: newSubOrders });
                                            }}
                                        />
                                    </Tooltip>
                                );
                            }}
                        </Form.Item>
                    </Form.Item>
                </Col>
                
                {/* 3. 收货人: 将 Select 替换为 AutoComplete */}
                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'receiver']} label="收货人" rules={[{ required: true, message: '请输入收货人' }]}>
                        <Form.Item noStyle dependencies={[['subOrders', name, 'receiver']]}>
                            {() => {
                                const receiverValue = form.getFieldValue(['subOrders', name, 'receiver']);
                                const  fendan_guanshui_type = form.getFieldValue(['subOrders', name, 'type']);
                                const receiverOptions = shippersAndReceivers
                                    .filter(item => item.类型 === '收货人' && item.hide === '0' && item.关税类型=== fendan_guanshui_type)
                                    .map(item => ({ value: item.发货人 }));

                                return (
                                    <Tooltip title={receiverValue} placement="top">
                                        <AutoComplete
                                            value={form.getFieldValue(['subOrders', name, 'receiver'])}
                                            options={receiverOptions}
                                            style={{ width: '100%' }}
                                            placeholder="请输入或选择收货人"
                                            filterOption={(inputValue, option) =>
                                                option!.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            allowClear
                                            onChange={(value) => {
                                                const currentSubOrders = form.getFieldValue('subOrders') || [];
                                                const newSubOrders = [...currentSubOrders];
                                                if (!newSubOrders[name]) newSubOrders[name] = {};
                                                newSubOrders[name].receiver = value;
                                                form.setFieldsValue({ subOrders: newSubOrders });
                                            }}
                                        />
                                    </Tooltip>
                                );
                            }}
                        </Form.Item>
                    </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'boxCount']} label="总箱数" rules={[{ required: true, message: '请输入总箱数' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="总箱数" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'grossWeight']} label="Gross Weight (KG)" rules={[{ required: true, message: '请输入重量' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="重量" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item {...restField} name={[name, 'volume']} label="Volume (CBM)" rules={[{ required: true, message: '请输入体积' }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="体积" />
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item {...restField} name={[name, 'natureOfName']} label="Nature of Name">
                        <div style={{ position: 'relative' }}>
                            <Input.TextArea
                                placeholder="请输入Nature of Name信息"
                                style={{ height: '100px', resize: 'none' }}
                            />
                            <Button
                                type="text"
                                icon={<FullscreenOutlined />}
                                onClick={() => {
                                    // Always get the latest value from the form field
                                    const content = form.getFieldValue(['subOrders', name, 'natureOfName']) || '';
                                    setFullscreenContent(content);
                                    setIsFullscreenModalOpen(true);
                                }}
                                style={{ position: 'absolute', right: '8px', top: '8px', zIndex: 1 }}
                                title="全屏编辑"
                            />
                        </div>
                    </Form.Item>
                </Col>

                {subOrderType === '自税' && (
                    <>
                        <Col xs={24}>
                            <div style={{ border: '1px dashed #d9d9d9', padding: '12px', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                                <Form.Item {...restField} name={[name, 'fullText']} label="完整文本内容">
                                    <Input.TextArea placeholder="在此粘贴完整的文本内容（包含SHIPPER和进口商信息），然后点击'解析文本框内容'按钮" autoSize={{ minRows: 4, maxRows: 8 }} />
                                </Form.Item>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <Button type="primary" onClick={() => parseTextContent(name, form)}>解析文本框内容</Button>
                                </div>
                            </div>
                        </Col>
                    </>
                )}
            </Row>
        </div>
        </>
    );
};
// ============== End of SubOrderFields Component ==============


const ExecuteAirTidan: React.FC = () => {
    const [shippersAndReceivers, setShippersAndReceivers] = useState<ShipperReceiver[]>([]);
    const [executeForm] = Form.useForm();
    const [loadingsubmit, setLoadingSubmit] = useState(false);
    const [totalBoxCount, setTotalBoxCount] = useState<number>(0);
    const [totalGrossWeight, setTotalGrossWeight] = useState<number>(0);
    const [totalVolume, setTotalVolume] = useState<number>(0);
    const [morelinkData, setMorelinkData] = useState<any>(null);
    const [morelinkLoading, setMorelinkLoading] = useState<boolean>(false);
    const userName = useSelector((state: RootState) => state.user.name);

    useEffect(() => {
        fetchShippersAndReceivers();
    }, []);
    
    const handleValuesChange = (changedValues: any, allValues: any) => {
        if ('subOrders' in changedValues) {
            let boxCount = 0;
            let grossWeight = 0;
            let volume = 0;
            (allValues.subOrders || []).forEach((order: any) => {
                if (order) {
                    boxCount += Number(order.boxCount) || 0;
                    grossWeight += Number(order.grossWeight) || 0;
                    volume += Number(order.volume) || 0;
                }
            });
            setTotalBoxCount(boxCount);
            setTotalGrossWeight(grossWeight);
            setTotalVolume(volume);
        }
    };


    const fetchShippersAndReceivers = async () => {
        const response = await axiosInstance.get(`${server_url}/qingguan/consignee`);
        setShippersAndReceivers(response.data.items);
    };

    const onFinish = async (values: any) => {
        setLoadingSubmit(true);

        if (morelinkData) {
            const boxCountDiff = Math.abs(totalBoxCount - (morelinkData.num || 0));
            const weightDiff = Math.abs(totalGrossWeight - (morelinkData.weight || 0));
            const volumeDiff = Math.abs(totalVolume - (morelinkData.volume || 0));
            if (boxCountDiff > 0.001 || weightDiff > 0.001 || volumeDiff > 0.001) {
                message.error('分单数据与MoreLink数据存在差异，请检查后重新提交！');
                setLoadingSubmit(false);
                return;
            }
        }
        console.log(values)

        try {
            // 构建 FenDanUploadData 对象
            const requestData: any = {
                orderNumber: values.orderNumber,
                subOrders: (values.subOrders || []).map((subOrder: any) => {
                    // Find the shipper and receiver details from shippersAndReceivers
                    const shipperDetail = shippersAndReceivers.find(item =>
                        item.类型 === '发货人' && item.发货人 === subOrder.sender && item.hide === '0'
                    );
                    const receiverDetail = shippersAndReceivers.find(item =>
                        item.类型 === '收货人' && item.发货人 === subOrder.receiver && item.hide === '0'
                    );
                    
                    // Build sender with detailed address
                    let senderWithAddress = subOrder.sender || '';
                    if (shipperDetail && shipperDetail.发货人详细地址) {
                        senderWithAddress += `\n${shipperDetail.发货人详细地址}`;
                    }
                    
                    // Build receiver with detailed address
                    let receiverWithAddress = subOrder.receiver || '';
                    if (receiverDetail && receiverDetail.发货人详细地址) {
                        receiverWithAddress += `\n${receiverDetail.发货人详细地址}`;
                    }
                    
                    // Build natureOfName with volume information
                    let natureOfNameWithVolume = subOrder.natureOfName || '';
                    // if (subOrder.volume) {
                    //     natureOfNameWithVolume += `\nVOL(CBM) : ${subOrder.volume}`;
                    // }
                    
                    return {
                        subOrderNumber: subOrder.subOrderNumber,
                        boxCount: subOrder.boxCount,
                        grossWeight: subOrder.grossWeight,
                        volume: subOrder.volume,
                        sender: senderWithAddress,
                        receiver: receiverWithAddress,
                        type: subOrder.type,
                        natureOfName: natureOfNameWithVolume
                    };
                })
            };

            // 添加 MoreLink 数据中的航班信息
            if (morelinkData) {
                if (morelinkData.flight_no) {
                    requestData.flight_no = morelinkData.flight_no;
                }
                if (morelinkData.startland) {
                    requestData.startland = morelinkData.startland;
                }
                if (morelinkData.destination) {
                    requestData.destination = morelinkData.destination;
                }
                if (morelinkData.shipcompany) {
                    requestData.shipcompany = morelinkData.shipcompany;
                }
                if (morelinkData.etd) {
                    requestData.etd = morelinkData.etd;
                }
            }

            console.log('Request data:', requestData);

            // 发送 JSON 数据到新接口
            const response = await axiosInstance.post(`${server_url}/qingguan/fencangdan_file_generate`, requestData, {
                responseType: 'blob' // 设置响应类型为 blob 以处理文件下载
            });

            // 创建下载链接
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${values.orderNumber}.zip`); // 使用订单号作为文件名
            document.body.appendChild(link);
            link.click();
            
            // 清理
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            message.success('分舱单文件生成成功！');

            // 重置表单
            executeForm.resetFields();
            setTotalBoxCount(0);
            setTotalGrossWeight(0);
            setTotalVolume(0);
            
            // 清空 morelink 数据
            setMorelinkData(null);

        } catch (error) {
            console.error('Error submitting data:', error);
            message.error('提交失败，请查看控制台错误。');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/excel_template/清关发票箱单模板 - Air.xlsx'; // Use public path
        link.download = '清关发票箱单模板 - Air.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchMorelinkData = async (masterBillNo: string) => {
        if (!masterBillNo) {
            setMorelinkData(null);
            return;
        }
        setMorelinkLoading(true);
        try {
            const response = await axiosInstance.post(`${server_url}/qingguan/get_morelink_zongdan?master_bill_no=${masterBillNo}`);
            setMorelinkData(response.data);
        } catch (error) {
            console.error('Error fetching MoreLink data:', error);
            setMorelinkData(null);
        } finally {
            setMorelinkLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: '2px solid #f0f0f0'
                }}>
                    <h1 className={styles.title} style={{
                        textAlign: 'left',
                        margin: 0,
                        color: '#1890ff',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>货运订单</h1>
                    <Space>
                        <Button icon={<HistoryOutlined />} onClick={() => message.info('功能待实现')}>提交历史</Button>
                        {/* <Button type="primary" onClick={downloadTemplate}>下载模板</Button> */}
                    </Space>
                </div>
                <Form form={executeForm} onFinish={onFinish} layout="vertical" onValuesChange={handleValuesChange}>
                    <Row gutter={16}>
                        <Col xs={24} sm={24}>
                            <Form.Item label="主单号" name="orderNumber" rules={[{ required: true, message: '主单号是必填项' }]}>
                                <Input placeholder="请输入主单号" addonAfter={
                                    <Tooltip title="从MoreLink同步数据">
                                        <Button type="link" icon={<SyncOutlined />} loading={morelinkLoading} onClick={() => {
                                            const masterBillNo = executeForm.getFieldValue('orderNumber');
                                            if (masterBillNo) {
                                                fetchMorelinkData(masterBillNo);
                                            } else {
                                                message.warning('请输入主单号');
                                            }
                                        }} />
                                    </Tooltip>
                                } />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Typography.Title level={4} style={{ marginTop: '20px' }}>分单信息</Typography.Title>
                    <Form.List name="subOrders">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <SubOrderFields key={key} form={executeForm} name={name} restField={restField} remove={remove} shippersAndReceivers={shippersAndReceivers} />
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加分单</Button>
                                </Form.Item>
                                
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    backgroundColor: '#f0f5ff',
                                    borderRadius: '8px',
                                    border: '1px solid #d6e4ff'
                                }}>
                                    <Typography.Title level={5} style={{ color: '#1890ff', marginBottom: '16px' }}>分单数据汇总</Typography.Title>
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
                                                <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>合计总箱数</Typography.Text>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff', marginTop: '8px' }}>{totalBoxCount}</div>
                                            </div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
                                                <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>Gross Weight (KG)</Typography.Text>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff', marginTop: '8px' }}>{totalGrossWeight.toFixed(2)}</div>
                                            </div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
                                                <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>Volume (CBM)</Typography.Text>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff', marginTop: '8px' }}>{totalVolume.toFixed(2)}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
                                        <Typography.Title level={5} style={{ color: '#52c41a', marginBottom: '12px' }}>MoreLink数据对比</Typography.Title>
                                        <Row gutter={16} style={{ marginTop: '12px' }}>
                                            {morelinkLoading ? <Col span={24}><Typography.Text>正在获取MoreLink数据...</Typography.Text></Col> :
                                            morelinkData ? (<>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>MoreLink总箱数</Typography.Text>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>{morelinkData.num || 'N/A'}</div>
                                                    </div>
                                                </Col>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>MoreLink重量(KG)</Typography.Text>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>{morelinkData.weight || 'N/A'}</div>
                                                    </div>
                                                </Col>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>MoreLink体积(CBM)</Typography.Text>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>{morelinkData.volume || 'N/A'}</div>
                                                    </div>
                                                </Col>
                                            </>) : <Col span={24}><Typography.Text type="secondary">输入主单号后点击刷新按钮以获取MoreLink数据</Typography.Text></Col>}
                                        </Row>
                                        {morelinkData && (
                                            <Row gutter={16} style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #d9d9d9' }}>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '4px', backgroundColor: Math.abs(totalBoxCount - (morelinkData.num || 0)) < 0.001 ? '#f6ffed' : '#fff2f0' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>箱数差异</Typography.Text>
                                                        <div style={{
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            color: Math.abs(totalBoxCount - (morelinkData.num || 0)) < 0.001 ? '#52c41a' : '#ff4d4f',
                                                            marginTop: '4px'
                                                        }}>
                                                            {totalBoxCount - (morelinkData.num || 0)}
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '4px', backgroundColor: Math.abs(totalGrossWeight - (morelinkData.weight || 0)) < 0.001 ? '#f6ffed' : '#fff2f0' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>重量差异</Typography.Text>
                                                        <div style={{
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            color: Math.abs(totalGrossWeight - (morelinkData.weight || 0)) < 0.001 ? '#52c41a' : '#ff4d4f',
                                                            marginTop: '4px'
                                                        }}>
                                                            {(totalGrossWeight - (morelinkData.weight || 0)).toFixed(2)} KG
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col span={8}>
                                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '4px', backgroundColor: Math.abs(totalVolume - (morelinkData.volume || 0)) < 0.001 ? '#f6ffed' : '#fff2f0' }}>
                                                        <Typography.Text strong style={{ fontSize: '14px', color: '#666' }}>体积差异</Typography.Text>
                                                        <div style={{
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            color: Math.abs(totalVolume - (morelinkData.volume || 0)) < 0.001 ? '#52c41a' : '#ff4d4f',
                                                            marginTop: '4px'
                                                        }}>
                                                            {(totalVolume - (morelinkData.volume || 0)).toFixed(2)} CBM
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </Form.List>

                    <div style={{
                        marginTop: '32px',
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '16px',
                        borderTop: '1px solid #f0f0f0'
                    }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loadingsubmit}
                            disabled={!morelinkData}
                            size="large"
                            style={{
                                minWidth: '120px',
                                height: '48px',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}
                        >
                            提交
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default ExecuteAirTidan;