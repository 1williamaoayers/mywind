/**
 * 国家统计局爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeNationalStats(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[国家统计局] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.stats.gov.cn/sj/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.list li, .news-list li, article', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const time = el.querySelector('.time, .date');
                return {
                    title: link?.textContent?.trim() || el.textContent?.trim().substring(0, 100),
                    url: link?.href || '',
                    time: time?.textContent?.trim() || '',
                    source: 'stats_gov'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[国家统计局] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[国家统计局] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getStatsStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeNationalStats, getStatsStatus };
