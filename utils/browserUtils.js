/**
 * Browser Utils - Puppeteer 稳定性优化工具
 * 
 * 功能：
 * 1. User-Agent 随机切换
 * 2. 随机延时 (2-5秒)
 * 3. 请求头伪装
 */

// User-Agent 池
const USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',

    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

    // Firefox Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',

    // Firefox Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',

    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

    // Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// 敏感源 (需要额外延时)
const SENSITIVE_SOURCES = [
    'xueqiu',      // 雪球
    'guba',        // 东财股吧
    'eastmoney',   // 东方财富
    'ths',         // 同花顺
    'qichacha',    // 企查查
    'tianyancha'   // 天眼查
];

/**
 * 获取随机 User-Agent
 * @returns {string}
 */
function getRandomUserAgent() {
    const index = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[index];
}

/**
 * 生成随机延时 (毫秒)
 * @param {number} min - 最小秒数 (默认 2)
 * @param {number} max - 最大秒数 (默认 5)
 * @returns {number} 毫秒数
 */
function getRandomDelay(min = 2, max = 5) {
    const seconds = Math.random() * (max - min) + min;
    return Math.floor(seconds * 1000);
}

/**
 * 异步延时
 * @param {number} ms - 毫秒数
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 智能延时 (敏感源额外延时)
 * @param {string} source - 数据源标识
 */
async function smartDelay(source) {
    const isSensitive = SENSITIVE_SOURCES.some(s =>
        source?.toLowerCase().includes(s)
    );

    if (isSensitive) {
        // 敏感源: 2-5秒随机延时
        const delay = getRandomDelay(2, 5);
        console.log(`[延时] ${source} 敏感源，等待 ${delay}ms`);
        await sleep(delay);
    } else {
        // 普通源: 0.5-1.5秒
        const delay = getRandomDelay(0.5, 1.5);
        await sleep(delay);
    }
}

/**
 * 获取伪装请求头
 * @param {object} extraHeaders - 额外请求头
 * @returns {object}
 */
function getHeaders(extraHeaders = {}) {
    return {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        ...extraHeaders
    };
}

/**
 * Puppeteer 页面配置
 * @param {Page} page - Puppeteer 页面实例
 * @param {string} source - 数据源标识
 */
async function configurePage(page, source) {
    // 设置随机 UA
    const ua = getRandomUserAgent();
    await page.setUserAgent(ua);

    // 设置额外请求头
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    });

    // 设置视口
    await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1
    });

    // 禁用 webdriver 检测
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    });

    console.log(`[Browser] ${source} 页面配置完成, UA: ${ua.substring(0, 50)}...`);
}

/**
 * 安全导航 (带重试)
 * @param {Page} page - Puppeteer 页面
 * @param {string} url - 目标 URL
 * @param {string} source - 数据源
 * @param {number} maxRetries - 最大重试次数
 */
async function safeNavigate(page, url, source, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            // 敏感源延时
            await smartDelay(source);

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // 成功后随机等待
            if (SENSITIVE_SOURCES.some(s => source?.toLowerCase().includes(s))) {
                await sleep(getRandomDelay(1, 3));
            }

            return true;
        } catch (error) {
            console.error(`[Browser] 导航失败 (${i + 1}/${maxRetries}):`, error.message);

            if (i < maxRetries - 1) {
                await sleep(getRandomDelay(3, 6));
            }
        }
    }

    return false;
}

/**
 * 检查是否为敏感源
 * @param {string} source - 数据源标识
 * @returns {boolean}
 */
function isSensitiveSource(source) {
    return SENSITIVE_SOURCES.some(s =>
        source?.toLowerCase().includes(s)
    );
}

module.exports = {
    USER_AGENTS,
    SENSITIVE_SOURCES,
    getRandomUserAgent,
    getRandomDelay,
    sleep,
    smartDelay,
    getHeaders,
    configurePage,
    safeNavigate,
    isSensitiveSource
};
