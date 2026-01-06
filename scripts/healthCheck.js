/**
 * 爬虫健康监控脚本
 * 
 * 功能：
 * 1. 定期检查所有爬虫状态
 * 2. 记录历史数据
 * 3. 生成健康报告
 * 
 * 用法：node scripts/healthCheck.js
 */

const fs = require('fs');
const path = require('path');

// 爬虫配置
const SCRAPERS = [
    { name: 'AAStocks', file: 'aastocks', func: 'scrapeAAStocksNews' },
    { name: '东财研报', file: 'eastmoneyReport', func: 'scrapeEastmoneyReports' },
    { name: '经济通', file: 'etnet', func: 'scrapeETNetNews' },
    { name: '富途', file: 'futu', func: 'scrapeFutu' },
    { name: '发现报告', file: 'fxbaogao', func: 'scrapeFxbaogao' },
    { name: '格隆汇', file: 'gelonghui', func: 'scrapeGelonghui' },
    { name: '全球媒体', file: 'globalMedia', func: 'scrapeGlobalMedia' },
    { name: '信报财经', file: 'hkej', func: 'scrapeHKEJNews' },
    { name: '香港经济日报', file: 'hket', func: 'scrapeHKETNews' },
    { name: '港交所', file: 'hkex', func: 'scrapeHKEXNews' },
    { name: '互动易', file: 'interactive', func: 'scrapeSSEInteractive' },
    { name: '界面新闻', file: 'jiemian', func: 'scrapeJiemian' },
    { name: '集微网', file: 'jimei', func: 'scrapeJimei' },
    { name: '金十数据', file: 'jin10', func: 'scrapeJin10' },
    { name: '36氪', file: 'kr36', func: 'scrape36Kr' },
    { name: '每日经济新闻', file: 'nbd', func: 'scrapeNBDNews' },
    { name: '港股通', file: 'northbound', func: 'scrapeNorthboundFlow' },
    { name: 'SEC', file: 'sec', func: 'scrapeSECFilings' },
    { name: 'SeekingAlpha', file: 'seekingalpha', func: 'scrapeSeekingAlpha' },
    { name: '国家统计局', file: 'stats', func: 'scrapeNationalStats' },
    { name: '证券时报', file: 'stcn', func: 'scrapeSTCN' },
    { name: '淘股吧', file: 'taoguba', func: 'scrapeTaoguba' },
    { name: '腾讯财经', file: 'tencent', func: 'scrapeTencentNews' },
    { name: '同花顺', file: 'ths', func: 'scrapeTHSNews' },
    { name: '微信搜索', file: 'wechatSearch', func: 'scrapeWechatSearch' },
    { name: '微博', file: 'weibo', func: 'scrapeWeiboHot' },
    { name: 'Yahoo Finance', file: 'yahoo', func: 'scrapeYahooNews' },
    { name: '研报客', file: 'yanbaoke', func: 'scrapeYanbaoke' },
    { name: '第一财经', file: 'yicai', func: 'scrapeYicaiNews' },
    { name: '知乎', file: 'zhihu', func: 'scrapeZhihuFinance' },
    { name: '智通财经', file: 'zhitong', func: 'scrapeZhitongNews' },
];

const HISTORY_FILE = path.join(__dirname, '../data/health-history.json');
const REPORT_FILE = path.join(__dirname, '../data/health-report.json');

// 告警管理器
const alertManager = require('../utils/alertManager');

/**
 * 测试单个爬虫
 */
