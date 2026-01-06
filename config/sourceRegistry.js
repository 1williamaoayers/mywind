/**
 * 源注册表 - 68个采集源的分类配置
 * 
 * 分类依据：基于项目目的（智能投研终端、预警、AI研报、向量搜索）
 * 
 * 分类标准：
 * - headline: 快讯类，只需标题
 * - deep: 深度类，需要正文
 * - restricted: 受限类，暂不可用
 * - abandoned: 放弃类，不建议使用
 */

module.exports = {
    // ==================== 快讯类（22个）====================
    // 只需要标题，用于实时预警和关键词匹配
    headline: {
        schedule: '*/5 * * * *',  // 每5分钟
        needsContent: false,
        sources: {
            // 通用采集模式
            general: [
                { name: 'aastocks', module: 'scrapers/aastocks', fn: 'scrapeAAStocksNews', label: 'AAStocks' },
                { name: 'futu', module: 'scrapers/futu', fn: 'scrapeFutu', label: '富途' },
                { name: 'gelonghui', module: 'scrapers/gelonghui', fn: 'scrapeGelonghui', label: '格隆汇' },
                { name: 'etnet', module: 'scrapers/etnet', fn: 'scrapeETNetNews', label: '经济通' },
                { name: 'yahoo', module: 'scrapers/yahoo', fn: 'scrapeYahooNews', label: '雅虎财经' },
                { name: 'jin10', module: 'scrapers/jin10', fn: 'scrapeJin10', label: '金十数据' },
                { name: 'globalMedia', module: 'scrapers/globalMedia', fn: 'scrapeGlobalMedia', label: '全球媒体' },
                { name: 'northbound', module: 'scrapers/northbound', fn: 'scrapeNorthboundFlow', label: '港股通' },
            ],
            // 定向采集模式
            targeted: [
                { name: 'cls', fn: 'scrapeCLSForStock', label: '财联社' },
                { name: 'wallstreet', fn: 'scrapeWallstreetForStock', label: '华尔街见闻' },
                { name: 'sina', fn: 'scrapeSinaForStock', label: '新浪' },
                { name: 'futu_targeted', fn: 'scrapeFutuForStock', label: '富途定向' },
                { name: 'gelonghui_targeted', fn: 'scrapeGelonghuiForStock', label: '格隆汇定向' },
                { name: 'jin10_targeted', fn: 'scrapeJin10ForStock', label: '金十定向' },
                { name: 'globalMedia_targeted', fn: 'scrapeGlobalMediaForStock', label: '全球媒体定向' },
                { name: 'northbound_targeted', fn: 'scrapeNorthboundForStock', label: '港股通定向' },
                { name: 'yahoo_targeted', fn: 'scrapeYahooForStock', label: '雅虎定向' },
                { name: 'aastocks_targeted', fn: 'scrapeAAStocksForStock', label: 'AAStocks定向' },
                { name: 'etnet_targeted', fn: 'scrapeETNetForStock', label: '经济通定向' },
            ]
        }
    },

    // ==================== 深度类（30个）====================
    // 需要正文，用于AI分析、研报生成、向量搜索
    deep: {
        schedule: '*/30 * * * *', // 每30分钟
        needsContent: true,
        sources: {
            // 已有正文的（优先使用）
            ready: [
                { name: 'ths', module: 'scrapers/ths', fn: 'scrapeTHSNews', label: '同花顺', hasContent: true },
                { name: 'sec', module: 'scrapers/sec', fn: 'scrapeSECFilings', label: 'SEC EDGAR', hasContent: true },
                { name: 'sinaFinance', module: 'scrapers/sinaFinance', fn: 'scrapeStockFinance', label: '新浪财务', hasContent: true, type: 'financial' },
            ],
            // 需要增加正文抓取的
            needsFix: [
                { name: 'hkex', module: 'scrapers/hkex', fn: 'scrapeHKEX', label: '披露易', priority: 'P0' },
                { name: 'cninfo', fn: 'scrapeCninfoForStock', label: '巨潮资讯', priority: 'P0' },
                { name: 'hkexnews', fn: 'scrapeHKEXNewsForStock', label: '披露易新闻', priority: 'P0' },
                { name: 'eastmoney_report', fn: 'scrapeEastmoneyReportForStock', label: '东财研报', priority: 'P1' },
                { name: 'yanbaoke', module: 'scrapers/yanbaoke', fn: 'scrapeYanbaoke', label: '研报客', priority: 'P1' },
                { name: 'fxbaogao', module: 'scrapers/fxbaogao', fn: 'scrapeFxbaogao', label: '发现报告', priority: 'P1' },
                { name: 'hket', module: 'scrapers/hket', fn: 'scrapeHKET', label: '香港经济日报', priority: 'P2' },
                { name: 'hkej', module: 'scrapers/hkej', fn: 'scrapeHKEJ', label: '信报', priority: 'P2' },
                { name: 'nbd', module: 'scrapers/nbd', fn: 'scrapeNBD', label: '每日经济新闻', priority: 'P2' },
                { name: 'jiemian', module: 'scrapers/jiemian', fn: 'scrapeJiemian', label: '界面新闻', priority: 'P2' },
                { name: 'kr36', module: 'scrapers/kr36', fn: 'scrapeKr36', label: '36氪', priority: 'P2' },
                { name: 'stcn', module: 'scrapers/stcn', fn: 'scrapeSTCN', label: '证券时报', priority: 'P2' },
                { name: 'yicai', module: 'scrapers/yicai', fn: 'scrapeYicai', label: '第一财经', priority: 'P2' },
                { name: 'jimei', module: 'scrapers/jimei', fn: 'scrapeJimei', label: '集微网', priority: 'P2' },
                { name: 'interactive', module: 'scrapers/interactive', fn: 'scrapeInteractive', label: '互动易', priority: 'P2' },
                { name: 'stats', module: 'scrapers/stats', fn: 'scrapeStats', label: '国家统计局', priority: 'P2' },
                { name: 'eastmoney', fn: 'scrapeEastmoneyForStock', label: '东方财富', priority: 'P2' },
                { name: 'xueqiu', fn: 'scrapeXueqiuForStock', label: '雪球', priority: 'P2' },
            ],
            // 定向采集需正文
            targeted: [
                { name: 'ths_targeted', fn: 'scrapeTHSForStock', label: '同花顺定向' },
                { name: 'hkex_targeted', fn: 'scrapeHKEXForStock', label: '披露易定向' },
                { name: 'yanbaoke_targeted', fn: 'scrapeYanbaokeForStock', label: '研报客定向' },
                { name: 'jiemian_targeted', fn: 'scrapeJiemianForStock', label: '界面定向' },
                { name: 'kr36_targeted', fn: 'scrapeKr36ForStock', label: '36氪定向' },
                { name: 'yicai_targeted', fn: 'scrapeYicaiForStock', label: '第一财经定向' },
                { name: 'nbd_targeted', fn: 'scrapeNBDForStock', label: '每经定向' },
                { name: 'stcn_targeted', fn: 'scrapeSTCNForStock', label: '证券时报定向' },
                { name: 'hket_targeted', fn: 'scrapeHKETForStock', label: '香港经济日报定向' },
                { name: 'hkej_targeted', fn: 'scrapeHKEJForStock', label: '信报定向' },
                { name: 'jimei_targeted', fn: 'scrapeJimeiForStock', label: '集微网定向' },
                { name: 'fxbaogao_targeted', fn: 'scrapeFxbaogaoForStock', label: '发现报告定向' },
            ]
        }
    },

    // ==================== 公告类（特殊处理）====================
    // PDF公告，需要OCR提取完整内容
    announcement: {
        schedule: '0 9,17 * * *', // 每天9点和17点
        needsContent: true,
        requiresOCR: true,
        sources: [
            { name: 'hkex_pdf', fn: 'scrapeHKEXForStock', label: '港交所公告PDF' },
            { name: 'cninfo_pdf', fn: 'scrapeCninfoForStock', label: '巨潮公告PDF' },
        ]
    },

    // ==================== 受限类（12个）====================
    // 暂不可用：需要登录、被封、技术问题
    restricted: {
        enabled: false,
        reason: '需要登录或被反爬阻断',
        sources: [
            { name: 'zhitong', label: '智通财经', reason: '被WAF阻断' },
            { name: 'weibo', label: '微博', reason: '需要登录' },
            { name: 'zhihu', label: '知乎', reason: '需要登录' },
            { name: 'tencent', label: '腾讯财经', reason: '需要登录' },
            { name: 'seekingalpha', label: 'Seeking Alpha', reason: '需要付费订阅' },
            { name: 'wechatSearch', label: '微信搜一搜', reason: '反爬严格' },
            // 定向版本
            { name: 'zhitong_targeted', label: '智通财经定向', reason: '被WAF阻断' },
            { name: 'weibo_targeted', label: '微博定向', reason: '需要登录' },
            { name: 'zhihu_targeted', label: '知乎定向', reason: '需要登录' },
            { name: 'tencent_targeted', label: '腾讯财经定向', reason: '需要登录' },
            { name: 'seekingalpha_targeted', label: 'Seeking Alpha定向', reason: '需要付费' },
        ]
    },

    // ==================== 放弃类（4个）====================
    // 不建议使用：噪音太多、价值低
    abandoned: {
        enabled: false,
        reason: '噪音太多或价值低',
        sources: [
            { name: 'taoguba', label: '淘股吧', reason: '用户帖子噪音多' },
            { name: 'guba', label: '东财股吧', reason: '用户帖子噪音多' },
            { name: 'taoguba_targeted', label: '淘股吧定向', reason: '噪音多' },
            { name: 'guba_targeted', label: '股吧定向', reason: '噪音多' },
        ]
    }
};

// ==================== 辅助函数 ====================

/**
 * 获取所有启用的源
 */
function getEnabledSources() {
    const registry = module.exports;
    const enabled = [];

    // 快讯类
    enabled.push(...registry.headline.sources.general);
    enabled.push(...registry.headline.sources.targeted);

    // 深度类
    enabled.push(...registry.deep.sources.ready);
    enabled.push(...registry.deep.sources.needsFix.filter(s => s.priority === 'P0'));

    return enabled;
}

/**
 * 获取指定分类的源
 */
function getSourcesByCategory(category) {
    return module.exports[category] || null;
}

/**
 * 获取已准备好的深度源（已有正文）
 */
function getReadyDeepSources() {
    return module.exports.deep.sources.ready;
}

module.exports.getEnabledSources = getEnabledSources;
module.exports.getSourcesByCategory = getSourcesByCategory;
module.exports.getReadyDeepSources = getReadyDeepSources;
