/**
 * 每日经济新闻爬虫
 * 
 * 数据源：每日经济新闻 (nbd.com.cn)
 * 采集方式：HTTP
 * 内容：财经快讯、A股新闻、深度调查
 */

const http = require('../../utils/httpClient');
const cheerio = require('cheerio');

const nbdStatus = {
    lastFetchTime: null,
    totalFetched: 0,
    successCount: 0,
    failCount: 0
};


/**
 * 获取每经快讯
 */
async function scrapeNBDNews(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];

    try {
        // 快讯页面
        const response = await http.get('https://www.nbd.com.cn/columns/318', {
            headers: {
                
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // 快讯列表
        $('.u-news-list li, .news-list li, .article-item').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const $a = $el.find('a').first();
            const title = $a.text().trim() || $el.find('.title').text().trim();
            const href = $a.attr('href') || '';
            const time = $el.find('.time, .date').text().trim();

            if (title && title.length > 5) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://www.nbd.com.cn${href}`,
                    source: 'nbd',
                    sourceName: '每日经济新闻',
                    dimension: 'realtime',
                    publishTime: parseTime(time),
                    crawlTime: new Date()
                });
            }
        });

        nbdStatus.successCount++;
        console.log(`[每日经济新闻] 采集成功: ${results.length} 条`);

    } catch (error) {
        nbdStatus.failCount++;
        console.error('[每日经济新闻] 采集失败:', error.message);
    }

    nbdStatus.lastFetchTime = new Date();
    nbdStatus.totalFetched += results.length;

    return results;
}

/**
 * 获取每经头条
 */
async function scrapeNBDHeadlines(options = {}) {
    const { maxItems = 20 } = options;
    const results = [];

    try {
        const response = await http.get('https://www.nbd.com.cn/', {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // 头条区域
        $('.focus-news a, .headline a, .top-news a, .m-focus a').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const title = $el.text().trim();
            const href = $el.attr('href') || '';

            if (title && title.length > 5 && !title.includes('广告')) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://www.nbd.com.cn${href}`,
                    source: 'nbd_headline',
                    sourceName: '每经头条',
                    dimension: 'deep_search',
                    publishTime: new Date(),
                    crawlTime: new Date(),
                    isHeadline: true
                });
            }
        });

        console.log(`[每日经济新闻] 头条采集: ${results.length} 条`);

    } catch (error) {
        console.error('[每日经济新闻] 头条采集失败:', error.message);
    }

    return results;
}

/**
 * 获取每经A股新闻
 */
async function scrapeNBDStock(options = {}) {
    const { maxItems = 30 } = options;
    const results = [];

    try {
        // A股频道
        const response = await http.get('https://www.nbd.com.cn/columns/285', {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        $('.u-news-list li, .news-list li').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const $a = $el.find('a').first();
            const title = $a.text().trim();
            const href = $a.attr('href') || '';
            const time = $el.find('.time, .date').text().trim();

            if (title && title.length > 5) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://www.nbd.com.cn${href}`,
                    source: 'nbd_stock',
                    sourceName: '每经A股',
                    dimension: 'realtime',
                    publishTime: parseTime(time),
                    crawlTime: new Date(),
                    category: 'A股'
                });
            }
        });

        console.log(`[每日经济新闻] A股采集: ${results.length} 条`);

    } catch (error) {
        console.error('[每日经济新闻] A股采集失败:', error.message);
    }

    return results;
}

/**
 * 获取每经独家
 */
async function scrapeNBDExclusive(options = {}) {
    const { maxItems = 15 } = options;
    const results = [];

    try {
        // 独家/深度频道
        const response = await http.get('https://www.nbd.com.cn/columns/332', {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        $('.u-news-list li, .news-list li').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const $a = $el.find('a').first();
            const title = $a.text().trim();
            const href = $a.attr('href') || '';
            const summary = $el.find('.summary, p').text().trim();

            if (title && title.length > 5) {
                results.push({
                    title: title,
                    content: summary,
                    url: href.startsWith('http') ? href : `https://www.nbd.com.cn${href}`,
                    source: 'nbd_exclusive',
                    sourceName: '每经独家',
                    dimension: 'deep_search',
                    publishTime: new Date(),
                    crawlTime: new Date(),
                    category: '独家'
                });
            }
        });

        console.log(`[每日经济新闻] 独家采集: ${results.length} 条`);

    } catch (error) {
        console.error('[每日经济新闻] 独家采集失败:', error.message);
    }

    return results;
}

/**
 * 解析时间
 */
function parseTime(timeStr) {
    if (!timeStr) return new Date();

    // 处理 "12:30" 格式
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch && !timeStr.includes('-')) {
        const now = new Date();
        now.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        return now;
    }

    // 处理 "X分钟前"
    const minMatch = timeStr.match(/(\d+)\s*分钟前/);
    if (minMatch) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - parseInt(minMatch[1]));
        return now;
    }

    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? new Date() : date;
}

function getNBDStatus() {
    return {
        ...nbdStatus,
        lastFetchTimeStr: nbdStatus.lastFetchTime
            ? nbdStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeNBDNews,
    scrapeNBDHeadlines,
    scrapeNBDStock,
    scrapeNBDExclusive,
    getNBDStatus
};
