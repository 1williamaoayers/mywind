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

/**
 * 微信公众号搜索 OCR 采集
 * 使用搜狗微信搜索（公开入口）
 */
async function scrapeWechat(keyword, options = {}) {
    const maxItems = options.maxItems || 3;

    addLog(`启动微信公众号搜索: ${keyword}`);
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
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

        // 搜狗微信搜索
        const searchUrl = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(keyword)}`;
        addLog(`打开搜狗微信搜索: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        // 查找文章列表
        const articles = await page.$$('.news-box .news-list li');
        addLog(`找到 ${articles.length} 篇文章`);

        const processCount = Math.min(articles.length, maxItems);
        for (let i = 0; i < processCount; i++) {
            try {
                const article = articles[i];
                const screenshotPath = path.join(OCR_DIR, `wechat_${Date.now()}_${i}.png`);

                await article.screenshot({ path: screenshotPath });

                const ocrResult = await recognizeImage(screenshotPath);

                if (ocrResult.text && ocrResult.confidence > 50) {
                    const newsItem = extractNewsFromOCR(ocrResult.text, 'wechat');
                    if (newsItem) {
                        newsItem.ocrConfidence = ocrResult.confidence;
                        results.push(newsItem);
                        addLog(`✅ 微信文章: ${newsItem.title.substring(0, 30)}...`);
                    }
                }

                fs.unlinkSync(screenshotPath);
            } catch (error) {
                addLog(`处理微信文章 ${i + 1} 失败: ${error.message}`);
            }
        }

        visualStatus.successCount++;
        addLog(`微信采集完成: ${results.length} 篇文章`);

    } catch (error) {
        visualStatus.failCount++;
        addLog(`微信采集失败: ${error.message}`);
    } finally {
        if (browser) await browser.close();
        visualStatus.isRunning = false;
        visualStatus.lastRunTime = new Date();
    }

    return results;
}

/**
 * 小红书搜索 OCR 采集
 */
