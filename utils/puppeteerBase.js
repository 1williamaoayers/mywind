/**
 * Puppeteer 爬虫基础模块（优化版）
 * 
 * 功能：
 * 1. 浏览器池管理（复用实例）
 * 2. 超时配置分级
 * 3. 资源拦截优化
 * 4. 反检测集成（puppeteer-extra-plugin-stealth）
 * 5. 智能重试机制
 * 
 * @author MyWind AI
 * @date 2025-12-27
 * @version 2.1 - 添加stealth插件
 */

// 使用 puppeteer-extra 替代 puppeteer，启用 stealth 插件
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { getDefaultPool, withBrowser, BROWSER_CONFIG } = require('./browserPool');
const { getRandomUA, applyAntiDetection, randomDelay, humanLikeScroll } = require('./antiDetect');

// ==================== 超时配置 ====================

/**
 * 超时配置分级
 * 根据网站响应速度分为四个等级
 */
const TIMEOUT_LEVELS = {
    fast: 15000,      // 快速网站：百度、36氪、SEC
    normal: 30000,    // 普通网站：大多数财经媒体
    slow: 45000,      // 慢速网站：同花顺、披露易
    heavy: 60000      // 重型网站：视觉采集、OCR处理
};

/**
 * 网站专属超时配置
 * 根据实际测试结果设置
 */
const SITE_TIMEOUT_MAP = {
    // 慢速网站（需要 45 秒）
    'stockpage.10jqka.com.cn': TIMEOUT_LEVELS.slow,    // 同花顺
    'news.10jqka.com.cn': TIMEOUT_LEVELS.slow,
    'hkexnews.hk': TIMEOUT_LEVELS.slow,                 // 披露易
    'www.etnet.com.hk': TIMEOUT_LEVELS.slow,            // 经济通

    // 快速网站（15 秒足够）
    'www.baidu.com': TIMEOUT_LEVELS.fast,
    'www.bing.com': TIMEOUT_LEVELS.fast,
    '36kr.com': TIMEOUT_LEVELS.fast,
    'www.sec.gov': TIMEOUT_LEVELS.fast,
    'seekingalpha.com': TIMEOUT_LEVELS.fast,
    'www.reuters.com': TIMEOUT_LEVELS.fast,

    // 其他默认 30 秒
};

/**
 * 获取网站超时配置
 * 
 * @param {string} url - 网站 URL
 * @returns {number} 超时毫秒数
 */
function getTimeout(url) {
    try {
        const hostname = new URL(url).hostname;
        return SITE_TIMEOUT_MAP[hostname] || TIMEOUT_LEVELS.normal;
    } catch {
        return TIMEOUT_LEVELS.normal;
    }
}

// ==================== 资源拦截 ====================

/**
 * 需要拦截的广告/统计域名
 */
const BLOCKED_DOMAINS = [
    'google-analytics.com',
    'googletagmanager.com',
    'googlesyndication.com',
    'facebook.com',
    'doubleclick.net',
    'cnzz.com',
    'baidu.com/hm.js',
    'umeng.com',
    'bdstatic.com/linksubmit',
    'growingio.com',
    'sensors.com',
    'hotjar.com'
];

/**
 * 设置资源拦截
 * 
 * @param {Page} page - Puppeteer 页面
 * @param {Object} options - 配置选项
 */
async function setupResourceBlocking(page, options = {}) {
    const {
        loadImages = false,      // 是否加载图片
        loadStylesheets = false, // 是否加载 CSS
        loadFonts = false,       // 是否加载字体
        loadMedia = false        // 是否加载视频/音频
    } = options;

    await page.setRequestInterception(true);

    page.on('request', req => {
        const type = req.resourceType();
        const url = req.url();

        // 检查是否为广告/统计域名
        const isBlockedDomain = BLOCKED_DOMAINS.some(d => url.includes(d));
        if (isBlockedDomain) {
            req.abort();
            return;
        }

        // 根据配置决定是否拦截资源类型
        const blockedTypes = [];
        if (!loadImages) blockedTypes.push('image');
        if (!loadStylesheets) blockedTypes.push('stylesheet');
        if (!loadFonts) blockedTypes.push('font');
        if (!loadMedia) blockedTypes.push('media');

        if (blockedTypes.includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });
}

// ==================== 页面创建 ====================

/**
 * 创建新页面（优化版）
 * 
 * @param {Object} options - 配置选项
 * @returns {Promise<Page>}
 */
async function createPage(options = {}) {
    const pool = getDefaultPool();
    const browser = await pool.acquire();
    const page = await browser.newPage();

    // 存储 browser 引用，用于释放
    page._browser = browser;
    page._pool = pool;

    // 应用反检测
    if (options.stealth !== false) {
        await applyAntiDetection(page);
    } else {
        // 仅设置 UA
        await page.setUserAgent(options.userAgent || getRandomUA());
    }

    // 设置视口
    await page.setViewport(options.viewport || { width: 1920, height: 1080 });

    // 设置超时（使用智能配置或手动指定）
    const timeout = options.timeout || TIMEOUT_LEVELS.normal;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(options.navigationTimeout || timeout);

    // 设置资源拦截
    if (options.blockResources !== false) {
        await setupResourceBlocking(page, options);
    }

    return page;
}

/**
 * 关闭页面并释放浏览器
 * 
 * @param {Page} page
 */
async function closePage(page) {
    if (!page) return;

    const pool = page._pool;
    const browser = page._browser;

    try {
        await page.close();
    } catch {
        // 忽略关闭错误
    }

    if (pool && browser) {
        pool.release(browser);
    }
}

// ==================== 页面访问 ====================

/**
 * 安全访问页面（带智能超时）
 * 
 * @param {Page} page
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
async function goto(page, url, options = {}) {
    const timeout = options.timeout || getTimeout(url);

    try {
        await page.goto(url, {
            waitUntil: options.waitUntil || 'domcontentloaded',
            timeout
        });
        return true;
    } catch (error) {
        console.error(`[Puppeteer] 访问失败 ${url}:`, error.message);
        return false;
    }
}

/**
 * 带重试的页面访问
 * 
 * @param {Page} page
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
async function gotoWithRetry(page, url, options = {}) {
    const { maxRetries = 2, retryDelay = 2000 } = options;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        const success = await goto(page, url, options);

        if (success) return true;

        if (attempt <= maxRetries) {
            console.log(`[Puppeteer] 第 ${attempt} 次重试: ${url}`);
            await randomDelay(retryDelay, retryDelay * 1.5);

            // 增加超时时间
            options.timeout = (options.timeout || getTimeout(url)) * 1.3;
        }
    }

    return false;
}

/**
 * 宽松等待访问（超时不中断）
 * 
 * 适用于资源密集型页面（如同花顺），超时后继续手动等待
 * 
 * @param {Page} page
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
async function gotoLoose(page, url, options = {}) {
    const {
        timeout = 30000,
        waitAfter = 15000,  // 超时后额外等待时间
        waitUntil = 'load'
    } = options;

    try {
        await page.goto(url, { waitUntil, timeout });
    } catch (error) {
        // 超时不中断，继续等待
        console.log(`[Puppeteer] ${url} 加载超时，继续等待...`);
    }

    // 额外等待渲染
    await new Promise(r => setTimeout(r, waitAfter));

    // 检查页面是否正常
    const currentUrl = page.url();
    if (currentUrl.includes('chrome-error')) {
        console.error(`[Puppeteer] 页面加载失败: ${currentUrl}`);
        return false;
    }

    return true;
}

// ==================== 元素操作 ====================

/**
 * 等待元素并获取文本
 */
async function waitAndGetText(page, selector, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { timeout });
        return await page.$eval(selector, el => el.textContent?.trim() || '');
    } catch {
        return '';
    }
}

