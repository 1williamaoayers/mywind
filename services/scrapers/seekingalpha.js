/**
 * Seeking Alpha 爬虫
 * 
 * 数据源：Seeking Alpha
 * 采集方式：HTTP（公开内容）
 * 内容：美股研报、分析文章
 */

const http = require('../../utils/httpClient');
const cheerio = require('cheerio');

const seekingAlphaStatus = {
    lastFetchTime: null,
    totalFetched: 0,
    successCount: 0,
    failCount: 0
};


/**
 * 获取 Seeking Alpha 最新文章
 */
async function scrapeSeekingAlpha(options = {}) {
    const { maxItems = 20 } = options;
    const results = [];

    try {
        // Seeking Alpha 首页
        const response = await http.get('https://seekingalpha.com/market-news', {
            headers: {
                
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);

        // 解析文章列表
        $('article, [data-test-id="post-list-item"]').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const $a = $el.find('a[href*="/article/"], a[href*="/news/"]').first();
            const title = $a.text().trim() || $el.find('h3, h4').text().trim();
            const href = $a.attr('href') || '';
            const author = $el.find('[data-test-id="author-name"], .author-name').text().trim();
            const time = $el.find('time, .date').attr('datetime') || $el.find('.date').text().trim();

            if (title && title.length > 10) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://seekingalpha.com${href}`,
                    source: 'seeking_alpha',
                    sourceName: 'Seeking Alpha',
                    dimension: 'deep_search',
                    publishTime: time ? new Date(time) : new Date(),
                    crawlTime: new Date(),
                    author: author
                });
            }
        });

        seekingAlphaStatus.successCount++;
        console.log(`[Seeking Alpha] 采集成功: ${results.length} 条`);

    } catch (error) {
        seekingAlphaStatus.failCount++;
        console.error('[Seeking Alpha] 采集失败:', error.message);
    }

    seekingAlphaStatus.lastFetchTime = new Date();
    seekingAlphaStatus.totalFetched += results.length;

    return results;
}

/**
 * 获取个股分析
 */
async function scrapeSeekingAlphaStock(symbol, options = {}) {
    const { maxItems = 15 } = options;
    const results = [];

    try {
        const response = await http.get(`https://seekingalpha.com/symbol/${symbol}`, {
            headers: {
                
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);

        // 解析个股文章
        $('article, [data-test-id="post-list-item"]').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const $a = $el.find('a[href*="/article/"]').first();
            const title = $a.text().trim() || $el.find('h3').text().trim();
            const href = $a.attr('href') || '';
            const author = $el.find('.author-name').text().trim();

            if (title && title.length > 10) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://seekingalpha.com${href}`,
                    source: 'seeking_alpha_stock',
                    sourceName: 'Seeking Alpha',
                    dimension: 'deep_search',
                    publishTime: new Date(),
                    crawlTime: new Date(),
                    symbol: symbol,
                    author: author
                });
            }
        });

        console.log(`[Seeking Alpha] 个股分析 ${symbol}: ${results.length} 条`);

    } catch (error) {
        console.error(`[Seeking Alpha] 个股分析失败 ${symbol}:`, error.message);
    }

    return results;
}

/**
 * 获取热门评级
 */
async function scrapeSeekingAlphaRatings(options = {}) {
    const { maxItems = 20 } = options;
    const results = [];

    try {
        const response = await http.get('https://seekingalpha.com/stock-ideas', {
            headers: {
            },
            timeout: 20000
        });

        const $ = cheerio.load(response.data);

        // 解析评级
        $('[data-test-id="stock-idea"]').slice(0, maxItems).each((i, el) => {
            const $el = $(el);
            const title = $el.find('h3').text().trim();
            const href = $el.find('a').first().attr('href') || '';
            const rating = $el.find('.rating').text().trim();
            const author = $el.find('.author').text().trim();

            if (title) {
                results.push({
                    title: title,
                    url: href.startsWith('http') ? href : `https://seekingalpha.com${href}`,
                    source: 'seeking_alpha_ratings',
                    sourceName: 'Seeking Alpha',
                    dimension: 'deep_search',
                    publishTime: new Date(),
                    crawlTime: new Date(),
                    rating: rating,
                    author: author
                });
            }
        });

        console.log(`[Seeking Alpha] 热门评级: ${results.length} 条`);

    } catch (error) {
        console.error('[Seeking Alpha] 热门评级失败:', error.message);
    }

    return results;
}

function getSeekingAlphaStatus() {
    return {
        ...seekingAlphaStatus,
        lastFetchTimeStr: seekingAlphaStatus.lastFetchTime
            ? seekingAlphaStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeSeekingAlpha,
    scrapeSeekingAlphaStock,
    scrapeSeekingAlphaRatings,
    getSeekingAlphaStatus
};
