/**
 * URL Builder - 7大维度动态 URL 拼接
 * 
 * 维度说明：
 * 1. 官方信披: 巨潮资讯、披露易、互动易/e互动
 * 2. 深度搜索: 雪球、慧博、富途社区
 * 3. 实时资讯: 财联社、华尔街见闻、新浪财经
 * 4. 社交情绪: 东财股吧、同花顺热榜
 * 5. 合规风险: 企查查/天眼查新闻舆情
 * 6. 全球影响: 英为财情 Investing
 */

/**
 * 维度枚举
 */
const DIMENSIONS = {
    OFFICIAL: 'official',        // 官方信披
    DEEP_SEARCH: 'deep_search',  // 深度搜索
    REALTIME: 'realtime',        // 实时资讯
    SOCIAL: 'social',            // 社交情绪
    COMPLIANCE: 'compliance',    // 合规风险
    GLOBAL: 'global',            // 全球影响
    POLICY: 'policy',            // 政策哨兵
    VERTICAL: 'vertical',        // 行业垂直
    ALTERNATIVE: 'alternative',  // 另类数据
    VISUAL: 'visual'             // 视觉采集
};

/**
 * 数据源枚举
 */
const SOURCES = {
    // 官方信披
    CNINFO: 'cninfo',          // 巨潮资讯
    HKEXNEWS: 'hkexnews',      // 披露易
    SSE_E: 'sse_e',            // 上交所 e互动
    SZSE_E: 'szse_e',          // 深交所互动易

    // 深度搜索
    XUEQIU: 'xueqiu',          // 雪球
    HIBOR: 'hibor',            // 慧博
    FUTU: 'futu',              // 富途

    // 实时资讯
    CLS: 'cls',                // 财联社
    WALLSTREET: 'wallstreet',  // 华尔街见闻
    SINA: 'sina',              // 新浪财经

    // 社交情绪
    EASTMONEY_GUBA: 'guba',    // 东财股吧
    THS_HOT: 'ths_hot',        // 同花顺热榜

    // 合规风险
    QICHACHA: 'qichacha',      // 企查查
    TIANYANCHA: 'tianyancha',  // 天眼查

    // 全球影响
    INVESTING: 'investing',    // 英为财情

    // 政策哨兵 (新增)
    PBC: 'pbc',                // 中国人民银行
    NDRC: 'ndrc',              // 国家发改委
    CSRC: 'csrc',              // 证监会
    MOF: 'mof',                // 财政部
    SCIO: 'scio',              // 国务院新闻办

    // 行业垂直 (新增)
    KECHUANG: 'kechuang',      // 科创板日报
    ZHITONG: 'zhitong',        // 智通财经
    MYSTEEL: 'mysteel',        // 我的钢铁网
    SCI99: 'sci99',            // 卓创资讯

    // 社交视觉 (新增)
    TOUTIAO: 'toutiao',        // 今日头条
    WECHAT: 'wechat',          // 微信公众号
    XIAOHONGSHU: 'xhs',        // 小红书

    // 另类数据 (新增)
    USD_CNH: 'usd_cnh',        // 离岸人民币汇率
    US_10Y: 'us_10y',          // 美国10年期国债
    VIX: 'vix'                 // VIX 恐慌指数
};

/**
 * URL 构建器配置
 */
