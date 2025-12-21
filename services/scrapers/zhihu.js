/**
 * 知乎财经抓取器 - 深度爆料
 * 使用 OCR 方式绕过反爬
 */

const path = require('path');
const fs = require('fs');

// OCR 临时目录
const OCR_DIR = '/tmp/ocr-scrape';

// 抓取状态
const zhihuStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 知乎财经话题 OCR 采集
 */
async function scrapeZhihuFinance(options = {}) {
    const maxItems = options.maxItems || 5;

    console.log('[知乎财经] 开始 OCR 采集...');
    zhihuStatus.isRunning = true;
    zhihuStatus.totalFetches++;

    const results = [];

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

        // 知乎财经话题
        const url = 'https://www.zhihu.com/topic/19551424/hot'; // 股票话题
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 等待加载
        await sleep(5000);

        // 滚动加载
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await sleep(1000);
        }

        // 截图
        const screenshotPath = path.join(OCR_DIR, `zhihu_${Date.now()}.png`);
        if (!fs.existsSync(OCR_DIR)) {
            fs.mkdirSync(OCR_DIR, { recursive: true });
        }

        await page.screenshot({
            path: screenshotPath,
            clip: { x: 200, y: 100, width: 800, height: 800 }
        });

        // OCR 识别
        const Tesseract = require('tesseract.js');
        const ocrResult = await Tesseract.recognize(screenshotPath, 'chi_sim+eng', {
            logger: () => { }
        });

        if (ocrResult.data.text && ocrResult.data.confidence > 40) {
            const lines = ocrResult.data.text.split('\n').filter(line => line.trim().length > 15);

            for (const line of lines.slice(0, maxItems)) {
                results.push({
                    source: 'zhihu',
                    sourceName: '知乎财经',
                    dimension: 'social',
                    title: line.trim().substring(0, 100),
                    content: '',
                    url: 'https://www.zhihu.com/topic/19551424/hot',
                    publishTime: new Date(),
                    category: '深度讨论',
                    ocrConfidence: ocrResult.data.confidence
                });
            }
        }

        fs.unlinkSync(screenshotPath);
        await browser.close();

        zhihuStatus.successCount++;
        console.log(`[知乎财经] OCR 采集完成: ${results.length} 条`);

    } catch (error) {
        zhihuStatus.failCount++;
        console.error('[知乎财经] OCR 采集失败:', error.message);
    } finally {
        zhihuStatus.isRunning = false;
        zhihuStatus.lastFetchTime = new Date();
    }

    return results;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取状态
 */
function getZhihuStatus() {
    return {
        ...zhihuStatus,
        lastFetchTimeStr: zhihuStatus.lastFetchTime
            ? zhihuStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeZhihuFinance,
    getZhihuStatus
};
