/**
 * Scheduler Service - 分布式调度引擎
 * 
 * 使用 node-cron 实现定时任务：
 * 1. 研报生成调度
 * 2. 采集任务调度
 * 3. 预警推送调度
 */

const cron = require('node-cron');
const { generateAllReports } = require('./aiService');
const { runFullScrape, runDimensionScrape, DIMENSIONS, processAndSave } = require('./scraperService');
const { processPendingAlerts } = require('./notificationService');
const { enhancedSearch, getSearchStatus } = require('./searchEngineScraper');
const { scrapeToutiao } = require('./visualScraper');
const { runPolicySentinel } = require('./policySentinel');
const { runAlternativeDataFetch } = require('./alternativeData');
const sourceRegistry = require('../config/sourceRegistry');

// 调度任务存储
const scheduledTasks = new Map();

// 默认调度配置
const DEFAULT_SCHEDULES = {
    // 研报生成：工作日 15:30
    report: {
        cron: '30 15 * * 1-5',
        enabled: true,
        description: '工作日 15:30 生成 AI 研报'
    },
    // 实时采集：每 5 分钟
    scrapeRealtime: {
        cron: '*/5 * * * *',
        enabled: true,
        description: '每 5 分钟采集实时资讯'
    },
    // 深度采集：每 30 分钟
    scrapeDeep: {
        cron: '*/30 * * * *',
        enabled: true,
        description: '每 30 分钟采集深度内容'
    },
    // 预警推送：每 2 分钟
    alerts: {
        cron: '*/2 * * * *',
        enabled: true,
        description: '每 2 分钟处理待推送预警'
    },
    // 数据清理：每天凌晨 3 点
    cleanup: {
        cron: '0 3 * * *',
        enabled: true,
        description: '每天凌晨 3 点清理 30 天前的旧数据'
    },
    // 搜索引擎增强：每 30 分钟
    searchEngine: {
        cron: '*/30 * * * *',
        enabled: true,
        description: '每 30 分钟通过搜索引擎采集增强数据'
    },
    // 视觉采集：每天 4 次（06:00、12:00、18:00、00:00）
    visualScrape: {
        cron: '0 0,6,12,18 * * *',
        enabled: true,
        description: '每天 4 次视觉采集（OCR 识别今日头条）'
    },
    // 政策哨兵：每 2 小时巡检一次
    policySentinel: {
        cron: '0 */2 * * *',
        enabled: true,
        description: '每 2 小时巡检央行、发改委等政府官网'
    },
    // 另类数据：每小时采集一次
    alternativeData: {
        cron: '0 * * * *',
        enabled: true,
        description: '每小时采集汇率、美债收益率、VIX'
    },
    // 腾讯财经：每 2 分钟（稳定兜底源）
    tencentNews: {
        cron: '*/2 * * * *',
        enabled: true,
        description: '每 2 分钟抓取腾讯财经快讯'
    },
    // 格隆汇：每 10 分钟
    gelonghui: {
        cron: '*/10 * * * *',
        enabled: true,
        description: '每 10 分钟抓取格隆汇港美股快讯'
    }
};

// 当前配置 (可被前端修改)
let currentConfig = { ...DEFAULT_SCHEDULES };

/**
 * 解析用户输入的时间点为 cron 表达式
 * @param {string[]} times - 时间点数组，如 ['15:30', '21:00']
 * @param {boolean} workdayOnly - 仅工作日
 */
function timesToCron(times, workdayOnly = true) {
    if (!times || times.length === 0) {
        return null;
    }

    // 多个时间点需要创建多个任务
    return times.map(time => {
        const [hour, minute] = time.split(':').map(Number);
        const dayPart = workdayOnly ? '1-5' : '*';
        return `${minute} ${hour} * * ${dayPart}`;
    });
}

/**
 * 任务执行器：AI 研报生成
 */
