import React, { useMemo, useRef, useState } from "react";
import type { FC } from "react";
import { Modal, Form, Select, Input, message, TreeSelect } from "antd";
import type { SelectProps, InputRef } from "antd"; // ★ 新增 InputRef
import type { DataNode } from "antd/es/tree";

// ====== 业务类型 ======
type PermissionOption = {
  label: string;
  value: string; // 例如 "user:delete" 或 "order.update"
};

type MenuNode = {
  id: string | number;
  name: string;
  children?: MenuNode[];
};

type BulkPermissionItem = {
  code: string;
  name: string;
  resource: string;
  action: string;
  menu_id: string | number | null;
  description: string;
};

type Props = {
  /** 弹窗可见性 */
  open: boolean;
  /** 关闭弹窗 */
  onClose: () => void;
  /** 权限代码选项（来自后端 API） */
  permissionCodeOptions: PermissionOption[];
  /** 菜单树（用于下拉） */
  menuData: MenuNode[];
  /** 提交回调（对接你的创建接口） */
  onSubmit?: (payload: BulkPermissionItem[]) => Promise<void> | void;
  /** 自定义标题（可选） */
  title?: string;
  /** 确认按钮文案（可选） */
  okText?: string;
  /** 取消按钮文案（可选） */
  cancelText?: string;
};

// ====== 辅助函数 ======
/** 转换菜单为 TreeSelect 的 DataNode 格式 */
function convertMenuToTreeData(nodes: MenuNode[]): DataNode[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    key: node.id,
    children: node.children ? convertMenuToTreeData(node.children) : undefined,
  }));
}

/** 尝试从 code 中拆分 resource 与 action */
function splitCode(code: string): { resource: string; action: string } {
  // 支持常见分隔：: . / _
  const byCommon = code.split(/[:./_]/).filter(Boolean);
  if (byCommon.length >= 2) {
    return {
      resource: byCommon.slice(0, byCommon.length - 1).join("."),
      action: byCommon[byCommon.length - 1],
    };
  }
  // 回退策略：按最后一个单词当 action，其余当 resource
  const m = code.match(/^(.*?)[\s\-]?([A-Za-z]+)$/);
  if (m && m[1] && m[2]) {
    return { resource: m[1], action: m[2] };
  }
  // 实在拆不出，就都给 code
  return { resource: code, action: code };
}

// ====== 组件实现 ======
export const BulkAddPermissionsModal: FC<Props> = ({
  open,
  onClose,
  permissionCodeOptions,
  menuData,
  onSubmit,
  title = "批量添加权限项",
  okText = "批量创建",
  cancelText = "取消",
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 选中的代码 + 每个代码的“中文名称”
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [codeNames, setCodeNames] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState<string>('');

  // 菜单 TreeData
  const menuTreeData = useMemo(() => convertMenuToTreeData(menuData), [menuData]);

  // 保存每个 tag 输入框的 ref，供手动聚焦
 const inputRefs = useRef<Record<string, InputRef | null>>({}); // ★ 从 HTMLInputElement 改为 InputRef

  // 选择变化：同步 selectedCodes，并确保 codeNames 有对应 key
  const handleCodesChange = (values: string[]) => {
    setSelectedCodes(values);
    setCodeNames((prev) => {
      const next: Record<string, string> = {};
      values.forEach((v) => (next[v] = prev[v] ?? ""));
      return next;
    });
  };

  // 自定义 tag：每个已选项目 → code + 名称输入框 + 移除
  const tagRender: SelectProps<string[]>["tagRender"] = (tagProps) => {
    const { value, onClose: removeTag } = tagProps; // 避免与 props.onClose 混淆
    const val = String(value);

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          background: "#F0FFF4",
          border: "1px solid #C6F6D5",
          borderRadius: 8,
          marginRight: 6,
          marginBottom: 6,
        }}
      >
        <code
          style={{
            color: "#2F855A",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 12,
          }}
        >
          {val}
        </code>

        {/* 关键修复：阻止默认 + 冒泡，并手动聚焦 */}
 <Input
  key={val}
  size="small"
  placeholder="名称"
  style={{ width: 168 }}
  value={codeNames[val] || ""}
  onChange={(e) => setCodeNames((prev) => ({ ...prev, [val]: e.target.value }))}
  ref={(el) => { inputRefs.current[val] = el; }}   // ★ 不要 return，直接赋值
  onMouseDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRefs.current[val]?.focus?.();             // ★ 使用 InputRef 的 focus
  }}
  onKeyDown={(e) => { e.stopPropagation(); }}
