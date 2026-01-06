/**
 * PDF 表格提取工具
 * 
 * 专门处理表格类PDF（如FF305股份购回报表）
 * 使用 pdf-table-extractor 库提取表格结构化数据
 * 
 * 依赖：pdf-table-extractor@1.0.3（已在package.json）
 */

const PDFTableExtractor = require('pdf-table-extractor');
const puppeteer = require('./puppeteerBase');
const fs = require('fs');
const path = require('path');

// 临时目录
const TMP_DIR = '/tmp/pdf-table';

// 确保目录存在
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * 使用Puppeteer下载PDF到本地文件
 * @param {string} url - PDF URL
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadPdfToFile(url) {
    let page = null;

    try {
        console.log(`[PDF-Table] 下载: ${url.substring(0, 60)}...`);

        page = await puppeteer.createPage({
            timeout: 90000,
            blockResources: false
        });

        // 使用CDP获取响应
        const client = await page.target().createCDPSession();
        await client.send('Fetch.enable', {
            patterns: [{ urlPattern: '*', requestStage: 'Response' }]
        });

        let pdfBuffer = null;

        client.on('Fetch.requestPaused', async ({ requestId, request, responseStatusCode }) => {
            try {
                if (request.url.includes('.pdf') && responseStatusCode === 200) {
                    const { body, base64Encoded } = await client.send('Fetch.getResponseBody', { requestId });
                    pdfBuffer = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
                    console.log(`[PDF-Table] 捕获: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
                }
                await client.send('Fetch.continueRequest', { requestId });
            } catch (e) {
                try { await client.send('Fetch.continueRequest', { requestId }); } catch (e2) { }
            }
        });

        // 访问PDF URL
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        }).catch(() => { });

        // 等待PDF加载
        await new Promise(r => setTimeout(r, 5000));
        await client.send('Fetch.disable');

        if (!pdfBuffer || pdfBuffer.length < 1000) {
            throw new Error('未能捕获有效PDF内容');
        }

        // 保存到临时文件
        const filePath = path.join(TMP_DIR, `pdf_${Date.now()}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`[PDF-Table] 保存: ${filePath}`);

        return filePath;

    } catch (error) {
        console.error(`[PDF-Table] 下载失败: ${error.message}`);
        throw error;
    } finally {
        if (page) {
            await puppeteer.closePage(page);
        }
    }
}

/**
 * 从PDF文件提取表格数据
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<object>} 表格数据
 */
function extractTablesFromFile(filePath) {
    return new Promise((resolve, reject) => {
        console.log(`[PDF-Table] 提取表格: ${filePath}`);

        PDFTableExtractor(
            filePath,
            (result) => {
                // result.pageTables = [{page: 1, tables: [[row1], [row2], ...]}, ...]
                console.log(`[PDF-Table] 成功: ${result.pageTables?.length || 0} 页`);
                resolve(result);
            },
            (error) => {
                console.error(`[PDF-Table] 提取失败: ${error}`);
                reject(new Error(`表格提取失败: ${error}`));
            }
        );
    });
}

/**
 * 将表格数据转换为Markdown格式
 * @param {object} result - pdf-table-extractor结果
 * @returns {string} Markdown格式的表格
 */
function tablesToMarkdown(result) {
    if (!result.pageTables || result.pageTables.length === 0) {
        return '（无表格数据）';
    }

    let markdown = '';

    for (const pageData of result.pageTables) {
        markdown += `\n## 第 ${pageData.page} 页\n\n`;

        if (!pageData.tables || pageData.tables.length === 0) {
            markdown += '（此页无表格）\n';
            continue;
        }

        // 每个表格
        for (let tableIdx = 0; tableIdx < pageData.tables.length; tableIdx++) {
            const table = pageData.tables[tableIdx];
            if (!table || table.length === 0) continue;

            markdown += `### 表格 ${tableIdx + 1}\n\n`;

            // 构建Markdown表格
            for (let rowIdx = 0; rowIdx < table.length; rowIdx++) {
                const row = table[rowIdx];
                if (!row) continue;

                const cells = row.map(cell => (cell || '').toString().trim().replace(/\|/g, '\\|'));
                markdown += `| ${cells.join(' | ')} |\n`;

                // 第一行后加分隔线
                if (rowIdx === 0) {
                    markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
                }
            }
            markdown += '\n';
        }
    }

    return markdown.trim();
}

/**
 * 从URL提取PDF表格内容
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<{markdown: string, raw: object, success: boolean}>}
 */
async function extractTableFromUrl(url, options = {}) {
    let filePath = null;

    try {
        // 检查URL是否是PDF
        if (!url.toLowerCase().includes('.pdf')) {
            return { markdown: '', raw: null, success: false, error: '非PDF链接' };
        }

        // 1. 下载PDF
        filePath = await downloadPdfToFile(url);

        // 2. 提取表格
        const result = await extractTablesFromFile(filePath);

        // 3. 转换为Markdown
        const markdown = tablesToMarkdown(result);

        return {
            markdown,
            raw: result,
            pages: result.pageTables?.length || 0,
            success: true
        };

    } catch (error) {
        return {
            markdown: '',
            raw: null,
            pages: 0,
            success: false,
            error: error.message
        };
    } finally {
        // 清理临时文件
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { }
        }
    }
}

module.exports = {
    downloadPdfToFile,
    extractTablesFromFile,
    tablesToMarkdown,
    extractTableFromUrl
};
