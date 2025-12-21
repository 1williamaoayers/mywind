/**
 * Human Behavior Module - Puppeteer 反检测增强
 * 
 * 让爬虫"像人一样"获取信息，降低被检测的风险
 * 
 * 功能：
 * 1. 随机延迟
 * 2. 人类化鼠标移动
 * 3. 人类化滚动
 * 4. 随机 UA 和 Viewport
 * 5. 浏览器指纹覆盖
 * 6. 请求节流器
 */

// ==================== 随机 User-Agent ====================

const USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    // Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
];

// ==================== 随机 Viewport ====================

const VIEWPORTS = [
    { width: 1920, height: 1080 },  // 1080p
    { width: 1366, height: 768 },   // 常见笔记本
    { width: 1536, height: 864 },   // 125% 缩放
    { width: 1440, height: 900 },   // MacBook
    { width: 1680, height: 1050 },  // 常见显示器
    { width: 2560, height: 1440 }   // 2K
];

// ==================== 请求节流器 ====================

class RequestThrottler {
    constructor() {
        this.lastRequests = new Map();
    }

    /**
     * 节流请求，避免同一域名请求过快
     * @param {string} domain - 域名
     * @param {number} minInterval - 最小间隔（毫秒）
     */
    async throttle(domain, minInterval = 5000) {
        const last = this.lastRequests.get(domain) || 0;
        const randomExtra = Math.random() * 10000; // 额外 0-10 秒随机
        const wait = Math.max(0, minInterval + randomExtra - (Date.now() - last));

        if (wait > 0) {
            console.log(`[反检测] 节流 ${domain}: 等待 ${Math.round(wait / 1000)}秒`);
            await sleep(wait);
        }

        this.lastRequests.set(domain, Date.now());
    }

    /**
     * 清理过期记录
     */
    cleanup(maxAge = 3600000) {
        const now = Date.now();
        for (const [domain, time] of this.lastRequests) {
            if (now - time > maxAge) {
                this.lastRequests.delete(domain);
            }
        }
    }
}

// 全局节流器实例
const throttler = new RequestThrottler();

// ==================== 随机延迟 ====================

/**
 * 随机延迟（毫秒）
 */
function randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, delay));
}

/**
 * 短延迟（模拟快速操作）
 */
function shortDelay() {
    return randomDelay(50, 200);
}

/**
 * 中等延迟（模拟阅读）
 */
function mediumDelay() {
    return randomDelay(500, 1500);
}

/**
 * 长延迟（模拟思考）
 */
function longDelay() {
    return randomDelay(2000, 5000);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ==================== 随机选择 ====================

/**
 * 获取随机 User-Agent
 */
function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 获取随机 Viewport
 */
function getRandomViewport() {
    return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

// ==================== 浏览器指纹覆盖 ====================

/**
 * 应用反检测脚本到页面
 */
async function applyStealthScripts(page) {
    await page.evaluateOnNewDocument(() => {
        // 1. 覆盖 webdriver 检测
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });

        // 2. 模拟真实 plugins（Chrome 有 3-5 个默认插件）
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ];
                plugins.length = 3;
                return plugins;
            }
        });

        // 3. 模拟真实语言
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en-US', 'en']
        });

        // 4. 模拟 Chrome 对象
        window.chrome = {
            runtime: {},
            loadTimes: function () { },
            csi: function () { },
            app: {}
        };

        // 5. 覆盖 permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({ state: Notification.permission });
            }
            return originalQuery(parameters);
        };

        // 6. WebGL 伪装
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter.call(this, parameter);
        };

        // 7. 隐藏自动化相关属性
        delete navigator.__proto__.webdriver;

        // 8. 假装有电池
        navigator.getBattery = () => Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
        });
    });
}

// ==================== 人类化鼠标移动 ====================

/**
 * 人类化鼠标移动（贝塞尔曲线）
 */
async function humanMove(page, targetX, targetY, options = {}) {
    const { steps = 20, jitter = 3 } = options;

    // 获取当前鼠标位置（假设从中心开始）
    const viewport = page.viewport();
    let currentX = viewport.width / 2;
    let currentY = viewport.height / 2;

    // 分步移动
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;

        // 使用 ease-out 缓动函数
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // 计算当前位置（加入随机抖动）
        const x = currentX + (targetX - currentX) * easeProgress + (Math.random() - 0.5) * jitter;
        const y = currentY + (targetY - currentY) * easeProgress + (Math.random() - 0.5) * jitter;

        await page.mouse.move(x, y);
        await sleep(Math.random() * 10 + 5); // 5-15ms 间隔
    }
}

