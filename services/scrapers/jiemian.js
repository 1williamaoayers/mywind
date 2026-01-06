/**
 * 界面新闻爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeJiemian(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[界面新闻] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.jiemian.com/lists/4.html');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        const items = await page.$$eval('.reports_item, .jm-i-article, [class*="news"] a', els =>
            els.map(el => {
                const link = el.tagName === 'A' ? el : el.querySelector('a');
                const title = el.querySelector('h3, h4, .title') || link;
                const time = el.querySelector('.time, .date, [class*="time"]');
                return {
                    title: title?.textContent?.trim()?.substring(0, 100) || '',
                    url: link?.href || '',
                    time: time?.textContent?.trim() || '',
                    source: 'jiemian',
                    sourceName: '界面新闻'
                };
            }).filter(item => item.title && item.title.length > 8 && item.url && !item.title.includes('下载'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[界面新闻] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[界面新闻] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getJiemianStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrapeJiemian, getJiemianStatus };
