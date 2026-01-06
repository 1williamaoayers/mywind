/**
 * 微博财经爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeWeiboHot(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[微博] Puppeteer采集热搜...');
        await puppeteer.gotoWithRetry(page, 'https://s.weibo.com/top/summary');
        await puppeteer.randomDelay(2000, 2000 * 1.5);

        // 等待热搜表格加载
        await page.waitForSelector('#pl_top_realtimehot table tbody tr', { timeout: 10000 }).catch(() => { });

        const items = await page.$$eval('#pl_top_realtimehot table tbody tr', els =>
            els.slice(1).map(el => {  // 跳过第一行（置顶）
                const link = el.querySelector('td.td-02 a');
                const hot = el.querySelector('td.td-02 span');
                return {
                    title: link?.textContent?.trim() || '',
                    url: link?.href || '',
                    hot: hot?.textContent?.trim() || '',
                    source: 'weibo_hot'
                };
            }).filter(item => item.title && item.title.length > 2)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[微博] 热搜采集: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[微博] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

async function scrapeWeiboSearch(keyword, options = {}) {
    const { maxItems = 20 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log(`[微博] Puppeteer搜索: ${keyword}`);
        await puppeteer.gotoWithRetry(page, `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`);
        await puppeteer.randomDelay(3000, 3000 * 1.5);

        const items = await page.$$eval('.card-wrap, .weibo-item', els =>
            els.map(el => {
                const content = el.querySelector('.txt, .content');
                const link = el.querySelector('a');
                const time = el.querySelector('.from, .time');
                return {
                    title: content?.textContent?.trim().substring(0, 200) || '',
                    url: link?.href || '',
                    time: time?.textContent?.trim() || '',
                    source: 'weibo_search'
                };
            }).filter(item => item.title)
        );

        results.push(...items.slice(0, maxItems));
    } catch (error) {
        console.error('[微博] 搜索失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

function getWeiboStatus() {
    return { ...status, method: 'Puppeteer' };
}

module.exports = { scrapeWeiboHot, scrapeWeiboSearch, getWeiboStatus };
