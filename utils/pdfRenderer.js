/**
 * PDF渲染工具 - 使用poppler将PDF转为图片
 * 
 * 方案：下载PDF → pdftoppm转换为PNG → Tesseract OCR
 * 
 * 解决问题：
 * 1. Chrome PDF查看器的embed无法通过JS滚动翻页
 * 2. pdfjs-dist 1.x 需要DOM环境，Node.js中无法使用
 * 
 * 依赖：poppler-utils (apt install poppler-utils)
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 临时目录
const TMP_DIR = '/tmp/pdf-render';
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * 下载PDF到本地文件
 * @param {string} url - PDF URL
 * @returns {Promise<string>} 本地文件路径
 */
function downloadPdfToFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const filePath = path.join(TMP_DIR, `pdf_${Date.now()}.pdf`);

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            timeout: 60000
        };

        console.log(`[PDF-Render] 下载: ${url.substring(0, 60)}...`);

        protocol.get(url, options, (response) => {
            // 处理重定向
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return downloadPdfToFile(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                const stats = fs.statSync(filePath);
                console.log(`[PDF-Render] 下载完成: ${(stats.size / 1024).toFixed(1)} KB → ${filePath}`);
                resolve(filePath);
            });

            fileStream.on('error', (err) => {
                fs.unlinkSync(filePath);
                reject(err);
            });
        }).on('error', reject);
    });
}

/**
 * 使用pdftoppm将PDF转为PNG图片
 * @param {string} pdfPath - PDF文件路径
 * @param {object} options - 选项
 * @returns {string[]} 生成的图片路径列表
 */