const URL_CONFIGS = {
    // ==================== 官方信披 ====================

    // 巨潮资讯 - A股公告搜索
    [SOURCES.CNINFO]: {
        dimension: DIMENSIONS.OFFICIAL,
        name: '巨潮资讯',
        baseUrl: 'http://www.cninfo.com.cn/new/fulltextSearch/full',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                searchkey: keyword,
                sdate: options.startDate || '',
                edate: options.endDate || '',
                isfulltext: 'false',
                sortName: 'pubdate',
                sortType: 'desc',
                pageNum: options.page || 1,
                pageSize: options.pageSize || 20
            });
            return `http://www.cninfo.com.cn/new/fulltextSearch/full?${params}`;
        },
        // API 请求方式
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    },

    // 披露易 - 港股公告
    [SOURCES.HKEXNEWS]: {
        dimension: DIMENSIONS.OFFICIAL,
        name: '披露易',
        baseUrl: 'https://www1.hkexnews.hk/search/titlesearch.xhtml',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                lang: 'ZH',
                searchType: 'title',
                t: keyword,
                fromDate: options.startDate || '',
                toDate: options.endDate || '',
                category: '0',
                sortDir: 'desc',
                sortByDate: 'true'
            });
            return `https://www1.hkexnews.hk/search/titlesearch.xhtml?${params}`;
        }
    },

    // 上交所 e互动
    [SOURCES.SSE_E]: {
        dimension: DIMENSIONS.OFFICIAL,
        name: '上交所e互动',
        baseUrl: 'http://sns.sseinfo.com/ajax/feeds.do',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                type: 11,
                keyword: keyword,
                pageSize: options.pageSize || 20,
                page: options.page || 1
            });
            return `http://sns.sseinfo.com/ajax/feeds.do?${params}`;
        }
    },

    // 深交所互动易
    [SOURCES.SZSE_E]: {
        dimension: DIMENSIONS.OFFICIAL,
        name: '深交所互动易',
        baseUrl: 'http://irm.cninfo.com.cn/szse/api/search',
        buildUrl: (keyword, options = {}) => {
            return {
                url: 'http://irm.cninfo.com.cn/szse/api/search',
                body: {
                    keyword: keyword,
                    pageIndex: options.page || 0,
                    pageSize: options.pageSize || 20
                }
            };
        },
        method: 'POST'
    },

    // ==================== 深度搜索 ====================

    // 雪球 - 搜索帖子
    [SOURCES.XUEQIU]: {
        dimension: DIMENSIONS.DEEP_SEARCH,
        name: '雪球',
        baseUrl: 'https://xueqiu.com/query/v1/search/status.json',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                q: keyword,
                sort: 'time',
                page: options.page || 1,
                count: options.pageSize || 20
            });
            return `https://xueqiu.com/query/v1/search/status.json?${params}`;
        },
        headers: {
            'Cookie': 'xq_a_token=required',  // 需要登录 cookie
            'User-Agent': 'Mozilla/5.0'
        }
    },

    // 慧博 - 研报搜索
    [SOURCES.HIBOR]: {
        dimension: DIMENSIONS.DEEP_SEARCH,
        name: '慧博研报',
        baseUrl: 'https://www.hibor.com.cn/search',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                keyword: keyword,
                sortby: 'time',
                page: options.page || 1
            });
            return `https://www.hibor.com.cn/search?${params}`;
        }
    },

    // 富途 - 社区搜索
    [SOURCES.FUTU]: {
        dimension: DIMENSIONS.DEEP_SEARCH,
        name: '富途社区',
        baseUrl: 'https://www.futunn.com/search',
        buildUrl: (keyword, options = {}) => {
            return `https://www.futunn.com/search?q=${encodeURIComponent(keyword)}&type=post`;
        }
    },

    // ==================== 实时资讯 ====================

    // 财联社 - 快讯
    [SOURCES.CLS]: {
        dimension: DIMENSIONS.REALTIME,
        name: '财联社',
        baseUrl: 'https://www.cls.cn/api/telegram',
        buildUrl: (keyword, options = {}) => {
            // 快讯流 API
            const params = new URLSearchParams({
                app: 'CailianpressWeb',
                os: 'web',
                sv: '7.7.5',
                rn: options.pageSize || 30,
                last_time: options.lastTime || ''
            });
            return `https://www.cls.cn/api/telegram?${params}`;
        },
        // 搜索 API
        buildSearchUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                keyword: keyword,
                type: 'telegram',
                page: options.page || 1
            });
            return `https://www.cls.cn/api/search?${params}`;
        }
    },

    // 华尔街见闻 - 快讯
    [SOURCES.WALLSTREET]: {
        dimension: DIMENSIONS.REALTIME,
        name: '华尔街见闻',
        baseUrl: 'https://api-one.wallstcn.com/apiv1/content/lives',
        buildUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                channel: 'global-channel',
                client: 'pc',
                limit: options.pageSize || 30,
                cursor: options.cursor || ''
            });
            return `https://api-one.wallstcn.com/apiv1/content/lives?${params}`;
        },
        buildSearchUrl: (keyword, options = {}) => {
            const params = new URLSearchParams({
                query: keyword,
                type: 'live',
                limit: options.pageSize || 20
            });
            return `https://api-one.wallstcn.com/apiv1/search/article?${params}`;
        }
    },

    // 新浪财经 - 实时快讯
    [SOURCES.SINA]: {
        dimension: DIMENSIONS.REALTIME,
        name: '新浪财经',
        baseUrl: 'https://finance.sina.com.cn/7x24',
        buildUrl: (keyword, options = {}) => {
            // 7x24 快讯流
            const params = new URLSearchParams({
                page: options.page || 1,
                num: options.pageSize || 20
            });
            return `https://zhibo.sina.com.cn/api/zhibo/feed?${params}&zhibo_id=152`;
        },
        buildSearchUrl: (keyword, options = {}) => {
            return `https://search.sina.com.cn/?q=${encodeURIComponent(keyword)}&c=news&sort=time`;
        }
    },

    // ==================== 社交情绪 ====================

    // 东方财富股吧
    [SOURCES.EASTMONEY_GUBA]: {
        dimension: DIMENSIONS.SOCIAL,
        name: '东财股吧',
        baseUrl: 'http://guba.eastmoney.com',
        buildUrl: (stockCode, options = {}) => {
            // 个股股吧帖子列表
            return `http://guba.eastmoney.com/list,${stockCode}.html`;
        },
        // API 方式
        buildApiUrl: (stockCode, options = {}) => {
            const params = new URLSearchParams({
                ps: options.pageSize || 30,
                p: options.page || 1,
                code: stockCode
            });
            return `http://guba.eastmoney.com/interface/GetData.aspx?${params}&path=postlist`;
        }
    },

    // 同花顺热榜
    [SOURCES.THS_HOT]: {
        dimension: DIMENSIONS.SOCIAL,
        name: '同花顺热榜',
        baseUrl: 'https://www.10jqka.com.cn',
        buildUrl: (keyword, options = {}) => {
            return `https://search.10jqka.com.cn/search?keyword=${encodeURIComponent(keyword)}`;
        }
    },

    // ==================== 合规风险 ====================

    // 企查查 - 新闻舆情
    [SOURCES.QICHACHA]: {
        dimension: DIMENSIONS.COMPLIANCE,
        name: '企查查',
        baseUrl: 'https://www.qcc.com',
        buildUrl: (companyName, options = {}) => {
            return `https://www.qcc.com/web/search?key=${encodeURIComponent(companyName)}`;
        },
        // 新闻舆情 API (需要登录)
        buildNewsUrl: (companyName) => {
            return `https://www.qcc.com/api/news?key=${encodeURIComponent(companyName)}`;
        }
    },

    // 天眼查 - 新闻舆情
    [SOURCES.TIANYANCHA]: {
        dimension: DIMENSIONS.COMPLIANCE,
        name: '天眼查',
        baseUrl: 'https://www.tianyancha.com',
        buildUrl: (companyName, options = {}) => {
            return `https://www.tianyancha.com/search?key=${encodeURIComponent(companyName)}`;
        }
    },

    // ==================== 全球影响 ====================

    // 英为财情 Investing
    [SOURCES.INVESTING]: {
        dimension: DIMENSIONS.GLOBAL,
        name: '英为财情',
        baseUrl: 'https://cn.investing.com',
        buildUrl: (keyword, options = {}) => {
            return `https://cn.investing.com/search/?q=${encodeURIComponent(keyword)}&tab=news`;
        },
        // ADR 新闻
        buildAdrUrl: (symbol) => {
            return `https://cn.investing.com/equities/${symbol.toLowerCase()}-news`;
        }
    }
};

