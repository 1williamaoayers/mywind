/**
 * Scraper Service - 7大维度全网采集引擎
 * 
 * 优化特性：
 * 1. User-Agent 随机切换
 * 2. 敏感源智能延时 (2-5秒)
 * 3. 核心层关键词过滤 (过滤无关噪音)
 * 4. MD5 去重 (title + date + source)
 */

const axios = require('axios');
const iconv = require('iconv-lite');
const News = require('../models/News');
const Stock = require('../models/Stock');
const { SOURCES, DIMENSIONS, buildUrl, getSourceConfig } = require('../utils/urlBuilder');
const { generateHashId, safeBatchInsert } = require('../utils/hashUtils');
const {
    getRandomUserAgent,
    getHeaders,
    smartDelay,
    isSensitiveSource,
    getRandomDelay,
    sleep
} = require('../utils/browserUtils');

// 预警关键词配置
const ALERT_KEYWORDS = {
    // 红色预警 (danger): 核心层 + 负面关键词
    danger: ['立案', '调查', '退市', '闪崩', '跌停', '暴跌', '违规', '处罚', '警示', 'ST', '暂停上市', '破产', '清算'],

    // 绿色预警 (success): 核心层 + 正面关键词
    success: ['重组', '并购', '中标', '涨停', '回购', '增持', '战略合作', '业绩预增', '超预期', '突破'],

    // 蓝色提醒 (primary): 关联层 + 中性关键词
    primary: ['减持', '异动', '说明会', '业绩会', '股东大会', '解禁', '增发', '配股']
};

/**
 * HTTP 请求封装 (带 UA 随机切换)
 */
async function fetchData(url, options = {}) {
    const config = {
        url,
        method: options.method || 'GET',
        headers: {
            ...getHeaders(),  // 随机 UA
            ...options.headers
        },
        timeout: options.timeout || 15000,
        responseType: options.responseType || 'text'
    };

    if (options.body) {
        config.data = options.body;
    }

    // 敏感源延时
    if (options.source && isSensitiveSource(options.source)) {
        await smartDelay(options.source);
    }

    try {
        const response = await axios(config);

        // 处理 GBK 编码
        if (options.encoding === 'gbk') {
            return iconv.decode(Buffer.from(response.data), 'gbk');
        }

        return response.data;
    } catch (error) {
        console.error(`请求失败 [${url}]:`, error.message);
        return null;
    }
}

/**
 * 检测预警类型
 */
function detectAlertType(title, content, matchedLayer) {
    const text = `${title} ${content}`.toLowerCase();

    if (matchedLayer === 'direct') {
        for (const keyword of ALERT_KEYWORDS.danger) {
            if (text.includes(keyword.toLowerCase())) {
                return { isImportant: true, alertType: 'danger' };
            }
        }
        for (const keyword of ALERT_KEYWORDS.success) {
            if (text.includes(keyword.toLowerCase())) {
                return { isImportant: true, alertType: 'success' };
            }
        }
    }

    if (matchedLayer === 'related') {
        for (const keyword of ALERT_KEYWORDS.primary) {
            if (text.includes(keyword.toLowerCase())) {
                return { isImportant: true, alertType: 'primary' };
            }
        }
    }

    return { isImportant: false, alertType: null };
}

/**
 * 匹配关键词与股票
 */
