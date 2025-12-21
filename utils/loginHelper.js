/**
 * Login Helper - 半自动登录助手
 * 
 * 功能：
 * 1. Cookie/LocalStorage 持久化
 * 2. 二维码截图转发飞书
 * 3. 等待手动扫码完成
 * 4. 自动关闭弹窗
 * 5. 登录状态检测
 */

const fs = require('fs');
const path = require('path');

// Cookie 存储目录
const COOKIE_DIR = process.env.COOKIE_DIR || './data/cookies';
const USER_DATA_DIR = process.env.USER_DATA_DIR || './data/user_data';

// 确保目录存在
function ensureDirs() {
    if (!fs.existsSync(COOKIE_DIR)) {
        fs.mkdirSync(COOKIE_DIR, { recursive: true });
    }
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }
}

ensureDirs();

// 网站登录配置
const SITE_CONFIGS = {
    fxbaogao: {
        name: '发现报告',
        loginUrl: 'https://www.fxbaogao.com/login',
        homeUrl: 'https://www.fxbaogao.com/',
        loginDetectors: ['请登录', '登录/注册', '扫码登录'],
        successDetectors: ['我的收藏', '退出', '个人中心'],
        qrcodeSelector: '.qrcode img, #qrcode img, img[alt*="二维码"]',
        cookieExpireDays: 7
    },
    xueqiu: {
        name: '雪球',
        loginUrl: 'https://xueqiu.com/',
        homeUrl: 'https://xueqiu.com/',
        loginDetectors: ['登录', '注册'],
        successDetectors: ['退出', '我的主页'],
        qrcodeSelector: '.qr-code img, #qrcode',
        cookieExpireDays: 30
    },
    eastmoney: {
        name: '东方财富',
        loginUrl: 'https://passport.eastmoney.com/pub/login',
        homeUrl: 'https://www.eastmoney.com/',
        loginDetectors: ['请登录', '立即登录'],
        successDetectors: ['退出', '我的'],
        qrcodeSelector: '.qrcode-img, #qrcode-img',
        cookieExpireDays: 30
    },
    hibor: {
        name: '慧博投研',
        loginUrl: 'https://www.hibor.com.cn/login',
        homeUrl: 'https://www.hibor.com.cn/',
        loginDetectors: ['登录', '请先登录'],
        successDetectors: ['退出', '个人中心'],
        qrcodeSelector: '#qrcode img',
        cookieExpireDays: 3
    }
};

/**
 * SessionManager - 会话管理器
 */
class SessionManager {
    constructor(siteName) {
        this.siteName = siteName;
        this.config = SITE_CONFIGS[siteName] || {};
        this.cookiePath = path.join(COOKIE_DIR, `${siteName}.json`);
        this.localStoragePath = path.join(COOKIE_DIR, `${siteName}_localStorage.json`);
    }

    /**
     * 加载保存的 Cookie
     */
    loadCookies() {
        try {
            if (fs.existsSync(this.cookiePath)) {
                const data = JSON.parse(fs.readFileSync(this.cookiePath, 'utf-8'));

                // 检查是否过期
                if (data.savedAt) {
                    const savedDate = new Date(data.savedAt);
                    const expireDays = this.config.cookieExpireDays || 7;
                    const expireDate = new Date(savedDate.getTime() + expireDays * 24 * 60 * 60 * 1000);

                    if (new Date() > expireDate) {
                        console.log(`[登录助手] ${this.siteName} Cookie 已过期`);
                        return null;
                    }
                }

                console.log(`[登录助手] 加载 ${this.siteName} Cookie: ${data.cookies?.length || 0} 条`);
                return data.cookies || [];
            }
        } catch (error) {
            console.error(`[登录助手] 加载 Cookie 失败:`, error.message);
        }
        return null;
    }

    /**
     * 保存 Cookie
     */
    saveCookies(cookies) {
        try {
            const data = {
                siteName: this.siteName,
                savedAt: new Date().toISOString(),
                cookies
            };
            fs.writeFileSync(this.cookiePath, JSON.stringify(data, null, 2));
            console.log(`[登录助手] 保存 ${this.siteName} Cookie: ${cookies.length} 条`);
            return true;
        } catch (error) {
            console.error(`[登录助手] 保存 Cookie 失败:`, error.message);
            return false;
        }
    }

