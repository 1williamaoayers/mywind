/**
 * 腾讯财经爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeTencentNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[腾讯财经] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://new.qq.com/ch/finance/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('.channel-hot-item, .channel-feed-item', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('.article-title, .hot-title, .article-title-text');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    source: 'tencent'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[腾讯财经] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[腾讯财经] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getTencentStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeTencentNews, getTencentStatus };
