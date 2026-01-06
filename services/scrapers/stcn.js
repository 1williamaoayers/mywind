/**
 * 证券时报爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeSTCN(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[证券时报] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.stcn.com/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.index-quick-news-list a, .top-news a, .cc-list a, [class*="news"] a', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                return {
                    title: text.substring(0, 100),
                    url: el.href || '',
                    source: 'stcn',
                    sourceName: '证券时报'
                };
            }).filter(item => item.title && item.title.length > 8 && item.url && !item.title.includes('下载'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[证券时报] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[证券时报] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getSTCNStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrapeSTCN, getSTCNStatus };