/>

        

        <span
          onClick={(e) => {
            e.stopPropagation();
            removeTag(); // 移除此 tag
          }}
          style={{
            cursor: "pointer",
            lineHeight: 0,
            padding: 2,
            userSelect: "none",
            color: "#2F855A",
            fontWeight: 600,
          }}
          title="移除此权限代码"
          aria-label="移除"
        >
          ×
        </span>
      </span>
    );
  };

  // 提交
  const handleOk = async () => {
    try {
      // 非必填项：menu_id, description。这里只校验名称是否齐全
      const empty = selectedCodes.filter((c) => !codeNames[c]?.trim());
      if (empty.length) {
        message.error(`请为以下权限代码填写名称：${empty.join(", ")}`);
        return;
      }

      setSubmitting(true);
      const values = await form.getFieldsValue(true);
      const payload: BulkPermissionItem[] = selectedCodes.map((code) => {
        const { resource, action } = splitCode(code);
        return {
          code,
          name: codeNames[code].trim(),
          resource,
          action,
          menu_id: values.menu_id ?? null,
          description: (values.description ?? "").trim(),
        };
      });

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        message.success("（示例）已构造 payload，等待接入后端接口。");
      }

      form.resetFields();
      setSelectedCodes([]);
      setCodeNames({});
      setSearchValue('');
      onClose();
    } catch (err) {
      message.error("提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  // 关闭弹窗：复位
  const handleCancel = () => {
    form.resetFields();
    setSelectedCodes([]);
    setCodeNames({});
    setSearchValue('');
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      width={800}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="选择权限代码"
          extra="从 API端点中选择多个权限代码。选中后即可在标签内填写名称。"
        >
          <Select
            mode="multiple"
            placeholder="选择权限代码"
            value={selectedCodes}
            onChange={handleCodesChange}
            options={permissionCodeOptions}
            style={{ width: "100%" }}
            showSearch
            // 不使用 responsive 折叠，允许全部标签换行显示
            // maxTagCount="responsive"
            filterOption={(input, option) =>
              (option?.value as string)?.toLowerCase?.().includes(input.toLowerCase()) ||
              (option?.label as string)?.toLowerCase?.().includes(input.toLowerCase()) ||
              false
            }
            tagRender={tagRender}
            onSelect={(val) => {
              // 选中后，把焦点移到对应标签内的输入框
              const key = String(val);
              setTimeout(() => inputRefs.current[key]?.focus(), 0);
            }}
            onSearch={(value) => setSearchValue(value)}
            searchValue={searchValue}
          />
        </Form.Item>

        <Form.Item name="menu_id" label="关联菜单（可选）">
          <TreeSelect
            placeholder="选择菜单用于分组展示"
            allowClear
            treeData={menuTreeData}
            showSearch
            treeDefaultExpandAll={false}
            filterTreeNode={(input, node) =>
              (node.title as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item name="description" label="描述（可选，应用于所有权限项）">
          <Input.TextArea placeholder="批量添加的权限项" rows={2} />
        </Form.Item>

        <div
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#1E40AF" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>提示：</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>从下拉框中选择多个 API 端点的权限代码</li>
              <li>每个选中的权限代码标签内直接填写中文名称</li>
              <li>所有权限项可关联到同一个菜单（可选）</li>
              <li>系统会自动根据代码拆分 resource 和 action</li>
            </ul>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

// ====== 使用示例（可在页面中这样使用） ======
// import { useState } from "react";
// export default function DemoPage() {
//   const [open, setOpen] = useState(false);
//   const permissionCodeOptions: PermissionOption[] = [
//     { label: "用户删除", value: "user:delete" },
//     { label: "用户更新", value: "user:update" },
//     { label: "订单创建", value: "order.create" },
//     { label: "订单支付", value: "order/pay" },
//   ];
//   const menuData: MenuNode[] = [
//     { id: 1, name: "用户管理" },
//     {
//       id: 2,
//       name: "订单管理",
//       children: [{ id: 21, name: "订单明细" }, { id: 22, name: "退款管理" }],
//     },
//   ];
//
//   const handleSubmit = async (payload: BulkPermissionItem[]) => {
//     // 在这里对接你的后端
//     // await api.createPermissions(payload);
//     message.success(`提交 ${payload.length} 条权限项成功`);
//   };
//
//   return (
//     <>
//       <button onClick={() => setOpen(true)}>打开弹窗</button>
//       <BulkAddPermissionsModal
//         open={open}
//         onClose={() => setOpen(false)}
//         permissionCodeOptions={permissionCodeOptions}
//         menuData={menuData}
//         onSubmit={handleSubmit}
//       />
//     </>
//   );
// }
