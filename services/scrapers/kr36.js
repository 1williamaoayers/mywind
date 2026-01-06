/**
 * 36氪爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrape36Kr(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[36氪] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://36kr.com/newsflashes');
        await puppeteer.randomDelay(2000, 2000 * 1.5);
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('.newsflash-item, .article-item, article', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('.title, h3, h4');
                const time = el.querySelector('.time, .date');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    time: time?.textContent?.trim() || '',
                    source: '36kr'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[36氪] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[36氪] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function get36KrStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrape36Kr, get36KrStatus };
