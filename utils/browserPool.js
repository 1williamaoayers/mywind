/**
 * 浏览器池管理模块
 * 
 * 功能：
 * 1. 复用浏览器实例，避免频繁启动开销
 * 2. 支持并发采集
 * 3. 自动健康检查和重启
 * 4. 使用stealth插件规避检测
 * 
 * @author MyWind AI
 * @date 2025-12-27
 * @version 1.1 - 添加stealth插件
 */

// 使用 puppeteer-extra 替代 puppeteer，启用 stealth 插件
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 浏览器启动配置
const BROWSER_CONFIG = {
    headless: 'new',
    args: [
        // === 必需参数 ===
        '--no-sandbox',
        '--disable-setuid-sandbox',

        // === 性能优化 ===
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',

        // === 内存优化 ===
        '--js-flags=--max-old-space-size=512',

        // === 网络配置 ===
        '--proxy-server=http://127.0.0.1:20171',
        '--ignore-certificate-errors',

        // === 反检测 ===
        '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1920, height: 1080 }
};

/**
 * 浏览器池类
 * 
 * 管理多个浏览器实例，支持获取和释放
 */
class BrowserPool {
    constructor(poolSize = 2) {
        this.poolSize = poolSize;           // 池大小
        this.browsers = [];                  // 所有浏览器实例
        this.available = [];                 // 可用实例队列
        this.waitQueue = [];                 // 等待队列
        this.initialized = false;            // 是否已初始化
        this.stats = {                       // 统计信息
            created: 0,
            acquired: 0,
            released: 0,
            errors: 0
        };
    }

    /**
     * 初始化浏览器池
     */
    async init() {
        if (this.initialized) return;

        console.log(`[BrowserPool] 初始化浏览器池，大小: ${this.poolSize}`);

        for (let i = 0; i < this.poolSize; i++) {
            try {
                const browser = await this._createBrowser();
                this.browsers.push(browser);
                this.available.push(browser);
                this.stats.created++;
            } catch (error) {
                console.error(`[BrowserPool] 创建浏览器 ${i + 1} 失败:`, error.message);
            }
        }

        this.initialized = true;
        console.log(`[BrowserPool] 初始化完成，可用: ${this.available.length}/${this.poolSize}`);
    }

    /**
     * 创建新浏览器实例
     */
    async _createBrowser() {
        return await puppeteer.launch(BROWSER_CONFIG);
    }

    /**
     * 获取浏览器实例
     * 
     * @param {number} timeout - 等待超时（毫秒）
     * @returns {Promise<Browser>}
     */
    async acquire(timeout = 60000) {
        // 确保已初始化
        if (!this.initialized) {
            await this.init();
        }

        // 有可用实例，直接返回
        if (this.available.length > 0) {
            const browser = this.available.pop();

            // 检查浏览器是否健康
            if (!browser.isConnected()) {
                console.log('[BrowserPool] 浏览器已断开，重新创建');
                const newBrowser = await this._createBrowser();
                const index = this.browsers.indexOf(browser);
                if (index > -1) this.browsers[index] = newBrowser;
                this.stats.acquired++;
                return newBrowser;
            }

            this.stats.acquired++;
            return browser;
        }

        // 无可用实例，等待
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const index = this.waitQueue.findIndex(w => w.resolve === resolve);
                if (index > -1) this.waitQueue.splice(index, 1);
                reject(new Error('获取浏览器超时'));
            }, timeout);

            this.waitQueue.push({
                resolve: (browser) => {
                    clearTimeout(timer);
                    this.stats.acquired++;
                    resolve(browser);
                },
                reject
            });
        });
    }

    /**
     * 释放浏览器实例
     * 
     * @param {Browser} browser
     */
    release(browser) {
        if (!browser) return;

        // 有等待者，直接给等待者
        if (this.waitQueue.length > 0) {
            const waiter = this.waitQueue.shift();
            waiter.resolve(browser);
            return;
        }

        // 放回可用队列
        if (!this.available.includes(browser)) {
            this.available.push(browser);
        }
        this.stats.released++;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: this.poolSize,
            available: this.available.length,
            waiting: this.waitQueue.length
        };
    }

    /**
     * 关闭所有浏览器
     */
    async closeAll() {
        console.log('[BrowserPool] 关闭所有浏览器');

        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (error) {
                // 忽略关闭错误
            }
        }

        this.browsers = [];
        this.available = [];
        this.initialized = false;
    }

    /**
     * 重启浏览器池
     */
    async restart() {
        await this.closeAll();
        await this.init();
    }
}

// 默认浏览器池实例
let defaultPool = null;

/**
 * 获取默认浏览器池
 * 增大池大小从2改为5，支持更多并发采集
 */
function getDefaultPool() {
    if (!defaultPool) {
        defaultPool = new BrowserPool(5);
    }
    return defaultPool;
}

/**
 * 使用浏览器执行任务（自动获取和释放）
 * 
 * @param {Function} task - 任务函数，接收 browser 参数
 * @returns {Promise<any>}
 */
async function withBrowser(task) {
    const pool = getDefaultPool();
    const browser = await pool.acquire();

    try {
        return await task(browser);
    } finally {
        pool.release(browser);
    }
}

module.exports = {
    BrowserPool,
    getDefaultPool,
    withBrowser,
    BROWSER_CONFIG
};
