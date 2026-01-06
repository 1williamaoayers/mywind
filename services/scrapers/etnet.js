/**
 * 经济通爬虫 (Puppeteer版)
 * 
 * 数据源：经济通 ETNet
 * 采集内容：财经新闻
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = {
    lastFetchTime: null,
    successCount: 0,
    failCount: 0
};

/**
 * 采集经济通新闻
 */
async function scrapeETNetNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[经济通] Puppeteer采集...');

        // 经济通中文财经新闻页面
        await puppeteer.gotoWithRetry(page, 'http://www.etnet.com.hk/www/tc/news/categorized_news.php?category=latest');
        await puppeteer.randomDelay(2000, 3000);

        // 尝试多种选择器
        let items = await page.$$eval('div.DivNewsContent, .news-list-item, .newsListItem', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const timeEl = el.querySelector('.newsTime, .time, span');
                return {
                    title: link?.textContent?.trim() || el.textContent?.trim().substring(0, 100),
                    url: link?.href || '',
                    time: timeEl?.textContent?.trim() || '',
                    source: 'etnet',
                    sourceName: '经济通'
                };
            }).filter(item => item.title && item.title.length > 5)
        ).catch(() => []);

        // 备用选择器：提取所有链接
        if (items.length === 0) {
            items = await page.$$eval('a', els =>
                els.filter(el => {
                    const href = el.href || '';
                    const text = el.textContent?.trim() || '';
                    return href.includes('news_detail') && text.length > 10;
                }).map(el => ({
                    title: el.textContent?.trim() || '',
                    url: el.href || '',
                    source: 'etnet',
                    sourceName: '经济通'
                }))
            ).catch(() => []);
        }

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[经济通] 采集成功: ${results.length} 条`);

    } catch (error) {
        status.failCount++;
        console.error('[经济通] 采集失败:', error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getETNetStatus() {
    return {
        ...status,
        lastFetchTimeStr: status.lastFetchTime?.toLocaleString('zh-CN') || '从未运行',
        method: 'Puppeteer'
    };
}

module.exports = {
    scrapeETNetNews,
    getETNetStatus
};

