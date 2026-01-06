/**
 * 第一财经爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeYicaiNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[第一财经] Puppeteer采集...');
        await puppeteer.gotoWithRetry(page, 'https://www.yicai.com/');
        await puppeteer.randomDelay(2000, 2000 * 1.5);
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('.m-list a, .m-list-1 a, .textlist a, .item a, .swiper-slide a', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                return {
                    title: text.substring(0, 100),
                    url: el.href || '',
                    source: 'yicai',
                    sourceName: '第一财经'
                };
            }).filter(item => item.title && item.title.length > 10 && item.url && !item.title.includes('下载'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[第一财经] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[第一财经] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getYicaiStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrapeYicaiNews, getYicaiStatus };