/**
 * 获取多个元素的文本
 */
async function getAllTexts(page, selector) {
    try {
        return await page.$$eval(selector, els =>
            els.map(el => el.textContent?.trim() || '').filter(t => t)
        );
    } catch {
        return [];
    }
}

/**
 * 获取链接列表
 */
async function getLinks(page, selector) {
    try {
        return await page.$$eval(selector, els =>
            els.map(el => ({
                text: el.textContent?.trim() || '',
                href: el.href || ''
            })).filter(l => l.href)
        );
    } catch {
        return [];
    }
}

/**
 * 滚动加载更多（人性化）
 */
async function scrollToBottom(page, options = {}) {
    await humanLikeScroll(page, {
        scrollTimes: options.times || 3,
        pauseMin: options.delay || 500,
        pauseMax: (options.delay || 500) * 2
    });
}

/**
 * 截图
 */
async function screenshot(page, path) {
    await page.screenshot({ path, fullPage: true });
    return path;
}

// ==================== 通用采集 ====================

/**
 * 通用新闻列表采集
 * 
 * @param {string} url - 目标 URL
 * @param {Object} selectors - CSS 选择器配置
 * @param {Object} options - 采集选项
 * @returns {Promise<Array>}
 */
async function scrapeNewsList(url, selectors, options = {}) {
    const page = await createPage({
        ...options,
        timeout: getTimeout(url)
    });
    const results = [];

    try {
        const success = await gotoWithRetry(page, url, options);
        if (!success) return results;

        // 等待内容加载
        if (selectors.container) {
            await page.waitForSelector(selectors.container, { timeout: 10000 }).catch(() => { });
        }

        // 滚动加载
        if (options.scroll) {
            await scrollToBottom(page, options.scroll);
        }

        // 提取新闻列表
        const items = await page.$$eval(selectors.item, (els, sels) => {
            return els.map(el => {
                const titleEl = el.querySelector(sels.title);
                const linkEl = el.querySelector(sels.link || 'a');
                const timeEl = el.querySelector(sels.time);

                return {
                    title: titleEl?.textContent?.trim() || '',
                    url: linkEl?.href || '',
                    time: timeEl?.textContent?.trim() || ''
                };
            }).filter(item => item.title);
        }, selectors);

        results.push(...items.slice(0, options.maxItems || 30));

    } catch (error) {
        console.error(`[Puppeteer] 采集失败:`, error.message);
    } finally {
        await closePage(page);
    }

    return results;
}

// ==================== 兼容性导出 ====================

// 兼容旧版 API
async function getBrowser() {
    const pool = getDefaultPool();
    return await pool.acquire();
}

async function closeBrowser() {
    const pool = getDefaultPool();
    await pool.closeAll();
}

// ==================== 模块导出 ====================

module.exports = {
    // 页面管理
    createPage,
    closePage,

    // 页面访问
    goto,
    gotoWithRetry,
    gotoLoose,

    // 元素操作
    waitAndGetText,
    getAllTexts,
    getLinks,
    scrollToBottom,
    screenshot,

    // 通用采集
    scrapeNewsList,

    // 工具函数
    randomDelay,
    getTimeout,

    // 配置
    TIMEOUT_LEVELS,
    SITE_TIMEOUT_MAP,
    BLOCKED_DOMAINS,

    // 兼容性（旧版 API）
    getBrowser,
    closeBrowser,
    USER_AGENTS: require('./antiDetect').ALL_USER_AGENTS
};