/**
 * 人类化点击
 */
async function humanClick(page, x, y, options = {}) {
    const { button = 'left' } = options;

    // 先移动到目标位置
    await humanMove(page, x, y);

    // 随机延迟后点击
    await shortDelay();

    // 点击（带随机偏移）
    const offsetX = x + (Math.random() - 0.5) * 4;
    const offsetY = y + (Math.random() - 0.5) * 4;

    await page.mouse.click(offsetX, offsetY, { button });

    // 点击后短暂等待
    await shortDelay();
}

/**
 * 人类化点击元素
 */
async function humanClickElement(page, selector) {
    const element = await page.$(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
        throw new Error(`Cannot get bounding box: ${selector}`);
    }

    // 点击元素中心（带随机偏移）
    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);

    await humanClick(page, x, y);
}

// ==================== 人类化滚动 ====================

/**
 * 人类化滚动
 */
async function humanScroll(page, options = {}) {
    const { direction = 'down', distance = null, smooth = true } = options;

    // 随机滚动距离
    const scrollDistance = distance || Math.floor(Math.random() * 400) + 200;
    const actualDistance = direction === 'up' ? -scrollDistance : scrollDistance;

    if (smooth) {
        // 分段滚动（更自然）
        const segments = Math.floor(Math.random() * 5) + 3;
        const segmentDistance = actualDistance / segments;

        for (let i = 0; i < segments; i++) {
            await page.evaluate((d) => {
                window.scrollBy({ top: d, behavior: 'smooth' });
            }, segmentDistance);
            await sleep(Math.random() * 200 + 100);
        }
    } else {
        await page.evaluate((d) => {
            window.scrollBy(0, d);
        }, actualDistance);
    }

    // 滚动后等待
    await mediumDelay();
}

/**
 * 模拟阅读网页（随机滚动多次）
 */
async function simulateReading(page, options = {}) {
    const { scrollCount = 3, readTime = 2000 } = options;

    for (let i = 0; i < scrollCount; i++) {
        // 随机等待（模拟阅读）
        await randomDelay(readTime / 2, readTime * 1.5);

        // 随机滚动
        await humanScroll(page);

        // 偶尔向上滚动一点（模拟回看）
        if (Math.random() > 0.7) {
            await humanScroll(page, { direction: 'up', distance: 100 });
        }
    }
}

// ==================== 人类化输入 ====================

/**
 * 人类化输入文字
 */
async function humanType(page, selector, text, options = {}) {
    const { clearFirst = true } = options;

    // 先点击输入框
    await humanClickElement(page, selector);
    await shortDelay();

    // 清空现有内容
    if (clearFirst) {
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await shortDelay();
    }

    // 逐字输入（随机速度）
    for (const char of text) {
        await page.keyboard.type(char);
        await sleep(Math.random() * 150 + 50); // 50-200ms 每字

        // 偶尔打错字并修正
        if (Math.random() > 0.95) {
            await page.keyboard.type('x');
            await sleep(200);
            await page.keyboard.press('Backspace');
            await sleep(100);
        }
    }
}

// ==================== 初始化增强页面 ====================

/**
 * 创建增强的浏览器页面
 */
async function createStealthPage(browser, options = {}) {
    const {
        applyFingerprint = true,
        randomUA = true,
        randomViewport = true
    } = options;

    const page = await browser.newPage();

    // 应用随机 User-Agent
    if (randomUA) {
        await page.setUserAgent(getRandomUA());
    }

    // 应用随机 Viewport
    if (randomViewport) {
        await page.setViewport(getRandomViewport());
    }

    // 应用反检测脚本
    if (applyFingerprint) {
        await applyStealthScripts(page);
    }

    // 设置额外 HTTP 头
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    });

    console.log('[反检测] 增强页面已创建');

    return page;
}

// ==================== 导出 ====================

module.exports = {
    // 延迟函数
    randomDelay,
    shortDelay,
    mediumDelay,
    longDelay,
    sleep,

    // 随机选择
    getRandomUA,
    getRandomViewport,
    USER_AGENTS,
    VIEWPORTS,

    // 请求节流
    throttler,
    RequestThrottler,

    // 反检测
    applyStealthScripts,
    createStealthPage,

    // 人类化操作
    humanMove,
    humanClick,
    humanClickElement,
    humanScroll,
    humanType,
    simulateReading
};
