/**
 * 研报客抓取器 (yanbaoke.com)
 * 
 * 互助式研报社区
 * 特点：冷门研报、内部讲义
 */

const path = require('path');

// 抓取状态
const yanbaokeStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取研报客
 */
async function scrapeYanbaoke(options = {}) {
    const { keyword = '', maxItems = 10 } = options;

    console.log('[研报客] 开始采集...');
    yanbaokeStatus.isRunning = true;
    yanbaokeStatus.totalFetches++;

    const results = [];

    let browser = null;

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const { createStealthPage, humanScroll, randomDelay, humanClickElement } = require('../../utils/humanBehavior');

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await createStealthPage(browser);

        // 构建 URL
        let url = 'https://www.yanbaoke.com/';
        if (keyword) {
            url = `https://www.yanbaoke.com/search?q=${encodeURIComponent(keyword)}`;
        }

        console.log(`[研报客] 访问: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 4000);

        // 自动关闭可能的弹窗
        await autoClosePopups(page);

        // 滚动加载
        for (let i = 0; i < 2; i++) {
            await humanScroll(page);
        }

        // 提取研报列表
        const reports = await page.evaluate(() => {
            const items = [];

            // 尝试多种选择器
            const selectors = [
                '.report-item',
                '.list-item',
                '.search-item',
                'article',
                '.post-item'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const titleEl = el.querySelector('.title, h2, h3, a');
                        const title = titleEl?.innerText?.trim() || '';

                        const link = el.querySelector('a')?.href || '';

                        const infoEl = el.querySelector('.info, .meta, .desc');
                        const info = infoEl?.innerText?.trim() || '';

                        if (title && title.length > 5) {
                            items.push({ title, url: link, info });
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
                source: 'yanbaoke',
                sourceName: '研报客',
                title: report.title,
                url: report.url,
                summary: report.info,
                publishDate: new Date(),
                reportType: detectReportType(report.title)
            });
        }

        yanbaokeStatus.successCount++;
        console.log(`[研报客] 采集完成: ${results.length} 份研报`);

    } catch (error) {
        yanbaokeStatus.failCount++;
        console.error('[研报客] 采集失败:', error.message);
    } finally {
        if (browser) await browser.close();
        yanbaokeStatus.isRunning = false;
        yanbaokeStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 自动关闭弹窗
 */
async function autoClosePopups(page) {
    try {
        // 常见弹窗关闭按钮选择器
        const closeSelectors = [
            '.close',
            '.close-btn',
            '.modal-close',
            '[aria-label="Close"]',
            '.popup-close',
            'button[class*="close"]',
            '.dialog-close'
        ];

        for (const selector of closeSelectors) {
            const closeBtn = await page.$(selector);
            if (closeBtn) {
                await closeBtn.click();
                console.log('[研报客] 关闭弹窗');
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 按 ESC 键关闭可能的模态框
        await page.keyboard.press('Escape');

    } catch (error) {
        // 忽略弹窗关闭错误
    }
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
    if (/讲义|培训|内部/.test(title)) return '其他';
    return '其他';
}

/**
 * 获取状态
 */
function getYanbaokeStatus() {
    return {
        ...yanbaokeStatus,
        lastFetchTimeStr: yanbaokeStatus.lastFetchTime
            ? yanbaokeStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeYanbaoke,
    getYanbaokeStatus
};
