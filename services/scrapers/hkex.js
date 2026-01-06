/**
 * 港交所新闻爬虫 (Puppeteer版)
 * 
 * 数据源：香港交易所披露易
 * 采集内容：新闻、公告、IPO信息
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = {
    lastFetchTime: null,
    successCount: 0,
    failCount: 0
};

/**
 * 采集港交所新闻
 */
async function scrapeHKEXNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[港交所] Puppeteer采集新闻...');

        // 使用披露易网站
        await puppeteer.gotoWithRetry(page, 'https://www.hkexnews.hk/index_c.htm');
        await puppeteer.randomDelay(5000, 6000);  // 增加等待时间

        // 等待页面加载
        await page.waitForSelector('a', { timeout: 10000 }).catch(() => { });

        // 提取公告链接 - 筛选包含公告相关路径的链接
        const items = await page.$$eval('a', els =>
            els.filter(el => {
                const href = el.href || '';
                const text = el.textContent?.trim() || '';
                // 筛选公告链接
                return text.length > 10 && text.length < 150 &&
                    (href.includes('/listedco/') || href.includes('/listconews/') ||
                        href.includes('sehk/') || href.includes('gem/'));
            }).slice(0, 30).map(el => ({
                title: el.textContent?.trim()?.substring(0, 100) || '',
                url: el.href || '',
                source: 'hkex',
                sourceName: '港交所披露易'
            }))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[港交所] 新闻采集成功: ${results.length} 条`);

    } catch (error) {
        status.failCount++;
        console.error('[港交所] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

/**
 * 采集港交所公告
 */
async function scrapeHKEXAnnouncements(options = {}) {
    return scrapeHKEXNews(options);
}

function getHKEXStatus() {
    return {
        ...status,
        lastFetchTimeStr: status.lastFetchTime?.toLocaleString('zh-CN') || '从未运行',
        method: 'Puppeteer'
    };
}

module.exports = {
    scrapeHKEXNews,
    scrapeHKEXAnnouncements,
    getHKEXStatus
};