function pdfToImages(pdfPath, options = {}) {
    const { maxPages = 10, dpi = 200 } = options;
    const outputPrefix = path.join(TMP_DIR, `output_${Date.now()}`);

    console.log(`[PDF-Render] 使用pdftoppm转换 (DPI=${dpi}, 最多${maxPages}页)...`);

    try {
        // 使用pdftoppm转换
        // -png: 输出PNG格式
        // -r: DPI分辨率
        // -l: 最后一页
        execSync(`pdftoppm -png -r ${dpi} -l ${maxPages} "${pdfPath}" "${outputPrefix}"`, {
            timeout: 120000,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // 查找生成的图片文件
        const files = fs.readdirSync(TMP_DIR)
            .filter(f => f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png'))
            .sort()
            .map(f => path.join(TMP_DIR, f));

        console.log(`[PDF-Render] 转换完成，生成 ${files.length} 张图片`);
        return files;

    } catch (error) {
        console.error(`[PDF-Render] pdftoppm错误: ${error.message}`);
        throw error;
    }
}

/**
 * 将PDF每页渲染为PNG图片
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<string[]>} 图片文件路径列表
 */
async function renderPdfToImages(url, options = {}) {
    const { maxPages = 10, dpi = 200 } = options;
    let pdfPath = null;

    try {
        // 1. 下载PDF
        pdfPath = await downloadPdfToFile(url);

        // 2. 转换为图片
        const imagePaths = pdfToImages(pdfPath, { maxPages, dpi });

        // 3. 删除PDF临时文件
        fs.unlinkSync(pdfPath);

        return imagePaths;

    } catch (error) {
        console.error(`[PDF-Render] 错误: ${error.message}`);
        // 清理PDF临时文件
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
        throw error;
    }
}

/**
 * 提取PDF内容 (poppler + OCR方式)
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<{text: string, pages: number, confidence: number, success: boolean}>}
 */
async function extractPdfContentPdfjs(url, options = {}) {
    const { maxPages = 10, maxLength = 20000 } = options;
    const Tesseract = require('tesseract.js');

    try {
        // 检查URL是否是PDF
        if (!url.toLowerCase().includes('.pdf')) {
            return { text: '', pages: 0, confidence: 0, success: false, error: '非PDF链接' };
        }

        // 1. 渲染PDF为图片
        const imagePaths = await renderPdfToImages(url, { maxPages });

        if (imagePaths.length === 0) {
            return { text: '', pages: 0, confidence: 0, success: false, error: '无法渲染PDF' };
        }

        // 2. OCR识别每一页
        let allText = '';
        let totalConfidence = 0;

        for (let i = 0; i < imagePaths.length; i++) {
            const imgPath = imagePaths[i];
            console.log(`[PDF-Render] OCR第 ${i + 1}/${imagePaths.length} 页...`);

            const result = await Tesseract.recognize(
                imgPath,
                'chi_sim+eng',
                {
                    logger: info => {
                        if (info.status === 'recognizing text' && info.progress >= 0.5) {
                            process.stdout.write(`\r[PDF-Render] OCR进度: ${Math.round(info.progress * 100)}%`);
                        }
                    }
                }
            );

            console.log(''); // 换行
            allText += result.data.text.trim() + '\n\n';
            totalConfidence += result.data.confidence;

            // 删除临时文件
            fs.unlinkSync(imgPath);
        }

        // 3. 处理结果
        let finalText = allText.trim();
        if (finalText.length > maxLength) {
            finalText = finalText.substring(0, maxLength) + '... (已截断)';
        }

        const avgConfidence = totalConfidence / imagePaths.length;

        console.log(`[PDF-Render] 完成: ${imagePaths.length}页, ${finalText.length}字符, 置信度${avgConfidence.toFixed(1)}%`);

        return {
            text: finalText,
            pages: imagePaths.length,
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

/**
 * 提取PDF内容 - 使用RapidOCR服务 (推荐)
 * 通过HTTP调用Python OCR服务，置信度约98%
 * 
 * @param {string} url - PDF URL
 * @param {object} options - 选项
 * @returns {Promise<{text: string, pages: number, confidence: number, success: boolean}>}
 */
async function extractPdfContentRapid(url, options = {}) {
    const { maxPages = 20, maxLength = 50000 } = options;
    const axios = require('axios');
    const FormData = require('form-data');

    // OCR服务地址 (从环境变量获取，默认本地)
    const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:9000';

    try {
        // 检查URL是否是PDF
        if (!url.toLowerCase().includes('.pdf')) {
            return { text: '', pages: 0, confidence: 0, success: false, error: '非PDF链接' };
        }

        console.log(`[PDF-Rapid] 下载PDF: ${url.substring(0, 60)}...`);

        // 1. 下载PDF到本地
        const pdfPath = await downloadPdfToFile(url);

        // 2. 创建FormData
        const formData = new FormData();
        formData.append('file', fs.createReadStream(pdfPath));
        formData.append('max_pages', maxPages.toString());

        console.log(`[PDF-Rapid] 调用OCR服务...`);

        // 3. 调用RapidOCR服务
        const response = await axios.post(`${OCR_SERVICE_URL}/ocr/pdf`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 300000, // 5分钟超时 (大PDF需要时间)
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            proxy: false // 不使用代理
        });

        // 4. 删除临时文件
        fs.unlinkSync(pdfPath);

        // 5. 处理响应
        if (response.data.success) {
            let finalText = response.data.text || '';
            if (finalText.length > maxLength) {
                finalText = finalText.substring(0, maxLength) + '... (已截断)';
            }

            console.log(`[PDF-Rapid] 完成: ${response.data.pages}页, ${finalText.length}字符, 置信度${response.data.confidence}%`);

            return {
                text: finalText,
                pages: response.data.pages,
                confidence: response.data.confidence,
                success: true
            };
        } else {
            throw new Error(response.data.detail || 'OCR服务返回失败');
        }

    } catch (error) {
        console.error(`[PDF-Rapid] 错误: ${error.message}`);

        // 如果RapidOCR服务不可用，回退到Tesseract
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.log(`[PDF-Rapid] OCR服务不可用，回退到Tesseract...`);
            return extractPdfContentPdfjs(url, options);
        }

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
    downloadPdfToFile,
    pdfToImages,
    renderPdfToImages,
    extractPdfContentPdfjs,
    extractPdfContentRapid,  // 新增：使用RapidOCR服务
    // 默认使用RapidOCR
    extractPdfContent: extractPdfContentRapid
};
