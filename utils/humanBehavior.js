/**
 * 人性化行为模拟模块
 * 
 * 功能：
 * 1. 模拟真实用户的滚动、点击、输入行为
 * 2. 增加随机延迟，避免被检测为机器人
 * 3. 创建隐身页面，绑定反检测脚本
 * 
 * @author MyWind AI
 * @date 2025-12-27
 */

const puppeteer = require('puppeteer');

// ==================== 随机延迟 ====================

/**
 * 随机延迟
 * 
 * @param {number} min - 最小毫秒
 * @param {number} max - 最大毫秒
 */
async function randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 短暂延迟（模拟思考时间）
 */
async function thinkDelay() {
    return randomDelay(100, 500);
}

// ==================== 人性化滚动 ====================

/**
 * 模拟人类滚动行为
 * 
 * @param {Page} page
 * @param {Object} options
 */
async function humanScroll(page, options = {}) {
    const {
        distance = 300,          // 每次滚动距离
        scrollTimes = 3,         // 滚动次数
        pauseMin = 500,          // 最小暂停时间
        pauseMax = 1500          // 最大暂停时间
    } = options;

    for (let i = 0; i < scrollTimes; i++) {
        // 随机滚动距离（有时多滚一点，有时少滚一点）
        const actualDistance = distance + Math.floor(Math.random() * 100) - 50;

        await page.evaluate((dist) => {
            window.scrollBy({
                top: dist,
                behavior: 'smooth'
            });
        }, actualDistance);

        // 随机暂停
        await randomDelay(pauseMin, pauseMax);

        // 偶尔向上滚动一点（模拟人类阅读习惯）
        if (Math.random() < 0.2) {
            await page.evaluate(() => {
                window.scrollBy({ top: -50, behavior: 'smooth' });
            });
            await randomDelay(200, 400);
        }
    }
}

/**
 * 滚动到页面底部
 */
async function scrollToBottom(page, options = {}) {
    const { maxScrolls = 10, waitForMore = true } = options;

    let previousHeight = 0;
    let scrollCount = 0;

    while (scrollCount < maxScrolls) {
        // 获取当前页面高度
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);

        if (currentHeight === previousHeight) {
            // 页面没有更多内容了
            break;
        }

        previousHeight = currentHeight;

        // 滚动到底部
        await page.evaluate(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });

        scrollCount++;
        await randomDelay(1000, 2000);

        // 等待可能的新内容加载
        if (waitForMore) {
            await randomDelay(500, 1000);
        }
    }

    return scrollCount;
}

// ==================== 人性化点击 ====================

/**
 * 模拟人类点击行为
 * 
 * @param {Page} page
 * @param {string} selector
 */
async function humanClick(page, selector) {
    try {
        const element = await page.$(selector);
        if (!element) return false;

        // 获取元素位置
        const box = await element.boundingBox();
        if (!box) return false;

        // 移动鼠标到元素附近（有一点随机偏移）
        const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
        const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

        // 模拟鼠标移动
        await page.mouse.move(x, y, { steps: 10 });

        // 短暂暂停（模拟人眼确认）
        await thinkDelay();

        // 点击
        await page.mouse.click(x, y);

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 点击元素（带重试）
 */
async function humanClickElement(page, element) {
    try {
        const box = await element.boundingBox();
        if (!box) return false;

        const x = box.x + box.width / 2 + (Math.random() * 6 - 3);
        const y = box.y + box.height / 2 + (Math.random() * 6 - 3);

        await page.mouse.move(x, y, { steps: 8 });
        await thinkDelay();
        await element.click();

        return true;
    } catch {
        return false;
    }
}

// ==================== 人性化输入 ====================

/**
 * 模拟人类输入行为
 * 
 * @param {Page} page
 * @param {string} selector
 * @param {string} text
 */
async function humanType(page, selector, text) {
    try {
        await page.click(selector);
        await thinkDelay();

        // 逐字输入，每个字符之间有随机延迟
        for (const char of text) {
            await page.keyboard.type(char);
            await randomDelay(50, 150);
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * 模拟输入（直接在元素上）
 */
async function humanTypeText(page, text, options = {}) {
    const { minDelay = 30, maxDelay = 120 } = options;

    for (const char of text) {
        await page.keyboard.type(char);
        await randomDelay(minDelay, maxDelay);
    }
}

// ==================== 隐身页面 ====================

/**
 * 创建隐身页面（增强反检测）
 * 
 * @param {Browser} browser
 * @returns {Promise<Page>}
 */
async function createStealthPage(browser) {
    const page = await browser.newPage();

    // 设置视口
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });

    // 设置语言
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    });

    // 注入反检测脚本
    await page.evaluateOnNewDocument(() => {
        // 隐藏 webdriver 标志
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });

        // 模拟真实的 plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' }
            ]
        });

        // 模拟真实的 languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en']
        });

        // 隐藏 Puppeteer 痕迹
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    console.log('[反检测] 增强页面已创建');
    return page;
}

// ==================== 持久化浏览器 ====================

/**
 * 创建持久化浏览器（保存 cookies 等状态）
 * 
 * @param {string} name - 浏览器名称
 * @returns {Promise<Browser>}
 */
async function createPersistentBrowser(name) {
    const userDataDir = `/tmp/puppeteer-profiles/${name}`;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            `--user-data-dir=${userDataDir}`,
            '--proxy-server=http://127.0.0.1:20171'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    return browser;
}

// ==================== 导出 ====================

module.exports = {
    // 随机延迟
    randomDelay,
    thinkDelay,

    // 人性化滚动
    humanScroll,
    scrollToBottom,

    // 人性化点击
    humanClick,
    humanClickElement,

    // 人性化输入
    humanType,
    humanTypeText,

    // 隐身页面
    createStealthPage,
    createPersistentBrowser
};
