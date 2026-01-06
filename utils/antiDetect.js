/**
 * 反检测模块
 * 
 * 功能：
 * 1. User-Agent 轮换
 * 2. 浏览器指纹伪装
 * 3. 人性化操作模拟
 * 
 * @author MyWind AI
 * @date 2025-12-27
 */

// User-Agent 列表（按浏览器分类）
const USER_AGENTS = {
    // Chrome Windows
    chrome_win: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ],
    // Chrome Mac
    chrome_mac: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ],
    // Firefox
    firefox: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ],
    // Edge
    edge: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
    ]
};

// 所有 User-Agent 的扁平列表
const ALL_USER_AGENTS = Object.values(USER_AGENTS).flat();

/**
 * 获取随机 User-Agent
 * 
 * @param {string} type - 可选，指定类型：chrome_win, chrome_mac, firefox, edge
 * @returns {string}
 */
function getRandomUA(type) {
    if (type && USER_AGENTS[type]) {
        const list = USER_AGENTS[type];
        return list[Math.floor(Math.random() * list.length)];
    }
    return ALL_USER_AGENTS[Math.floor(Math.random() * ALL_USER_AGENTS.length)];
}

/**
 * 设置隐身模式（反 webdriver 检测）
 * 
 * @param {Page} page - Puppeteer 页面实例
 */
async function setupStealthMode(page) {
    // 在页面加载前注入脚本
    await page.evaluateOnNewDocument(() => {
        // 隐藏 webdriver 标记
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });

        // 隐藏 Chrome 自动化标记
        delete navigator.__proto__.webdriver;

        // 伪装 plugins（正常浏览器有插件）
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                return [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ];
            }
        });

        // 伪装 languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en-US', 'en']
        });

        // 伪装 platform
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32'
        });

        // 伪装 hardwareConcurrency（CPU 核心数）
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8
        });

        // 伪装 deviceMemory（设备内存 GB）
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
        });

        // 隐藏 Puppeteer 注入的变量
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters)
        );

        // 伪装 WebGL 渲染器
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter.apply(this, arguments);
        };
    });
}

/**
 * 设置随机视口尺寸（模拟真实用户）
 * 
 * @param {Page} page
 */
async function setRandomViewport(page) {
    const width = 1920 + Math.floor(Math.random() * 100) - 50;  // 1870-1970
    const height = 1080 + Math.floor(Math.random() * 100) - 50; // 1030-1130

    await page.setViewport({ width, height });
}

/**
 * 随机延迟（人性化）
 * 
 * @param {number} min - 最小毫秒
 * @param {number} max - 最大毫秒
 */
function randomDelay(min = 500, max = 2000) {
    return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

/**
 * 模拟人类滚动行为
 * 
 * @param {Page} page
 * @param {Object} options
 */
async function humanLikeScroll(page, options = {}) {
    const { scrollTimes = 3, pauseMin = 300, pauseMax = 800 } = options;

    for (let i = 0; i < scrollTimes; i++) {
        // 随机滚动距离
        const scrollDistance = 200 + Math.floor(Math.random() * 400);

        await page.evaluate((distance) => {
            window.scrollBy({
                top: distance,
                behavior: 'smooth'
            });
        }, scrollDistance);

        // 随机停顿
        await randomDelay(pauseMin, pauseMax);
    }
}

/**
 * 模拟鼠标移动
 * 
 * @param {Page} page
 * @param {number} x - 目标 X 坐标
 * @param {number} y - 目标 Y 坐标
 */
async function humanLikeMouseMove(page, x, y) {
    // 分多步移动，模拟真实轨迹
    const steps = 10 + Math.floor(Math.random() * 10);

    const currentPos = await page.evaluate(() => ({
        x: window.mouseX || 0,
        y: window.mouseY || 0
    }));

    const deltaX = (x - currentPos.x) / steps;
    const deltaY = (y - currentPos.y) / steps;

    for (let i = 0; i < steps; i++) {
        const nextX = currentPos.x + deltaX * (i + 1) + (Math.random() * 4 - 2);
        const nextY = currentPos.y + deltaY * (i + 1) + (Math.random() * 4 - 2);

        await page.mouse.move(nextX, nextY);
        await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
    }
}

/**
 * 模拟人类输入
 * 
 * @param {Page} page
 * @param {string} selector - 输入框选择器
 * @param {string} text - 要输入的文本
 */
async function humanLikeType(page, selector, text) {
    await page.click(selector);
    await randomDelay(100, 300);

    for (const char of text) {
        await page.type(selector, char, { delay: 50 + Math.random() * 100 });
    }
}

/**
 * 应用全部反检测设置到页面
 * 
 * @param {Page} page
 */
async function applyAntiDetection(page) {
    // 设置随机 UA
    await page.setUserAgent(getRandomUA());

    // 设置隐身模式
    await setupStealthMode(page);

    // 设置随机视口
    await setRandomViewport(page);
}

module.exports = {
    USER_AGENTS,
    ALL_USER_AGENTS,
    getRandomUA,
    setupStealthMode,
    setRandomViewport,
    randomDelay,
    humanLikeScroll,
    humanLikeMouseMove,
    humanLikeType,
    applyAntiDetection
};
