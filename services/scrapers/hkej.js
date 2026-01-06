/**
 * 信报财经爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeHKEJNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[信报财经] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.hkej.com/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.in_news_u_t a, .in_news_ll_t a, [class*="news"] a', els =>
            els.map(el => ({
                title: el.textContent?.trim()?.substring(0, 100) || '',
                url: el.href || '',
                source: 'hkej',
                sourceName: '信报财经'
            })).filter(item => item.title && item.title.length > 8 && item.url)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[信报财经] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[信报财经] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

async function scrapeHKEJColumn(options = {}) {
    return scrapeHKEJNews(options);
}

function getHKEJStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeHKEJNews, scrapeHKEJColumn, getHKEJStatus };