async function executeReportTask() {
    console.log('[调度] 开始执行 AI 研报生成任务');
    try {
        const result = await generateAllReports({ triggerType: 'scheduled' });
        console.log(`[调度] 研报生成完成:`, result);
        return result;
    } catch (error) {
        console.error('[调度] 研报生成失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：实时资讯采集
 * 使用3个有正文的源：ths, sec, jin10
 */
async function executeRealtimeScrapeTask() {
    console.log('[调度] 开始采集实时资讯（有正文的源）');
    try {
        const allResults = [];

        // 同花顺
        try {
            const { scrapeTHSNews } = require('./scrapers/ths');
            const thsItems = await scrapeTHSNews({ maxItems: 20 });
            allResults.push(...thsItems);
            console.log(`[实时] 同花顺: ${thsItems.length}条`);
        } catch (e) {
            console.error('[实时] 同花顺失败:', e.message);
        }

        // 金十数据
        try {
            const { scrapeJin10 } = require('./scrapers/jin10');
            const jin10Items = await scrapeJin10({ maxItems: 20 });
            allResults.push(...jin10Items);
            console.log(`[实时] 金十数据: ${jin10Items.length}条`);
        } catch (e) {
            console.error('[实时] 金十数据失败:', e.message);
        }

        // SEC（美股，低频）
        try {
            const { scrapeSECFilings } = require('./scrapers/sec');
            const secItems = await scrapeSECFilings({ maxItems: 10 });
            allResults.push(...secItems);
            console.log(`[实时] SEC: ${secItems.length}条`);
        } catch (e) {
            console.error('[实时] SEC失败:', e.message);
        }

        // 入库
        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks);
            console.log(`[调度] 实时采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库`);
            return saveResult;
        }

        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 实时采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：快讯源采集（只有标题）
 * 使用9个快讯源：aastocks, futu, gelonghui, etnet, yahoo, globalMedia等
 */
async function executeDeepScrapeTask() {
    console.log('[调度] 开始采集快讯源（9个）');
    try {
        const allResults = [];

        // 从sourceRegistry获取快讯源
        const headlineSources = sourceRegistry.headline.sources.general;

        for (const source of headlineSources) {
            // 跳过已在实时采集中处理的源
            if (source.name === 'jin10') continue;

            try {
                const scraperModule = require(`./${source.module}`);
                const fn = scraperModule[source.fn];
                if (fn) {
                    const items = await fn({ maxItems: 15 });
                    allResults.push(...items);
                    console.log(`[快讯] ${source.label}: ${items.length}条`);
                }
            } catch (e) {
                console.error(`[快讯] ${source.label}失败:`, e.message);
            }
        }

        // 入库
        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks);
            console.log(`[调度] 快讯采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库`);
            return saveResult;
        }

        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 快讯采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：快讯类采集（基于源配置）
 * 只抓标题，用于实时预警
 */
async function executeHeadlineScrapeTask() {
    console.log('[调度] 开始快讯类采集（只抓标题）');
    try {
        const headlineConfig = sourceRegistry.headline;
        const allResults = [];

        // 采集通用模式的源
        for (const source of headlineConfig.sources.general) {
            try {
                const scraperModule = require(`./${source.module}`);
                const fn = scraperModule[source.fn];
                if (fn) {
                    const items = await fn({ maxItems: 10 });
                    allResults.push(...items);
                    console.log(`[快讯] ${source.label}: ${items.length}条`);
                }
            } catch (e) {
                console.error(`[快讯] ${source.label}失败:`, e.message);
            }
        }

        // 入库
        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks);
            console.log(`[调度] 快讯采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库`);
            return saveResult;
        }

        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 快讯采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：深度类采集（基于源配置）
 * 抓取正文，用于AI分析
 */
async function executeDeepContentScrapeTask() {
    console.log('[调度] 开始深度类采集（抓取正文）');
    try {
        const deepConfig = sourceRegistry.deep;
        const allResults = [];

        // 只采集已准备好的源（已有正文）
        for (const source of deepConfig.sources.ready) {
            try {
                const scraperModule = require(`./${source.module}`);
                const fn = scraperModule[source.fn];
                if (fn) {
                    const items = await fn({ maxItems: 20 });
                    allResults.push(...items);
                    console.log(`[深度] ${source.label}: ${items.length}条`);
                }
            } catch (e) {
                console.error(`[深度] ${source.label}失败:`, e.message);
            }
        }

        // 入库
        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks);
            console.log(`[调度] 深度采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库`);
            return saveResult;
        }

        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 深度采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：定向采集（针对订阅股票）
 * 使用11个定向源，为每只订阅股票采集专属新闻
 */
async function executeTargetedScrapeTask() {
    console.log('[调度] 开始定向采集（订阅股票）');
    try {
        const collector = require('./stockNewsCollector');
        const { getSubscriptionManager } = require('./subscriptionManager');
        const subManager = getSubscriptionManager();
        const allResults = [];

        // 从subscriptionManager获取订阅股票
        const subscriptions = subManager.getAll();
        if (subscriptions.length === 0) {
            console.log('[定向] 无订阅股票');
            return { total: 0, inserted: 0 };
        }
        console.log(`[定向] 订阅股票: ${subscriptions.length}只`);

        // 11个定向源函数名（第一阶段快讯源）
        const targetedFunctions = [
            'scrapeFutuForStock',
            'scrapeGelonghuiForStock',
            'scrapeAAStocksForStock',
            'scrapeETNetForStock',
            'scrapeYahooForStock',
            'scrapeSinaForStock',
            'scrapeEastmoneyForStock',
            'scrapeTHSForStock',
            'scrapeNBDForStock',
            'scrapeJiemianForStock',
            'scrapeKr36ForStock'
        ];

        // 为每只股票采集
        for (const sub of subscriptions.slice(0, 3)) { // 限制前3只避免超时
            console.log(`[定向] 采集 ${sub.stockCode} ${sub.stockName}...`);

            for (const fnName of targetedFunctions) {
                const fn = collector[fnName];
                if (!fn) continue;

                try {
                    const items = await fn(sub.stockCode, sub.stockName, { maxItems: 3 });
                    if (items && items.length > 0) {
                        allResults.push(...items);
                        console.log(`[定向] ${fnName.replace('scrape', '').replace('ForStock', '')}: ${items.length}条`);
                    }
                } catch (e) {
                    // 静默失败，不打印每个错误
                }
            }
        }

        // 入库（定向采集跳过白名单过滤，因为已针对订阅股票）
        if (allResults.length > 0) {
            const saveResult = await processAndSave(allResults, subscriptions, { skipWhitelist: true });
            console.log(`[调度] 定向采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库`);
            return saveResult;
        }

        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 定向采集失败:', error.message);
        return { error: error.message };
    }
}

// ============================================================
// 五任务系统 - 新增 (2026-01-05)
// 基于代码验证：32个通用源 + 36个定向源
// ============================================================

/**
 * 任务执行器：快速新闻源 (scrapeFastNews)
 * 来源: 8个快讯通用源
 * 白名单: 使用
 * 频率: 每5分钟
 */
async function executeFastNewsTask() {
    console.log('[调度] 开始快速新闻源采集（8个源）');
    const startTime = Date.now();
    try {
        const allResults = [];

        const fastSources = [
            { name: 'aastocks', module: 'scrapers/aastocks', fn: 'scrapeAAStocksNews' },
            { name: 'futu', module: 'scrapers/futu', fn: 'scrapeFutu' },
            { name: 'gelonghui', module: 'scrapers/gelonghui', fn: 'scrapeGelonghui' },
            { name: 'etnet', module: 'scrapers/etnet', fn: 'scrapeETNetNews' },
            { name: 'yahoo', module: 'scrapers/yahoo', fn: 'scrapeYahooNews' },
            { name: 'jin10', module: 'scrapers/jin10', fn: 'scrapeJin10' },
            { name: 'globalMedia', module: 'scrapers/globalMedia', fn: 'scrapeGlobalMedia' },
            { name: 'northbound', module: 'scrapers/northbound', fn: 'scrapeNorthboundFlow' }
        ];

        for (const source of fastSources) {
            try {
                const scraperModule = require(`./${source.module}`);
                const fn = scraperModule[source.fn];
                if (fn) {
                    const items = await fn({ maxItems: 10 });
                    if (items && items.length > 0) {
                        allResults.push(...items);
                        console.log(`[快速] ${source.name}: ${items.length}条`);
                    }
                }
            } catch (e) {
                console.error(`[快速] ${source.name}失败:`, e.message);
            }
        }

        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks, { skipWhitelist: false });
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[调度] 快速源采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库, 耗时${duration}s`);
            return { ...saveResult, total: allResults.length, duration: `${duration}s`, sources: 8 };
        }
        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 快速源采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：通用新闻源 (scrapeGeneralNews)
 * 来源: 24个通用源 (32个scrapers - 8个快速源)
 * 白名单: 使用
 * 频率: 每30分钟
 */
async function executeGeneralNewsTask() {
    console.log('[调度] 开始通用新闻源采集（24个源）');
    const startTime = Date.now();
    try {
        const allResults = [];
        const fastSourceNames = ['aastocks', 'futu', 'gelonghui', 'etnet', 'yahoo', 'jin10', 'globalMedia', 'northbound'];

        const headlineGeneral = (sourceRegistry.headline?.sources?.general || [])
            .filter(s => !fastSourceNames.includes(s.name));
        const deepReady = sourceRegistry.deep?.sources?.ready || [];
        const generalSources = [...headlineGeneral, ...deepReady];
        let successCount = 0;

        for (const source of generalSources) {
            try {
                const scraperModule = require(`./${source.module}`);
                const fn = scraperModule[source.fn];
                if (fn) {
                    const items = await fn({ maxItems: 10 });
                    if (items && items.length > 0) {
                        allResults.push(...items);
                        successCount++;
                        console.log(`[通用] ${source.label || source.name}: ${items.length}条`);
                    }
                }
            } catch (e) { }
        }

        if (allResults.length > 0) {
            const Stock = require('../models/Stock');
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(allResults, stocks, { skipWhitelist: false });
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[调度] 通用源采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库, ${successCount}个源成功, 耗时${duration}s`);
            return { ...saveResult, total: allResults.length, duration: `${duration}s`, sources: successCount };
        }
        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 通用源采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：定向新闻源 (scrapeTargetedNews)
 * 来源: stockNewsCollector中全部36个ForStock函数
 * 白名单: 跳过 (100%入库)
 * 频率: 每15分钟
 * 
 * 优化: 分批并发执行，每5个一批，避免浏览器池超时
 */
async function executeTargetedNewsTask() {
    console.log('[调度] 开始定向新闻源采集（分批并发模式）');
    const startTime = Date.now();
    const BATCH_SIZE = 5; // 每批5个任务（匹配浏览器池大小）

    try {
        const collector = require('./stockNewsCollector');
        const { getSubscriptionManager } = require('./subscriptionManager');
        const subscriptions = getSubscriptionManager().getAll();

        if (subscriptions.length === 0) {
            console.log('[定向新闻] 无订阅股票');
            return { total: 0, inserted: 0 };
        }

        const targetedFunctions = Object.keys(collector)
            .filter(key => key.includes('ForStock') && typeof collector[key] === 'function');

        console.log(`[定向新闻] ${subscriptions.length}只股票, ${targetedFunctions.length}个定向函数, 分批大小=${BATCH_SIZE}`);
        const allResults = [];
        let successCount = 0;

        for (const sub of subscriptions) {
            console.log(`[定向新闻] 采集 ${sub.stockCode} ${sub.stockName}...`);

            // 分批执行
            for (let i = 0; i < targetedFunctions.length; i += BATCH_SIZE) {
                const batch = targetedFunctions.slice(i, i + BATCH_SIZE);

                // 并发执行当前批次
                const batchResults = await Promise.allSettled(
                    batch.map(async fnName => {
                        const fn = collector[fnName];
                        if (!fn) return [];
                        try {
                            const items = await fn(sub.stockCode, sub.stockName, { maxItems: 5 });
                            if (items && items.length > 0) {
                                items.forEach(item => {
                                    item.stockCode = item.stockCode || sub.stockCode;
                                    item.stockName = item.stockName || sub.stockName;
                                });
                                return items;
                            }
                            return [];
                        } catch (e) {
                            return [];
                        }
                    })
                );

                // 收集结果
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value.length > 0) {
                        allResults.push(...result.value);
                        successCount++;
                    }
                }

                // 批次间休息1秒，让浏览器池恢复
                if (i + BATCH_SIZE < targetedFunctions.length) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        if (allResults.length > 0) {
            const saveResult = await processAndSave(allResults, subscriptions, { skipWhitelist: true });
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[调度] 定向新闻采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库, ${successCount}个源成功, 耗时${duration}s`);
            return { ...saveResult, total: allResults.length, stocks: subscriptions.map(s => s.stockCode), sources: targetedFunctions.length, successCount, duration: `${duration}s` };
        }
        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 定向新闻采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：定向财务源 (scrapeTargetedFinance)
 * 来源: sinaFinance(财务数据) + ths(公告) + hkex(公告)
 * 白名单: 跳过
 * 频率: 每天2次 (9点/17点)
 */
async function executeTargetedFinanceTask() {
    console.log('[调度] 开始定向财务源采集（财务+公告）');
    const startTime = Date.now();
    try {
        const { getSubscriptionManager } = require('./subscriptionManager');
        const subscriptions = getSubscriptionManager().getAll();
        if (subscriptions.length === 0) {
            console.log('[定向财务] 无订阅股票');
            return { total: 0, inserted: 0 };
        }

        const allResults = [];

        // 1. 新浪财经财务数据
        try {
            const sinaFinance = require('./scrapers/sinaFinance');
            for (const sub of subscriptions) {
                try {
                    const data = await sinaFinance.scrapeStockFinance(sub.stockCode);
                    if (data && data.success) {
                        allResults.push({
                            source: 'sinaFinance', sourceName: '新浪财经',
                            title: `${sub.stockName}财务数据`, content: JSON.stringify(data),
                            stockCode: sub.stockCode, stockName: sub.stockName, type: 'finance', crawlTime: new Date()
                        });
                        console.log(`[定向财务] 新浪 ${sub.stockCode}: 成功`);
                    }
                } catch (e) { }
            }
        } catch (e) { console.error('[定向财务] 新浪模块加载失败:', e.message); }

        // 2. 同花顺公告
        try {
            const { scrapeTHSAnnouncements } = require('./scrapers/ths');
            for (const sub of subscriptions) {
                try {
                    const items = await scrapeTHSAnnouncements(sub.stockCode, sub.stockName, { maxItems: 5 });
                    if (items && items.length > 0) {
                        allResults.push(...items);
                        console.log(`[定向财务] 同花顺 ${sub.stockCode}: ${items.length}条`);
                    }
                } catch (e) { }
            }
        } catch (e) { console.error('[定向财务] 同花顺模块加载失败:', e.message); }

        // 3. 披露易公告
        try {
            const collector = require('./stockNewsCollector');
            const hkexFn = collector.scrapeHKEXNewsForStock || collector.scrapeHKEXForStock;
            if (hkexFn) {
                for (const sub of subscriptions) {
                    try {
                        const items = await hkexFn(sub.stockCode, sub.stockName, { maxItems: 5 });
                        if (items && items.length > 0) {
                            allResults.push(...items);
                            console.log(`[定向财务] 披露易 ${sub.stockCode}: ${items.length}条`);
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { console.error('[定向财务] 披露易模块加载失败:', e.message); }

        if (allResults.length > 0) {
            const saveResult = await processAndSave(allResults, subscriptions, { skipWhitelist: true });
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[调度] 定向财务采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库, 耗时${duration}s`);
            return { ...saveResult, total: allResults.length, stocks: subscriptions.map(s => s.stockCode), duration: `${duration}s` };
        }
        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 定向财务采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：定向研报源 (scrapeTargetedReports)
 * 来源: eastmoneyReport + yanbaoke + fxbaogao
 * 白名单: 跳过
 * 频率: 每周一次 (周一9点)
 */
async function executeTargetedReportsTask() {
    console.log('[调度] 开始定向研报源采集');
    const startTime = Date.now();
    try {
        const collector = require('./stockNewsCollector');
        const { getSubscriptionManager } = require('./subscriptionManager');
        const subscriptions = getSubscriptionManager().getAll();
        if (subscriptions.length === 0) {
            console.log('[定向研报] 无订阅股票');
            return { total: 0, inserted: 0 };
        }

        const reportFunctions = ['scrapeEastmoneyReportForStock', 'scrapeYanbaokeForStock', 'scrapeFxbaogaoForStock'];
        const allResults = [];

        for (const sub of subscriptions) {
            console.log(`[定向研报] 采集 ${sub.stockCode} ${sub.stockName}...`);
            for (const fnName of reportFunctions) {
                const fn = collector[fnName];
                if (!fn) continue;
                try {
                    const items = await fn(sub.stockCode, sub.stockName, { maxItems: 3 });
                    if (items && items.length > 0) {
                        items.forEach(item => {
                            item.type = 'report';
                            item.stockCode = item.stockCode || sub.stockCode;
                            item.stockName = item.stockName || sub.stockName;
                        });
                        allResults.push(...items);
                        console.log(`[定向研报] ${fnName.replace('scrape', '').replace('ForStock', '')}: ${items.length}条`);
                    }
                } catch (e) { console.error(`[定向研报] ${fnName}失败:`, e.message); }
            }
        }

        if (allResults.length > 0) {
            const saveResult = await processAndSave(allResults, subscriptions, { skipWhitelist: true });
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[调度] 定向研报采集完成: ${allResults.length}条采集, ${saveResult.inserted}条入库, 耗时${duration}s`);
            return { ...saveResult, total: allResults.length, stocks: subscriptions.map(s => s.stockCode), duration: `${duration}s` };
        }
        return { total: 0, inserted: 0 };
    } catch (error) {
        console.error('[调度] 定向研报采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：预警推送
 */
async function executeAlertTask() {
    try {
        const result = await processPendingAlerts();
        if (result.sent > 0 || result.silenced > 0) {
            console.log(`[调度] 预警推送: 发送=${result.sent}, 静默=${result.silenced}`);
        }
        return result;
    } catch (error) {
        console.error('[调度] 预警推送失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：数据清理 (保持硬盘健康)
 */
async function executeCleanupTask() {
    console.log('[调度] 开始执行数据清理任务');
    try {
        const News = require('../models/News');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 只删除非重要新闻 (保留重要预警记录)
        const result = await News.deleteMany({
            crawlTime: { $lt: thirtyDaysAgo },
            isImportant: { $ne: true }
        });

        console.log(`[调度] 数据清理完成: 删除 ${result.deletedCount} 条旧新闻`);
        return { deleted: result.deletedCount };
    } catch (error) {
        console.error('[调度] 数据清理失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：搜索引擎增强采集
 */
async function executeSearchEngineTask() {
    console.log('[调度] 开始执行搜索引擎增强采集');
    try {
        const { getKeywords } = require('../config/filterConfig');
        const { processAndSave } = require('./scraperService');
        const Stock = require('../models/Stock');

        // 获取白名单关键词
        const keywords = getKeywords().slice(0, 5); // 每次只搜前5个，避免过于频繁

        if (keywords.length === 0) {
            console.log('[调度] 白名单为空，跳过搜索引擎采集');
            return { skipped: true };
        }

        // 执行增强搜索
        const results = await enhancedSearch(keywords);

        // 入库
        if (results.length > 0) {
            const stocks = await Stock.find({ isActive: true });
            const saveResult = await processAndSave(results, stocks);
            console.log(`[调度] 搜索引擎采集完成: 新增 ${saveResult.inserted} 条`);
            return saveResult;
        }

        return { inserted: 0, results: results.length };
    } catch (error) {
        console.error('[调度] 搜索引擎采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：视觉采集（OCR）
 */
async function executeVisualScrapeTask() {
    console.log('[调度] 开始执行视觉采集（今日头条 OCR）');
    try {
        const News = require('../models/News');

        // 执行今日头条视觉采集（1核1G机器建议只抓 3 条）
        const results = await scrapeToutiao({ maxItems: 3 });

        // 入库
        if (results.length > 0) {
            for (const item of results) {
                try {
                    await News.findOneAndUpdate(
                        { title: item.title },
                        { $setOnInsert: item },
                        { upsert: true }
                    );
                } catch (e) {
                    // 忽略重复
                }
            }
            console.log(`[调度] 视觉采集完成: 识别 ${results.length} 条新闻`);
        }

        return { count: results.length };
    } catch (error) {
        console.error('[调度] 视觉采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：政策哨兵
 */
async function executePolicySentinelTask() {
    console.log('[调度] 开始执行政策哨兵巡检');
    try {
        const result = await runPolicySentinel();
        console.log(`[调度] 政策哨兵巡检完成: ${result.changedCount || 0} 个变动`);
        return result;
    } catch (error) {
        console.error('[调度] 政策哨兵失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 任务执行器：另类数据采集
 */
async function executeAlternativeDataTask() {
    console.log('[调度] 开始执行另类数据采集');
    try {
        const result = await runAlternativeDataFetch();
        console.log(`[调度] 另类数据采集完成: ${result.successCount || 0} 个指标`);
        return result;
    } catch (error) {
        console.error('[调度] 另类数据采集失败:', error.message);
        return { error: error.message };
    }
}

/**
 * 启动单个调度任务
 */
function startTask(taskId, cronExpr, executor) {
    if (scheduledTasks.has(taskId)) {
        scheduledTasks.get(taskId).stop();
    }

    if (!cron.validate(cronExpr)) {
        console.error(`[调度] 无效的 cron 表达式: ${cronExpr}`);
        return false;
    }

    const task = cron.schedule(cronExpr, executor, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
    });

    scheduledTasks.set(taskId, task);
    console.log(`[调度] 任务已启动: ${taskId} (${cronExpr})`);

    return true;
}

/**
 * 停止单个调度任务
 */
function stopTask(taskId) {
    if (scheduledTasks.has(taskId)) {
        scheduledTasks.get(taskId).stop();
        scheduledTasks.delete(taskId);
        console.log(`[调度] 任务已停止: ${taskId}`);
        return true;
    }
    return false;
}

/**
 * 初始化所有调度任务
 */
function initScheduler() {
    console.log('[调度] 初始化调度引擎...');

    // 研报生成
    if (currentConfig.report.enabled) {
        startTask('report', currentConfig.report.cron, executeReportTask);
    }

    // 实时采集
    if (currentConfig.scrapeRealtime.enabled) {
        startTask('scrapeRealtime', currentConfig.scrapeRealtime.cron, executeRealtimeScrapeTask);
    }

    // 深度采集（快讯源）
    if (currentConfig.scrapeDeep.enabled) {
        startTask('scrapeDeep', currentConfig.scrapeDeep.cron, executeDeepScrapeTask);
    }

    // 定向采集（订阅股票）- 每15分钟 [旧版保留兼容]
    startTask('scrapeTargeted', '*/15 * * * *', executeTargetedScrapeTask);

    // ============================================================
    // 五任务系统 - 新增 (2026-01-05)
    // ============================================================

    // 快速新闻源 - 每5分钟
    startTask('scrapeFastNews', '*/5 * * * *', executeFastNewsTask);

    // 通用新闻源 - 每30分钟
    startTask('scrapeGeneralNews', '*/30 * * * *', executeGeneralNewsTask);

    // 定向新闻源 - 每15分钟
    startTask('scrapeTargetedNews', '*/15 * * * *', executeTargetedNewsTask);

    // 定向财务源 - 每天9点和17点
    startTask('scrapeTargetedFinance', '0 9,17 * * *', executeTargetedFinanceTask);

    // 定向研报源 - 每周一9点
    startTask('scrapeTargetedReports', '0 9 * * 1', executeTargetedReportsTask);

    // 预警推送
    if (currentConfig.alerts.enabled) {
        startTask('alerts', currentConfig.alerts.cron, executeAlertTask);
    }

    // 数据清理
    if (currentConfig.cleanup.enabled) {
        startTask('cleanup', currentConfig.cleanup.cron, executeCleanupTask);
    }

    // 搜索引擎增强
    if (currentConfig.searchEngine.enabled) {
        startTask('searchEngine', currentConfig.searchEngine.cron, executeSearchEngineTask);
    }

    // 视觉采集（OCR）
    if (currentConfig.visualScrape.enabled) {
        startTask('visualScrape', currentConfig.visualScrape.cron, executeVisualScrapeTask);
    }

    // 政策哨兵
    if (currentConfig.policySentinel.enabled) {
        startTask('policySentinel', currentConfig.policySentinel.cron, executePolicySentinelTask);
    }

    // 另类数据
    if (currentConfig.alternativeData.enabled) {
        startTask('alternativeData', currentConfig.alternativeData.cron, executeAlternativeDataTask);
    }

    console.log(`[调度] 已启动 ${scheduledTasks.size} 个调度任务`);
}

/**
 * 停止所有调度任务
 */
function stopAllTasks() {
    scheduledTasks.forEach((task, id) => {
        task.stop();
        console.log(`[调度] 任务已停止: ${id}`);
    });
    scheduledTasks.clear();
}

/**
 * 更新调度配置
 */
function updateConfig(newConfig) {
    // 停止所有任务
    stopAllTasks();

    // 合并配置
    currentConfig = { ...currentConfig, ...newConfig };

    // 重新初始化
    initScheduler();

    return currentConfig;
}

/**
 * 更新研报生成时间
 * @param {string[]} times - 时间点数组，如 ['15:30', '21:00']
 * @param {boolean} workdayOnly - 仅工作日
 */
function updateReportSchedule(times, workdayOnly = true) {
    // 停止现有研报任务
    stopTask('report');

    if (!times || times.length === 0) {
        currentConfig.report.enabled = false;
        return { success: true, message: '研报调度已禁用' };
    }

    // 为每个时间点创建任务
    times.forEach((time, index) => {
        const [hour, minute] = time.split(':').map(Number);
        const dayPart = workdayOnly ? '1-5' : '*';
        const cronExpr = `${minute} ${hour} * * ${dayPart}`;

        const taskId = times.length === 1 ? 'report' : `report_${index}`;
        startTask(taskId, cronExpr, executeReportTask);
    });

    currentConfig.report.enabled = true;
    currentConfig.report.times = times;
    currentConfig.report.workdayOnly = workdayOnly;

    return {
        success: true,
        message: `研报调度已更新: ${times.join(', ')}`,
        config: currentConfig.report
    };
}

/**
 * 获取当前配置
 */
function getConfig() {
    return {
        ...currentConfig,
        activeTasks: Array.from(scheduledTasks.keys())
    };
}

/**
 * 获取任务状态
 */
function getTaskStatus() {
    const status = {};
    scheduledTasks.forEach((task, id) => {
        status[id] = {
            running: true,
            config: currentConfig[id]
        };
    });
    return status;
}

/**
 * 手动触发任务
 */
async function triggerTask(taskId) {
    switch (taskId) {
        case 'report':
            return executeReportTask();
        case 'scrapeRealtime':
            return executeRealtimeScrapeTask();
        case 'scrapeDeep':
            return executeDeepScrapeTask();
        case 'scrapeTargeted':
            return executeTargetedScrapeTask();
        case 'scrapeFull':
            return runFullScrape();
        case 'alerts':
            return executeAlertTask();
        case 'cleanup':
            return executeCleanupTask();
        case 'searchEngine':
            return executeSearchEngineTask();
        case 'visualScrape':
            return executeVisualScrapeTask();
        case 'policySentinel':
            return executePolicySentinelTask();
        case 'alternativeData':
            return executeAlternativeDataTask();
        // 五任务系统 - 新增 (2026-01-05)
        case 'scrapeFastNews':
            return executeFastNewsTask();
        case 'scrapeGeneralNews':
            return executeGeneralNewsTask();
        case 'scrapeTargetedNews':
            return executeTargetedNewsTask();
        case 'scrapeTargetedFinance':
            return executeTargetedFinanceTask();
        case 'scrapeTargetedReports':
            return executeTargetedReportsTask();
        default:
            return { error: '未知任务' };
    }
}

module.exports = {
    // 初始化
    initScheduler,
    stopAllTasks,

    // 任务管理
    startTask,
    stopTask,
    triggerTask,

    // 配置
    getConfig,
    updateConfig,
    updateReportSchedule,
    getTaskStatus,

    // 工具
    timesToCron,

    // 常量
    DEFAULT_SCHEDULES,

    // 五任务系统执行器 - 新增 (2026-01-05)
    executeFastNewsTask,
    executeGeneralNewsTask,
    executeTargetedNewsTask,
    executeTargetedFinanceTask,
    executeTargetedReportsTask
};
