/**
 * PDF 内容提取工具
 * 
 * 功能：
 * 1. 下载 PDF 文件（使用 Puppeteer 绕过反爬）
 * 2. 提取 PDF 文本内容
 * 
 * 用途：
 * - 披露易公告内容提取
 * - 研报内容提取
 * 
 * 依赖：pdf-parse@1.1.1
 */

const pdf = require('pdf-parse');
const puppeteer = require('./puppeteerBase');

/**
 * 使用 Puppeteer 下载 PDF 文件
 * 通过CDP协议直接获取响应body
 * @param {string} url - PDF 文件 URL
 * @returns {Promise<Buffer>} PDF 文件内容
 */
async function downloadPdf(url) {
    let page = null;

    try {
        console.log(`[PDF] 下载: ${url.substring(0, 80)}...`);

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

        client.on('Fetch.requestPaused', async ({ requestId, request, responseHeaders, responseStatusCode }) => {
            try {
                if (request.url.includes('.pdf') && responseStatusCode === 200) {
                    // 获取响应body
                    const { body, base64Encoded } = await client.send('Fetch.getResponseBody', { requestId });
                    if (base64Encoded) {
                        pdfBuffer = Buffer.from(body, 'base64');
                    } else {
                        pdfBuffer = Buffer.from(body);
                    }
                    console.log(`[PDF] 捕获: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
                }
                // 继续请求
                await client.send('Fetch.continueRequest', { requestId });
            } catch (e) {
                try {
                    await client.send('Fetch.continueRequest', { requestId });
                } catch (e2) { }
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

        if (pdfBuffer && pdfBuffer.length > 1000) {
            console.log(`[PDF] 下载成功: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
            return pdfBuffer;
        }

        throw new Error('未能捕获有效PDF内容');

    } catch (error) {
        console.error(`[PDF] 下载失败: ${error.message}`);
        throw new Error(`PDF下载失败: ${error.message}`);
    } finally {
        if (page) {
            await puppeteer.closePage(page);
        }
    }
}

/**
 * 从 PDF Buffer 提取文本
 * 使用 pdf-parse 1.x 的简单 API
 * @param {Buffer} pdfBuffer - PDF 文件内容
 * @returns {Promise<{text: string, pages: number}>}
 */
async function extractPdfText(pdfBuffer) {
    try {
        // pdf-parse 1.x: 直接调用 pdf(buffer)
        const data = await pdf(pdfBuffer);

        console.log(`[PDF] 解析成功: ${data.numpages} 页, ${data.text.length} 字符`);

        return {
            text: data.text.trim(),
            pages: data.numpages
        };

    } catch (error) {
        console.error(`[PDF] 解析失败: ${error.message}`);
        throw new Error(`PDF解析失败: ${error.message}`);
    }
}

/**
 * 下载并提取 PDF 内容
 * @param {string} url - PDF 文件 URL
 * @param {object} options - 选项
 * @param {number} options.maxLength - 最大返回长度 (默认 5000)
 * @returns {Promise<{text: string, pages: number, success: boolean}>}
 */
async function extractPdfContent(url, options = {}) {
    const { maxLength = 5000 } = options;

    try {
        // 检查URL是否是PDF
        if (!url.toLowerCase().includes('.pdf')) {
            return { text: '', pages: 0, success: false, error: '非PDF链接' };
        }

        // 下载
        const pdfBuffer = await downloadPdf(url);

        // 解析
        const { text: rawText, pages } = await extractPdfText(pdfBuffer);

        // 截取文本
        let text = rawText;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '... (已截断)';
        }

        return {
            text,
            pages,
            success: true
        };

    } catch (error) {
        return {
            text: '',
            pages: 0,
            success: false,
            error: error.message
        };
    }
}

/**
 * 批量提取多个 PDF 内容
 * @param {string[]} urls - PDF 文件 URL 列表
 * @param {object} options - 选项
 * @returns {Promise<object[]>} 提取结果列表
 */
async function extractMultiplePdfs(urls, options = {}) {
    const results = [];

    for (const url of urls) {
        const result = await extractPdfContent(url, options);
        results.push({ url, ...result });

        // 避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }

    return results;
}

module.exports = {
    downloadPdf,
    extractPdfText,
    extractPdfContent,
    extractMultiplePdfs
};
