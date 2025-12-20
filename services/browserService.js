/**
 * Browser Service - Puppeteer 高级封装
 * 
 * 特性：
 * 1. 极轻量模式 - 资源拦截（图片/CSS/字体/广告）
 * 2. 环境仿真 - 随机 UA/分辨率/语言
 * 3. 反检测 - Stealth 插件
 * 4. 智能交互 - 翻页/滚动模拟
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// 启用 Stealth 插件（反检测）
puppeteer.use(StealthPlugin());

// 常见分辨率池
const VIEWPORT_POOL = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
];

// User-Agent 池
const USER_AGENT_POOL = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

// 需要拦截的资源类型
const BLOCKED_RESOURCE_TYPES = ['image', 'stylesheet', 'font', 'media'];

// 需要拦截的 URL 模式（广告/统计）
const BLOCKED_URL_PATTERNS = [
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.com',
    'doubleclick.net',
    'baidu.com/hm.js',
    'cnzz.com',
    'umeng.com',
    '51.la',
    'tongji.baidu.com'
];

// 浏览器实例（复用）
let browserInstance = null;

/**
 * 获取随机 User-Agent
 */
function getRandomUserAgent() {
    return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];
}

/**
 * 获取随机分辨率
 */
function getRandomViewport() {
    return VIEWPORT_POOL[Math.floor(Math.random() * VIEWPORT_POOL.length)];
}

/**
 * 启动浏览器（复用实例）
 */
async function launchBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    console.log('[浏览器] 启动 Puppeteer (Stealth 模式)...');

    // 使用系统 Chromium（Docker 环境）
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    browserInstance = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ]
    });

    console.log('[浏览器] Puppeteer 启动成功');
    return browserInstance;
}

/**
 * 创建新页面（带资源拦截和环境仿真）
 */
async function createPage(options = {}) {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    // 1. 设置随机 User-Agent
    const userAgent = options.userAgent || getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // 2. 设置随机分辨率
    const viewport = options.viewport || getRandomViewport();
    await page.setViewport(viewport);

    // 3. 设置语言
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    });

    // 4. 开启资源拦截（极轻量模式）
    if (options.lightMode !== false) {
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const resourceType = request.resourceType();
            const url = request.url();

            // 拦截资源类型
            if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
                request.abort();
                return;
            }

            // 拦截广告/统计 URL
            if (BLOCKED_URL_PATTERNS.some(pattern => url.includes(pattern))) {
                request.abort();
                return;
            }

            request.continue();
        });
    }

    console.log(`[浏览器] 新页面已创建 (UA: ${userAgent.substring(0, 30)}..., ${viewport.width}x${viewport.height})`);
    return page;
}

/**
 * 模拟人类滚动（触发懒加载）
 */
async function humanScroll(page, options = {}) {
    const scrollCount = options.scrollCount || 3;
    const scrollDelay = options.scrollDelay || 500;

    for (let i = 0; i < scrollCount; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
        });
        await sleep(scrollDelay + Math.random() * 300);
    }

    // 滚动到底部
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(500);
}

/**
 * 模拟人类鼠标移动并点击
 */
async function humanClick(page, selector) {
    try {
        const element = await page.$(selector);
        if (!element) return false;

        const box = await element.boundingBox();
        if (!box) return false;

        // 计算随机点击位置（元素内部）
        const x = box.x + box.width * (0.3 + Math.random() * 0.4);
        const y = box.y + box.height * (0.3 + Math.random() * 0.4);

        // 移动鼠标（模拟轨迹）
        await page.mouse.move(x, y, { steps: 10 });
        await sleep(100 + Math.random() * 200);

        // 点击
        await page.mouse.click(x, y);
        return true;

    } catch (error) {
        console.error('[浏览器] 点击失败:', error.message);
        return false;
    }
}

/**
 * 智能翻页搜索
 * @param {Page} page - Puppeteer 页面
 * @param {string} nextSelector - 下一页按钮选择器
 * @param {number} maxPages - 最大翻页数
 * @param {Function} extractFunc - 提取数据函数
 */
async function smartPaginate(page, nextSelector, maxPages = 3, extractFunc) {
    const allResults = [];
    const seenUrls = new Set();

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        console.log(`[浏览器] 正在处理第 ${pageNum} 页...`);

        // 滚动触发懒加载
        await humanScroll(page);

        // 提取当前页数据
        const results = await extractFunc(page);

        // 去重
        for (const item of results) {
            if (!seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                allResults.push(item);
            }
        }

        console.log(`[浏览器] 第 ${pageNum} 页提取 ${results.length} 条，累计 ${allResults.length} 条`);

        // 检查是否有下一页
        if (pageNum < maxPages) {
            const hasNext = await humanClick(page, nextSelector);
            if (!hasNext) {
                console.log('[浏览器] 没有更多页面');
                break;
            }

            // 等待页面加载
            await sleep(2000 + Math.random() * 1000);
        }
    }

    return allResults;
}

/**
 * 截图保存（调试用）
 */
async function takeScreenshot(page, filename) {
    try {
        await page.screenshot({
            path: `/tmp/${filename}.png`,
            fullPage: false
        });
        console.log(`[浏览器] 截图已保存: /tmp/${filename}.png`);
    } catch (error) {
        console.error('[浏览器] 截图失败:', error.message);
    }
}

/**
 * 关闭页面
 */
async function closePage(page) {
    try {
        await page.close();
    } catch (error) {
        // 忽略
    }
}

/**
 * 关闭浏览器
 */
async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        console.log('[浏览器] Puppeteer 已关闭');
    }
}

/**
 * 辅助函数：睡眠
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    // 浏览器管理
    launchBrowser,
    createPage,
    closePage,
    closeBrowser,

    // 人类行为模拟
    humanScroll,
    humanClick,
    smartPaginate,

    // 工具
    takeScreenshot,
    getRandomUserAgent,
    getRandomViewport,
    sleep
};
