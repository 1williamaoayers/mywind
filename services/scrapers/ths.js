/**
 * 同花顺爬虫
 * 
 * 数据源：同花顺财经
 * 采集方式：HTTP API + Puppeteer（备用）
 * 内容：实时资讯、个股新闻、研报
 */

const http = require('../../utils/httpClient');
const cheerio = require('cheerio');

// 状态追踪
const thsStatus = {
    lastFetchTime: null,
    totalFetched: 0,
    successCount: 0,
    failCount: 0
};

// User-Agent 池
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

/**
 * 获取同花顺7x24快讯
 */
async function scrapeTHSNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];

    try {
        // 同花顺7x24快讯 API
        const url = 'https://news.10jqka.com.cn/tapp/news/push/stock/?page=1&tag=&track=website&pagesize=' + maxItems;

        const response = await http.get(url, {
            headers: {
                'Referer': 'https://news.10jqka.com.cn/'
            },
            timeout: 15000
        });

        if (response.data && response.data.data && response.data.data.list) {
            for (const item of response.data.data.list) {
                results.push({
                    title: item.title || '',
                    content: item.digest || item.content || '',
                    url: item.url || `https://news.10jqka.com.cn/cjzx/${item.seq}.html`,
                    source: 'ths',
                    sourceName: '同花顺',
                    dimension: 'realtime',
                    publishTime: item.ctime ? new Date(item.ctime * 1000) : new Date(),
                    crawlTime: new Date(),
                    rawData: item
                });
            }
        }

        thsStatus.successCount++;
        console.log(`[同花顺] 采集成功: ${results.length} 条`);

    } catch (error) {
        thsStatus.failCount++;
        console.error('[同花顺] 采集失败:', error.message);

        // 备用方案：抓取网页
        try {
            const html = await http.get('https://news.10jqka.com.cn/realtimenews.html', {
                timeout: 15000
            });

            const $ = cheerio.load(html.data);
            $('.list-con li').slice(0, maxItems).each((i, el) => {
                const $el = $(el);
                results.push({
                    title: $el.find('a').text().trim(),
                    url: $el.find('a').attr('href') || '',
                    source: 'ths',
                    sourceName: '同花顺',
                    dimension: 'realtime',
                    publishTime: new Date(),
                    crawlTime: new Date()
                });
            });

            console.log(`[同花顺] 备用采集: ${results.length} 条`);
        } catch (e) {
            console.error('[同花顺] 备用采集也失败:', e.message);
        }
    }

    thsStatus.lastFetchTime = new Date();
    thsStatus.totalFetched += results.length;

    return results;
}

/**
 * 获取同花顺个股新闻
 */
async function scrapeTHSStockNews(stockCode, options = {}) {
    const { maxItems = 20 } = options;
    const results = [];

    try {
        // 个股新闻 API
        const url = `https://basic.10jqka.com.cn/api/stockph/news/${stockCode}/?page=1&pagesize=${maxItems}`;

        const response = await http.get(url, {
            headers: {
                'Referer': `https://stockpage.10jqka.com.cn/${stockCode}/`
            },
            timeout: 15000
        });

        if (response.data && response.data.data) {
            for (const item of response.data.data) {
                results.push({
                    title: item.title || '',
                    content: item.content || '',
                    url: item.url || '',
                    source: 'ths_stock',
                    sourceName: '同花顺-个股',
                    dimension: 'deep_search',
                    publishTime: item.datetime ? new Date(item.datetime) : new Date(),
                    crawlTime: new Date(),
                    stockCode: stockCode
                });
            }
        }

    } catch (error) {
        console.error(`[同花顺] 个股新闻采集失败 ${stockCode}:`, error.message);
    }

    return results;
}

/**
 * 获取状态
 */
function getTHSStatus() {
    return {
        ...thsStatus,
        lastFetchTimeStr: thsStatus.lastFetchTime
            ? thsStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

/**
 * 采集股票公告PDF（代理到announcementCollector）
 * 
 * @param {string} stockCode - 股票代码
 * @param {string} stockName - 股票名称
 * @param {Object} options - 配置选项
 */
async function scrapeTHSAnnouncements(stockCode, stockName, options = {}) {
    const { collectAnnouncements } = require('../announcementCollector');
    return collectAnnouncements(stockCode, stockName, { source: 'ths', ...options });
}

module.exports = {
    scrapeTHSNews,
    scrapeTHSStockNews,
    scrapeTHSAnnouncements,
    getTHSStatus
};
