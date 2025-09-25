import { NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';

export async function GET() {
  try {
    // 创建新的工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SKU详情');

    // 设置列头
    worksheet.columns = [
      { header: '原SKU', key: 'oldsku', width: 20 },
      { header: '新SKU', key: 'newsku', width: 20 },
      { header: '跟踪号', key: 'trackingnumber', width: 20 },
      { header: '箱号', key: 'boxno', width: 15 },
      { header: 'PC编号', key: 'pcno', width: 15 },
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer();

    // 返回响应
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="SKU详情导入模板.xlsx"',
      },
    });
  } catch (error) {
    console.error('生成Excel模板失败:', error);
    return NextResponse.json({ error: '生成Excel模板失败' }, { status: 500 });
  }
}
