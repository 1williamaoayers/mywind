/**
 * 格隆汇爬虫 (Puppeteer版)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = {
    lastFetchTime: null,
    successCount: 0,
    failCount: 0
};

/**
 * 采集格隆汇新闻
 */
async function scrapeGelonghui(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[格隆汇] Puppeteer采集...');

        await puppeteer.gotoWithRetry(page, 'https://www.gelonghui.com/');
        await puppeteer.randomDelay(3000, 3000 * 1.5);

        // 滚动加载更多
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('[class*="article"], .live-item, .news-card', els =>
            els.map(el => {
                const link = el.querySelector('a[href*="/live/"], a[href*="/news/"], a[href*="/p/"]') || el.querySelector('a');
                const title = el.querySelector('h2, h3, h4, .title, .article-title') || link;
                const time = el.querySelector('.time, .date, time, [class*="time"]');
                const summary = el.querySelector('.summary, .desc, .content, p');

                const titleText = title?.textContent?.trim() || '';
                const href = link?.href || '';

                return {
                    title: titleText.substring(0, 100),
                    url: href,
                    time: time?.textContent?.trim() || '',
                    summary: summary?.textContent?.trim()?.substring(0, 200) || '',
                    source: 'gelonghui',
                    sourceName: '格隆汇'
                };
            }).filter(item => item.title && item.title.length > 5 && item.url && !item.title.includes('下载'))
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[格隆汇] 采集成功: ${results.length} 条`);

    } catch (error) {
        status.failCount++;
        console.error('[格隆汇] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getGelonghuiStatus() {
    return {
        ...status,
        lastFetchTimeStr: status.lastFetchTime?.toLocaleString('zh-CN') || '从未运行',
        method: 'Puppeteer'
    };
}

module.exports = {
    scrapeGelonghui,
    getGelonghuiStatus
};