function matchKeywords(title, content, stocks) {
    const text = `${title} ${content}`;
    const matchedKeywords = [];
    const matchedStockIds = [];
    let matchedLayer = null;

    for (const stock of stocks) {
        const { matrix, _id } = stock;
        let stockMatched = false;

        for (const keyword of (matrix?.direct || [])) {
            if (keyword && text.includes(keyword)) {
                matchedKeywords.push(keyword);
                if (!matchedLayer || matchedLayer !== 'direct') {
                    matchedLayer = 'direct';
                }
                stockMatched = true;
            }
        }

        if (!stockMatched) {
            for (const keyword of (matrix?.related || [])) {
                if (keyword && text.includes(keyword)) {
                    matchedKeywords.push(keyword);
                    if (!matchedLayer) {
                        matchedLayer = 'related';
                    }
                    stockMatched = true;
                }
            }
        }

        if (!stockMatched) {
            for (const keyword of (matrix?.context || [])) {
                if (keyword && text.includes(keyword)) {
                    matchedKeywords.push(keyword);
                    if (!matchedLayer) {
                        matchedLayer = 'context';
                    }
                    stockMatched = true;
                }
            }
        }

        if (stockMatched) {
            matchedStockIds.push(_id);
        }
    }

    return {
        matchedKeywords: [...new Set(matchedKeywords)],
        matchedLayer,
        matchedStocks: matchedStockIds
    };
}

/**
 * 核心层关键词过滤 (过滤标题不包含核心关键词的结果)
 * @param {Array} items - 采集结果
 * @param {string[]} directKeywords - 核心层关键词
 * @param {boolean} strict - 严格模式 (标题必须包含关键词)
 */
function filterByDirectKeywords(items, directKeywords, strict = true) {
    if (!strict || !directKeywords || directKeywords.length === 0) {
        return items;
    }

    return items.filter(item => {
        const title = (item.title || '').toLowerCase();
        return directKeywords.some(keyword =>
            title.includes(keyword.toLowerCase())
        );
    });
}

// ==================== 各数据源解析器 ====================

/**
 * 财联社解析器 (带关键词过滤)
 */
async function parseCLS(keyword, options = {}) {
    const config = getSourceConfig(SOURCES.CLS);
    const url = config.buildSearchUrl ? config.buildSearchUrl(keyword, options) : buildUrl(SOURCES.CLS, keyword, options);

    const data = await fetchData(url, {
        headers: config.headers,
        source: SOURCES.CLS
    });
    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.data?.data || json.data || [];

        let results = items.map(item => ({
            source: SOURCES.CLS,
            sourceName: '财联社',
            dimension: DIMENSIONS.REALTIME,
            title: item.title || item.content?.substring(0, 50) || '',
            content: item.content || item.brief || '',
            url: item.shareurl || `https://www.cls.cn/detail/${item.id}`,
            publishTime: item.ctime ? new Date(item.ctime * 1000) : new Date()
        }));

        // 核心层关键词过滤
        if (options.directKeywords) {
            results = filterByDirectKeywords(results, options.directKeywords);
        }

        return results;
    } catch (e) {
        console.error('财联社解析失败:', e.message);
        return [];
    }
}

/**
 * 华尔街见闻解析器
 */
async function parseWallStreet(keyword, options = {}) {
    const config = getSourceConfig(SOURCES.WALLSTREET);
    const url = buildUrl(SOURCES.WALLSTREET, keyword, options);

    const data = await fetchData(url, { source: SOURCES.WALLSTREET });
    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.data?.items || [];

        return items.map(item => ({
            source: SOURCES.WALLSTREET,
            sourceName: '华尔街见闻',
            dimension: DIMENSIONS.REALTIME,
            title: item.title || item.content_text?.substring(0, 50) || '',
            content: item.content_text || item.content || '',
            url: item.uri || `https://wallstreetcn.com/live/${item.id}`,
            publishTime: item.display_time ? new Date(item.display_time * 1000) : new Date()
        }));
    } catch (e) {
        console.error('华尔街见闻解析失败:', e.message);
        return [];
    }
}

/**
 * 新浪财经解析器 (带关键词过滤)
 */
