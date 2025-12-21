/**
 * 全球媒体抓取器 - 路透社/彭博/巴伦周刊
 */

const axios = require('axios');
const cheerio = require('cheerio');

// 抓取状态
const globalStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

/**
 * 抓取全球媒体
 */
async function scrapeGlobalMedia(options = {}) {
    const maxItems = options.maxItems || 10;
    const source = options.source || 'all'; // 'reuters' | 'barrons' | 'all'

    console.log('[全球媒体] 开始抓取...');
    globalStatus.isRunning = true;
    globalStatus.totalFetches++;

    const results = [];

    const sources = [
        // 路透社中文
        {
            id: 'reuters',
            name: '路透社',
            url: 'https://cn.reuters.com/',
            selector: '.story-content a, .media-story-card__headline a'
        },
        // 巴伦周刊中文版
        {
            id: 'barrons',
            name: '巴伦周刊',
            url: 'https://barrons.cn/',
            selector: '.article-title a, .post-title a'
        }
    ];

    for (const src of sources) {
        if (source !== 'all' && source !== src.id) continue;

        try {
            const response = await axios.get(src.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                },
                timeout: 20000
            });

            const $ = cheerio.load(response.data);

            $(src.selector).each((i, el) => {
                if (results.length >= maxItems) return false;

                const $el = $(el);
                const title = $el.text().trim();
                let href = $el.attr('href');

                if (title && title.length > 10) {
                    if (href && !href.startsWith('http')) {
                        href = src.url + href;
                    }

                    results.push({
                        source: src.id,
                        sourceName: src.name,
                        dimension: 'global',
                        title,
                        content: '',
                        url: href || src.url,
                        publishTime: new Date(),
                        category: '全球视角'
                    });
                }
            });

            console.log(`[全球媒体] ${src.name} 抓取成功`);

        } catch (srcError) {
            console.error(`[全球媒体] ${src.name} 抓取失败:`, srcError.message);
        }
    }

    globalStatus.successCount++;
    console.log(`[全球媒体] 抓取完成: ${results.length} 条`);

    globalStatus.isRunning = false;
    globalStatus.lastFetchTime = new Date();

    return results;
}

/**
 * 获取状态
 */
function getGlobalMediaStatus() {
    return {
        ...globalStatus,
        lastFetchTimeStr: globalStatus.lastFetchTime
            ? globalStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

module.exports = {
    scrapeGlobalMedia,
    getGlobalMediaStatus
};