    /**
     * 加载 LocalStorage
     */
    loadLocalStorage() {
        try {
            if (fs.existsSync(this.localStoragePath)) {
                return JSON.parse(fs.readFileSync(this.localStoragePath, 'utf-8'));
            }
        } catch (error) {
            console.error(`[登录助手] 加载 LocalStorage 失败:`, error.message);
        }
        return null;
    }

    /**
     * 保存 LocalStorage
     */
    saveLocalStorage(data) {
        try {
            fs.writeFileSync(this.localStoragePath, JSON.stringify(data, null, 2));
            console.log(`[登录助手] 保存 ${this.siteName} LocalStorage`);
            return true;
        } catch (error) {
            console.error(`[登录助手] 保存 LocalStorage 失败:`, error.message);
            return false;
        }
    }

    /**
     * 清除会话
     */
    clearSession() {
        try {
            if (fs.existsSync(this.cookiePath)) {
                fs.unlinkSync(this.cookiePath);
            }
            if (fs.existsSync(this.localStoragePath)) {
                fs.unlinkSync(this.localStoragePath);
            }
            console.log(`[登录助手] 已清除 ${this.siteName} 会话`);
            return true;
        } catch (error) {
            console.error(`[登录助手] 清除会话失败:`, error.message);
            return false;
        }
    }
}

/**
 * LoginHelper - 登录助手
 */
