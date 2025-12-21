/**
 * 国家统计局抓取器 - 宏观经济官方数据
 * 
 * 数据：GDP、CPI、PMI、PPI 等
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const statsStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取国家统计局最新发布
 */
async function scrapeNationalStats(options = {}) {
    const maxItems = options.maxItems || 15;

    console.log('[国家统计局] 开始抓取最新数据...');
    statsStatus.isRunning = true;
    statsStatus.totalFetches++;

    const results = [];

    try {
        // 国家统计局最新发布页面
        const urls = [
            'http://www.stats.gov.cn/sj/zxfb/',  // 最新发布
            'http://www.stats.gov.cn/sj/sjjd/'   // 数据解读
        ];

        for (const url of urls) {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml'
                    },
                    timeout: 15000,
                    responseType: 'arraybuffer'
                });

                // 处理 GBK 编码
                const iconv = require('iconv-lite');
                const html = iconv.decode(response.data, 'utf-8');
                const $ = cheerio.load(html);

                // 提取新闻列表
                $('ul.center_list li, .list li, .newsList li').each((i, el) => {
                    if (results.length >= maxItems) return false;

                    const $el = $(el);
                    const $link = $el.find('a').first();
                    const title = $link.text().trim();
                    let href = $link.attr('href');
                    const dateText = $el.find('span').text().trim() || '';

                    if (title && title.length > 5) {
                        // 处理相对路径
                        if (href && !href.startsWith('http')) {
                            href = `http://www.stats.gov.cn${href}`;
                        }

                        results.push({
                            source: 'stats',
                            sourceName: '国家统计局',
                            dimension: 'policy',
                            title,
                            content: '',
                            url: href || url,
                            publishTime: parseDate(dateText) || new Date(),
                            category: '宏观数据'
                        });
                    }
                });
            } catch (urlError) {
                console.error(`[国家统计局] ${url} 抓取失败:`, urlError.message);
            }
        }

        statsStatus.successCount++;
        console.log(`[国家统计局] 抓取完成: ${results.length} 条数据`);

    } catch (error) {
        statsStatus.failCount++;
        console.error('[国家统计局] 抓取失败:', error.message);
    } finally {
        statsStatus.isRunning = false;
        statsStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 解析日期
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
        return new Date(match[1], match[2] - 1, match[3]);
    }
    return null;
}

/**
 * 获取状态
 */
function getStatsStatus() {
    return {
        ...statsStatus,
        lastFetchTimeStr: statsStatus.lastFetchTime
            ? statsStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeNationalStats,
    getStatsStatus
};
