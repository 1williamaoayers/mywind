/**
 * 登录助手模块
 * 
 * 功能：
 * 1. 管理网站登录状态
 * 2. Cookie 持久化
 * 3. 登录流程自动化
 * 
 * @author MyWind AI
 * @date 2025-12-27
 */

const fs = require('fs');
const path = require('path');
const { createPersistentBrowser } = require('./humanBehavior');

// Cookie 存储目录
const COOKIE_DIR = '/tmp/puppeteer-cookies';

/**
 * 登录助手类
 */
class LoginHelper {
    constructor(page, siteName) {
        this.page = page;
        this.siteName = siteName;
        this.cookiePath = path.join(COOKIE_DIR, `${siteName}.json`);
    }

    /**
     * 检查是否已登录
     */
    async isLoggedIn() {
        // 子类可以覆盖此方法
        return false;
    }

    /**
     * 加载保存的 cookies
     */
    async loadCookies() {
        try {
            if (fs.existsSync(this.cookiePath)) {
                const cookies = JSON.parse(fs.readFileSync(this.cookiePath, 'utf-8'));
                await this.page.setCookie(...cookies);
                console.log(`[LoginHelper] 已加载 ${this.siteName} 的 cookies`);
                return true;
            }
        } catch (error) {
            console.error(`[LoginHelper] 加载 cookies 失败:`, error.message);
        }
        return false;
    }

    /**
     * 保存当前 cookies
     */
    async saveCookies() {
        try {
            if (!fs.existsSync(COOKIE_DIR)) {
                fs.mkdirSync(COOKIE_DIR, { recursive: true });
            }
            const cookies = await this.page.cookies();
            fs.writeFileSync(this.cookiePath, JSON.stringify(cookies, null, 2));
            console.log(`[LoginHelper] 已保存 ${this.siteName} 的 cookies`);
            return true;
        } catch (error) {
            console.error(`[LoginHelper] 保存 cookies 失败:`, error.message);
            return false;
        }
    }

    /**
     * 确保已登录
     */
    async ensureLoggedIn() {
        // 先尝试加载 cookies
        await this.loadCookies();

        // 检查是否已登录
        if (await this.isLoggedIn()) {
            return { success: true, method: 'cookie' };
        }

        // 需要手动登录
        return { success: false, method: 'none' };
    }
}

module.exports = {
    LoginHelper,
    createPersistentBrowser,
    COOKIE_DIR
};