/**
 * 构建采集 URL
 * @param {string} source - 数据源标识
 * @param {string} keyword - 关键词
 * @param {object} options - 可选参数 {page, pageSize, startDate, endDate, ...}
 * @returns {string|object} URL 或包含 method/body 的对象
 */
function buildUrl(source, keyword, options = {}) {
    const config = URL_CONFIGS[source];
    if (!config) {
        throw new Error(`未知数据源: ${source}`);
    }

    return config.buildUrl(keyword, options);
}

/**
 * 构建搜索 URL (如果数据源支持)
 * @param {string} source - 数据源标识
 * @param {string} keyword - 搜索关键词
 * @param {object} options - 可选参数
 * @returns {string} 搜索 URL
 */
function buildSearchUrl(source, keyword, options = {}) {
    const config = URL_CONFIGS[source];
    if (!config) {
        throw new Error(`未知数据源: ${source}`);
    }

    if (config.buildSearchUrl) {
        return config.buildSearchUrl(keyword, options);
    }

    return config.buildUrl(keyword, options);
}

/**
 * 获取数据源配置
 * @param {string} source - 数据源标识
 * @returns {object} 配置对象
 */
function getSourceConfig(source) {
    return URL_CONFIGS[source] || null;
}

/**
 * 获取指定维度的所有数据源
 * @param {string} dimension - 维度标识
 * @returns {string[]} 数据源标识数组
 */
