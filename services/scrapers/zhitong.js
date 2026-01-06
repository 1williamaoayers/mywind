/**
 * 智通财经爬虫 (增强反检测版)
 * 
 * 使用stealth插件和人性化行为模拟绕过WAF
 */

const status = { lastFetchTime: null, successCount: 0, failCount: 0 };

async function scrapeZhitongNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];

    let browser = null;

    try {
        console.log('[智通财经] 启动增强反检测模式...');

        // 使用 puppeteer-extra + stealth 插件
        const puppeteerExtra = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteerExtra.use(StealthPlugin());

        const { createStealthPage, humanScroll, randomDelay } = require('../../utils/humanBehavior');

        // 启动浏览器，使用更真实的配置
        browser = await puppeteerExtra.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--proxy-server=http://127.0.0.1:20171'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        // 创建增强隐身页面
        const page = await createStealthPage(browser);

        // 设置更真实的User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('[智通财经] 访问页面...');
        await page.goto('https://www.zhitongcaijing.com/immediately.html', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // 模拟人类行为
        await randomDelay(3000, 5000);
        await humanScroll(page, { scrollTimes: 2 });
        await randomDelay(2000, 3000);

        // 检查是否被拦截
        const pageTitle = await page.title();
        if (pageTitle.includes('阻断') || pageTitle.includes('blocked')) {
            console.log('[智通财经] 仍被WAF拦截');
            status.failCount++;
            return results;
        }

        // 提取快讯列表
        const items = await page.$$eval('a', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                const href = el.href || '';
                if (text.length > 15 && text.length < 100 &&
                    (href.includes('/content/') || href.includes('/immediately/') || href.includes('/article/'))) {
                    return {
                        title: text,
                        url: href,
                        source: 'zhitong'
                    };
                }
                return null;
            }).filter(item => item !== null)
        );

        results.push(...items.slice(0, maxItems));
        status.successCount++;
        console.log(`[智通财经] 采集成功: ${results.length} 条`);

    } catch (error) {
        status.failCount++;
        console.error('[智通财经] 采集失败:', error.message);
    } finally {
        if (browser) await browser.close();
    }

    status.lastFetchTime = new Date();
    return results;
}

async function scrapeZhitongHK(options = {}) {
    return scrapeZhitongNews(options);
}

async function scrapeZhitongResearch(options = {}) {
    return scrapeZhitongNews(options);
}

function getZhitongStatus() { return { ...status, method: 'Puppeteer+Stealth' }; }

module.exports = { scrapeZhitongNews, scrapeZhitongHK, scrapeZhitongResearch, getZhitongStatus };
