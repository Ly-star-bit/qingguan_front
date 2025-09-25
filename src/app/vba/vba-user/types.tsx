// types.ts

export interface SelectedItem {
    key: number;
    name?: string;
    tax_rate?: number
    total_jiazheng?: number
    yugu_tax_money_usd?: number | null
    huomian_deadline?: string
    quantity?: number;
    danxiangshuijin?: number
    renzheng?: string
    goods_price?: number
    single_weight?: number
    single_price?: number
    packing?: number;
    other_rate: {
        unit: string;
        value: number;
    }


}


export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string; // 对应 Duty(%)
    加征: string; // 对应 加征%
    加征0204: string;
    加征代码: string;
    一箱税金: string;
    豁免代码: string;
    豁免代码含义: string;
    豁免截止日期说明: string; // 对应 豁免截止日期/说明
    豁免过期后: string;
    认证: string; // 对应 认证？
    件箱: string; // 对应 件/箱
    单价: string;
    材质: string;
    用途: string;
    更新时间: string; // 假设 更新时间 是一个字符串，而不是日期时间
    类别: string;
    属性绑定工厂: string;
    序号: number; // 假设 序号 是一个数字
    备注: string;
    单件重量合理范围: string;
    客户: string;
    报关代码: string;
    客人资料美金: string;
    single_weight: number
    other_rate?: {
        unit: string;
        value: number;
    },
    single_weight_range?: {
        min_weight_per_box: number
        max_weight_per_box: number
    },
}



export interface Port {
    id?: number; // 可选字段，因为在创建新记录时，id 可能尚未分配
    port_name: string;
    sender_name: string;
    receiver_name: string;
    remarks: string;
    check_data?: Array<{
        name: string;
        value: number;
    }>;
    check_remarks?: string;
    expansion_factor?: number; // 膨胀系数字段
}


export interface ShipperReceiver {
    id?: number;
    中文?: string;
    发货人?: string;
    发货人详细地址?: string;
    类型: string;
    关税类型: string;
    备注: string;
    hide: string
}

export interface ShippingRequest {
    sender: string;
    receiver: string;
    orderNumber: string;
    weight: number;
    volume: number;
    itemName: SelectedItem[];
}
