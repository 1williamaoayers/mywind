/**
 * Auth Service - 自动化登录引擎
 * 
 * 功能：
 * 1. Cookie 持久化（userDataDir）
 * 2. 自动填充表单
 * 3. 实时截图预览
 * 4. 登录状态管理
 */

const path = require('path');
const fs = require('fs');
const Account = require('../models/Account');
const { PLATFORMS } = require('../models/Account');

// Cookie 存储目录
const COOKIE_DIR = process.env.COOKIE_DIR || '/tmp/puppeteer-cookies';

// 确保目录存在
if (!fs.existsSync(COOKIE_DIR)) {
    fs.mkdirSync(COOKIE_DIR, { recursive: true });
}

// 当前截图（用于前端预览）
let currentScreenshot = null;

/**
 * 获取平台的 userDataDir 路径
 */
function getUserDataDir(platformId) {
    return path.join(COOKIE_DIR, platformId);
}

/**
 * 检查 Session 是否可能有效（通过文件存在性）
 */
function hasExistingSession(platformId) {
    const dir = getUserDataDir(platformId);
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

/**
 * 执行登录流程
 * @param {string} accountId - 账号 ID
 * @param {object} options - 选项
 */
async function performLogin(accountId, options = {}) {
    const account = await Account.findById(accountId);
    if (!account) {
        throw new Error('账号不存在');
    }

    const platformInfo = account.platformInfo;
    if (!platformInfo) {
        throw new Error('不支持的平台');
    }

    console.log(`[登录] 开始登录 ${platformInfo.name}: ${account.username}`);
    await account.updateStatus('logging_in', '正在启动浏览器...');

    let page = null;

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        // 启动浏览器（使用 userDataDir 持久化 Session）
        const browser = await puppeteer.launch({
            headless: 'new',
            userDataDir: getUserDataDir(account.platform),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // 设置中文语言
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9'
        });

        await account.updateStatus('logging_in', '正在打开登录页面...');

        // 导航到登录页
        await page.goto(platformInfo.loginUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // 截图
        await takeScreenshot(page, account);

        // 检查是否已经登录（通过 URL 或页面元素判断）
        const currentUrl = page.url();
        if (!currentUrl.includes('login') && !currentUrl.includes('passport')) {
            // 可能已经登录了
            await account.updateStatus('logged_in', '会话有效，无需重新登录');
            await browser.close();
            return { success: true, message: '已登录（Session 有效）' };
        }

        await account.updateStatus('logging_in', '正在填充登录表单...');

        // 获取解密后的密码
        const password = account.getPassword();

        // 根据平台执行不同的登录逻辑
        const loginResult = await executeLoginStrategy(page, account.platform, account.username, password);

        // 截图
        await takeScreenshot(page, account);

        if (loginResult.needCaptcha) {
            await account.updateStatus('need_captcha', '需要输入验证码，请查看截图');
            // 保持浏览器打开，等待用户处理
            return {
                success: false,
                needCaptcha: true,
                message: '需要验证码',
                screenshot: account.lastScreenshot
            };
        }

        if (loginResult.success) {
            await account.updateStatus('logged_in', '登录成功');
            await browser.close();
            return { success: true, message: '登录成功' };
        } else {
            await account.updateStatus('failed', loginResult.message || '登录失败');
            await browser.close();
            return { success: false, message: loginResult.message };
        }

    } catch (error) {
        console.error('[登录] 错误:', error.message);
        await account.updateStatus('failed', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * 根据平台执行登录策略
 */
async function executeLoginStrategy(page, platform, username, password) {
    try {
        switch (platform) {
            case 'xueqiu':
                return await loginXueqiu(page, username, password);
            case 'toutiao':
                return await loginToutiao(page, username, password);
            case 'eastmoney':
                return await loginEastmoney(page, username, password);
            default:
                return await loginGeneric(page, username, password);
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 雪球登录
 */
async function loginXueqiu(page, username, password) {
    try {
        // 等待登录表单
        await page.waitForSelector('input[name="username"], input[placeholder*="手机"]', { timeout: 10000 });

        // 填充用户名
        await page.type('input[name="username"], input[placeholder*="手机"]', username, { delay: 50 });
        await sleep(500);

        // 填充密码
        await page.type('input[name="password"], input[type="password"]', password, { delay: 50 });
        await sleep(500);

        // 检查是否有验证码
        const hasCaptcha = await page.$('img[src*="captcha"], .captcha, #captcha');
        if (hasCaptcha) {
            return { success: false, needCaptcha: true };
        }

        // 点击登录按钮
        await page.click('button[type="submit"], .login-btn');
        await sleep(3000);

        // 检查是否登录成功
        const currentUrl = page.url();
        if (!currentUrl.includes('login')) {
            return { success: true };
        }

        return { success: false, message: '登录失败，请检查账号密码' };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 今日头条登录
 */
async function loginToutiao(page, username, password) {
    try {
        // 头条通常需要扫码或手机验证
        await page.waitForSelector('input[placeholder*="手机"], input[name="mobile"]', { timeout: 10000 });

        await page.type('input[placeholder*="手机"], input[name="mobile"]', username, { delay: 50 });
        await sleep(500);

        // 头条大概率需要验证码
        return { success: false, needCaptcha: true, message: '头条需要验证码，请手动处理' };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 东方财富登录
 */
async function loginEastmoney(page, username, password) {
    try {
        await page.waitForSelector('input[name="username"], #username', { timeout: 10000 });

        await page.type('input[name="username"], #username', username, { delay: 50 });
        await sleep(500);

        await page.type('input[name="password"], #password', password, { delay: 50 });
        await sleep(500);

        // 检查验证码
        const hasCaptcha = await page.$('#captcha, img[src*="captcha"]');
        if (hasCaptcha) {
            return { success: false, needCaptcha: true };
        }

        await page.click('button[type="submit"], #loginBtn');
        await sleep(3000);

        const currentUrl = page.url();
        if (!currentUrl.includes('login') && !currentUrl.includes('passport')) {
            return { success: true };
        }

        return { success: false, message: '登录失败' };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 通用登录（尝试常见选择器）
 */
async function loginGeneric(page, username, password) {
    try {
        // 尝试常见的用户名输入框
        const usernameSelectors = [
            'input[name="username"]',
            'input[name="account"]',
            'input[type="text"][placeholder*="用户"]',
            'input[type="text"][placeholder*="账号"]',
            'input[type="tel"]'
        ];

        for (const selector of usernameSelectors) {
            const elem = await page.$(selector);
            if (elem) {
                await page.type(selector, username, { delay: 50 });
                break;
            }
        }

        await sleep(500);

        // 填充密码
        await page.type('input[type="password"]', password, { delay: 50 });
        await sleep(500);

        // 检查验证码
        const hasCaptcha = await page.$('img[src*="captcha"], .captcha, #captcha, [class*="verify"]');
        if (hasCaptcha) {
            return { success: false, needCaptcha: true };
        }

        // 点击登录
        const loginBtnSelectors = [
            'button[type="submit"]',
            '.login-btn',
            '[class*="login"][class*="btn"]',
            'input[type="submit"]'
        ];

        for (const selector of loginBtnSelectors) {
            const elem = await page.$(selector);
            if (elem) {
                await page.click(selector);
                break;
            }
        }

        await sleep(3000);
        return { success: true };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * 截图保存
 */
async function takeScreenshot(page, account) {
    try {
        const filename = `${account.platform}_${Date.now()}.png`;
        const filepath = path.join('/tmp', filename);
        await page.screenshot({ path: filepath, fullPage: false });

        // 读取为 base64
        const imageBuffer = fs.readFileSync(filepath);
        currentScreenshot = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        account.lastScreenshot = filepath;
        await account.save();

        console.log(`[登录] 截图已保存: ${filepath}`);
    } catch (error) {
        console.error('[登录] 截图失败:', error.message);
    }
}

/**
 * 获取当前截图（Base64）
 */
function getCurrentScreenshot() {
    return currentScreenshot;
}

/**
 * 清除平台 Session
 */
function clearSession(platformId) {
    const dir = getUserDataDir(platformId);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`[登录] 已清除 ${platformId} 的 Session`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    performLogin,
    hasExistingSession,
    getCurrentScreenshot,
    clearSession,
    getUserDataDir
};
