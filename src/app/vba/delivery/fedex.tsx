"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Button, message, Typography, Input, Table, Form, AutoComplete } from 'antd';
import { UploadOutlined, FullscreenOutlined, FullscreenExitOutlined, EyeOutlined } from '@ant-design/icons';
import axiosInstance from '@/utils/axiosInstance';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// 动态导入地图组件,禁用SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const { Title, Text } = Typography;
const server_url = process.env.NEXT_PUBLIC_BACKEND_URL;

// 定义一个飞机场图标
const airportIcon = L.icon({
    iconUrl: '/yellow_location.jpg', // 替换为你的飞机场图标路径
    iconSize: [25, 25], // 图标大小
    iconAnchor: [12, 12], // 图标的锚点，指向图标的中心
    popupAnchor: [0, -6] // 弹出窗口的锚点
});

const seaportIcon = L.icon({
    iconUrl: '/blue_location.jpg', // 替换为你的飞机场图标路径
    iconSize: [25, 25], // 图标大小
    iconAnchor: [12, 12], // 图标的锚点，指向图标的中心
    popupAnchor: [0, -6] // 弹出窗口的锚点
});

// 定义一个红色定位图标
const redLocationIcon = L.icon({
    iconUrl: '/red_location.png', // 使用红色标记图标
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

// 港口名称映射
const seaportNames = {
    "USBAL": "巴尔的摩港",
    "USNWK": "纽瓦克港",
    "USNYK": "纽约港",
    "USSAV": "萨凡纳港",
    "USCHI": "芝加哥港",
    "USMKC": "堪萨斯城港",
    "USHOU": "休斯顿",
    "USMEM": "孟菲斯港",
    "USLAX": "洛杉矶港",
    "USLGB": "长滩港",
    "USOAK": "奥克兰港",
    "USPLD": "波特兰港",
    "USSEA": "西雅图港",
    "USTAC": "塔科马港"
};
const stateSeaports = {
    "USBAL-巴尔的摩港": [39.2861, -76.6098], // 巴尔的摩港 (Port of Baltimore)
    "USNWK-纽瓦克港": [40.6833, -74.1500], // 纽瓦克港 (Port of Newark)
    "USNYK-纽约港": [40.6667, -74.0000], // 纽约港 (Port of New York)
    "USSAV-萨凡纳港": [32.0833, -81.1000], // 萨凡纳港 (Port of Savannah)
    "USCHI-芝加哥港": [41.8833, -87.6167], // 芝加哥港 (Port of Chicago)
    "USMKC-堪萨斯城港": [39.1167, -94.5833], // 堪萨斯城港 (Port of Kansas City)
    "USHOU-休斯顿": [29.7333, -95.2500], // 休斯顿 (Port of Houston)
    "USMEM-孟菲斯港": [35.1333, -90.0500], // 孟菲斯港 (Port of Memphis)
    "USLAX-洛杉矶港": [33.7333, -118.2667], // 洛杉矶港 (Port of Los Angeles)
    "USLGB-长滩港": [33.7542, -118.2165], // 长滩港 (Port of Long Beach)
    "USOAK-奥克兰港": [37.8000, -122.3167], // 奥克兰港 (Port of Oakland)
    "USPLD-波特兰港": [45.5167, -122.6833], // 波特兰港 (Port of Portland)
    "USSEA-西雅图港": [47.5833, -122.3500], // 西雅图港 (Port of Seattle)
    "USTAC-塔科马港": [47.2500, -122.4333] // 塔科马港 (Port of Tacoma)
};
const stateAirports = {
    "ATL-亚特兰大机场": [33.6407, -84.4277], // 亚特兰大机场 (Hartsfield-Jackson Atlanta International Airport)
    "JFK-纽约肯尼迪机场": [40.6413, -73.7781], // 纽约肯尼迪机场 (John F. Kennedy International Airport)
    "MIA-迈阿密国际机场": [25.7959, -80.2870], // 迈阿密国际机场 (Miami International Airport)
    "CLT-夏洛特机场": [35.2140, -80.9431], // 夏洛特机场 (Charlotte Douglas International Airport)
    "EWR-纽瓦克机场": [40.6895, -74.1745], // 纽瓦克机场 (Newark Liberty International Airport)
    "CVG-辛辛那提国际机场": [39.0488, -84.6678], // 辛辛那提国际机场 (Cincinnati/Northern Kentucky International Airport)
    "DFW-达拉斯机场": [32.8968, -97.0380], // 达拉斯机场 (Dallas/Fort Worth International Airport)
    "ORD-芝加哥机场": [41.9742, -87.9067], // 芝加哥机场 (Chicago O'Hare International Airport)
    "DTW-底特律机场": [42.2124, -83.3534], // 底特律机场 (Detroit Metropolitan Wayne County Airport)
    "HOU-休斯顿机场": [29.6454, -95.2789], // 休斯顿机场 (William P. Hobby Airport)
    "MEM-孟菲斯机场": [35.0424, -89.9767], // 孟菲斯机场 (Memphis International Airport)
    "LAX-洛杉矶机场": [33.9416, -118.4085], // 洛杉矶机场 (Los Angeles International Airport)
    "SFO-旧金山机场": [37.6213, -122.3790], // 旧金山机场 (San Francisco International Airport)
    "SEA-西雅图机场": [47.4502, -122.3088] // 西雅图机场 (Seattle-Tacoma International Airport)
};

// 机场名称映射（保持不变）
const airportNames = {
    "ATL": "亚特兰大机场",
    "JFK": "纽约肯尼迪机场",
    "MIA": "迈阿密国际机场",
    "CLT": "夏洛特机场",
    "EWR": "纽瓦克机场",
    "CVG": "辛辛那提国际机场",
    "DFW": "达拉斯机场",
    "ORD": "芝加哥机场",
    "DTW": "底特律机场",
    "HOU": "休斯顿机场",
    "MEM": "孟菲斯机场",
    "LAX": "洛杉矶机场",
    "SFO": "旧金山机场",
    "SEA": "西雅图机场"
};

// 添加州首府数据
const stateCapitals = {
    "AL-蒙哥马利": [32.3792, -86.3077, "36104"], // 阿拉巴马州-蒙哥马利
    "AK-朱诺": [58.3019, -134.4197, "99801"], // 阿拉斯加州-朱诺
    "AZ-凤凰城": [33.4484, -112.0740, "85001"], // 亚利桑那州-凤凰城
    "AR-小石城": [34.7465, -92.2896, "72201"], // 阿肯色州-小石城
    "CA-萨克拉门托": [38.5816, -121.4944, "95814"], // 加利福尼亚州-萨克拉门托
    "CO-丹佛": [39.7392, -104.9903, "80202"], // 科罗拉多州-丹佛
    "CT-哈特福德": [41.7658, -72.6734, "06103"], // 康涅狄格州-哈特福德
    "DE-多佛": [39.1582, -75.5244, "19901"], // 特拉华州-多佛
    "FL-塔拉哈西": [30.4383, -84.2807, "32301"], // 佛罗里达州-塔拉哈西
    "GA-亚特兰大": [33.7490, -84.3880, "30301"], // 佐治亚州-亚特兰大
    "HI-火奴鲁鲁": [21.3069, -157.8583, "96813"], // 夏威夷州-火奴鲁鲁
    "ID-博伊西": [43.6150, -116.2023, "83702"], // 爱达荷州-博伊西
    "IL-斯普林菲尔德": [39.7817, -89.6501, "62701"], // 伊利诺伊州-斯普林菲尔德
    "IN-印第安纳波利斯": [39.7684, -86.1581, "46204"], // 印第安纳州-印第安纳波利斯
    "IA-得梅因": [41.5868, -93.6250, "50309"], // 爱荷华州-得梅因
    "KS-托皮卡": [39.0473, -95.6752, "66603"], // 堪萨斯州-托皮卡
    "KY-法兰克福": [38.1970, -84.8630, "40601"], // 肯塔基州-法兰克福
    "LA-巴吞鲁日": [30.4515, -91.1871, "70801"], // 路易斯安那州-巴吞鲁日
    "ME-奥古斯塔": [44.3107, -69.7795, "04330"], // 缅因州-奥古斯塔
    "MD-安纳波利斯": [38.9784, -76.4922, "21401"], // 马里兰州-安纳波利斯
    "MA-波士顿": [42.3601, -71.0589, "02201"], // 马萨诸塞州-波士顿
    "MI-兰辛": [42.7325, -84.5555, "48933"], // 密歇根州-兰辛
    "MN-圣保罗": [44.9537, -93.0900, "55101"], // 明尼苏达州-圣保罗
    "MS-杰克逊": [32.2988, -90.1848, "39201"], // 密西西比州-杰克逊
    "MO-杰斐逊城": [38.5767, -92.1735, "65101"], // 密苏里州-杰斐逊城
    "MT-海伦娜": [46.5891, -112.0391, "59601"], // 蒙大拿州-海伦娜
    "NE-林肯": [40.8136, -96.7026, "68501"], // 内布拉斯加州-林肯
    "NV-卡森城": [39.1638, -119.7674, "89701"], // 内华达州-卡森城
    "NH-康科德": [43.2081, -71.5376, "03301"], // 新罕布什尔州-康科德
    "NJ-特伦顿": [40.2206, -74.7597, "08608"], // 新泽西州-特伦顿
    "NM-圣达菲": [35.6870, -105.9378, "87501"], // 新墨西哥州-圣达菲
    "NY-奥尔巴尼": [42.6526, -73.7562, "12207"], // 纽约州-奥尔巴尼
    "NC-罗利": [35.7796, -78.6382, "27601"], // 北卡罗来纳州-罗利
    "ND-俾斯麦": [46.8083, -100.7837, "58501"], // 北达科他州-俾斯麦
    "OH-哥伦布": [39.9612, -82.9988, "43215"], // 俄亥俄州-哥伦布
    "OK-俄克拉荷马城": [35.4676, -97.5164, "73102"], // 俄克拉荷马州-俄克拉荷马城
    "OR-塞勒姆": [44.9429, -123.0351, "97301"], // 俄勒冈州-塞勒姆
    "PA-哈里斯堡": [40.2732, -76.8867, "17101"], // 宾夕法尼亚州-哈里斯堡
    "RI-普罗维登斯": [41.8240, -71.4128, "02903"], // 罗德岛州-普罗维登斯
    "SC-哥伦比亚": [34.0007, -81.0348, "29201"], // 南卡罗来纳州-哥伦比亚
    "SD-皮尔": [44.3683, -100.3510, "57501"], // 南达科他州-皮尔
    "TN-纳什维尔": [36.1627, -86.7816, "37201"], // 田纳西州-纳什维尔
    "TX-奥斯汀": [30.2672, -97.7431, "78701"], // 德克萨斯州-奥斯汀
    "UT-盐湖城": [40.7608, -111.8910, "84101"], // 犹他州-盐湖城
    "VT-蒙彼利埃": [44.2601, -72.5754, "05602"], // 佛蒙特州-蒙彼利埃
    "VA-里士满": [37.5407, -77.4360, "23219"], // 弗吉尼亚州-里士满
    "WA-奥林匹亚": [47.0379, -122.9007, "98501"], // 华盛顿州-奥林匹亚
    "WV-查尔斯顿": [38.3498, -81.6326, "25301"], // 西弗吉尼亚州-查尔斯顿
    "WI-麦迪逊": [43.0731, -89.4012, "53701"], // 威斯康星州-麦迪逊
    "WY-夏延": [41.1400, -104.8202, "82001"], // 怀俄明州-夏延
};

// 添加州首府图标
const capitalIcon = L.icon({
    iconUrl: '/capital.png', // 需要添加一个州首府的图标
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -6]
});

const FedexRemoteAddressChecker: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [form] = Form.useForm();
    const [searchLoading, setSearchLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{city: string, state: string, position: [number, number]} | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapSearchValue, setMapSearchValue] = useState<string>('');
    const [mapSearchOptions, setMapSearchOptions] = useState<any[]>([]);
    const mapContainerRef = useRef<any>(null);
    const [showMarkers, setShowMarkers] = useState(false);

    const [loadingCities, setLoadingCities] = useState<{[key: string]: boolean}>({});

    // 分别控制不同类型标记的显示状态
    const [markerVisibility, setMarkerVisibility] = useState({
        capitals: false,
        airports: false,
        seaports: false
    });

    // 切换标记显示状态的处理函数
    const toggleMarkerVisibility = (type: 'capitals' | 'airports' | 'seaports') => {
        setMarkerVisibility(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // 将 Leaflet 图标设置移到组件内部
    useEffect(() => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
            iconUrl: require('leaflet/dist/images/marker-icon.png').default,
            shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
            className: 'red-marker' // 添加自定义CSS类
        });
    }, []);

    const columns = [
        {
            title: '邮编',
            dataIndex: 'zip_code',
            key: 'zip_code',
        },
        {
            title: '城市名称',
            dataIndex: 'city',
            key: 'city',
            width: 200,
            render: (text: string, record: any) => {
                const isLoading = loadingCities[record.zip_code];
                return (
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <div style={{flex: 1}}>
                            {isLoading ? (
                                <span>加载中...</span>
                            ) : (
                                <>
                                    <div>{record.city || '未知城市'}</div>
                                    {record.avoid_city && (
                                        <div style={{ fontSize: '12px', color: '#999', position: 'absolute', bottom: 0, right: 0 }}>
                                            不可接收: {record.avoid_city}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        {record.city && (
                            <EyeOutlined 
                                onClick={async () => {
                                    try {
                                        const response = await axios.get(`https://fresh-deer-84.deno.dev/search?format=json&q=${encodeURIComponent(record.city + ',' + record.state)}`);
                                        if (response.data && response.data[0]) {
                                            const newPosition = [parseFloat(response.data[0].lat), parseFloat(response.data[0].lon)];
                                            setSelectedLocation({
                                                city: record.city,
                                                state: record.state,
                                                position: [newPosition[0], newPosition[1]] as [number, number]
                                            });
                                            setShowMap(true);
                                            if (mapContainerRef.current) {
                                                mapContainerRef.current.setView(newPosition, 13);
                                            }
                                        }
                                    } catch (error) {
                                        console.error('获取地理位置失败:', error);
                                        message.error('获取地理位置失败');
                                    }
                                }}
                                style={{marginLeft: 8, color: '#1890ff'}}
                            />
                        )}
                    </div>
                );
            }
        },
        {
            title: '所在州名称',
            dataIndex: 'state',
            key: 'state',
            width: 200,
            render: (text: string, record: any) => {
                const isLoading = loadingCities[record.zip_code];
                return isLoading ? <span>加载中...</span> : <span>{record.state || '未知'}</span>;
            }
        },
        {
            title: '地址属性',
            dataIndex: 'property',
            key: 'property',
            render: (text: string, record: any) => (
                <span>{record.type} {text}</span>
            )
        },
        {
            title: '地址描述',
            dataIndex: 'property_chinese',
            key: 'property_chinese',
        },
        {
            title: '费用',
            dataIndex: 'cost',
            key: 'cost',
        }
    ];

    useEffect(() => {
        const fetchEffectiveDate = async () => {
            try {
                const response = await axiosInstance.get(`${server_url}/qingguan/get_fedex_remoteaddresscheck_effective_date`);
                setEffectiveDate(response.data.effective_date);
            } catch (error) {
                console.error('获取生效日期失败:', error);
                message.error('获取生效日期失败');
            }
        };

        fetchEffectiveDate();
    }, []);

    const handleSearch = async (values: any) => {
        if (!values.zipcode) {
            message.error('请输入邮编');
            return;
        }
        
        setSearchLoading(true);
        setSearchResults([]); // 清空之前的搜索结果
        
        try {
            // 首先发送查询请求获取基本数据
            const formData = new FormData();
            formData.append('zip_code_str', values.zipcode);
            
            const response = await axiosInstance.post(`${server_url}/qingguan/all_remoteaddresscheck_process`, formData);
            const data = Array.isArray(response.data) ? response.data : [];

            // 设置初始结果
            setSearchResults(data);

            // 为每个结果异步获取城市和州信息
            data.forEach(async (item: any) => {
                setLoadingCities(prev => ({...prev, [item.zip_code]: true}));
                try {
                    // 改为通过后端服务器请求USPS API,避免CORS问题
                    const uspsResponse = await axiosInstance.post(`${server_url}/qingguan/get_city_by_zip`, {
                        zip_code: item.zip_code
                    });

                    if (uspsResponse.data) {
                        setSearchResults(prev => 
                            prev.map(result => 
                                result.zip_code === item.zip_code 
                                    ? {...result, city: uspsResponse.data.city, state: uspsResponse.data.state}
                                    : result
                            )
                        );
                    }
                } catch (error) {
                    console.error('获取城市信息失败:', error);
                } finally {
                    setLoadingCities(prev => ({...prev, [item.zip_code]: false}));
                }
            });

        } catch (error) {
            console.error('查询失败:', error);
            message.error('查询失败');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleFileChange = (info: any) => {
        const selectedFile = info.fileList[0]?.originFileObj as File | undefined;
        if (selectedFile) {
            setFile(selectedFile);
            setFileList(info.fileList);
            message.success(`已选择文件: ${selectedFile.name}`);
        } else {
            message.error('文件选择失败，请重试');
        }
    };

    const handleRemove = () => {
        setFile(null);
        setFileList([]);
    };

    const handleUpload = async () => {
        if (!file) {
            message.error('请先选择文件！');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post(`${server_url}/qingguan/fedex_remoteaddresscheck`, formData, {
                responseType: 'arraybuffer'
            });

            if (!response.data || response.data.byteLength === 0) {
                throw new Error('接收到的文件为空或已损坏');
            }

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'processed_output.xlsx');
            document.body.appendChild(link);
            link.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            message.success('文件处理并下载成功！');
            handleRemove();
        } catch (error: any) {
            console.error('文件上传错误:', error);
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    message.error('请求参数错误：' + (error.response.data.message || ''));
                } else if (status === 500) {
                    message.error('服务器内部错误：' + (error.response.data.message || ''));
                } else {
                    message.error('文件处理失败：' + (error.response.data.message || ''));
                }
            } else if (error.request) {
                message.error('服务器无响应，请检查网络连接');
            } else {
                message.error('文件处理失败：' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMapSearch = async (value: string) => {
        setMapSearchValue(value);
        if (value) {
            try {
                const response = await axios.get(`https://fresh-deer-84.deno.dev/search?format=json&q=${encodeURIComponent(value)}`);
                const options = response.data.map((item: any) => ({
                    value: item.display_name,
                    label: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                }));
                setMapSearchOptions(options);
            } catch (error) {
                console.error('地图搜索失败:', error);
                message.error('地图搜索失败');
            }
        } else {
            setMapSearchOptions([]);
        }
    };

    const handleMapSelect = (value: string, option: any) => {
        if (!option || !value) {
            message.error('无效的地址选择');
            return;
        }

        const addressParts = value.split(',');
        if (addressParts.length < 2) {
            message.error('地址格式不正确');
            return;
        }

        const newPosition = [parseFloat(option.lat), parseFloat(option.lon)] as [number, number];
        setSelectedLocation({
            city: addressParts[0].trim(),
            state: addressParts[addressParts.length - 2].trim(),
            position: newPosition
        });

        // 使用地图实例进行视图更新
        if (mapContainerRef.current) {
            mapContainerRef.current.setView(newPosition, 13);
        }
    };

    const mapStyles = {
        position: 'fixed' as 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: isMapFullscreen ? '100%' : '40%',
        backgroundColor: 'white',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column' as 'column',
    };

    useEffect(() => {
        if (showMap && isMapFullscreen && mapRef.current) {
            mapRef.current.requestFullscreen();
        } else if (!isMapFullscreen && document.fullscreenElement) {
            document.exitFullscreen();
        }
    }, [isMapFullscreen, showMap]);


    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <h1 style={{ textAlign: 'center', flexGrow: 1 }}>Fedex偏远地址判断</h1>
            </div>
            {effectiveDate && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Text type="danger">生效日期: {effectiveDate}</Text>
                </div>
            )}

            <div style={{ marginBottom: 20 }}>
                <Form form={form} onFinish={handleSearch} layout="inline" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Form.Item name="zipcode" style={{ flex: 1, marginRight: 16 }}>
                        <Input placeholder="请输入邮编" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={searchLoading}>
                            查询
                        </Button>
                    </Form.Item>
                    <Form.Item>
                        <Upload 
                            beforeUpload={() => false}
                            onChange={handleFileChange}
                            onRemove={handleRemove}
                            fileList={fileList}
                            accept=".xlsx, .xls"
                            disabled={loading}
                        >
                            <Button icon={<UploadOutlined />} disabled={loading}>
                                选择文件
                            </Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item>
                        <Button 
                            type="primary"
                            onClick={handleUpload}
                            disabled={!file || loading}
                            loading={loading}
                        >
                            上传处理
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            <Table 
                columns={columns}
                dataSource={searchResults}
                rowKey="zipcode"
                pagination={false}
                loading={searchLoading}
            />

            {showMap && selectedLocation && (
                <div style={mapStyles} ref={mapRef}>
                    <div style={{ 
                        padding: '12px 20px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>{selectedLocation.city}, {selectedLocation.state}</span>
                        <div>
                            <Button
                                onClick={() => toggleMarkerVisibility('capitals')}
                                style={{ marginRight: '8px' }}
                            >
                                {markerVisibility.capitals ? '隐藏州府' : '显示州府'}
                            </Button>
                            <Button
                                onClick={() => toggleMarkerVisibility('airports')}
                                style={{ marginRight: '8px' }}
                            >
                                {markerVisibility.airports ? '隐藏机场' : '显示机场'}
                            </Button>
                            <Button
                                onClick={() => toggleMarkerVisibility('seaports')}
                                style={{ marginRight: '8px' }}
                            >
                                {markerVisibility.seaports ? '隐藏港口' : '显示港口'}
                            </Button>
                            <Button
                                icon={isMapFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                                style={{ marginRight: '8px' }}
                            />
                            <Button onClick={() => {
                                setShowMap(false);
                                setIsMapFullscreen(false);
                            }}>
                                关闭
                            </Button>
                        </div>
                    </div>
                    <div style={{ padding: '10px' }}>
                        <AutoComplete
                            style={{ width: '100%' }}
                            options={mapSearchOptions}
                            placeholder="搜索地点"
                            value={mapSearchValue}
                            onSearch={handleMapSearch}
                            onSelect={handleMapSelect}
                        />
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <MapContainer
                            center={selectedLocation.position}
                            zoom={5}
                            maxZoom={8}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                            ref={mapContainerRef}
                        >
                            <TileLayer url={`${server_url}/qingguan/tiles/{z}/{x}/{y}.png`} />
                            
                            {/* 州首府标记 */}
                            {markerVisibility.capitals && Object.entries(stateCapitals).map(([name, [lat, lng, zipcode]]) => (
                                <Marker 
                                    key={name} 
                                    position={[Number(lat), Number(lng)]} 
                                    icon={capitalIcon}
                                >
                                    <Popup>
                                        {name}
                                        <br />
                                        邮编: {zipcode}
                                    </Popup>
                                </Marker>
                            ))}

                            {/* 机场标记 */}
                            {markerVisibility.airports && Object.entries(stateAirports).map(([state, coords]) => (
                                <Marker 
                                    key={state} 
                                    position={[coords[0], coords[1]]} 
                                    icon={airportIcon}
                                >
                                    <Popup>
                                        {airportNames[state.split('-')[0] as keyof typeof airportNames]}
                                        <br />
                                        {state.split('-')[0]}
                                    </Popup>
                                </Marker>
                            ))}

                            {/* 当前位置标记 - 始终显示 */}
                            <Marker position={selectedLocation.position} icon={redLocationIcon}>
                                <Popup>
                                    {selectedLocation.city}, {selectedLocation.state}
                                </Popup>
                            </Marker>

                            {/* 港口标记 */}
                            {markerVisibility.seaports && Object.entries(stateSeaports).map(([state, coords]) => (
                                <Marker 
                                    key={state} 
                                    position={[coords[0], coords[1]]} 
                                    icon={seaportIcon}
                                >
                                    <Popup>
                                        {seaportNames[state.split('-')[0] as keyof typeof seaportNames]}
                                        <br />
                                        {state.split('-')[0]}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FedexRemoteAddressChecker;