class LoginHelper {
    constructor(page, siteName, options = {}) {
        this.page = page;
        this.siteName = siteName;
        this.config = SITE_CONFIGS[siteName] || {};
        this.session = new SessionManager(siteName);
        this.feishuWebhook = options.feishuWebhook || process.env.FEISHU_WEBHOOK;
        this.screenshotDir = options.screenshotDir || '/tmp/login-helper';

        // 确保截图目录存在
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    /**
     * 初始化：加载已保存的 Cookie
     */
    async initSession() {
        const cookies = this.session.loadCookies();

        if (cookies && cookies.length > 0) {
            try {
                await this.page.setCookie(...cookies);
                console.log(`[登录助手] 已注入 ${this.siteName} Cookie`);
                return true;
            } catch (error) {
                console.error(`[登录助手] 注入 Cookie 失败:`, error.message);
            }
        }

        return false;
    }

    /**
     * 检测是否需要登录
     */
    async needsLogin() {
        try {
            const pageContent = await this.page.content();
            const pageText = await this.page.evaluate(() => document.body.innerText);

            // 检查是否有登录标志
            for (const detector of (this.config.loginDetectors || [])) {
                if (pageText.includes(detector) || pageContent.includes(detector)) {
                    console.log(`[登录助手] 检测到登录标志: "${detector}"`);
                    return true;
                }
            }

            // 检查是否已登录
            for (const detector of (this.config.successDetectors || [])) {
                if (pageText.includes(detector) || pageContent.includes(detector)) {
                    console.log(`[登录助手] 检测到已登录标志: "${detector}"`);
                    return false;
                }
            }

            // 默认不需要登录
            return false;
        } catch (error) {
            console.error(`[登录助手] 检测登录状态失败:`, error.message);
            return false;
        }
    }

    /**
     * 截取二维码
     */
    async captureQRCode() {
        try {
            const timestamp = Date.now();
            const filename = `qrcode_${this.siteName}_${timestamp}.png`;
            const filepath = path.join(this.screenshotDir, filename);

            // 尝试找到二维码元素
            const qrcodeSelector = this.config.qrcodeSelector || 'img[src*="qr"], .qrcode img';
            const qrcodeElement = await this.page.$(qrcodeSelector);

            if (qrcodeElement) {
                // 截取二维码区域
                await qrcodeElement.screenshot({ path: filepath });
                console.log(`[登录助手] 二维码截图: ${filepath}`);
            } else {
                // 截取整个页面
                await this.page.screenshot({ path: filepath, fullPage: false });
                console.log(`[登录助手] 页面截图（未找到二维码）: ${filepath}`);
            }

            return filepath;
        } catch (error) {
            console.error(`[登录助手] 截取二维码失败:`, error.message);
            return null;
        }
    }

    /**
     * 发送二维码到飞书
     */
    async sendQRCodeToFeishu(screenshotPath) {
        if (!this.feishuWebhook) {
            console.log(`[登录助手] 未配置飞书 Webhook，跳过通知`);
            return false;
        }

        try {
            const axios = require('axios');

            // 读取图片并转换为 base64
            const imageBuffer = fs.readFileSync(screenshotPath);
            const base64Image = imageBuffer.toString('base64');

            // 发送图片消息
            const response = await axios.post(this.feishuWebhook, {
                msg_type: 'interactive',
                card: {
                    header: {
                        title: {
                            tag: 'plain_text',
                            content: `🔐 ${this.config.name || this.siteName} 需要扫码登录`
                        },
                        template: 'orange'
                    },
                    elements: [
                        {
                            tag: 'div',
                            text: {
                                tag: 'lark_md',
                                content: `**请用手机扫描下方二维码完成登录**\n\n登录成功后系统会自动保存状态，下次无需重复扫码。`
                            }
                        },
                        {
                            tag: 'img',
                            img_key: '', // 飞书需要先上传图片获取 key
                            alt: {
                                tag: 'plain_text',
                                content: '二维码'
                            }
                        },
                        {
                            tag: 'note',
                            elements: [
                                {
                                    tag: 'plain_text',
                                    content: `截图时间: ${new Date().toLocaleString('zh-CN')}`
                                }
                            ]
                        }
                    ]
                }
            });

            // 由于飞书图片需要先上传，这里改用文本提醒
            const textResponse = await axios.post(this.feishuWebhook, {
                msg_type: 'text',
                content: {
                    text: `🔐 ${this.config.name || this.siteName} 需要扫码登录\n\n请打开浏览器截图查看二维码，或等待 60 秒后检查登录状态。\n\n截图路径: ${screenshotPath}\n时间: ${new Date().toLocaleString('zh-CN')}`
                }
            });

            console.log(`[登录助手] 飞书通知已发送`);
            return true;
        } catch (error) {
            console.error(`[登录助手] 发送飞书通知失败:`, error.message);
            return false;
        }
    }

    /**
     * 等待登录完成
     */
    async waitForLoginComplete(timeoutMs = 120000) {
        console.log(`[登录助手] 等待扫码登录... (超时: ${timeoutMs / 1000}秒)`);

        const startTime = Date.now();
        const checkInterval = 3000; // 每 3 秒检查一次

        while (Date.now() - startTime < timeoutMs) {
            await new Promise(r => setTimeout(r, checkInterval));

            try {
                const pageText = await this.page.evaluate(() => document.body.innerText);

                // 检查是否已登录
                for (const detector of (this.config.successDetectors || [])) {
                    if (pageText.includes(detector)) {
                        console.log(`[登录助手] ✅ 登录成功！检测到: "${detector}"`);
                        return true;
                    }
                }

                // 检查 URL 变化（某些网站登录后会跳转）
                const currentUrl = this.page.url();
                if (this.config.homeUrl && currentUrl.includes(this.config.homeUrl) &&
                    !currentUrl.includes('login')) {
                    console.log(`[登录助手] ✅ 登录成功！URL 已跳转`);
                    return true;
                }

            } catch (error) {
                // 页面可能正在刷新
            }

            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`[登录助手] 等待中... ${elapsed}秒`);
        }

        console.log(`[登录助手] ⚠️ 等待超时`);
        return false;
    }

