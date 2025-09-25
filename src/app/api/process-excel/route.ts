// pages/api/process-excel.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { read, utils, write } from 'xlsx';

// export const config = {
//   api: {
//     bodyParser: false, // 禁用内置的 body 解析器
//   },
// };

// 定义类型
type RowData = (string | number | null)[];
type FuelData = { startDate: Date; endDate: Date; rate: number };
type SheetUspData = { [key: string]: { [key: string]: number } };

const convertDate = (excelDate: number | string | null): Date | null => {
  if (typeof excelDate === 'number' && !isNaN(excelDate)) {
    return new Date((excelDate - (25567 + 2)) * 86400 * 1000);
  } else {
    return null;
  }
};

export async function POST(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as Blob;

      if (!file) {
        return new NextResponse('No file uploaded', { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 读取工作簿
      const workbook = read(buffer, { type: 'buffer' });

      // 输出工作簿信息以供调试
      console.log('Sheet Names:', workbook.SheetNames);

      // 处理逻辑
      const sheetData = utils.sheet_to_json(workbook.Sheets['数据粘贴'], { header: 1 , raw: true }) as any[][];
      const sheetLaxPartition = utils.sheet_to_json(workbook.Sheets['LAX分区'], { header: 1, raw: true  }) as any[][];
      const sheetFuel = utils.sheet_to_json(workbook.Sheets['燃油'], { header: 1 , raw: true }) as any[][];
      const sheetUspRaw = utils.sheet_to_json(workbook.Sheets['USPS报价单'], { header: 1, raw: true  }) as any[][];

      // 检查数据是否存在
      if (!sheetData || !sheetLaxPartition || !sheetFuel || !sheetUspRaw) {
        throw new Error('One or more sheets are missing or empty');
      }

      // 检查关键数据的有效性
      if (sheetData.length < 3 || !sheetData[1] || !sheetData[1].length) {
        throw new Error('Invalid 数据粘贴 sheet format');
      }

      if (!sheetUspRaw[1] || !Array.isArray(sheetUspRaw[1]) || sheetUspRaw[1].length < 2) {
        throw new Error('Invalid USPS报价单 sheet format');
      }

      let dataRows: RowData[] = sheetData.slice(2); // 从第3行开始读取数据
      let headers = sheetData[1]; // 第2行作为表头

      let fuelData: FuelData[] = sheetFuel.slice(1).map((row) => {
        let dateRange = (row[0] as string).split('~');
        let startDate = dateRange[0].trim();
        let endDate = dateRange[1].trim();

        return {
          startDate: new Date(startDate.split('-').reverse().join('-')), // 将日-月-年 转换为 年-月-日
          endDate: new Date(endDate.split('-').reverse().join('-')),
          rate: parseFloat(row[1] as string),
        };
      });

      const uspHeaders = sheetUspRaw[1].slice(1); // C 到 L 列作为列名
      const uspRowNames = sheetUspRaw.slice(2, 73).map((row) => row[1]); // B 列作为行名，第2到72行
      const uspData = sheetUspRaw.slice(2, 73).map((row) => row.slice(1)); // 数据部分，第2到72行

      let sheetUsp: SheetUspData = {};
      uspRowNames.forEach((name, index) => {
        sheetUsp[name] = {};
        uspHeaders.forEach((col, colIndex) => {
          sheetUsp[name][col] = uspData[index][colIndex];
        });
      });

      // 在循环之前检查所有行的日期
      const hasInvalidDate = dataRows.some(row => {
        const orderDate = convertDate(row[headers.indexOf('国内下单时间')]);
        return !orderDate || orderDate.getFullYear() === 2025;
      });
      
      if (hasInvalidDate) {
        return new NextResponse(JSON.stringify({ message: '日期格式不对可能为空、不是正确的格式或是2025年' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      let result: RowData[] = [];



      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        let jifeiWeight = Math.ceil(Number(row[headers.indexOf('重量\n(KG)')]) * 2.2046); // 计费重量
        if (isNaN(jifeiWeight)) {
          jifeiWeight = 0;
        }
        let zipCodePrefix = String(row[headers.indexOf('邮编')]).substr(0, 3); // 邮编前三位
        let orderDate = convertDate(row[headers.indexOf('国内下单时间')]);
        // console.log(orderDate)
        let partitionRow = sheetLaxPartition.find((laxRow) => String(laxRow[0]).startsWith(zipCodePrefix));
        let partition = partitionRow ? partitionRow[1] : '未找到分区';

        let fuelRow = fuelData.find((fuel) => orderDate && fuel.startDate <= orderDate && fuel.endDate >= orderDate);
        let fuelRate = fuelRow ? fuelRow.rate : 0;

        // 判断日期是否为11月或12月
        let current_uspHeaders
        let current_uspRowNames
        let current_sheetUsp
        if (orderDate) {
            const month = orderDate.getMonth() + 1; // getMonth()返回0-11，所以+1
            const monthSheets = {
                11: '尾程 11月报价单',
                12: '尾程 12月报价单'
            };

            if (month in monthSheets) {
                console.log(month)

                const sheetName = monthSheets[month as keyof typeof monthSheets];
                const sheetUspRaw = utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true }) as any[][];

                // 提取表头、行名和数据
                const uspHeaders = sheetUspRaw[1].slice(1); // C 到 L 列作为列名
                const uspRowNames = sheetUspRaw.slice(2, 73).map((row) => row[1]); // B 列作为行名，第2到72行
                const uspData = sheetUspRaw.slice(2, 73).map((row) => row.slice(1)); // 数据部分，第2到72行

                // 构建数据结构
                let sheetUsp: SheetUspData = {};
                for (let j = 0; j < uspRowNames.length; j++) {
                    const name = uspRowNames[j];
                    sheetUsp[name] = {};
                    for (let k = 0; k < uspHeaders.length; k++) {
                        const col = uspHeaders[k];
                        sheetUsp[name][col] = uspData[j][k];
                    }
                }

                current_uspHeaders = uspHeaders
                current_uspRowNames = uspRowNames
                current_sheetUsp = sheetUsp
            }
        }
        
        let rowName = current_uspRowNames ? current_uspRowNames.find((name) => name == jifeiWeight) : uspRowNames.find((name) => name == jifeiWeight);
        let colName = current_uspHeaders ? current_uspHeaders.find((col) => col == partition) : uspHeaders.find((col) => col == partition);
        let money = rowName && colName && (current_sheetUsp ? current_sheetUsp[rowName][colName] : sheetUsp[rowName][colName]) ? (current_sheetUsp ? current_sheetUsp[rowName][colName] : sheetUsp[rowName][colName]) : 0;

        let allMoney = Math.ceil(money * (1 + fuelRate) * 100) / 100;

        if (headers && row) {
          row[headers.indexOf('计费重量（美制）')] = jifeiWeight;
          row[headers.indexOf('分区')] = partition;
          row[headers.indexOf('燃油')] = (fuelRate * 100).toFixed(2) + '%';
          row[headers.indexOf('总金额')] = allMoney;

          row[headers.indexOf('国内下单时间')] = orderDate ? orderDate.toISOString().split('T')[0] : null;
          row[headers.indexOf('美国出库\n时间')] = convertDate(row[headers.indexOf('美国出库\n时间')])?.toISOString().split('T')[0] || null;
          row[headers.indexOf('送达时间')] = convertDate(row[headers.indexOf('送达时间')])?.toISOString().split('T')[0] || null;
        }

        result.push(row);
      }
      // console.log(`处理完成${result}`);
      let outputWorkbook = utils.book_new();
      let outputSheet = utils.aoa_to_sheet([headers, ...result]);
      utils.book_append_sheet(outputWorkbook, outputSheet, '结果');

      const outputBuffer = write(outputWorkbook, { bookType: 'xlsx', type: 'buffer' });

      // 本地保存文件
      const fs = require('fs');
      const path = require('path');
      
      // 创建输出目录（如果不存在）
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      
      // 生成输出文件路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFilePath = path.join(outputDir, `output-${timestamp}.xlsx`);
      
      // 将文件写入本地
      fs.writeFileSync(outputFilePath, outputBuffer);
      
      console.log(`文件已保存到: ${outputFilePath}`);
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Disposition': 'attachment; filename=output.xlsx',
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (error) {
      console.error('Error processing file:', error);
      return new NextResponse(JSON.stringify({ message: 'Error processing the file' }), { status: 500 });
    }
  } else {
    return new NextResponse('Method not allowed', { status: 405 });
  }
}
