/**
 * 股票定向采集模块 v2
 * 
 * 针对订阅股票，在各信息源进行定向搜索/采集
 * 
 * 港股信息源URL模式：
 * - AAStocks: http://www.aastocks.com/sc/stocks/quote/detail-quote.aspx?symbol=09618 (报价页)
 *            http://www.aastocks.com/sc/stocks/analysis/stock-aafn/09618 (个股新闻)
 * - 富途: https://www.futunn.com/stock/09618-HK (股票详情)
 * - 格隆汇: https://www.gelonghui.com/search?keyword=京东 (搜索)
 * - 经济通: https://www.etnet.com.hk/www/tc/stocks/realtime/quote_news.php?code=09618 (个股新闻)
 * - 港交所: https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=ZH&stockCode=09618 (公告)
 * - 智通财经: https://www.zhitongcaijing.com/search?keyword=京东 (搜索)
 * 
 * A股信息源URL模式：
 * - 同花顺: https://search.10jqka.com.cn/unifiedwap/search/search/indexSearch?keyword=京东 (搜索)
 * - 东方财富: https://so.eastmoney.com/News/s?keyword=京东 (搜索)
 * - 新浪财经: https://search.sina.com.cn/?q=京东&c=news&from=home (搜索)
 */

const puppeteer = require('../utils/puppeteerBase');
const { getSubscriptionManager } = require('./subscriptionManager');

// ==================== 港股信息源 ====================

/**
 * AAStocks 个股新闻采集
 * URL: http://www.aastocks.com/sc/stocks/analysis/stock-aafn/{code}
 */
async function scrapeAAStocksForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 使用正确的个股新闻页面 URL
        const code = stockCode.replace(/^0+/, ''); // 去前导零
        const url = `http://www.aastocks.com/sc/stocks/analysis/stock-aafn/${code}`;

        console.log(`[AAStocks] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        // 尝试多种选择器
        const items = await page.$$eval('a[href*="news"], .newshead4 a, .news-list a, table.content a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200 &&
                !item.title.includes('iPhone') &&
                !item.title.includes('下载')
            )
        );

        // 去重
        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'aastocks',
                    sourceName: 'AAStocks',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[AAStocks] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[AAStocks] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 富途 股票详情页采集
 * URL: https://www.futunn.com/stock/{code}-HK
 */
async function scrapeFutuForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 使用实时资讯页面采集通用财经新闻
        const url = `https://news.futunn.com/main/live`;

        console.log(`[富途] 采集 ${stockCode} ${stockName}...`);
        // 使用宽松等待策略（富途页面资源多）
        await puppeteer.gotoLoose(page, url, { waitAfter: 15000 });

        // 滚动加载更多
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(2000, 3000);

        // 使用正确的选择器 .flash-list__flash-item
        const allItems = await page.$$eval('.flash-list__flash-item', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                const link = el.querySelector('a');
                return {
                    title: text.substring(0, 150),
                    url: link?.href || 'https://news.futunn.com/main/live'
                };
            }).filter(item => item.title && item.title.length > 20)
        );

        // 用关键词过滤相关新闻（如果没有匹配则返回最新快讯）
        const keyword = stockName.replace(/集团|科技|控股/g, '');
        let items = allItems.filter(item =>
            item.title.includes(keyword) ||
            item.title.includes(stockCode) ||
            item.title.includes(stockName.substring(0, 2))
        );

        // 如果没有匹配，返回最新的通用财经快讯
        if (items.length === 0 && allItems.length > 0) {
            items = allItems.slice(0, Math.min(maxItems, 5));
        }

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'futu',
                    sourceName: '富途',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[富途] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[富途] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 格隆汇 关键词搜索
 * URL: https://www.gelonghui.com/search?keyword={keyword}
 */
