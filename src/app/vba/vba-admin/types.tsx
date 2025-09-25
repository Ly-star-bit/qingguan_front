// types.ts

export interface SelectedItem {
    key: number;
    name?: string;
    quantity?: number;

}


// export interface Product {
//     id?: number;
//     中文品名?: string;
//     英文品名?: string;
//     HS_CODE?: string;
//     PCS_CTN?: string;  // 你提供的表结构中 PCS_CTN 是 varchar(50)，所以保持为 string
//     UNIT_PRICE?: string;  // 你提供的表结构中 UNIT_PRICE 是 varchar(50)，所以保持为 string
//     TEXTURE?: string;
//     Usage?: string;
//     属性?: string;
//     豁免代码?: string;
//     FDA?: string;
//     一箱税金?: string;  // 你提供的表结构中 一箱税金 是 varchar(255)，所以保持为 string
//     Duty?: string;  // 你提供的表结构中 Duty 是 varchar(50)，所以保持为 string
//     加征?: string;  // 你提供的表结构中 加征 是 varchar(50)，所以保持为 string
//     豁免截止?: string;
//     豁免过期后?: string;
//     更新时间?: string;
//     FZ?: string;
//     FZ1?: string;
// }
export interface Product {
    总税率: string;
    中文品名: string;
    英文品名: string;
    HS_CODE: string;
    Duty: string; // 对应 Duty(%)
    加征: string; // 对应 加征%
    加征0204: string; // 对应 加征0204%
    加征代码: string; // 对应 加征代码
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
    id:string;
    备注: string;
    单件重量合理范围: string;
    客户: string;
    报关代码: string;
    客人资料美金: string;
    single_weight:number
    single_weight_range?: {
        min_weight_per_box: number;
        max_weight_per_box: number;
    }
    自税:boolean
    类型:string
    huomian_file_name?:string
    other_rate?: {
        unit: string;
        value: string;
    }
    is_hidden: boolean;
}

  

export interface Port {
    id?: number; // 可选字段，因为在创建新记录时，id 可能尚未分配
    port_name: string;
    sender_name: string;
    receiver_name: string;
  }
  

export interface ShipperReceiver {
    id?: number;
    中文?: string;
    发货人?: string;
    发货人详细地址?: string;
    类型?: string;
    备注?: string;
    hide?: string

}

export interface ShippingRequest {
    sender: string;
    receiver: string;
    orderNumber: string;
    weight: number;
    volume: number;
    itemName: SelectedItem[];
}