async function scrapeXiaohongshu(keyword, options = {}) {
    const maxItems = options.maxItems || 3;

    addLog(`启动小红书搜索: ${keyword}`);
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
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

        // 小红书搜索
        const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;
        addLog(`打开小红书搜索: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);

        // 滚动加载
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(2000);

        // 截取整个搜索结果区域
        const screenshotPath = path.join(OCR_DIR, `xhs_${Date.now()}.png`);
        await page.screenshot({
            path: screenshotPath,
            clip: { x: 200, y: 100, width: 1000, height: 800 }
        });

        const ocrResult = await recognizeImage(screenshotPath);

        if (ocrResult.text && ocrResult.confidence > 40) {
            // 小红书内容通常比较短，按段落分割
            const paragraphs = ocrResult.text.split('\n\n').filter(p => p.trim().length > 20);

            for (const para of paragraphs.slice(0, maxItems)) {
                const newsItem = extractNewsFromOCR(para, 'xiaohongshu');
                if (newsItem) {
                    newsItem.ocrConfidence = ocrResult.confidence;
                    results.push(newsItem);
                }
            }
        }

        fs.unlinkSync(screenshotPath);
        visualStatus.successCount++;
        addLog(`小红书采集完成: ${results.length} 条内容`);

    } catch (error) {
        visualStatus.failCount++;
        addLog(`小红书采集失败: ${error.message}`);
    } finally {
        if (browser) await browser.close();
        visualStatus.isRunning = false;
        visualStatus.lastRunTime = new Date();
    }

    return results;
}

/**
 * 行业垂直网站 OCR 采集
 */
async function scrapeVertical(source, options = {}) {
    const VERTICAL_SOURCES = {
        // 科创板日报
        kechuang: {
            name: '科创板日报',
            url: 'https://www.chinastarmarket.cn/',
            contentSelector: '.news-list'
        },
        // 智通财经
        zhitong: {
            name: '智通财经',
            url: 'https://www.zhitongcaijing.com/content/meigu.html',
            contentSelector: '.news-box'
        }
    };

    const config = VERTICAL_SOURCES[source];
    if (!config) {
        addLog(`未知的垂直源: ${source}`);
        return [];
    }

    addLog(`启动 ${config.name} 采集...`);
    return await scrapeVisual(config.url, { selector: config.contentSelector, ...options });
}

/**
 * 雪球热议榜 OCR + AI 情绪分析
 */
async function scrapeXueqiuSentiment(stockCode, options = {}) {
    const maxItems = options.maxItems || 5;

    addLog(`启动雪球情绪分析: ${stockCode}...`);
    visualStatus.isRunning = true;
    visualStatus.totalScans++;

    let browser = null;
    const result = {
        stockCode,
        hotTopics: [],
        sentiment: null,
        analysis: null
    };

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
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

        // 雪球个股讨论页
        const stockUrl = `https://xueqiu.com/S/${stockCode}`;
        addLog(`打开雪球: ${stockUrl}`);

        await page.goto(stockUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);

        // 滚动加载评论
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await sleep(1000);
        }

        // 截取讨论区
        const screenshotPath = path.join(OCR_DIR, `xueqiu_${stockCode}_${Date.now()}.png`);
        await page.screenshot({
            path: screenshotPath,
            clip: { x: 600, y: 200, width: 800, height: 800 }
        });

        // OCR 识别
        const ocrResult = await recognizeImage(screenshotPath);

        if (ocrResult.text && ocrResult.confidence > 40) {
            // 提取热门话题
            const lines = ocrResult.text.split('\n').filter(line => line.trim().length > 10);
            result.hotTopics = lines.slice(0, maxItems);

            // 简单情绪分析（关键词统计）
            const text = ocrResult.text;
            const bullishWords = ['涨', '看多', '抄底', '加仓', '利好', '突破', '新高', '牛', '冲'];
            const bearishWords = ['跌', '看空', '割肉', '清仓', '利空', '破位', '新低', '熊', '跑'];

            let bullishCount = 0;
            let bearishCount = 0;

            for (const word of bullishWords) {
                const regex = new RegExp(word, 'g');
                bullishCount += (text.match(regex) || []).length;
            }
            for (const word of bearishWords) {
                const regex = new RegExp(word, 'g');
                bearishCount += (text.match(regex) || []).length;
            }

            const total = bullishCount + bearishCount;
            if (total > 0) {
                const bullishRatio = bullishCount / total;
                if (bullishRatio > 0.6) {
                    result.sentiment = 'bullish';
                    result.analysis = `看多情绪 (${Math.round(bullishRatio * 100)}%)：股民倾向于"抄底"`;
                } else if (bullishRatio < 0.4) {
                    result.sentiment = 'bearish';
                    result.analysis = `看空情绪 (${Math.round((1 - bullishRatio) * 100)}%)：股民倾向于"割肉"`;
                } else {
                    result.sentiment = 'neutral';
                    result.analysis = '情绪分歧：多空博弈激烈';
                }
            } else {
                result.sentiment = 'unknown';
                result.analysis = '样本不足，无法判断情绪';
            }

            result.bullishCount = bullishCount;
            result.bearishCount = bearishCount;
            result.ocrConfidence = ocrResult.confidence;

            addLog(`✅ 雪球情绪分析: ${result.sentiment} (多${bullishCount}/空${bearishCount})`);
        }

        fs.unlinkSync(screenshotPath);
        visualStatus.successCount++;

    } catch (error) {
        visualStatus.failCount++;
        addLog(`雪球情绪分析失败: ${error.message}`);
        result.error = error.message;
    } finally {
        if (browser) await browser.close();
        visualStatus.isRunning = false;
        visualStatus.lastRunTime = new Date();
    }

    return result;
}

module.exports = {
    scrapeToutiao,
    scrapeVisual,
    scrapeWechat,
    scrapeXiaohongshu,
    scrapeVertical,
    scrapeXueqiuSentiment,
    recognizeImage,
    extractNewsFromOCR,
    getVisualStatus,
    addLog
};