    /**
     * 保存当前会话
     */
    async saveCurrentSession() {
        try {
            // 保存 Cookie
            const cookies = await this.page.cookies();
            this.session.saveCookies(cookies);

            // 保存 LocalStorage
            const localStorage = await this.page.evaluate(() => {
                const data = {};
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    data[key] = window.localStorage.getItem(key);
                }
                return data;
            });
            this.session.saveLocalStorage(localStorage);

            console.log(`[登录助手] 会话已保存`);
            return true;
        } catch (error) {
            console.error(`[登录助手] 保存会话失败:`, error.message);
            return false;
        }
    }

    /**
     * 自动关闭弹窗
     */
    async closePopups() {
        try {
            // 常见关闭按钮选择器
            const closeSelectors = [
                '.close',
                '.close-btn',
                '.modal-close',
                '[aria-label="Close"]',
                '[aria-label="关闭"]',
                '.popup-close',
                'button[class*="close"]',
                '.dialog-close',
                '.ant-modal-close',
                '.el-dialog__close',
                '[class*="close-icon"]',
                'a:contains("关闭")',
                'button:contains("我知道了")',
                'button:contains("知道了")',
                'button:contains("确定")',
                'button:contains("跳过")',
                '[class*="skip"]'
            ];

            let closedCount = 0;

            for (const selector of closeSelectors) {
                try {
                    const elements = await this.page.$$(selector);
                    for (const el of elements) {
                        const isVisible = await el.isIntersectingViewport();
                        if (isVisible) {
                            await el.click();
                            closedCount++;
                            await new Promise(r => setTimeout(r, 300));
                        }
                    }
                } catch (e) {
                    // 忽略选择器错误
                }
            }

            // 按 ESC 键
            await this.page.keyboard.press('Escape');

            if (closedCount > 0) {
                console.log(`[登录助手] 关闭了 ${closedCount} 个弹窗`);
            }

            return closedCount;
        } catch (error) {
            console.error(`[登录助手] 关闭弹窗失败:`, error.message);
            return 0;
        }
    }

    /**
     * 完整的登录流程
     */
    async ensureLoggedIn() {
        console.log(`[登录助手] 开始处理 ${this.config.name || this.siteName} 登录...`);

        // 1. 尝试加载已保存的 Cookie
        const hasSession = await this.initSession();

        // 2. 导航到目标页面
        if (this.config.homeUrl) {
            await this.page.goto(this.config.homeUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await new Promise(r => setTimeout(r, 2000));
        }

        // 3. 检测是否需要登录
        const needsLogin = await this.needsLogin();

        if (!needsLogin) {
            console.log(`[登录助手] ✅ ${this.config.name} 已登录`);
            await this.closePopups();
            return { success: true, method: 'cached' };
        }

        console.log(`[登录助手] 需要扫码登录...`);

        // 4. 导航到登录页
        if (this.config.loginUrl) {
            await this.page.goto(this.config.loginUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await new Promise(r => setTimeout(r, 3000));
        }

        // 5. 截取二维码
        const qrcodePath = await this.captureQRCode();

        // 6. 发送飞书通知
        if (qrcodePath) {
            await this.sendQRCodeToFeishu(qrcodePath);
        }

        // 7. 等待用户扫码
        const loginSuccess = await this.waitForLoginComplete();

        if (loginSuccess) {
            // 8. 关闭可能的弹窗
            await this.closePopups();
            await new Promise(r => setTimeout(r, 1000));

            // 9. 保存会话
            await this.saveCurrentSession();

            // 10. 清理截图
            if (qrcodePath && fs.existsSync(qrcodePath)) {
                fs.unlinkSync(qrcodePath);
            }

            return { success: true, method: 'scanned' };
        }

        return { success: false, method: 'timeout' };
    }
}

/**
 * 创建带持久化会话的浏览器
 */
async function createPersistentBrowser(siteName, options = {}) {
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const siteUserDataDir = path.join(USER_DATA_DIR, siteName);

    // 确保目录存在
    if (!fs.existsSync(siteUserDataDir)) {
        fs.mkdirSync(siteUserDataDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: options.headless !== false ? 'new' : false,
        executablePath,
        userDataDir: siteUserDataDir, // 关键：使用固定的用户数据目录
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    console.log(`[登录助手] 使用持久化目录: ${siteUserDataDir}`);

    return browser;
}

/**
 * 获取所有站点的登录状态
 */
function getAllLoginStatus() {
    const status = {};

    for (const [siteName, config] of Object.entries(SITE_CONFIGS)) {
        const session = new SessionManager(siteName);
        const cookies = session.loadCookies();

        status[siteName] = {
            name: config.name,
            hasSession: !!cookies,
            cookieCount: cookies?.length || 0,
            expireDays: config.cookieExpireDays
        };
    }

    return status;
}

/**
 * 清除指定站点的登录状态
 */
function clearSiteSession(siteName) {
    const session = new SessionManager(siteName);
    return session.clearSession();
}

module.exports = {
    LoginHelper,
    SessionManager,
    createPersistentBrowser,
    getAllLoginStatus,
    clearSiteSession,
    SITE_CONFIGS,
    COOKIE_DIR,
    USER_DATA_DIR
};
