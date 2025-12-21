/**
 * 微信搜一搜抓取器
 * 
 * 监控券商研究所公众号
 * 如：中金策略、天风研究、广发证券研究等
 */

const path = require('path');
const fs = require('fs');

// 抓取状态
const wechatSearchStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0
};

// 默认关注的券商公众号
const DEFAULT_ACCOUNTS = [
    '中金策略',
    '天风研究',
    '广发证券研究',
    '国泰君安证券研究',
    '招商证券研究',
    '兴业研究',
    '中信建投证券研究',
    '海通研究',
    '申万宏源研究'
];

/**
 * 通过搜狗微信搜索公众号文章
 */
async function scrapeWechatSearch(options = {}) {
    const { keyword = '', account = '', maxItems = 10 } = options;

    console.log('[微信搜一搜] 开始采集...');
    wechatSearchStatus.isRunning = true;
    wechatSearchStatus.totalFetches++;

    const results = [];

    let browser = null;

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const { createStealthPage, humanScroll, randomDelay } = require('../utils/humanBehavior');

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await createStealthPage(browser);

        // 搜狗微信搜索
        const searchQuery = account || keyword;
        const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(searchQuery)}`;

        console.log(`[微信搜一搜] 访问: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 4000);

        // 检测验证码
        const hasCaptcha = await page.evaluate(() => {
            return document.body.innerText.includes('请输入验证码') ||
                document.querySelector('#seccodeImage') !== null;
        });

        if (hasCaptcha) {
            console.log('[微信搜一搜] 检测到验证码，跳过本次采集');
            wechatSearchStatus.failCount++;
            return results;
        }

        // 滚动加载
        await humanScroll(page);

        // 提取文章列表
        const articles = await page.evaluate(() => {
            const items = [];

            document.querySelectorAll('.news-box .news-list li, .txt-box').forEach(el => {
                const titleEl = el.querySelector('h3 a, .tit a');
                const title = titleEl?.innerText?.trim() || '';
                const url = titleEl?.href || '';

                const accountEl = el.querySelector('.account, .s-p a');
                const account = accountEl?.innerText?.trim() || '';

                const summaryEl = el.querySelector('.txt-info, p.txt-info');
                const summary = summaryEl?.innerText?.trim() || '';

                const dateEl = el.querySelector('.s2, .s-p');
                const date = dateEl?.innerText?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';

                if (title && title.length > 5) {
                    items.push({ title, url, account, summary, date });
                }
            });

            return items;
        });

        // 处理结果
        for (const article of articles.slice(0, maxItems)) {
            // 尝试从公众号名称识别券商
            const broker = extractBroker(article.account);

            results.push({
                source: 'wechat',
                sourceName: '微信公众号',
                title: article.title,
                url: article.url,
                summary: article.summary,
                broker: broker,
                analyst: '', // 公众号文章通常不标注分析师
                publishDate: article.date ? new Date(article.date) : new Date(),
                reportType: detectReportType(article.title),
                originalAccount: article.account
            });
        }

        wechatSearchStatus.successCount++;
        console.log(`[微信搜一搜] 采集完成: ${results.length} 篇文章`);

    } catch (error) {
        wechatSearchStatus.failCount++;
        console.error('[微信搜一搜] 采集失败:', error.message);
    } finally {
        if (browser) await browser.close();
        wechatSearchStatus.isRunning = false;
        wechatSearchStatus.lastFetchTime = new Date();
    }

    return results;
}

/**
 * 批量监控多个券商公众号
 */
async function monitorBrokerAccounts(accounts = DEFAULT_ACCOUNTS, maxItemsPerAccount = 3) {
    console.log(`[微信搜一搜] 批量监控 ${accounts.length} 个公众号`);

    const allResults = [];

    for (const account of accounts) {
        try {
            const results = await scrapeWechatSearch({ account, maxItems: maxItemsPerAccount });
            allResults.push(...results);

            // 每个账号间隔
            const { randomDelay } = require('../utils/humanBehavior');
            await randomDelay(5000, 10000);
        } catch (error) {
            console.error(`[微信搜一搜] ${account} 采集失败:`, error.message);
        }
    }

    console.log(`[微信搜一搜] 批量监控完成: 共 ${allResults.length} 篇文章`);
    return allResults;
}

/**
 * 从公众号名称提取券商
 */
function extractBroker(accountName) {
    const brokerPatterns = [
        { pattern: /中金/, broker: '中金公司' },
        { pattern: /天风/, broker: '天风证券' },
        { pattern: /广发/, broker: '广发证券' },
        { pattern: /国泰君安/, broker: '国泰君安' },
        { pattern: /招商/, broker: '招商证券' },
        { pattern: /兴业/, broker: '兴业证券' },
        { pattern: /中信建投/, broker: '中信建投' },
        { pattern: /中信证券/, broker: '中信证券' },
        { pattern: /海通/, broker: '海通证券' },
        { pattern: /申万|申银万国/, broker: '申万宏源' },
        { pattern: /华泰/, broker: '华泰证券' },
        { pattern: /东方证券/, broker: '东方证券' },
        { pattern: /国盛/, broker: '国盛证券' },
        { pattern: /浙商/, broker: '浙商证券' },
        { pattern: /光大/, broker: '光大证券' }
    ];

    for (const { pattern, broker } of brokerPatterns) {
        if (pattern.test(accountName)) {
            return broker;
        }
    }

    return accountName;
}

/**
 * 检测研报类型
 */
function detectReportType(title) {
    if (/深度|深入|详解/.test(title)) return '深度';
    if (/点评|快评|简评/.test(title)) return '点评';
    if (/晨会|晨报/.test(title)) return '晨会纪要';
    if (/电话|会议纪要|调研/.test(title)) return '电话会议';
    if (/行业|产业/.test(title)) return '行业';
    if (/宏观|策略|配置/.test(title)) return '策略';
    return '其他';
}

/**
 * 获取状态
 */
function getWechatSearchStatus() {
    return {
        ...wechatSearchStatus,
        lastFetchTimeStr: wechatSearchStatus.lastFetchTime
            ? wechatSearchStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行',
        defaultAccounts: DEFAULT_ACCOUNTS
    };
}

module.exports = {
    scrapeWechatSearch,
    monitorBrokerAccounts,
    getWechatSearchStatus,
    DEFAULT_ACCOUNTS
};
