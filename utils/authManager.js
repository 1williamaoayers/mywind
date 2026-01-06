/**
 * 认证管理器 - 统一登录方案
 * 
 * 功能：
 * 1. Cookie持久化
 * 2. 登录状态检测
 * 3. 自动登录
 * 
 * 支持的网站：
 * - 发现报告 (fxbaogao)
 * - 知乎 (zhihu)
 * - 互动易 (interactive)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('./puppeteerBase');

const COOKIE_DIR = path.join(__dirname, '../data/cookies');

// 确保cookie目录存在
if (!fs.existsSync(COOKIE_DIR)) {
    fs.mkdirSync(COOKIE_DIR, { recursive: true });
}

/**
 * 网站配置
 */
const SITES = {
    fxbaogao: {
        name: '发现报告',
        loginUrl: 'https://www.fxbaogao.com/login',
        checkUrl: 'https://www.fxbaogao.com/',
        loginSelector: '.login-form, .user-login',
        loggedInSelector: '.user-info, .user-avatar'
    },
    zhihu: {
        name: '知乎',
        loginUrl: 'https://www.zhihu.com/signin',
        checkUrl: 'https://www.zhihu.com/',
        loginSelector: '.SignContainer, .Login-content',
        loggedInSelector: '.Profile-lightHeader, .Header-userMenu'
    },
    interactive: {
        name: '互动易',
        loginUrl: 'http://irm.cninfo.com.cn/szse/login',
        checkUrl: 'http://irm.cninfo.com.cn/szse/',
        loginSelector: '.login-box, #login-form',
        loggedInSelector: '.user-name, .logout'
    }
};

/**
 * 获取Cookie文件路径
 */
function getCookiePath(siteName) {
    return path.join(COOKIE_DIR, `${siteName}.json`);
}

/**
 * 保存Cookie
 */
async function saveCookies(page, siteName) {
    const cookies = await page.cookies();
    const cookiePath = getCookiePath(siteName);
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    console.log(`[认证] ${siteName} Cookie已保存`);
    return cookies;
}

/**
 * 加载Cookie
 */
async function loadCookies(page, siteName) {
    const cookiePath = getCookiePath(siteName);

    if (!fs.existsSync(cookiePath)) {
        return false;
    }

    try {
        const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        await page.setCookie(...cookies);
        console.log(`[认证] ${siteName} Cookie已加载`);
        return true;
    } catch (error) {
        console.error(`[认证] ${siteName} Cookie加载失败:`, error.message);
        return false;
    }
}

/**
 * 检查是否已登录
 */
async function checkLoginStatus(page, siteName) {
    const config = SITES[siteName];
    if (!config) {
        return false;
    }

    try {
        // 检查是否有登录后的元素
        const loggedIn = await page.$(config.loggedInSelector);
        if (loggedIn) {
            return true;
        }

        // 检查是否有登录表单
        const loginForm = await page.$(config.loginSelector);
        return !loginForm;
    } catch (error) {
        return false;
    }
}

/**
 * 创建带认证的页面
 */
async function createAuthenticatedPage(siteName, options = {}) {
    const config = SITES[siteName];
    if (!config) {
        throw new Error(`不支持的网站: ${siteName}`);
    }

    const page = await puppeteer.createPage(options);

    // 尝试加载Cookie
    await loadCookies(page, siteName);

    // 访问检查页面
    await puppeteer.gotoWithRetry(page, config.checkUrl);
    await puppeteer.randomDelay(2000, 3000);

    // 检查登录状态
    const isLoggedIn = await checkLoginStatus(page, siteName);

    if (!isLoggedIn) {
        console.log(`[认证] ${config.name} 需要登录`);

        // 标记需要登录
        page._needsLogin = true;
        page._siteConfig = config;
    } else {
        console.log(`[认证] ${config.name} 已登录`);
    }

    return page;
}

/**
 * 手动登录辅助
 * 
 * 用法：运行后手动完成登录，然后调用saveAfterLogin
 */
async function startManualLogin(siteName) {
    const config = SITES[siteName];
    if (!config) {
        throw new Error(`不支持的网站: ${siteName}`);
    }

    console.log(`[认证] 打开 ${config.name} 登录页面...`);
    console.log('请在浏览器中完成登录，然后按Enter键保存Cookie');

    // 使用可见的浏览器
    const browser = await require('puppeteer').launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(config.loginUrl);

    return { browser, page, siteName };
}

/**
 * 登录完成后保存Cookie
 */
async function saveAfterLogin(session) {
    const { browser, page, siteName } = session;

    await saveCookies(page, siteName);
    await browser.close();

    console.log(`[认证] ${siteName} 登录完成，Cookie已保存`);
}

/**
 * 清除指定网站的Cookie
 */
function clearCookies(siteName) {
    const cookiePath = getCookiePath(siteName);

    if (fs.existsSync(cookiePath)) {
        fs.unlinkSync(cookiePath);
        console.log(`[认证] ${siteName} Cookie已清除`);
        return true;
    }

    return false;
}

/**
 * 列出所有已保存的Cookie
 */
function listSavedCookies() {
    if (!fs.existsSync(COOKIE_DIR)) {
        return [];
    }

    return fs.readdirSync(COOKIE_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const siteName = f.replace('.json', '');
            const stat = fs.statSync(path.join(COOKIE_DIR, f));
            return {
                site: siteName,
                name: SITES[siteName]?.name || siteName,
                savedAt: stat.mtime
            };
        });
}

module.exports = {
    SITES,
    saveCookies,
    loadCookies,
    checkLoginStatus,
    createAuthenticatedPage,
    startManualLogin,
    saveAfterLogin,
    clearCookies,
    listSavedCookies
};