async function scrapeGelonghuiForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 使用搜索 URL 规律：/search?keyword={关键词}&type=live
        const keyword = encodeURIComponent(stockName);
        const url = `https://www.gelonghui.com/search?keyword=${keyword}&type=live`;

        console.log(`[格隆汇] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(5000, 6000);

        // 等待搜索结果加载
        await page.waitForSelector('.live-li, .day-lives, .search-result', { timeout: 15000 }).catch(() => { });

        // 滚动加载更多
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(2000, 3000);

        // 提取搜索结果（使用正确的选择器 .live-li）
        const items = await page.$$eval('.live-li, .day-lives__content', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ').replace(/^\d+:\d+\s*/, '').replace(/【/g, '【').replace(/】/g, '】') || '';
                const link = el.querySelector('a');
                return {
                    title: text.substring(0, 150),
                    url: link?.href || 'https://www.gelonghui.com/live'
                };
            }).filter(item => item.title && item.title.length > 20)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'gelonghui',
                    sourceName: '格隆汇',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[格隆汇] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[格隆汇] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 经济通 ETNet 个股新闻
 * URL: https://www.etnet.com.hk/www/tc/stocks/realtime/quote_news.php?code={code}
 */
async function scrapeETNetForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const url = `https://www.etnet.com.hk/www/tc/stocks/realtime/quote_news.php?code=${stockCode}`;

        console.log(`[经济通] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('a[href*="news_detail"], .news-list a, table a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'etnet',
                    sourceName: '经济通',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[经济通] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[经济通] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 港交所 HKEX 公告搜索
 * URL: https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=ZH&stockCode={code}
 */
async function scrapeHKEXForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const url = `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=ZH&stockCode=${stockCode}`;

        console.log(`[港交所] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        // 等待表格加载
        await page.waitForSelector('table, .search-result', { timeout: 10000 }).catch(() => { });

        const items = await page.$$eval('table tbody tr a, .result-item a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 5
            )
        );

        for (const item of items.slice(0, maxItems)) {
            results.push({
                ...item,
                source: 'hkex',
                sourceName: '港交所',
                type: 'announcement',
                relatedStocks: [stockCode],
                stockCode,
                stockName
            });
        }

        console.log(`[港交所] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[港交所] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 智通财经 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. 使用Puppeteer模拟搜索流程（首页 → 点击搜索 → 输入关键词 → 回车）
 * 2. 搜索结果URL带动态token，无法直接构造
 * 3. 选择器: 资讯列表中的链接
 */
async function scrapeZhitongForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        console.log(`[智通财经] 搜索 ${stockCode} ${stockName}...`);

        // 方案1: 访问首页并使用搜索功能
        await page.goto('https://www.zhitongcaijing.com/', {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        await puppeteer.randomDelay(3000, 4000);

        // 点击右上角搜索图标（打开搜索框）
        const searchBtn = await page.$('.header-search, [class*="search"], .search-btn, .icon-search');
        if (searchBtn) {
            await searchBtn.click();
            await puppeteer.randomDelay(1000, 2000);
        }

        // 查找并填写搜索框
        const searchInput = await page.$('input[type="text"], input[placeholder*="搜索"], input.search-input');

        if (searchInput) {
            console.log(`[智通财经] 找到搜索框，模拟拟人输入...`);
            await searchInput.click();
            await puppeteer.randomDelay(500, 1000);

            // 拟人输入（逐字符输入，模拟人类打字）
            for (const char of stockName) {
                await searchInput.type(char, { delay: 80 + Math.random() * 50 });
                await puppeteer.randomDelay(50, 150);
            }

            await puppeteer.randomDelay(1000, 2000);

            // 按回车触发搜索
            await page.keyboard.press('Enter');

            // 等待页面跳转
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => { });
        } else {
            // 方案2: 直接访问搜索页面（可能会被拦截但尝试）
            console.log(`[智通财经] 直接访问搜索页面...`);
            const keyword = encodeURIComponent(stockName);
            await page.goto(`https://www.zhitongcaijing.com/search.html?keyword=${keyword}&type=article`, {
                waitUntil: 'networkidle0',
                timeout: 45000
            });
        }

        // 等待搜索结果加载
        console.log(`[智通财经] 等待搜索结果...`);
        await puppeteer.randomDelay(8000, 10000);

        // 确保在"资讯"标签页（用evaluate检查）
        try {
            await page.evaluate(() => {
                const tabs = document.querySelectorAll('a, span');
                for (const tab of tabs) {
                    if (tab.textContent?.includes('资讯') && tab.href?.includes('type=article')) {
                        tab.click();
                        break;
                    }
                }
            });
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) { /* 忽略 */ }

        // 提取新闻列表
        const items = await page.$$eval('a', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                const href = el.href || '';
                // 提取标题（去掉时间和来源信息）
                const titleMatch = text.match(/^(.+?)(?:\d{4}-\d{2}-\d{2}|港股研究|港股公告|来源)/);
                const title = titleMatch ? titleMatch[1].trim() : text.substring(0, 80);

                return {
                    title: title,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 12 &&
                item.title.length < 150 &&
                (item.url.includes('content') || item.url.includes('zhitongcaijing')) &&
                !item.title.includes('首页') &&
                !item.title.includes('更多') &&
                !item.title.includes('登录')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'zhitong',
                    sourceName: '智通财经',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[智通财经] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[智通财经] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

// ==================== 第一批扩展：高价值源 ====================

/**
 * 香港经济日报 股票页面采集
 * 
 * 修复记录 (2025-12-31):
 * 1. URL 从 search 改为股票详情页面
 * 2. 正确URL格式: invest.hket.com/data/HKG{5位代码}/{股票名称}
 * 3. 新闻选择器: .article-list-simple-date
 */
async function scrapeHKETForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 从 09618.HK 提取 09618
        const code5 = stockCode.replace('.HK', '').padStart(5, '0');

        // 股票名称映射（简体转繁体+后缀）
        const nameMap = {
            '京东集团': '京東集團-SW',
            '小米集团': '小米集團-W',
            '中国联塑': '中國聯塑',
            '禾赛': '禾賽-W'
        };
        const hkName = nameMap[stockName] || encodeURIComponent(stockName);

        // 使用用户截图中的正确URL格式
        const url = `https://invest.hket.com/data/HKG${code5}/${hkName}`;

        console.log(`[香港经济日报] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[香港经济日报] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[香港经济日报] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 等待相关新闻区域加载
        await page.waitForSelector('.article-list-simple-date, .article-region', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器提取新闻
        const items = await page.$$eval('.article-list-simple-date', els =>
            els.map(el => {
                // 获取文本内容
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                // 提取日期（今日 或 2025/12/30）
                const dateMatch = text.match(/(今日|\d{4}\/\d{2}\/\d{2})/);
                const date = dateMatch ? dateMatch[1] : '';
                // 获取链接
                const link = el.querySelector('a');
                const href = link?.href || 'https://invest.hket.com';

                return {
                    title: text.substring(0, 150),
                    time: date,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 15 &&
                !item.title.includes('更多')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'hket',
                    sourceName: '香港经济日报',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[香港经济日报] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[香港经济日报] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 信报财经 股票新闻页面采集
 * 
 * 修复记录 (2025-12-31):
 * 1. URL 从 search 改为股票新闻页面
 * 2. 正确URL格式: stock360.hkej.com/quotePlus/{代码}/companyNews
 * 3. 注意：代码去掉前导0（09618→9618, 01810→1810）
 */
async function scrapeHKEJForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 从 09618.HK 提取数字并去掉前导0
        const code = stockCode.replace('.HK', '').replace(/^0+/, '');

        // 使用用户截图中的正确URL格式
        const url = `https://stock360.hkej.com/quotePlus/${code}/companyNews`;

        console.log(`[信报财经] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[信报财经] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[信报财经] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 等待新闻区域加载
        await page.waitForSelector('.newsListingWrap, a[href*="news"]', { timeout: 15000 }).catch(() => { });

        // 提取新闻链接
        const items = await page.$$eval('a', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                const href = el.href || '';
                return {
                    title: text,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 150 &&
                (item.url.includes('news') || item.url.includes('article') || item.url.includes('hkej')) &&
                !item.title.includes('登入') &&
                !item.title.includes('註冊') &&
                !item.title.includes('更多')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'hkej',
                    sourceName: '信报财经',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[信报财经] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[信报财经] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 东财研报 股票搜索
 * URL: https://data.eastmoney.com/report/stock/{code}.html
 */
async function scrapeEastmoneyReportForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 对于港股，需要特殊处理代码格式
        const code = stockCode.replace(/^0+/, '');
        const url = `https://data.eastmoney.com/report/stock/${code}.html`;

        console.log(`[东财研报] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        const items = await page.$$eval('a[href*="/report/"]', els =>
            els.filter(el => {
                const text = el.textContent?.trim() || '';
                const href = el.href || '';
                return text.length > 10 && text.length < 150 && href.includes('.html');
            }).map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            }))
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'eastmoney_report',
                    sourceName: '东财研报',
                    type: 'research',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[东财研报] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[东财研报] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * Yahoo Finance 个股新闻
 * URL: https://finance.yahoo.com/quote/{symbol}/news
 */
async function scrapeYahooForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 港股代码转换：09618 -> 9618.HK
        const symbol = stockCode.replace(/^0+/, '') + '.HK';
        const url = `https://finance.yahoo.com/quote/${symbol}/news`;

        console.log(`[Yahoo] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);
        await puppeteer.scrollToBottom(page, { times: 2 });

        const items = await page.$$eval('.stream-item a, [class*="story"] a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'yahoo',
                    sourceName: 'Yahoo Finance',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[Yahoo] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[Yahoo] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 研报客 关键词搜索
 * URL: https://www.yanbaoke.com/search?q={keyword}
 */
async function scrapeYanbaokeForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://www.yanbaoke.com/search?q=${keyword}`;

        console.log(`[研报客] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        // 等待搜索结果加载
        await page.waitForSelector('[class*="item"], [class*="report"], [class*="list"]', { timeout: 10000 }).catch(() => { });

        // 使用更宽泛的选择器
        const items = await page.$$eval('.report-item a, .list-item a, article a, [class*="item"] a, a[href*="/report/"]', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 5 &&
                item.title.length < 200 &&
                !item.title.includes('首页')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'yanbaoke',
                    sourceName: '研报客',
                    type: 'research',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[研报客] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[研报客] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

// ==================== A股信息源 ====================

/**
 * 同花顺 关键词搜索
 * URL: https://search.10jqka.com.cn/unifiedwap/search/search/indexSearch?keyword={keyword}
 */
async function scrapeTHSForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://search.10jqka.com.cn/unifiedwap/search/search/indexSearch?keyword=${keyword}&sourceType=6`;

        console.log(`[同花顺] 搜索 ${stockCode} ${stockName}...`);
        // 使用宽松等待策略（同花顺页面资源多）
        await puppeteer.gotoLoose(page, url, { waitAfter: 8000 });
        await puppeteer.randomDelay(2000, 3000);

        const items = await page.$$eval('a[href*="news"], .list-item a, .news-item a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'ths',
                    sourceName: '同花顺',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[同花顺] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[同花顺] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 东方财富 关键词搜索
 * URL: https://so.eastmoney.com/News/s?keyword={keyword}
 */
async function scrapeEastmoneyForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://so.eastmoney.com/News/s?keyword=${keyword}`;

        console.log(`[东方财富] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        // 等待搜索结果加载
        await page.waitForSelector('.news_item, .news_list', { timeout: 10000 }).catch(() => { });

        // 使用调研后的正确选择器
        const items = await page.$$eval('.news_item a, .news_item_t a, .news_item_url', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200 &&
                !item.title.includes('更多')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'eastmoney',
                    sourceName: '东方财富',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[东方财富] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[东方财富] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 新浪财经 关键词搜索
 * URL: https://search.sina.com.cn/?q={keyword}&c=news
 */
async function scrapeSinaForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://search.sina.com.cn/?q=${keyword}&c=news&from=home`;

        console.log(`[新浪] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('a[href*="sina.com"], .result a, .news-item a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 200
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'sina',
                    sourceName: '新浪财经',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[新浪] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[新浪] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

// ==================== 第二批扩展：A股源 ====================

/**
 * 每经新闻 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. URL从 nbd.com.cn/search 改为 nbd.com.cn/search/article_search/
 * 2. 正确URL格式: nbd.com.cn/search/article_search/?utf8=✓&q=关键词
 * 3. 新闻选择器: .search-list li a
 */
async function scrapeNBDForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 使用用户截图中的正确URL格式
        const keyword = encodeURIComponent(stockName);
        const url = `https://www.nbd.com.cn/search/article_search/?utf8=%E2%9C%93&q=${keyword}`;

        console.log(`[每经新闻] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[每经新闻] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[每经新闻] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 等待搜索结果加载
        await page.waitForSelector('.search-list, .search-result', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器提取新闻
        const items = await page.$$eval('.search-list li a', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                const href = el.href || '';
                // 提取标题（去掉来源、责编等元信息）
                const titleMatch = text.match(/^(.+?)(?:来源|每经责编|每经记者|时间)/);
                const title = titleMatch ? titleMatch[1].trim() : text.substring(0, 60);

                return {
                    title: title,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 8 &&
                item.title.length < 150 &&
                (item.url.includes('articles') || item.url.includes('nbd.com.cn'))
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'nbd',
                    sourceName: '每经新闻',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[每经新闻] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[每经新闻] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 界面新闻 关键词搜索
 * 
 * 修复记录 (2025-12-31):
 * 1. URL 从 www.jiemian.com/search 改为 a.jiemian.com/index.php?m=search
 * 2. 正确URL格式: a.jiemian.com/index.php?m=search&a=index&msg=关键词&type=news&opt=old
 * 3. 新闻标题在 <a> 标签内，时间在 .news-footer 或 .date
 */
async function scrapeJiemianForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 使用用户截图中的正确URL格式
        const keyword = encodeURIComponent(stockName);
        const url = `https://a.jiemian.com/index.php?m=search&a=index&msg=${keyword}&type=news&opt=old`;

        console.log(`[界面新闻] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[界面新闻] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[界面新闻] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 滚动触发懒加载
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(2000, 3000);

        // 等待搜索结果加载
        await page.waitForSelector('.list-search, .search-content, a[href*="/article/"]', { timeout: 15000 }).catch(() => { });

        // 提取新闻条目 - 查找包含文章链接的 <a> 标签
        const items = await page.$$eval('a[href*="/article/"], a[href*="jiemian.com"]', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                const href = el.href || '';
                return {
                    title: text,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 15 &&
                item.title.length < 200 &&
                item.url.includes('/article/') &&
                !item.title.includes('更多') &&
                !item.title.includes('返回')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'jiemian',
                    sourceName: '界面新闻',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[界面新闻] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[界面新闻] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 36氪 关键词搜索
 */
async function scrapeKr36ForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://36kr.com/search/articles/${keyword}`;

        console.log(`[36氪] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        // 等待搜索结果加载
        await page.waitForSelector('[class*="article"], [class*="item"], [class*="list"]', { timeout: 10000 }).catch(() => { });

        // 滚动触发懒加载
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(2000, 3000);

        // 使用更宽泛的选择器
        const items = await page.$$eval('a[href*="/p/"], a[href*="/newsflash/"], [class*="article"] a, [class*="item-title"] a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200 && !item.title.includes('36氪'))
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'kr36', sourceName: '36氪', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[36氪] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[36氪] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 证券时报 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. URL从 stcn.com/search 改为 stcn.com/article/search.html
 * 2. 正确URL格式: stcn.com/article/search.html?search_type=news&keyword=关键词&uncertainty=1&sorter=time
 * 3. 新闻标题选择器: .tt
 */
async function scrapeSTCNForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 使用用户截图中的正确URL格式
        const keyword = encodeURIComponent(stockName);
        const url = `https://www.stcn.com/article/search.html?search_type=news&keyword=${keyword}&uncertainty=1&sorter=time`;

        console.log(`[证券时报] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[证券时报] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[证券时报] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 等待搜索结果加载
        await page.waitForSelector('.tt, .infinite-list, a[href*="/article/detail/"]', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器提取新闻（标题在 .tt，链接指向 /article/detail/）
        const items = await page.$$eval('.tt a, a[href*="/article/detail/"]', els =>
            els.map(el => {
                const text = el.textContent?.trim() || '';
                const href = el.href || '';
                return {
                    title: text,
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 15 &&
                item.title.length < 200 &&
                item.url.includes('/article/detail/') &&
                !item.title.includes('首页') &&
                !item.title.includes('更多')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'stcn',
                    sourceName: '证券时报',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[证券时报] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[证券时报] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 第一财经 关键词搜索
 */
async function scrapeYicaiForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://www.yicai.com/search?keys=${keyword}`;

        console.log(`[第一财经] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('.m-list a, .textlist a, a[href*="/news/"]', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'yicai', sourceName: '第一财经', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[第一财经] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[第一财经] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

// ==================== 第三批扩展：社交/舆情源 ====================

/**
 * 微博 关键词搜索
 */
async function scrapeWeiboForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://s.weibo.com/weibo?q=${keyword}`;

        console.log(`[微博] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        const items = await page.$$eval('.card-feed a, .content a[href*="weibo.com"]', els =>
            els.map(el => ({
                title: el.textContent?.trim()?.substring(0, 150) || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'weibo', sourceName: '微博', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[微博] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[微博] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 知乎 关键词搜索
 */
async function scrapeZhihuForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://www.zhihu.com/search?type=content&q=${keyword}`;

        console.log(`[知乎] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(4000, 5000);

        const items = await page.$$eval('a[href*="/question/"], a[href*="/answer/"], .ContentItem-title a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'zhihu', sourceName: '知乎', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[知乎] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[知乎] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 腾讯财经 关键词搜索
 */
async function scrapeTencentForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://new.qq.com/search?query=${keyword}`;

        console.log(`[腾讯财经] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('.channel-hot-item a, .result-list a, a[href*="qq.com/a/"]', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'tencent', sourceName: '腾讯财经', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[腾讯财经] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[腾讯财经] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 金十数据 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. URL从 www.jin10.com/search 改为 search.jin10.com
 * 2. 正确URL格式: search.jin10.com/?page=1&type=flash&order=1&keyword=关键词
 * 3. 新闻选择器: .search-list-item
 */
async function scrapeJin10ForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        // 使用用户截图中的正确URL格式
        const keyword = encodeURIComponent(stockName);
        const url = `https://search.jin10.com/?page=1&type=flash&order=1&keyword=${keyword}&offset=0&vip=`;

        console.log(`[金十数据] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[金十数据] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染
        console.log(`[金十数据] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 等待搜索结果加载
        await page.waitForSelector('.search-list-item, .item-content', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器提取新闻
        const items = await page.$$eval('.search-list-item', els =>
            els.map(el => {
                // 获取快讯内容
                const content = el.querySelector('.flash-wrap, .item-content');
                const text = content?.textContent?.trim().replace(/\s+/g, ' ') || '';
                // 获取时间
                const timeEl = el.querySelector('.footer, .left-wrap');
                const time = timeEl?.textContent?.trim() || '';

                return {
                    title: text.substring(0, 200),
                    time: time,
                    url: 'https://www.jin10.com'
                };
            }).filter(item =>
                item.title &&
                item.title.length > 15 &&
                !item.title.includes('登录') &&
                !item.title.includes('商务合作')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'jin10',
                    sourceName: '金十数据',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[金十数据] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[金十数据] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

/**
 * 集微网 关键词搜索 (半导体专业)
 */
async function scrapeJimeiForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://www.jmw.com.cn/search?keyword=${keyword}`;

        console.log(`[集微网] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('a[href*="/news/"], .news-item a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'jimei', sourceName: '集微网', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[集微网] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[集微网] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }
    return results;
}

// ==================== 第四批扩展：补充源 ====================

/**
 * SEC EDGAR 个股文件搜索
 * URL: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}
 */
async function scrapeSECForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];

    try {
        // SEC 使用 HTTP API，无需 Puppeteer
        const https = require('https');
        const ticker = stockCode.replace('.US', '').replace('.HK', '');
        const url = `https://data.sec.gov/submissions/CIK${ticker.padStart(10, '0')}.json`;

        console.log(`[SEC] 采集 ${stockCode} ${stockName}...`);

        // 对于港股，SEC 可能没有数据
        if (stockCode.match(/^\d{5}$/)) {
            console.log(`[SEC] ${stockCode} 是港股，跳过`);
            return results;
        }

        // 简化：返回占位结果
        console.log(`[SEC] ${stockCode}: 需要美股 ticker`);
    } catch (error) {
        console.error(`[SEC] ${stockCode} 失败:`, error.message);
    }

    return results;
}

/**
 * SeekingAlpha 个股分析
 * URL: https://seekingalpha.com/symbol/{ticker}
 */
async function scrapeSeekingAlphaForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 港股代码转换
        const ticker = stockCode.match(/^\d{5}$/) ? `${stockCode}:HK` : stockCode;
        const url = `https://seekingalpha.com/symbol/${ticker}/news`;

        console.log(`[SeekingAlpha] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('a[data-test-id="post-list-item"], article a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'seekingalpha', sourceName: 'SeekingAlpha', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[SeekingAlpha] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[SeekingAlpha] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 全球媒体 关键词搜索
 */
async function scrapeGlobalMediaForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        // 使用 Google News 作为全球媒体源
        const url = `https://news.google.com/search?q=${keyword}&hl=zh-CN`;

        console.log(`[全球媒体] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('article a, [data-n-tid] a', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 10 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'globalMedia', sourceName: '全球媒体', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[全球媒体] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[全球媒体] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 港股通 资金流向查询（按股票过滤）
 */
async function scrapeNorthboundForStock(stockCode, stockName, options = {}) {
    const { maxItems = 5 } = options;
    const results = [];

    try {
        console.log(`[港股通] 查询 ${stockCode} ${stockName} 资金流向...`);

        // 港股通数据需要从东财API获取
        const https = require('https');
        const code = stockCode.replace(/^0+/, '');

        // 简化：返回资金流向信息
        results.push({
            title: `${stockName} 港股通资金流向 (需实时查询)`,
            url: `https://data.eastmoney.com/hsgt/stock/${code}.html`,
            source: 'northbound',
            sourceName: '港股通',
            type: 'flow',
            relatedStocks: [stockCode],
            stockCode,
            stockName
        });

        console.log(`[港股通] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[港股通] ${stockCode} 失败:`, error.message);
    }

    return results;
}

/**
 * 淘股吧 个股讨论
 * URL: https://www.taoguba.com.cn/quotes/{code}
 */
async function scrapeTaogubaForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 只支持 A 股
        if (stockCode.match(/^\d{5}$/)) {
            console.log(`[淘股吧] ${stockCode} 是港股，跳过`);
            return results;
        }

        const url = `https://www.taoguba.com.cn/quotes/${stockCode}`;

        console.log(`[淘股吧] 采集 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('.topic-item a, .post-item a, a[href*="/Article/"]', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 5 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'taoguba', sourceName: '淘股吧', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[淘股吧] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[淘股吧] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 发现报告 研报搜索
 * URL: https://www.fxbaogao.com/search?keywords={keyword}
 */
async function scrapeFxbaogaoForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://www.fxbaogao.com/search?keywords=${keyword}`;

        console.log(`[发现报告] 搜索 ${stockCode} ${stockName}...`);
        await puppeteer.gotoWithRetry(page, url);
        await puppeteer.randomDelay(3000, 4000);

        const items = await page.$$eval('.report-item a, .search-item a, a[href*="/view/"]', els =>
            els.map(el => ({
                title: el.textContent?.trim() || '',
                url: el.href || ''
            })).filter(item => item.title && item.title.length > 5 && item.title.length < 200)
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({ ...item, source: 'fxbaogao', sourceName: '发现报告', type: 'research', relatedStocks: [stockCode], stockCode, stockName });
            }
        }
        console.log(`[发现报告] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[发现报告] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

// ==================== HTTP API 源定向采集 ====================

/**
 * 财联社 搜索
 * 
 * 修复记录 (2025-12-31):
 * 1. 从 API 改为 Puppeteer 访问搜索页面
 * 2. URL: https://www.cls.cn/searchPage?keyword=关键词&type=telegram
 * 3. 选择器: .search-telegraph-list (电报容器)
 * 4. 内容选择器: .search-telegraph-content
 */
async function scrapeCLSForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false
    });

    try {
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        // 使用用户截图中的正确URL格式
        const url = `https://www.cls.cn/searchPage?keyword=${keyword}&type=telegram`;

        console.log(`[财联社] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[财联社] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // 等待页面渲染（SPA需要时间）
        console.log(`[财联社] 等待页面渲染...`);
        await puppeteer.randomDelay(8000, 10000);

        // 滚动触发懒加载
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(2000, 3000);

        // 等待电报列表加载
        await page.waitForSelector('.search-telegraph-list', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器提取电报内容
        const items = await page.$$eval('.search-telegraph-list', els =>
            els.map(el => {
                // 获取时间
                const timeEl = el.querySelector('.m-b-10');
                const time = timeEl?.textContent?.trim().split(' ').slice(0, 2).join(' ') || '';

                // 获取内容
                const contentEl = el.querySelector('.search-telegraph-content');
                let text = contentEl?.textContent?.trim() || el.textContent?.trim() || '';
                text = text.replace(/\s+/g, ' ');

                return {
                    title: text.substring(0, 200),
                    time: time,
                    url: 'https://www.cls.cn/telegraph'
                };
            }).filter(item =>
                item.title &&
                item.title.length > 20 &&
                item.title.startsWith('【')  // 财联社电报特征
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'cls',
                    sourceName: '财联社',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[财联社] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[财联社] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 雪球 股票搜索
 */
async function scrapeXueqiuForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];

    try {
        console.log(`[雪球] 搜索 ${stockCode} ${stockName}...`);

        // 雪球需要 Cookie，简化处理
        const code = stockCode.match(/^\d{5}$/) ? `${stockCode}.HK` : stockCode;
        results.push({
            title: `${stockName} 雪球讨论 (需Cookie访问)`,
            url: `https://xueqiu.com/S/${code}`,
            source: 'xueqiu',
            sourceName: '雪球',
            relatedStocks: [stockCode],
            stockCode,
            stockName
        });

        console.log(`[雪球] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[雪球] ${stockCode} 失败:`, error.message);
    }

    return results;
}

/**
 * 巨潮资讯 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. 从API改为Puppeteer拟人搜索
 * 2. 流程：访问首页 → 点击搜索框 → 输入关键词 → 按回车 → 提取结果
 * 3. 移除"仅A股"限制，支持港股关键词搜索
 */
async function scrapeCninfoForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 90000,
        blockResources: false
    });

    try {
        console.log(`[巨潮资讯] 搜索 ${stockCode} ${stockName}...`);

        // 1. 访问首页
        await page.goto('https://www.cninfo.com.cn/new/index', {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        console.log(`[巨潮资讯] 首页加载完成，查找搜索框...`);
        await puppeteer.randomDelay(3000, 4000);

        // 2. 查找搜索框（根据用户截图的placeholder）
        const searchInput = await page.$('input[placeholder*="代码"], input[placeholder*="关键字"], input[type="text"]');

        if (searchInput) {
            console.log(`[巨潮资讯] 找到搜索框，模拟拟人输入...`);

            // 3. 点击搜索框
            await searchInput.click();
            await puppeteer.randomDelay(500, 1000);

            // 4. 拟人输入（模拟人类打字，每个字符有延迟）
            for (const char of stockName) {
                await searchInput.type(char, { delay: 80 + Math.random() * 50 });
                await puppeteer.randomDelay(50, 150);
            }

            await puppeteer.randomDelay(1000, 2000);

            // 5. 按回车触发搜索
            console.log(`[巨潮资讯] 按回车搜索...`);
            await page.keyboard.press('Enter');

            // 6. 等待搜索结果页面
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => { });
            await puppeteer.randomDelay(5000, 7000);

        } else {
            console.log(`[巨潮资讯] 未找到搜索框，尝试直接访问搜索URL...`);
            const keyword = encodeURIComponent(stockName);
            await page.goto(`https://www.cninfo.com.cn/new/fulltextSearch?keyWord=${keyword}`, {
                waitUntil: 'networkidle0',
                timeout: 45000
            });
            await puppeteer.randomDelay(5000, 7000);
        }

        console.log(`[巨潮资讯] 提取搜索结果...`);

        // 7. 提取搜索结果
        const items = await page.$$eval('a', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                const href = el.href || '';

                return {
                    title: text.substring(0, 100),
                    url: href
                };
            }).filter(item =>
                item.title &&
                item.title.length > 10 &&
                item.title.length < 150 &&
                (item.url.includes('cninfo.com.cn') || item.url.includes('disclosure') || item.url.includes('announcement')) &&
                !item.title.includes('首页') &&
                !item.title.includes('登录') &&
                !item.title.includes('注册')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'cninfo',
                    sourceName: '巨潮资讯',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[巨潮资讯] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[巨潮资讯] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 披露易 港股公告搜索
 * 
 * 修复记录 (2026-01-01):
 * 1. 访问首页，用JS设置股票代码触发下拉
 * 2. 点击下拉项设置stockId
 * 3. 提交表单获取搜索结果
 * 4. 解析表格提取公告列表
 */
async function scrapeHKEXNewsForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 90000,
        blockResources: false
    });

    try {
        console.log(`[披露易] 搜索 ${stockCode} ${stockName}...`);

        // 支持港股格式：01810.HK 或 1810 或 01810
        const match = stockCode.match(/^0*(\d+)\.?HK$/i) || stockCode.match(/^(\d{4,5})$/);
        if (!match) {
            console.log(`[披露易] ${stockCode} 不是港股，跳过`);
            return results;
        }

        // 补齐5位代码
        const code = match[1].padStart(5, '0');

        // 1. 访问首页
        await page.goto('https://www.hkexnews.hk/index_c.htm', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await puppeteer.randomDelay(4000, 5000);  // 增加初始等待时间

        // 2. 用JS设置股票代码并触发input事件
        await page.evaluate((stockCode) => {
            const input = document.querySelector('#searchStockCode');
            input.value = stockCode;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, code);

        // 等待下拉菜单加载（增加等待时间）
        await puppeteer.randomDelay(5000, 6000);

        // 3. 点击第一个下拉项（增加重试逻辑）
        let clicked = false;
        for (let retry = 0; retry < 3; retry++) {
            clicked = await page.evaluate(() => {
                const trs = document.querySelectorAll('.autocomplete-suggestions table tr');
                if (trs.length > 0) {
                    trs[0].click();
                    return true;
                }
                return false;
            });

            if (clicked) break;

            // 如果没找到，等待后重试
            console.log(`[披露易] ${stockCode} 下拉项未出现，重试 ${retry + 1}/3...`);
            await puppeteer.randomDelay(2000, 3000);
        }

        if (!clicked) {
            console.log(`[披露易] ${stockCode} 未找到下拉项（已重试3次）`);
            return results;
        }

        await puppeteer.randomDelay(1500, 2000);

        // 4. 提交表单
        await page.evaluate(() => {
            const form = document.querySelector('form[action*="titlesearch"]');
            if (form) form.submit();
        });

        // 等待结果页面加载
        await puppeteer.randomDelay(10000, 12000);

        // 5. 提取公告列表
        const items = await page.evaluate((max) => {
            const announcements = [];
            const trs = document.querySelectorAll('tr');

            for (const tr of trs) {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 4) {
                    const link = tds[3]?.querySelector('a');
                    if (link?.href?.includes('hkexnews')) {
                        announcements.push({
                            date: tds[0]?.textContent?.trim().replace(/[發放時間:\s]/g, ''),
                            title: link.textContent?.trim(),
                            url: link.href
                        });
                    }
                }
                if (announcements.length >= max) break;
            }

            return announcements;
        }, maxItems);

        console.log(`[披露易] ${stockCode} 找到 ${items.length} 条公告`);

        // 转换为标准格式
        for (const item of items) {
            const newsItem = {
                title: `[${item.date}] ${item.title}`,
                url: item.url,
                source: 'hkexnews',
                sourceName: '披露易',
                type: 'announcement',
                relatedStocks: [stockCode],
                stockCode,
                stockName,
                content: ''  // 默认空内容
            };
            results.push(newsItem);
        }

        // 如果启用内容提取，使用OCR提取PDF内容
        if (options.extractContent && results.length > 0) {
            console.log(`[披露易] 开始OCR提取PDF内容...`);
            const { extractPdfContentPdfjs } = require('../utils/pdfRenderer');

            for (const item of results) {
                if (item.url.includes('.pdf')) {
                    try {
                        const ocrResult = await extractPdfContentPdfjs(item.url, { maxPages: 10, maxLength: 20000 });
                        if (ocrResult.success) {
                            item.content = ocrResult.text;
                            item.ocrConfidence = ocrResult.confidence;
                            console.log(`[披露易] OCR成功: 置信度${ocrResult.confidence.toFixed(1)}% ${item.content.length}字符`);
                        }
                    } catch (e) {
                        console.log(`[披露易] OCR失败: ${e.message}`);
                    }
                }
            }
        }

        console.log(`[披露易] ${stockCode}: ${results.length} 条`);
    } catch (error) {
        console.error(`[披露易] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 华尔街见闻 搜索
 * 
 * 修复记录 (2025-12-31):
 * 1. URL 需添加 &type=live 参数（用户发现）
 * 2. 使用 networkidle0 等待 SPA 完成渲染
 * 3. 正确选择器：.live-item（DOM分析确认102个元素）
 * 4. 提取元素内文本内容（仿照格隆汇做法）
 */
async function scrapeWallstreetForStock(stockCode, stockName, options = {}) {
    const { maxItems = 10 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 60000,
        blockResources: false  // 不拦截资源，确保 JS 完整加载
    });

    try {
        // URL 必须添加 &type=live 参数（用户截图确认）
        const keyword = encodeURIComponent(stockName.replace(/集团|科技|控股/g, ''));
        const url = `https://wallstreetcn.com/search?q=${keyword}&type=live`;

        console.log(`[华尔街见闻] 搜索 ${stockCode} ${stockName}...`);
        console.log(`[华尔街见闻] URL: ${url}`);

        // 使用 networkidle0 等待页面完全加载（SPA 关键）
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 45000
        });

        // SPA 需要额外等待时间（经验值 10-15 秒）
        console.log(`[华尔街见闻] 等待 SPA 渲染...`);
        await puppeteer.randomDelay(10000, 15000);

        // 滚动触发懒加载
        await page.evaluate(() => window.scrollTo(0, 500));
        await puppeteer.randomDelay(3000, 4000);

        // 等待 .live-item 加载（DOM分析确认这是正确选择器）
        await page.waitForSelector('.live-item', { timeout: 15000 }).catch(() => { });

        // 使用正确选择器 .live-item 提取新闻内容（仿照格隆汇做法）
        const items = await page.$$eval('.live-item', els =>
            els.map(el => {
                // 获取时间
                const timeEl = el.querySelector('.live-item_created, time');
                const time = timeEl?.textContent?.trim() || '';

                // 获取完整文本内容，去除时间前缀
                let text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                // 去除开头的时间（如 "09:23"）
                text = text.replace(/^\d{1,2}:\d{2}\s*/, '');

                return {
                    title: text.substring(0, 200),
                    time: time,
                    url: 'https://wallstreetcn.com/live'
                };
            }).filter(item =>
                item.title &&
                item.title.length > 20 &&
                // 过滤广告/公告
                !item.title.includes('清朗') &&
                !item.title.includes('专项整治') &&
                !item.title.includes('举报专区') &&
                !item.title.includes('涉企虚假')
            )
        );

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    ...item,
                    source: 'wallstreet',
                    sourceName: '华尔街见闻',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[华尔街见闻] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[华尔街见闻] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

/**
 * 东财股吧 搜索采集
 * 
 * 修复记录 (2025-12-31):
 * 1. 直接访问 so.eastmoney.com/tiezi/s?keyword=关键词#time
 * 2. 使用 networkidle2 等待页面完全加载
 * 3. 提取 guba.eastmoney.com 链接（帖子格式无【】开头）
 */
async function scrapeGubaForStock(stockCode, stockName, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];
    const page = await puppeteer.createPage({
        timeout: 90000,
        blockResources: false
    });

    try {
        console.log(`[东财股吧] 搜索 ${stockCode} ${stockName}...`);

        // 直接访问搜索结果URL（按时间排序）
        const keyword = encodeURIComponent(stockName);
        const url = `https://so.eastmoney.com/tiezi/s?keyword=${keyword}#time`;
        console.log(`[东财股吧] URL: ${url}`);

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`[东财股吧] 页面加载完成，等待渲染...`);
        await puppeteer.randomDelay(5000, 6000);

        // 提取guba链接（帖子格式：标题文字 + guba.eastmoney.com链接）
        console.log(`[东财股吧] 提取帖子列表...`);

        const items = await page.$$eval('a', els =>
            els.map(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
                const href = el.href || '';

                // 只要是guba链接且标题长度合适
                if (href.includes('guba.eastmoney.com/news') &&
                    text.length > 10 &&
                    text.length < 200 &&
                    !text.startsWith('http')) {
                    return { title: text, url: href };
                }
                return null;
            }).filter(item => item)
        );

        console.log(`[东财股吧] 找到 ${items.length} 个帖子`);

        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item.title) && results.length < maxItems) {
                seen.add(item.title);
                results.push({
                    title: item.title,
                    url: item.url,
                    source: 'guba',
                    sourceName: '东财股吧',
                    relatedStocks: [stockCode],
                    stockCode,
                    stockName
                });
            }
        }

        console.log(`[东财股吧] ${stockCode}: ${results.length} 条`);

    } catch (error) {
        console.error(`[东财股吧] ${stockCode} 失败:`, error.message);
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

// ==================== 批量采集 ====================

/**
 * 所有可用的定向采集函数 (已扩展到47个信息源)
 */
const SCRAPERS = {
    // 港股 (11个)
    aastocks: { fn: scrapeAAStocksForStock, markets: ['HK'] },
    futu: { fn: scrapeFutuForStock, markets: ['HK'] },
    gelonghui: { fn: scrapeGelonghuiForStock, markets: ['HK', 'US', 'SH', 'SZ'] },
    etnet: { fn: scrapeETNetForStock, markets: ['HK'] },
    hkex: { fn: scrapeHKEXForStock, markets: ['HK'] },
    zhitong: { fn: scrapeZhitongForStock, markets: ['HK', 'US'] },
    hket: { fn: scrapeHKETForStock, markets: ['HK'] },
    hkej: { fn: scrapeHKEJForStock, markets: ['HK'] },
    yahoo: { fn: scrapeYahooForStock, markets: ['HK', 'US'] },

    // A股 (10个)
    ths: { fn: scrapeTHSForStock, markets: ['SH', 'SZ', 'HK'] },
    eastmoney: { fn: scrapeEastmoneyForStock, markets: ['SH', 'SZ', 'HK'] },
    sina: { fn: scrapeSinaForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    eastmoney_report: { fn: scrapeEastmoneyReportForStock, markets: ['SH', 'SZ', 'HK'] },
    yanbaoke: { fn: scrapeYanbaokeForStock, markets: ['SH', 'SZ', 'HK'] },
    nbd: { fn: scrapeNBDForStock, markets: ['SH', 'SZ'] },
    jiemian: { fn: scrapeJiemianForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    kr36: { fn: scrapeKr36ForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    stcn: { fn: scrapeSTCNForStock, markets: ['SH', 'SZ'] },
    yicai: { fn: scrapeYicaiForStock, markets: ['SH', 'SZ', 'HK'] },

    // 社交/舆情 (5个)
    weibo: { fn: scrapeWeiboForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    zhihu: { fn: scrapeZhihuForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    tencent: { fn: scrapeTencentForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    jin10: { fn: scrapeJin10ForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    jimei: { fn: scrapeJimeiForStock, markets: ['SH', 'SZ'] },

    // 第四批扩展 (12个)
    sec: { fn: scrapeSECForStock, markets: ['US'] },
    seekingalpha: { fn: scrapeSeekingAlphaForStock, markets: ['US', 'HK'] },
    globalMedia: { fn: scrapeGlobalMediaForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    northbound: { fn: scrapeNorthboundForStock, markets: ['HK'] },
    taoguba: { fn: scrapeTaogubaForStock, markets: ['SH', 'SZ'] },
    fxbaogao: { fn: scrapeFxbaogaoForStock, markets: ['SH', 'SZ', 'HK'] },
    cls: { fn: scrapeCLSForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    xueqiu: { fn: scrapeXueqiuForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    cninfo: { fn: scrapeCninfoForStock, markets: ['SH', 'SZ'] },
    hkexnews: { fn: scrapeHKEXNewsForStock, markets: ['HK'] },
    wallstreet: { fn: scrapeWallstreetForStock, markets: ['SH', 'SZ', 'HK', 'US'] },
    guba: { fn: scrapeGubaForStock, markets: ['SH', 'SZ'] }
};

/**
 * 为所有订阅股票进行定向采集
 */
async function scrapeForAllSubscriptions(sources = null, options = {}) {
    const subManager = getSubscriptionManager();
    const subscriptions = subManager.getAll();
    const allResults = [];

    // 默认使用所有可用源
    const activeSources = sources || Object.keys(SCRAPERS);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`开始定向采集 ${subscriptions.length} 只订阅股票`);
    console.log(`信息源: ${activeSources.length} 个`);
    console.log('='.repeat(60) + '\n');

    for (const sub of subscriptions) {
        const { stockCode, stockName, market } = sub;
        console.log(`\n--- ${stockCode} ${stockName} (${market}) ---`);

        for (const sourceName of activeSources) {
            const scraper = SCRAPERS[sourceName];
            if (!scraper) continue;

            // 检查市场兼容性
            if (!scraper.markets.includes(market)) {
                continue;
            }

            try {
                const results = await scraper.fn(stockCode, stockName, options);
                allResults.push(...results);
            } catch (e) {
                console.error(`[${sourceName}] ${stockCode} 错误:`, e.message);
            }

            // 避免请求过快
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`定向采集完成: 共 ${allResults.length} 条`);
    console.log('='.repeat(60) + '\n');

    return allResults;
}

/**
 * 快速采集（只用高成功率的源）
 */
async function quickScrapeForSubscriptions(options = {}) {
    return scrapeForAllSubscriptions(['futu', 'gelonghui', 'etnet', 'aastocks'], options);
}

/**
 * 获取所有可用的信息源列表
 */
function getAvailableSources() {
    return Object.entries(SCRAPERS).map(([name, config]) => ({
        name,
        markets: config.markets
    }));
}

module.exports = {
    // 港股定向采集
    scrapeAAStocksForStock,
    scrapeFutuForStock,
    scrapeGelonghuiForStock,
    scrapeETNetForStock,
    scrapeHKEXForStock,
    scrapeZhitongForStock,
    scrapeHKETForStock,
    scrapeHKEJForStock,
    scrapeYahooForStock,

    // A股定向采集
    scrapeTHSForStock,
    scrapeEastmoneyForStock,
    scrapeSinaForStock,
    scrapeEastmoneyReportForStock,
    scrapeYanbaokeForStock,
    scrapeNBDForStock,
    scrapeJiemianForStock,
    scrapeKr36ForStock,
    scrapeSTCNForStock,
    scrapeYicaiForStock,

    // 社交/舆情定向采集
    scrapeWeiboForStock,
    scrapeZhihuForStock,
    scrapeTencentForStock,
    scrapeJin10ForStock,
    scrapeJimeiForStock,

    // 第四批扩展定向采集
    scrapeSECForStock,
    scrapeSeekingAlphaForStock,
    scrapeGlobalMediaForStock,
    scrapeNorthboundForStock,
    scrapeTaogubaForStock,
    scrapeFxbaogaoForStock,
    scrapeCLSForStock,
    scrapeXueqiuForStock,
    scrapeCninfoForStock,
    scrapeHKEXNewsForStock,
    scrapeWallstreetForStock,
    scrapeGubaForStock,

    // 批量采集
    scrapeForAllSubscriptions,
    quickScrapeForSubscriptions,
    getAvailableSources,

    // 常量
    SCRAPERS
};