function getSourcesByDimension(dimension) {
    return Object.entries(URL_CONFIGS)
        .filter(([_, config]) => config.dimension === dimension)
        .map(([source, _]) => source);
}

/**
 * 为股票构建所有维度的 URL
 * @param {object} stock - 股票对象 {code, name, market, matrix}
 * @returns {Array<{source, dimension, url, keyword}>}
 */
function buildAllUrlsForStock(stock) {
    const urls = [];
    const { code, name, matrix } = stock;

    // 核心层关键词 - 用于所有维度
    const directKeywords = matrix?.direct || [code, name];

    // 关联层关键词 - 用于深度搜索和实时资讯
    const relatedKeywords = matrix?.related || [];

    // 遍历所有数据源
    Object.entries(URL_CONFIGS).forEach(([source, config]) => {
        const keywords = config.dimension === DIMENSIONS.SOCIAL
            ? [code]  // 股吧只用代码
            : directKeywords;

        keywords.forEach(keyword => {
            try {
                const urlResult = config.buildUrl(keyword, {});
                urls.push({
                    source,
                    dimension: config.dimension,
                    sourceName: config.name,
                    url: typeof urlResult === 'string' ? urlResult : urlResult.url,
                    method: config.method || 'GET',
                    headers: config.headers,
                    keyword,
                    layer: 'direct'
                });
            } catch (e) {
                // 忽略构建失败
            }
        });

        // 关联层关键词 (仅部分维度)
        if ([DIMENSIONS.DEEP_SEARCH, DIMENSIONS.REALTIME].includes(config.dimension)) {
            relatedKeywords.forEach(keyword => {
                try {
                    const urlResult = config.buildUrl(keyword, {});
                    urls.push({
                        source,
                        dimension: config.dimension,
                        sourceName: config.name,
                        url: typeof urlResult === 'string' ? urlResult : urlResult.url,
                        method: config.method || 'GET',
                        headers: config.headers,
                        keyword,
                        layer: 'related'
                    });
                } catch (e) {
                    // 忽略
                }
            });
        }
    });

    return urls;
}

/**
 * 获取所有数据源信息
 * @returns {Array<{source, name, dimension}>}
 */
function getAllSources() {
    return Object.entries(URL_CONFIGS).map(([source, config]) => ({
        source,
        name: config.name,
        dimension: config.dimension,
        hasSearch: !!config.buildSearchUrl
    }));
}

module.exports = {
    DIMENSIONS,
    SOURCES,
    URL_CONFIGS,
    buildUrl,
    buildSearchUrl,
    getSourceConfig,
    getSourcesByDimension,
    buildAllUrlsForStock,
    getAllSources
};
