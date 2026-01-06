/**
 * 集微网爬虫 (Puppeteer版)
 * 
 * 数据源：集微网（半导体/芯片行业资讯）
 * URL: https://laoyaoba.com/ (集微网实际域名)
 */

const puppeteer = require('../../utils/puppeteerBase');

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeJimei(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 45000 });

    try {
        console.log('[集微网] Puppeteer采集...');

        // 集微网实际域名是 laoyaoba.com
        await puppeteer.gotoWithRetry(page, 'https://laoyaoba.com/');

        const items = await page.$$eval('.news-list li, .article-item, article, .news-item', els =>
            els.map(el => {
                const link = el.querySelector('a');
                const title = el.querySelector('.title, h3, h4');
                return {
                    title: title?.textContent?.trim() || link?.textContent?.trim() || '',
                    url: link?.href || '',
                    source: 'jimei',
                    sourceName: '集微网'
                };
            }).filter(item => item.title && item.title.length > 5)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[集微网] 采集成功: ${results.length} 条`);
    } catch (error) {
        status.failCount++;
        console.error('[集微网] 采集失败:', error.message);
    } finally {
        // 使用新的 closePage API（自动释放浏览器到池中）
        await puppeteer.closePage(page);
    }

    status.lastFetchTime = new Date();
    return results;
}

function getJimeiStatus() { return { ...status, method: 'Puppeteer' }; }

module.exports = { scrapeJimei, getJimeiStatus };
