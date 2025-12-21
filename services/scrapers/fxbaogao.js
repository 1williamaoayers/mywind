/**
 * 发现报告抓取器 (fxbaogao.com)
 * 
 * 特点：
 * - 行业深度和新兴产业研报更新快
 * - 晨会纪要、电话会议纪要
 * - 预览模式对 Puppeteer 友好
 */

const path = require('path');
const fs = require('fs');

// 抓取状态
const fxbaogaoStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

// OCR 临时目录
const OCR_DIR = '/tmp/ocr-scrape';

/**
 * 抓取发现报告
 */
async function scrapeFxbaogao(options = {}) {
    const { keyword = '', maxItems = 10, category = '', useLogin = false } = options;

    console.log('[发现报告] 开始采集研报...');
    fxbaogaoStatus.isRunning = true;
    fxbaogaoStatus.totalFetches++;

    const results = [];

    let browser = null;

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const { createStealthPage, humanScroll, randomDelay } = require('../../utils/humanBehavior');
        const { LoginHelper, createPersistentBrowser } = require('../../utils/loginHelper');

        // 如果需要登录，使用持久化浏览器
        if (useLogin) {
            browser = await createPersistentBrowser('fxbaogao');
        } else {
            const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
        }

        const page = await createStealthPage(browser);

        // 如果需要登录，执行登录流程
        if (useLogin) {
            const loginHelper = new LoginHelper(page, 'fxbaogao');
            const loginResult = await loginHelper.ensureLoggedIn();
            console.log(`[发现报告] 登录结果: ${loginResult.success ? '成功' : '失败'} (${loginResult.method})`);
        }

        // 构建 URL
        let url = 'https://www.fxbaogao.com/';
        if (keyword) {
            url = `https://www.fxbaogao.com/search?q=${encodeURIComponent(keyword)}`;
        } else if (category) {
            // 常见分类：hysd 行业深度, xxcy 新兴产业, chjy 晨会纪要
            url = `https://www.fxbaogao.com/rp/${category}`;
        }

        console.log(`[发现报告] 访问: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 4000);

        // 滚动加载
        for (let i = 0; i < 3; i++) {
            await humanScroll(page);
        }

        // 提取研报列表
        const reports = await page.evaluate(() => {
            const items = [];

            // 尝试多种选择器
            const selectors = [
                '.report-item',
                '.search-result-item',
                '.list-item',
                'a[href*="/view/"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const titleEl = el.querySelector('.title, h3, h4, .name') || el;
                        const title = titleEl.innerText?.trim() || '';

                        const link = el.querySelector('a')?.href || el.href || '';

                        const brokerEl = el.querySelector('.broker, .org, .source');
                        const broker = brokerEl?.innerText?.trim() || '';

                        const dateEl = el.querySelector('.date, .time, .pub-date');
                        const date = dateEl?.innerText?.trim() || '';

                        if (title && title.length > 5) {
                            items.push({ title, url: link, broker, date });
                        }
                    });
                    break;
                }
            }

            return items;
        });

        // 处理结果
        for (const report of reports.slice(0, maxItems)) {
            results.push({
                source: 'fxbaogao',
                sourceName: '发现报告',
                title: report.title,
                url: report.url,
                broker: report.broker,
                publishDate: parseDate(report.date),
                reportType: detectReportType(report.title)
            });
        }

        fxbaogaoStatus.successCount++;
        console.log(`[发现报告] 采集完成: ${results.length} 份研报`);

    } catch (error) {
        fxbaogaoStatus.failCount++;
        console.error('[发现报告] 采集失败:', error.message);
    } finally {
        if (browser) await browser.close();
        fxbaogaoStatus.isRunning = false;
        fxbaogaoStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 视觉采集研报页面（截图保存图表）
 */
async function screenshotReportPage(url, options = {}) {
    const { pageCount = 3 } = options;

    console.log(`[发现报告] 视觉采集: ${url}`);

    let browser = null;
    const screenshots = [];

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const { createStealthPage, humanScroll, randomDelay } = require('../utils/humanBehavior');

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await createStealthPage(browser);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(3000, 5000);

        // 确保 OCR 目录存在
        if (!fs.existsSync(OCR_DIR)) {
            fs.mkdirSync(OCR_DIR, { recursive: true });
        }

        // 截取多页
        for (let i = 0; i < pageCount; i++) {
            const filename = `fxbaogao_${Date.now()}_page${i + 1}.png`;
            const filepath = path.join(OCR_DIR, filename);

            await page.screenshot({ path: filepath, fullPage: false });
            screenshots.push(filepath);

            console.log(`[发现报告] 截图第 ${i + 1} 页`);

            // 滚动到下一页
            await humanScroll(page, { distance: 800 });
            await randomDelay(1000, 2000);
        }

    } catch (error) {
        console.error('[发现报告] 视觉采集失败:', error.message);
    } finally {
        if (browser) await browser.close();
    }

    return screenshots;
}

/**
 * 检测研报类型
 */
function detectReportType(title) {
    if (/深度|深入|详解/.test(title)) return '深度';
    if (/点评|快评|简评/.test(title)) return '点评';
    if (/晨会|晨报/.test(title)) return '晨会纪要';
    if (/电话|会议纪要|调研/.test(title)) return '电话会议';
    if (/行业|产业/.test(title)) return '行业';
    if (/宏观|策略|配置/.test(title)) return '策略';
    return '其他';
}

/**
 * 解析日期
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date();

    // 尝试多种格式
    const formats = [
        /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/,
        /(\d{1,2})[-./](\d{1,2})/
    ];

    for (const regex of formats) {
        const match = dateStr.match(regex);
        if (match) {
            if (match.length === 4) {
                return new Date(match[1], match[2] - 1, match[3]);
            } else if (match.length === 3) {
                const now = new Date();
                return new Date(now.getFullYear(), match[1] - 1, match[2]);
            }
        }
    }

    return new Date();
}

/**
 * 获取状态
 */
function getFxbaogaoStatus() {
    return {
        ...fxbaogaoStatus,
        lastFetchTimeStr: fxbaogaoStatus.lastFetchTime
            ? fxbaogaoStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeFxbaogao,
    screenshotReportPage,
    getFxbaogaoStatus
};
