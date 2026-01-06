/**
 * PDF OCR 内容提取工具
 * 
 * 方案：Puppeteer打开PDF → 截图 → Tesseract OCR识别
 * 
 * 优势：
 * - 表格内容也能识别
 * - 中文识别效果好
 * - 项目已有Tesseract依赖
 */

const puppeteer = require('./puppeteerBase');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// 临时目录
const TMP_DIR = '/tmp/pdf-ocr';

// 确保目录存在
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * 用Puppeteer打开PDF并截图
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<string[]>} 截图文件路径列表
 */
async function screenshotPdf(url, options = {}) {
    const { maxPages = 3 } = options;
    let page = null;
    const screenshots = [];

    try {
        console.log(`[PDF-OCR] 打开: ${url.substring(0, 60)}...`);

        page = await puppeteer.createPage({
            timeout: 90000,
            blockResources: false
        });

        // 设置视口大小（A4比例）
        await page.setViewport({ width: 1200, height: 1600 });

        // 访问PDF
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        }).catch(() => { });

        // 等待PDF渲染
        await new Promise(r => setTimeout(r, 5000));

        // 截图第一页
        const screenshotPath = path.join(TMP_DIR, `pdf_${Date.now()}_page1.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: false
        });
        screenshots.push(screenshotPath);
        console.log(`[PDF-OCR] 截图: ${screenshotPath}`);

        // 如果需要更多页，滚动并截图
        for (let i = 2; i <= maxPages; i++) {
            // 滚动一页
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await new Promise(r => setTimeout(r, 2000));

            const pagePath = path.join(TMP_DIR, `pdf_${Date.now()}_page${i}.png`);
            await page.screenshot({
                path: pagePath,
                fullPage: false
            });
            screenshots.push(pagePath);
        }

        console.log(`[PDF-OCR] 共截图 ${screenshots.length} 页`);
        return screenshots;

    } catch (error) {
        console.error(`[PDF-OCR] 截图失败: ${error.message}`);
        throw error;
    } finally {
        if (page) {
            await puppeteer.closePage(page);
        }
    }
}

/**
 * 对图片进行OCR识别
 * @param {string} imagePath - 图片路径
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function ocrImage(imagePath) {
    try {
        console.log(`[PDF-OCR] OCR识别: ${path.basename(imagePath)}...`);

        const result = await Tesseract.recognize(
            imagePath,
            'chi_sim+eng',  // 中文简体 + 英文
            {
                logger: info => {
                    if (info.status === 'recognizing text' && info.progress >= 0.5) {
                        process.stdout.write(`\r[PDF-OCR] 进度: ${Math.round(info.progress * 100)}%`);
                    }
                }
            }
        );

        console.log(''); // 换行
        return {
            text: result.data.text.trim(),
            confidence: result.data.confidence
        };
    } catch (error) {
        console.error(`[PDF-OCR] OCR失败: ${error.message}`);
        return { text: '', confidence: 0 };
    }
}

/**
 * 提取PDF内容（OCR方式）
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<{text: string, pages: number, confidence: number, success: boolean}>}
 */
async function extractPdfContentOcr(url, options = {}) {
    const { maxPages = 2, maxLength = 5000 } = options;

    try {
        // 检查URL是否是PDF
        if (!url.toLowerCase().includes('.pdf')) {
            return { text: '', pages: 0, confidence: 0, success: false, error: '非PDF链接' };
        }

        // 1. 截图
        const screenshots = await screenshotPdf(url, { maxPages });

        // 2. OCR识别每一页
        let allText = '';
        let totalConfidence = 0;

        for (const imgPath of screenshots) {
            const { text, confidence } = await ocrImage(imgPath);
            allText += text + '\n\n';
            totalConfidence += confidence;

            // 删除临时文件
            fs.unlinkSync(imgPath);
        }

        // 3. 处理结果
        let finalText = allText.trim();
        if (finalText.length > maxLength) {
            finalText = finalText.substring(0, maxLength) + '... (已截断)';
        }

        const avgConfidence = totalConfidence / screenshots.length;

        console.log(`[PDF-OCR] 完成: ${screenshots.length}页, ${finalText.length}字符, 置信度${avgConfidence.toFixed(1)}%`);

        return {
            text: finalText,
            pages: screenshots.length,
            confidence: avgConfidence,
            success: true
        };

    } catch (error) {
        return {
            text: '',
            pages: 0,
            confidence: 0,
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    screenshotPdf,
    ocrImage,
    extractPdfContentOcr
};
