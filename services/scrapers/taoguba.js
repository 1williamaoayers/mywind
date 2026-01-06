/**
 * 淘股吧爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeTaoguba(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 90000 });

    try {
        console.log('[淘股吧] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.taoguba.com.cn/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.newsLives a, .todayContent-list a, .items-list-user a, [class*="news"] a', els =>
            els.map(el => ({
                title: el.textContent?.trim()?.substring(0, 100) || '',
                url: el.href || '',
                source: 'taoguba',
                sourceName: '淘股吧'
            })).filter(item => item.title && item.title.length > 8 && item.url && !item.title.includes('下载'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[淘股吧] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[淘股吧] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getTaogubaStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeTaoguba, getTaogubaStatus };