async function testScraper(config, timeout = 60000) {
    const startTime = Date.now();

    try {
        const module = require(`../services/scrapers/${config.file}`);
        const func = module[config.func];

        if (!func) {
            return { success: false, error: 'Function not found', duration: 0 };
        }

        // 设置超时
        const result = await Promise.race([
            func({ maxItems: 3 }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);

        const duration = Date.now() - startTime;
        const itemCount = Array.isArray(result) ? result.length : (result ? 1 : 0);

        return {
            success: itemCount > 0,
            itemCount,
            duration,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            itemCount: 0,
            duration: Date.now() - startTime,
            error: error.message
        };
    }
}

/**
 * 运行健康检查
 */
async function runHealthCheck(options = {}) {
    const { parallel = 3, timeout = 60000 } = options;

    console.log('=== 开始健康检查 ===');
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`爬虫数: ${SCRAPERS.length}`);
    console.log('');

    const results = [];

    // 分批测试
    for (let i = 0; i < SCRAPERS.length; i += parallel) {
        const batch = SCRAPERS.slice(i, i + parallel);
        const batchResults = await Promise.all(
            batch.map(async (config) => {
                console.log(`[${config.name}] 测试中...`);
                const result = await testScraper(config, timeout);
                const status = result.success ? '✅' : '❌';
                console.log(`[${config.name}] ${status} ${result.itemCount}条 ${result.duration}ms`);
                return { ...config, ...result };
            })
        );
        results.push(...batchResults);

        // 清理浏览器
        try {
            const puppeteer = require('../utils/puppeteerBase');
            await puppeteer.closeBrowser();
        } catch (e) { }
    }

    // 统计结果
    const summary = {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        successRate: (results.filter(r => r.success).length / results.length * 100).toFixed(1) + '%'
    };

    // 生成报告
    const report = {
        checkTime: new Date().toISOString(),
        summary,
        details: results.map(r => ({
            name: r.name,
            success: r.success,
            itemCount: r.itemCount,
            duration: r.duration,
            error: r.error
        }))
    };

    // 保存报告
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    // 保存历史
    saveHistory(report);

    // 触发告警
    await checkAlerts(report);

    // 打印总结
    console.log('');
    console.log('=== 健康检查完成 ===');
    console.log(`成功: ${summary.success}/${summary.total} (${summary.successRate})`);
    console.log(`报告: ${REPORT_FILE}`);

    return report;
}

/**
 * 保存历史记录
 */
function saveHistory(report) {
    let history = [];

    if (fs.existsSync(HISTORY_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (e) { }
    }

    // 只保留最近30条记录
    history.push({
        time: report.checkTime,
        successRate: report.summary.successRate,
        success: report.summary.success,
        total: report.summary.total
    });

    if (history.length > 30) {
        history = history.slice(-30);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * 检查告警
 */
async function checkAlerts(report) {
    const failedScrapers = report.details.filter(d => !d.success);

    // 规则1: 成功率低于50%
    if (report.summary.success < report.summary.total * 0.5) {
        await alertManager.alert({
            level: 'critical',
            title: '爬虫成功率过低',
            message: `当前成功率: ${report.summary.successRate}`,
            scrapers: failedScrapers.map(s => s.name)
        });
    }

    // 规则2: 失败数超过5个
    if (failedScrapers.length > 5) {
        await alertManager.alert({
            level: 'warning',
            title: '多个爬虫失败',
            message: `${failedScrapers.length}个爬虫失败`,
            scrapers: failedScrapers.map(s => s.name)
        });
    }
}

/**
 * 快速检查（只测试关键爬虫）
 */
async function quickCheck() {
    const keyScrapers = SCRAPERS.filter(s =>
        ['金十数据', '同花顺', '第一财经', '富途', '港股通'].includes(s.name)
    );

    console.log('=== 快速健康检查 ===');

    for (const config of keyScrapers) {
        const result = await testScraper(config, 30000);
        const status = result.success ? '✅' : '❌';
        console.log(`[${config.name}] ${status}`);
    }

    try {
        const puppeteer = require('../utils/puppeteerBase');
        await puppeteer.closeBrowser();
    } catch (e) { }
}

// 命令行入口
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--quick')) {
        quickCheck().then(() => process.exit(0));
    } else {
        runHealthCheck().then(() => process.exit(0));
    }
}

module.exports = {
    runHealthCheck,
    quickCheck,
    testScraper,
    SCRAPERS
};
