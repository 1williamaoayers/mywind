/**
 * 香港经济日报爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeHKETNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[香港经济日报] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://invest.hket.com/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.item-area, .article-list-item', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('.item-title, h3, h4') || link;
                const time = el.querySelector('.item-desc, .time, .date');
                return {
                    title: title?.textContent?.trim() || '',
                    url: link?.href || '',
                    time: time?.textContent?.trim() || '',
                    source: 'hket'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[香港经济日报] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[香港经济日报] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getHKETStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeHKETNews, getHKETStatus };
