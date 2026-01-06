/**
 * Yahoo Finance爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeYahooNews(options = {}) {
    const { maxItems = 30, symbol = '' } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[Yahoo Finance] Puppeteer采集...');
        const url = symbol
            ? `https://finance.yahoo.com/quote/${symbol}/news`
            : 'https://finance.yahoo.com/news';

        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 3000 * 1.5);
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('.stream-item, .story-item, [class*="modular-content-list-story-item"]', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('h3, h4, [class*="title"]');
                const summary = el.querySelector('p');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    summary: summary?.textContent?.trim()?.substring(0, 200) || '',
                    source: 'yahoo_finance'
                };
            }).filter(item => item.title && item.title.length > 10)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[Yahoo Finance] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[Yahoo Finance] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getYahooStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrapeYahooNews, getYahooStatus };