async function parseSina(keyword, options = {}) {
    const config = getSourceConfig(SOURCES.SINA);
    const url = buildUrl(SOURCES.SINA, keyword, options);

    const data = await fetchData(url, { source: SOURCES.SINA });
    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.result?.data?.feed?.list || [];

        let results = items.map(item => ({
            source: SOURCES.SINA,
            sourceName: '新浪财经',
            dimension: DIMENSIONS.REALTIME,
            title: item.rich_text || item.text?.substring(0, 50) || '',
            content: item.text || '',
            url: `https://finance.sina.com.cn/7x24/${item.id}`,
            publishTime: item.create_time ? new Date(item.create_time) : new Date()
        }));

        // 核心层关键词过滤
        if (options.directKeywords) {
            results = filterByDirectKeywords(results, options.directKeywords);
        }

        return results;
    } catch (e) {
        console.error('新浪财经解析失败:', e.message);
        return [];
    }
}

/**
 * 雪球解析器 (带延时保护)
 */
async function parseXueqiu(keyword, options = {}) {
    const config = getSourceConfig(SOURCES.XUEQIU);
    const url = buildUrl(SOURCES.XUEQIU, keyword, options);

    // 雪球敏感源，先延时
    await smartDelay(SOURCES.XUEQIU);

    const headers = {
        ...getHeaders(),
        'Cookie': process.env.XUEQIU_COOKIE || ''
    };

    const data = await fetchData(url, { headers, source: SOURCES.XUEQIU });
    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.list || [];

        return items.map(item => ({
            source: SOURCES.XUEQIU,
            sourceName: '雪球',
            dimension: DIMENSIONS.DEEP_SEARCH,
            title: item.title || item.text?.substring(0, 50) || '',
            content: item.text || item.description || '',
            url: `https://xueqiu.com${item.target}`,
            publishTime: item.created_at ? new Date(item.created_at) : new Date()
        }));
    } catch (e) {
        console.error('雪球解析失败:', e.message);
        return [];
    }
}

/**
 * 东财股吧解析器 (带延时保护)
 */
async function parseGuba(stockCode, options = {}) {
    const config = getSourceConfig(SOURCES.EASTMONEY_GUBA);
    const url = config.buildApiUrl(stockCode, options);

    // 东财敏感源，先延时
    await smartDelay(SOURCES.EASTMONEY_GUBA);

    const data = await fetchData(url, {
        encoding: 'gbk',
        source: SOURCES.EASTMONEY_GUBA
    });
    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.data || [];

        return items.map(item => ({
            source: SOURCES.EASTMONEY_GUBA,
            sourceName: '东财股吧',
            dimension: DIMENSIONS.SOCIAL,
            title: item.post_title || '',
            content: item.post_content || '',
            url: `http://guba.eastmoney.com/news,${stockCode},${item.post_id}.html`,
            publishTime: item.post_publish_time ? new Date(item.post_publish_time) : new Date()
        }));
    } catch (e) {
        console.error('东财股吧解析失败:', e.message);
        return [];
    }
}

/**
 * 巨潮资讯解析器
 */
async function parseCninfo(keyword, options = {}) {
    const config = getSourceConfig(SOURCES.CNINFO);

    const data = await fetchData(config.baseUrl, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            ...config.headers
        },
        body: `searchkey=${encodeURIComponent(keyword)}&sdate=&edate=&isfulltext=false&sortName=pubdate&sortType=desc&pageNum=${options.page || 1}&pageSize=${options.pageSize || 20}`,
        source: SOURCES.CNINFO
    });

    if (!data) return [];

    try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = json.announcements || [];

        return items.map(item => ({
            source: SOURCES.CNINFO,
            sourceName: '巨潮资讯',
            dimension: DIMENSIONS.OFFICIAL,
            title: item.announcementTitle || '',
            content: item.announcementContent || '',
            url: `http://www.cninfo.com.cn/new/disclosure/detail?stockCode=${item.secCode}&announcementId=${item.announcementId}`,
            publishTime: item.announcementTime ? new Date(item.announcementTime) : new Date()
        }));
    } catch (e) {
        console.error('巨潮资讯解析失败:', e.message);
        return [];
    }
}

/**
 * 披露易解析器 (港股)
 */
