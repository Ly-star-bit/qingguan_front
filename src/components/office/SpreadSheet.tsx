import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
// TypeScript declarations for the libraries loaded from script tags
declare const luckysheet: any;
declare const LuckyExcel: any;
declare const XLSX: any;
declare const ExcelJS: any;

interface SpreadSheetProps {
  excelData?: ArrayBuffer;
  fileName?: string;
}

interface LuckysheetCellData {
    r: number;
    c: number;
    v: {
        f?: string;
        v?: any;
        m?: string;
        ct?: {
            fa?: string;
            t?: string;
        };
        bg?: string | null;
        bl?: number | string;
        it?: number | string;
        ff?: number;
        fs?: number;
        fc?: string;
        ht?: number | string;
        vt?: number | string;
        mc?: {
            r: number;
            c: number;
            rs?: number;
            cs?: number;
        };
        result?: any;
        tb?: string | number;
    };
}

interface LuckysheetSheetData {
    name: string;
    color: string;
    index: number | string;
    status: number | string;
    order: number | string;
    celldata: LuckysheetCellData[];
    config?: {
        merge?: Record<string, any>;
        rowlen?: Record<string, any>;
        columnlen?: Record<string, any>;
        rowhidden?: Record<string, any>;
        colhidden?: Record<string, any>;
        borderInfo?: Record<string, any>;
        authority?: Record<string, any>;
    };
}

/**
 * A React component that wraps Luckysheet to display and edit Excel files.
 */
