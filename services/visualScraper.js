/**
 * Visual Scraper Service - 视觉化采集引擎
 * 
 * 功能：
 * 1. Puppeteer 打开反爬网站（今日头条等）
 * 2. 区域截图 + Tesseract.js OCR 识别
 * 3. 关键词矩阵过滤
 * 
 * 适用场景：
 * - 今日头条推荐流
 * - 其他 DOM 难以解析的动态页面
 */

const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { shouldIngest } = require('../config/filterConfig');
const { generateHashId } = require('../utils/hashUtils');

// OCR 临时目录
const OCR_DIR = '/tmp/ocr-scrape';

// 视觉采集状态
const visualStatus = {
    isRunning: false,
    lastRunTime: null,
    totalScans: 0,
    successCount: 0,
    failCount: 0,
    recentLogs: []
};

// 确保目录存在
if (!fs.existsSync(OCR_DIR)) {
    fs.mkdirSync(OCR_DIR, { recursive: true });
}

/**
 * 添加日志
 */
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const log = `[${timestamp}] ${message}`;
    visualStatus.recentLogs.unshift(log);
    if (visualStatus.recentLogs.length > 20) {
        visualStatus.recentLogs.pop();
    }
    console.log(`[视觉采集] ${message}`);
}

/**
 * OCR 识别单张图片
 */
async function recognizeImage(imagePath) {
    try {
        const result = await Tesseract.recognize(
            imagePath,
            'chi_sim+eng',
            {
                logger: info => {
                    if (info.status === 'recognizing text' && info.progress === 1) {
                        addLog('OCR 识别完成');
                    }
                }
            }
        );
        return {
            text: result.data.text.trim(),
            confidence: result.data.confidence
        };
    } catch (error) {
        addLog(`OCR 失败: ${error.message}`);
        return { text: '', confidence: 0 };
    }
}

/**
 * 从 OCR 文本提取新闻信息
 */
function extractNewsFromOCR(ocrText, source = 'visual') {
    const lines = ocrText.split('\n').filter(line => line.trim().length > 10);

    if (lines.length === 0) return null;

    // 第一行通常是标题
    const title = lines[0].replace(/\s+/g, '').substring(0, 100);
    const content = lines.slice(1).join(' ').substring(0, 500);

    // 白名单过滤
    const filterResult = shouldIngest(title, content);
    if (!filterResult.shouldIngest) {
        return null;
    }

    return {
        source: `visual_${source}`,
        sourceName: `视觉采集-${source}`,
        dimension: 'visual',
        title,
        content,
        url: '',
        publishTime: new Date(),
        matchedKeywords: filterResult.matchedKeywords,
        ocrConfidence: 0
    };
}

/**
 * 视觉采集今日头条推荐流
 */
async function scrapeToutiao(options = {}) {
    const maxItems = options.maxItems || 5;

    addLog('启动今日头条视觉采集...');
    visualStatus.isRunning = true;
    visualStatus.totalScans++;

    let browser = null;
    const results = [];

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        // 获取 Chromium 路径
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9'
        });

        addLog('打开今日头条首页...');
        await page.goto('https://www.toutiao.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // 等待页面稳定
        await sleep(3000);

        // 滚动加载更多内容
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await sleep(1000);
        }

        addLog('开始截取新闻元素...');

        // 查找新闻元素
        const newsSelectors = [
            '.feed-card-article-l',
            '.feed-card',
            '[data-log-name="article"]'
        ];

        let newsElements = [];
        for (const selector of newsSelectors) {
            newsElements = await page.$$(selector);
            if (newsElements.length > 0) {
                addLog(`找到 ${newsElements.length} 个新闻元素 (${selector})`);
                break;
            }
        }

        // 处理每个新闻元素
        const processCount = Math.min(newsElements.length, maxItems);
        for (let i = 0; i < processCount; i++) {
            try {
                const element = newsElements[i];
                const screenshotPath = path.join(OCR_DIR, `news_${Date.now()}_${i}.png`);

                await element.screenshot({ path: screenshotPath });
                addLog(`截图 ${i + 1}/${processCount}: ${screenshotPath}`);

                // OCR 识别
                const ocrResult = await recognizeImage(screenshotPath);

                if (ocrResult.text && ocrResult.confidence > 60) {
                    const newsItem = extractNewsFromOCR(ocrResult.text, 'toutiao');
                    if (newsItem) {
                        newsItem.ocrConfidence = ocrResult.confidence;
                        results.push(newsItem);
                        addLog(`✅ 识别成功: ${newsItem.title.substring(0, 30)}...`);
                    }
                }

                // 清理截图
                fs.unlinkSync(screenshotPath);

            } catch (error) {
                addLog(`处理元素 ${i + 1} 失败: ${error.message}`);
            }
        }

        visualStatus.successCount++;
        addLog(`视觉采集完成: 共识别 ${results.length} 条有效新闻`);

    } catch (error) {
        visualStatus.failCount++;
        addLog(`视觉采集失败: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
        visualStatus.isRunning = false;
        visualStatus.lastRunTime = new Date();
    }

    return results;
}

/**
 * 视觉采集通用页面
 */
async function scrapeVisual(url, options = {}) {
    const { selector = 'body', maxScreenshots = 3 } = options;

    addLog(`启动视觉采集: ${url}`);
    visualStatus.isRunning = true;
    visualStatus.totalScans++;

    let browser = null;
    const results = [];

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2000);

        // 截图并识别
        const screenshotPath = path.join(OCR_DIR, `visual_${Date.now()}.png`);

        if (selector === 'body') {
            await page.screenshot({ path: screenshotPath, fullPage: false });
        } else {
            const element = await page.$(selector);
            if (element) {
                await element.screenshot({ path: screenshotPath });
            }
        }

        const ocrResult = await recognizeImage(screenshotPath);

        if (ocrResult.text && ocrResult.confidence > 50) {
            const newsItem = extractNewsFromOCR(ocrResult.text, 'custom');
            if (newsItem) {
                newsItem.url = url;
                newsItem.ocrConfidence = ocrResult.confidence;
                results.push(newsItem);
            }
        }

        fs.unlinkSync(screenshotPath);
        visualStatus.successCount++;

    } catch (error) {
        visualStatus.failCount++;
        addLog(`视觉采集失败: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
        visualStatus.isRunning = false;
        visualStatus.lastRunTime = new Date();
    }

    return results;
}

/**
 * 获取视觉采集状态
 */
function getVisualStatus() {
    return {
        ...visualStatus,
        lastRunTimeStr: visualStatus.lastRunTime
            ? visualStatus.lastRunTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

/**
 * 辅助函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    scrapeToutiao,
    scrapeVisual,
    recognizeImage,
    extractNewsFromOCR,
    getVisualStatus,
    addLog
};