async function parseHkexnews(keyword, options = {}) {
    const url = buildUrl(SOURCES.HKEXNEWS, keyword, options);

    const data = await fetchData(url, { source: SOURCES.HKEXNEWS });
    if (!data) return [];

    try {
        const results = [];
        const regex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = regex.exec(data)) !== null) {
            if (match[1].includes('pdf') || match[1].includes('doc')) {
                results.push({
                    source: SOURCES.HKEXNEWS,
                    sourceName: '披露易',
                    dimension: DIMENSIONS.OFFICIAL,
                    title: match[2].trim(),
                    content: '',
                    url: match[1].startsWith('http') ? match[1] : `https://www1.hkexnews.hk${match[1]}`,
                    publishTime: new Date()
                });
            }
        }

        return results;
    } catch (e) {
        console.error('披露易解析失败:', e.message);
        return [];
    }
}

/**
 * 英为财情解析器
 */
async function parseInvesting(keyword, options = {}) {
    const url = buildUrl(SOURCES.INVESTING, keyword, options);

    const data = await fetchData(url, { source: SOURCES.INVESTING });
    if (!data) return [];

    try {
        const results = [];
        const regex = /<article[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/article>/gi;
        let match;

        while ((match = regex.exec(data)) !== null) {
            results.push({
                source: SOURCES.INVESTING,
                sourceName: '英为财情',
                dimension: DIMENSIONS.GLOBAL,
                title: match[2].trim(),
                content: '',
                url: match[1].startsWith('http') ? match[1] : `https://cn.investing.com${match[1]}`,
                publishTime: new Date()
            });
        }

        return results.slice(0, 20);
    } catch (e) {
        console.error('英为财情解析失败:', e.message);
        return [];
    }
}

// ==================== 主采集逻辑 ====================

/**
 * 按维度采集 (带关键词过滤)
 */
async function scrapeByDimension(dimension, keyword, options = {}) {
    const results = [];

    switch (dimension) {
        case DIMENSIONS.REALTIME:
            results.push(...await parseCLS(keyword, options));
            results.push(...await parseWallStreet(keyword, options));
            results.push(...await parseSina(keyword, options));
            break;

        case DIMENSIONS.DEEP_SEARCH:
            results.push(...await parseXueqiu(keyword, options));
            break;

        case DIMENSIONS.OFFICIAL:
            results.push(...await parseCninfo(keyword, options));
            results.push(...await parseHkexnews(keyword, options));
            break;

        case DIMENSIONS.SOCIAL:
            results.push(...await parseGuba(keyword, options));
            break;

        case DIMENSIONS.GLOBAL:
            results.push(...await parseInvesting(keyword, options));
            break;
    }

    return results;
}

/**
 * 按数据源采集
 */
async function scrapeBySource(source, keyword, options = {}) {
    switch (source) {
        case SOURCES.CLS:
            return parseCLS(keyword, options);
        case SOURCES.WALLSTREET:
            return parseWallStreet(keyword, options);
        case SOURCES.SINA:
            return parseSina(keyword, options);
        case SOURCES.XUEQIU:
            return parseXueqiu(keyword, options);
        case SOURCES.EASTMONEY_GUBA:
            return parseGuba(keyword, options);
        case SOURCES.CNINFO:
            return parseCninfo(keyword, options);
        case SOURCES.HKEXNEWS:
            return parseHkexnews(keyword, options);
        case SOURCES.INVESTING:
            return parseInvesting(keyword, options);
        default:
            return [];
    }
}

/**
 * 为单个股票执行全维度采集
 */
async function scrapeForStock(stock) {
    const { code, name, matrix } = stock;
    const allResults = [];

    const directKeywords = matrix?.direct || [code, name];

    console.log(`[采集] 开始采集股票: ${code} ${name}`);

    for (const dimension of Object.values(DIMENSIONS)) {
        for (const keyword of directKeywords) {
            try {
                // 传递核心层关键词用于过滤
                const results = await scrapeByDimension(dimension, keyword, {
                    directKeywords
                });
                allResults.push(...results);

                // 智能延时
                const delay = isSensitiveSource(dimension)
                    ? getRandomDelay(2, 4)
                    : getRandomDelay(0.5, 1.5);
                await sleep(delay);
            } catch (e) {
                console.error(`[采集] ${dimension}/${keyword} 失败:`, e.message);
            }
        }
    }

    console.log(`[采集] ${code} 采集完成，共 ${allResults.length} 条`);

    return allResults;
}

/**
 * 处理并保存采集结果
 */
async function processAndSave(rawItems, stocks) {
    if (!rawItems || rawItems.length === 0) {
        return { inserted: 0, duplicates: 0 };
    }

    const processedItems = rawItems.map(item => {
        // 确保有发布时间，无则使用当天
        const publishTime = item.publishTime || new Date();

        // 生成 hashId (title + date + source)
        const hashId = generateHashId(item.source, item.title, publishTime);

        const { matchedKeywords, matchedLayer, matchedStocks } = matchKeywords(
            item.title,
            item.content,
            stocks
        );

        const { isImportant, alertType } = detectAlertType(
            item.title,
            item.content,
            matchedLayer
        );

        return {
            ...item,
            publishTime,
            hashId,
            matchedKeywords,
            matchedLayer,
            matchedStocks,
            isImportant,
            alertType
        };
    });

    const result = await safeBatchInsert(News, processedItems);

    console.log(`[保存] 插入 ${result.inserted} 条，去重 ${result.duplicates} 条`);

    return result;
}

/**
 * 执行完整采集任务
 */
async function runFullScrape() {
    console.log('[采集] 开始全量采集任务');

    const stocks = await Stock.find({ isActive: true });

    if (stocks.length === 0) {
        console.log('[采集] 没有激活的股票，跳过');
        return { total: 0, inserted: 0, duplicates: 0 };
    }

    let totalInserted = 0;
    let totalDuplicates = 0;

    for (const stock of stocks) {
        try {
            const rawItems = await scrapeForStock(stock);
            const result = await processAndSave(rawItems, stocks);

            totalInserted += result.inserted;
            totalDuplicates += result.duplicates;

            // 股票间延时 (2-4秒)
            await sleep(getRandomDelay(2, 4));
        } catch (e) {
            console.error(`[采集] ${stock.code} 任务失败:`, e.message);
        }
    }

    console.log(`[采集] 全量采集完成: 插入 ${totalInserted}, 去重 ${totalDuplicates}`);

    return {
        total: totalInserted + totalDuplicates,
        inserted: totalInserted,
        duplicates: totalDuplicates
    };
}

/**
 * 按维度执行采集
 */
async function runDimensionScrape(dimension) {
    const stocks = await Stock.find({ isActive: true });

    if (stocks.length === 0) {
        return { total: 0, inserted: 0, duplicates: 0 };
    }

    let totalInserted = 0;
    let totalDuplicates = 0;

    for (const stock of stocks) {
        const directKeywords = stock.matrix?.direct || [stock.code, stock.name];

        for (const keyword of directKeywords) {
            try {
                const rawItems = await scrapeByDimension(dimension, keyword, {
                    directKeywords
                });
                const result = await processAndSave(rawItems, stocks);

                totalInserted += result.inserted;
                totalDuplicates += result.duplicates;

                await sleep(getRandomDelay(1, 2));
            } catch (e) {
                console.error(`[采集] ${dimension}/${keyword} 失败:`, e.message);
            }
        }
    }

    return {
        total: totalInserted + totalDuplicates,
        inserted: totalInserted,
        duplicates: totalDuplicates
    };
}

module.exports = {
    // 核心采集
    scrapeBySource,
    scrapeByDimension,
    scrapeForStock,
    processAndSave,

    // 任务调度
    runFullScrape,
    runDimensionScrape,

    // 工具
    matchKeywords,
    detectAlertType,
    filterByDirectKeywords,

    // 常量
    ALERT_KEYWORDS,
    DIMENSIONS,
    SOURCES
};