const SpreadSheet = forwardRef<any, SpreadSheetProps>(({ excelData, fileName }, ref) => {
    const [isScriptsLoaded, setScriptsLoaded] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const luckysheetInstanceExists = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load necessary CSS and JS files
    useEffect(() => {
        const loadCss = (href: string) => {
            if (!document.querySelector(`link[href="${href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        };

        const loadScript = (src: string) => {
            return new Promise<void>((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        };

        const cssFiles = [
            '/static/luckysheet/dist/plugins/css/pluginsCss.css',
            '/static/luckysheet/dist/css/luckysheet.css',
            '/static/luckysheet/dist/assets/iconfont/iconfont.css',
        ];
        cssFiles.forEach(loadCss);

        const scripts = [
            '/static/luckysheet/dist/jquery.min.js',
            '/static/luckysheet/dist/plugins/js/plugin.js',
            '/static/luckysheet/dist/luckysheet.umd.js',
            '/static/luckysheet/dist/luckyexcel.umd.min.js',
            '/static/luckysheet/dist/xlsx.full.min.js',
            '/static/exceljs/dist/exceljs.min.js',
        ];

        const loadInOrder = async () => {
            try {
                for (const src of scripts) {
                    await loadScript(src);
                }
                setScriptsLoaded(true);
                 // Initialize with an empty sheet once scripts are loaded
                 initializeLuckysheet(null, "新文件");
            } catch (error: any) {
                showError(error.message);
                console.error(error);
            }
        };

        loadInOrder();

    }, []);

    useEffect(() => {
        if (excelData && isScriptsLoaded) {
            const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const file = new File([blob], fileName || 'preview.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            processAndPreviewFile(file);
        }
    }, [excelData, fileName, isScriptsLoaded]);

    useImperativeHandle(ref, () => ({
        processAndPreviewFile,
        exportLuckysheetToExcel
    }));

    const showError = (message: string) => {
        setErrorMessage(message);
        console.error("SpreadSheet Error:", message);
    };

    const clearError = () => {
        setErrorMessage('');
    };

    const initializeLuckysheet = (initialData: any[] | null, title: string) => {
        if (typeof luckysheet === 'undefined') {
            showError("Luckysheet library is not loaded yet.");
            return;
        }

        if (luckysheetInstanceExists.current && typeof luckysheet.destroy === 'function') {
            try {
                luckysheet.destroy();
            } catch (e) {
                console.warn("Error destroying previous luckysheet instance:", e);
            }
        }
        luckysheetInstanceExists.current = false;

        // Recreate the luckysheet container div for a clean slate
        const wrapper = document.getElementById('luckysheet-container-wrapper');
        const oldLuckysheetDiv = document.getElementById('luckysheet');
        if (oldLuckysheetDiv && oldLuckysheetDiv.parentElement) {
            oldLuckysheetDiv.parentElement.removeChild(oldLuckysheetDiv);
        }
        
        if (wrapper) {
            const newLuckysheetDiv = document.createElement('div');
            newLuckysheetDiv.id = 'luckysheet';
            newLuckysheetDiv.style.width = '100%';
            newLuckysheetDiv.style.height = '100%';
            newLuckysheetDiv.style.position = 'absolute';
            wrapper.appendChild(newLuckysheetDiv);
        } else {
            const errorMsg = "UI container for spreadsheet (#luckysheet-container-wrapper) not found.";
            showError(errorMsg);
            console.error(errorMsg);
            return;
        }

        let dataForCreate: any[];
        if (!initialData || initialData.length === 0) {
            // Create a default sheet if no data is provided
            dataForCreate = [{
                "name": title === "Untitled" || !title ? "Sheet1" : title,
                "color": "",
                "status": "1", // Use string for status
                "order": "0",  // Use string for order
                "celldata": [], 
                "config": {
                    "merge": {}
                },
            }];
        } else {
            // Use the data directly, assuming it's already in the correct format
            dataForCreate = initialData;
        }
        
        const options = {
            container: `luckysheet_${uuidv4()}`,
            showinfobar: true, 
            lang: 'zh',
            allowEdit: true, 
            allowCopy: true, 
            showtoolbar: true,
            showsheetbar: true,
            sheetFormulaBar: true,
            data: dataForCreate,
            title: title || "未命名文件",
            userInfo: false,
            // Force formula calculation on load
            forceCalculation: true,
            autoFormulaCalculation: true
        };

        try {
            luckysheet.create(options);
            luckysheetInstanceExists.current = true;
        } catch (e: any) {
            showError('Luckysheet 创建失败: ' + e.message);
            console.error('Luckysheet creation failed:', e);
            luckysheetInstanceExists.current = false;
        }
    }

    const processAndPreviewFile = (fileObject: File) => {
        clearError();

        if (!fileObject) {
            showError('未提供文件对象');
            return;
        }
        const fileName = fileObject.name;
        const fileType = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();

        if (fileType !== "xlsx" && fileType !== "xls") {
            showError('文件格式不正确 (仅支持 .xlsx 或 .xls)，收到: ' + fileName);
            initializeLuckysheet(null, fileName);
            return;
        }

        try {
            if (fileType === "xlsx") {
                LuckyExcel.transformExcelToLucky(fileObject, function(exportJson: any) {
                    if (!exportJson || !Array.isArray(exportJson.sheets) || exportJson.sheets.length === 0) {
                        showError("读取Excel文件内容失败：文件无效或没有工作表。(xlsx)");
                        initializeLuckysheet(null, fileName);
                        return;
                    }

                    const sanitizedSheets = exportJson.sheets
                        .filter(Boolean) // Remove any null/undefined entries
                        .map((sheet: any, index: number) => {
                            // Start with a default, complete sheet structure
                            const fullSheet = {
                                name: `Sheet${index + 1}`,
                                color: "",
                                index: String(index),
                                status: index === 0 ? "1" : "0",
                                order: String(index),
                                celldata: [],
                                config: {
                                    merge: {}, // Ensure merge property exists
                                },
                                ...sheet, // Spread the actual sheet data, overwriting defaults
                            };

                            // Automatically enable text wrap for cells containing newlines
                            if (fullSheet.celldata && Array.isArray(fullSheet.celldata)) {
                                fullSheet.celldata.forEach((cell: LuckysheetCellData) => {
                                    if (cell?.v?.v && typeof cell.v.v === 'string' && cell.v.v.includes('\n')) {
                                        if (cell.v.tb === undefined) {
                                            cell.v.tb = '2'; // 2: Wrap text
                                        }
                                        if (cell.v.vt === undefined) {
                                            cell.v.vt = '1'; // 1: Align top (default for wrapped text in Excel)
                                        }
                                    }
                                });
                            }

                            // Ensure critical properties are strings
                            fullSheet.status = String(fullSheet.status);
                            fullSheet.order = String(fullSheet.order);
                            fullSheet.index = String(fullSheet.index);

                            // Ensure config and config.merge exist
                            if (fullSheet.config == null) {
                                fullSheet.config = { merge: {} };
                            } else if (fullSheet.config.merge == null) {
                                fullSheet.config.merge = {};
                            }

                            return fullSheet;
                        });

                    initializeLuckysheet(sanitizedSheets, exportJson.info.name || fileName);
                }, function(err: any) {
                    showError('LuckyExcel处理失败: ' + (err.message || err));
                    initializeLuckysheet(null, fileName);
                });
            } else if (fileType === "xls") {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = e.target?.result;
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const luckySheets: any[] = [];
                        workbook.SheetNames.forEach(function(sheetName: string, index: number) {
                            const worksheet = workbook.Sheets[sheetName];
                            
                            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                            const celldata: any[] = [];
                            
                            const config: { merge: { [key: string]: any } } = { merge: {} };
                             if (worksheet['!merges']) {
                                worksheet['!merges'].forEach((merge: any) => {
                                    const key = `${merge.s.r}_${merge.s.c}`;
                                    config.merge[key] = { r: merge.s.r, c: merge.s.c, rs: merge.e.r - merge.s.r + 1, cs: merge.e.c - merge.s.c + 1 };
                                });
                            }

                            sheetData.forEach((row: any, r: number) => {
                                if (!row) return;
                                (row as any[]).forEach((cellValue: any, c: number) => {
                                    if (cellValue === null || cellValue === undefined) return;
                                    
                                    const cellObj: any = { r: r, c: c, v: { v: cellValue, m: String(cellValue) } };
                                    
                                    // Automatically enable text wrap for cells containing newlines
                                    if (typeof cellValue === 'string' && cellValue.includes('\n')) {
                                        cellObj.v.tb = '2'; // Wrap text
                                        cellObj.v.vt = '1'; // Align top
                                    }
                                    
                                    let isMergedNonMaster = false;
                                    if (config.merge) {
                                        for (const key in config.merge) {
                                            const m = config.merge[key];
                                            if (r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs) {
                                                if (r === m.r && c === m.c) {
                                                    cellObj.mc = { r: m.r, c: m.c, rs: m.rs, cs: m.cs };
                                                } else {
                                                    isMergedNonMaster = true;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    if (!isMergedNonMaster) {
                                        celldata.push(cellObj);
                                    }
                                });
                            });

                            luckySheets.push({
                                name: sheetName,
                                color: "",
                                index: String(index),
                                status: String(index === 0 ? 1 : 0),
                                order: String(index),
                                celldata: celldata,
                                config: config
                            });
                        });
                        if (luckySheets.length > 0) {
                            initializeLuckysheet(luckySheets, fileName);
                        } else {
                            showError("读取Excel文件内容失败！(.xls)");
                            initializeLuckysheet(null, fileName);
                        }
                    } catch (xlsParseError: any) {
                         showError('XLS文件解析失败: ' + (xlsParseError.message || xlsParseError));
                         initializeLuckysheet(null, fileName);
                    }
                };
                reader.readAsBinaryString(fileObject);
            }
        } catch (error: any) {
            showError(`文件处理失败: ${error.message || error}`);
            initializeLuckysheet(null, fileName);
        }
    }
    
    const handleLocalFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isScriptsLoaded) {
            showError("依赖库尚未加载完成，请稍候。");
            return;
        }
        const file = event.target.files?.[0];
        if (file) {
            processAndPreviewFile(file);
        }
        event.target.value = ''; // Reset input
    };

    const luckysheetColorToExcelJSARGB = (luckysheetColor: string) => {
        if (!luckysheetColor) return undefined;
        if (luckysheetColor.startsWith('#')) {
            let hex = luckysheetColor.substring(1);
            if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
            if (hex.length === 6) return 'FF' + hex.toUpperCase();
            if (hex.length === 8) return hex.toUpperCase();
            return undefined;
        } else if (luckysheetColor.startsWith('rgb')) {
            const match = luckysheetColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                const r = parseInt(match[1]).toString(16).padStart(2, '0');
                const g = parseInt(match[2]).toString(16).padStart(2, '0');
                const b = parseInt(match[3]).toString(16).padStart(2, '0');
                let a = 'FF';
                if (match[4] !== undefined) {
                    a = Math.round(parseFloat(match[4]) * 255).toString(16).padStart(2, '0');
                }
                return (a + r + g + b).toUpperCase();
            }
        }
        return undefined;
    }

    const exportLuckysheetToExcel = async () => {
        if (!isScriptsLoaded || !luckysheetInstanceExists.current) {
            showError('Luckysheet 未初始化，无法导出。');
            return;
        }

        try {
            const allSheetsData = luckysheet.getAllSheets();
            if (!allSheetsData || allSheetsData.length === 0) {
                showError('没有可导出的数据。');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'LuckysheetReactComponent';

            allSheetsData.forEach((sheet: any) => {
                if (!sheet || !sheet.name) return;
                const worksheet = workbook.addWorksheet(sheet.name);

                // Column Widths
                if (sheet.config && sheet.config.columnlen) {
                    Object.entries(sheet.config.columnlen).forEach(([colIdx, widthPx]: [string, any]) => {
                        worksheet.getColumn(parseInt(colIdx) + 1).width = Math.max(parseFloat(widthPx) / 7.5, 1);
                    });
                }

                // Row Heights
                if (sheet.config && sheet.config.rowlen) {
                    Object.entries(sheet.config.rowlen).forEach(([rowIdx, heightPx]: [string, any]) => {
                        worksheet.getRow(parseInt(rowIdx) + 1).height = parseFloat(heightPx) * 0.75;
                    });
                }
                
                // Merges
                if (sheet.config && sheet.config.merge) {
                    Object.values(sheet.config.merge).forEach((merge: any) => {
                        worksheet.mergeCells(merge.r + 1, merge.c + 1, merge.r + merge.rs, merge.c + merge.cs);
                    });
                }

                // Cell Data and Styles
                if (sheet.celldata && Array.isArray(sheet.celldata)) {
                    sheet.celldata.forEach((cellObj: any) => {
                        if (!cellObj || !cellObj.v) return;
                        const excelCell = worksheet.getCell(cellObj.r + 1, cellObj.c + 1);

                        if (cellObj.v.f) {
                            excelCell.value = { formula: cellObj.v.f.substring(1), result: cellObj.v.v };
                        } else {
                            excelCell.value = cellObj.v.v;
                        }

                        if (cellObj.v.ct?.fa) {
                            excelCell.numFmt = cellObj.v.ct.fa;
                        }

                        const style: any = { font: {}, alignment: {}, fill: {}, border: {} };
                        let hasStyle = false;
                        
                        // Fill
                        if (cellObj.v.bg) {
                            const bgColor = luckysheetColorToExcelJSARGB(cellObj.v.bg);
                            if (bgColor) {
                                style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                                hasStyle = true;
                            }
                        }

                        // Font
                        if (cellObj.v.fc) { style.font.color = { argb: luckysheetColorToExcelJSARGB(cellObj.v.fc) }; hasStyle = true; }
                        if (cellObj.v.bl === 1 || cellObj.v.bl === '1') { style.font.bold = true; hasStyle = true; }
                        if (cellObj.v.it === 1 || cellObj.v.it === '1') { style.font.italic = true; hasStyle = true; }
                        if (cellObj.v.fs) { style.font.size = parseInt(cellObj.v.fs); hasStyle = true; }

                         // Alignment
                        if (cellObj.v.ht !== undefined) { 
                            if (String(cellObj.v.ht) === '0') style.alignment.horizontal = 'center';
                            else if (String(cellObj.v.ht) === '2') style.alignment.horizontal = 'right';
                            else style.alignment.horizontal = 'left';
                            hasStyle = true;
                        }
                        if (cellObj.v.vt !== undefined) {
                             if (String(cellObj.v.vt) === '0') style.alignment.vertical = 'middle';
                            else if (String(cellObj.v.vt) === '1') style.alignment.vertical = 'top';
                            else style.alignment.vertical = 'bottom';
                            hasStyle = true;
                        }
                        if(String(cellObj.v.tb) === '2') { style.alignment.wrapText = true; hasStyle = true; }

                        if (hasStyle) {
                            excelCell.style = style;
                        }
                    });
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const firstSheetName = allSheetsData[0]?.info?.name || allSheetsData[0]?.name || "Exported_Data";
            a.download = `${firstSheetName.replace(/[^a-z0-9_\-\s\u4E00-\u9FA5]/gi, '_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error: any) {
            showError(`导出Excel失败: ${error.message || error}`);
            console.error('导出Excel失败:', error);
        }
    };

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>
                {`
                    .upload-container {
                        padding: 10px;
                        background: #f5f5f5;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        border-bottom: 1px solid #ddd;
                        flex-shrink: 0;
                        ${excelData ? 'display: none;' : ''}
                    }
                    .upload-container button {
                        padding: 5px 10px;
                        cursor: pointer;
                        border: 1px solid #ccc;
                        background-color: #fff;
                        border-radius: 3px;
                    }
                    .upload-container button:hover {
                        background-color: #f0f0f0;
                    }
                    .error-message {
                        color: red;
                        margin-left: 10px;
                        font-size: 0.9em;
                    }
                `}
            </style>
            <div className="upload-container">
                <button onClick={() => fileInputRef.current?.click()}>本地上传预览</button>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleLocalFileUpload}
                />
                <button onClick={exportLuckysheetToExcel} disabled={!isScriptsLoaded || !luckysheetInstanceExists.current}>导出Excel</button>
                {errorMessage && <span className="error-message">{errorMessage}</span>}
            </div>

            <div id="luckysheet-container-wrapper" style={{ width: '100%', flexGrow: 1, position: 'relative' }}>
                <div id="luckysheet" style={{ width: '100%', height: '100%', position: 'absolute' }}></div>
            </div>
        </div>
    );
});

export default SpreadSheet;
