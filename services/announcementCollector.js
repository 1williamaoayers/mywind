/**
 * 公告采集服务
 * 
 * 功能：
 * 1. 从同花顺采集业绩公告PDF
 * 2. 自动翻页采集所有公告
 * 3. 智能重试机制
 * 4. 动态等待时间
 */

const puppeteer = require('../utils/puppeteerBase');
const fs = require('fs');
const path = require('path');
const Announcement = require('../models/Announcement');

// 配置
const CONFIG = {
    // PDF存储目录
    pdfDir: process.env.PDF_DIR || '/anti/mywind/data/announcements',
    // 等待时间配置
    waitTime: {
        '年报': 25000,
        '年度报告': 25000,
        '中期': 18000,
        '季度': 12000,
        'default': 12000
    },
    // 最大重试次数
    maxRetries: 3,
    // 最大翻页数
    maxPages: 10
};

/**
 * 获取等待时间（根据公告类型）
 */
function getWaitTime(title) {
    for (const [key, time] of Object.entries(CONFIG.waitTime)) {
        if (key !== 'default' && title.includes(key)) {
            return time;
        }
    }
    return CONFIG.waitTime.default;
}

/**
 * 验证PDF有效性
 */
function validatePdf(buffer) {
    if (!buffer || buffer.length < 10240) return false;  // 至少10KB
    return buffer.slice(0, 5).toString() === '%PDF-';
}

/**
 * 解析公告类型
 */
function parseAnnouncementType(title) {
    if (title.includes('年度报告') || title.includes('年報')) return '年报';
    if (title.includes('中期')) return '中期报告';
    if (title.includes('季度')) return '季报';
    if (title.includes('股息')) return '股息公告';
    if (title.includes('业绩') || title.includes('業績')) return '业绩公告';
    return '其他';
}

/**
 * 解析年份和季度
 */
function parseYearQuarter(title) {
    // 匹配年份
    const yearMatch = title.match(/(20\d{2})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    // 匹配季度
    let quarter = null;
    if (title.includes('第一季度') || title.includes('Q1') || title.includes('3月')) {
        quarter = 'Q1';
    } else if (title.includes('第二季度') || title.includes('中期') || title.includes('6月')) {
        quarter = 'Q2';
    } else if (title.includes('第三季度') || title.includes('Q3') || title.includes('9月')) {
        quarter = 'Q3';
    } else if (title.includes('第四季度') || title.includes('12月') || title.includes('全年')) {
        quarter = 'Q4';
    }

    return { year, quarter };
}

/**
 * 下载单个PDF（带重试）
 */
async function downloadPdf(page, url, filePath, title) {
    const waitTime = getWaitTime(title);

    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            // 宽松等待策略
            try {
                await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            } catch (e) {
                // 超时继续
            }

            await new Promise(r => setTimeout(r, waitTime));

            // 在页面上下文中用fetch获取PDF
            const data = await page.evaluate(async () => {
                const r = await fetch(location.href, { credentials: 'include' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return Array.from(new Uint8Array(await r.arrayBuffer()));
            });

            const buffer = Buffer.from(data);

            if (validatePdf(buffer)) {
                // 确保目录存在
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(filePath, buffer);
                return { success: true, size: buffer.length };
            }

            throw new Error('无效PDF');

        } catch (e) {
            console.log(`    尝试${attempt}/${CONFIG.maxRetries}: ${e.message.substring(0, 30)}`);
            if (attempt < CONFIG.maxRetries) {
                await new Promise(r => setTimeout(r, attempt * 5000));
            }
        }
    }

    return { success: false, error: '重试次数用尽' };
}

/**
 * 采集单只股票的公告
 */
async function collectAnnouncements(stockCode, stockName, options = {}) {
    const { years = [2024, 2025], source = 'ths' } = options;

    // 同花顺代码格式
    const thsCode = stockCode.startsWith('0') ? `HK${stockCode}` : `HK${stockCode}`;
    const listUrl = `https://stockpage.10jqka.com.cn/${thsCode}/news/`;

    // 输出目录
    const outputDir = path.join(CONFIG.pdfDir, stockCode);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`[公告采集] 开始采集 ${stockCode} ${stockName}`);

    const page = await puppeteer.createPage({ timeout: 120000, blockResources: false });
    const results = { collected: 0, downloaded: 0, failed: 0, skipped: 0 };

    try {
        // 访问公告列表页面
        console.log(`[公告采集] 访问 ${listUrl}`);
        await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { });
        await new Promise(r => setTimeout(r, 10000)); // 等待动态内容加载

        // 直接在主页面提取公告链接（不需要找iframe）
        // 使用经验文档中验证成功的方法
        console.log('[公告采集] 提取公告链接...');

        const allLinks = await page.evaluate((years) => {
            const links = [];
            // 查找所有包含PDF链接的元素
            document.querySelectorAll('a').forEach(a => {
                const text = a.textContent?.trim() || '';
                const href = a.href || '';

                // 过滤条件：包含年份 + 是公告类型
                const hasYear = years.some(y => text.includes(y.toString()));
                const isAnnouncement = text.includes('季度') || text.includes('年度') ||
                    text.includes('业绩') || text.includes('中期') ||
                    text.includes('業績') || text.includes('年報') ||
                    text.includes('股息') || text.includes('报告');

                if (hasYear && isAnnouncement && href) {
                    links.push({ title: text, href: href });
                }
            });
            return links;
        }, years);

        // 如果主页面没找到，尝试在所有frame中查找
        if (allLinks.length === 0) {
            console.log('[公告采集] 主页面未找到公告，尝试frame...');
            const frames = page.frames();
            for (const frame of frames) {
                try {
                    const frameLinks = await frame.evaluate((years) => {
                        const links = [];
                        document.querySelectorAll('a').forEach(a => {
                            const text = a.textContent?.trim() || '';
                            const href = a.href || '';
                            const hasYear = years.some(y => text.includes(y.toString()));
                            const isAnnouncement = text.includes('季度') || text.includes('年度') ||
                                text.includes('业绩') || text.includes('中期') ||
                                text.includes('業績') || text.includes('年報');
                            if (hasYear && isAnnouncement && href) {
                                links.push({ title: text, href: href });
                            }
                        });
                        return links;
                    }, years);
                    if (frameLinks.length > 0) {
                        allLinks.push(...frameLinks);
                        console.log(`[公告采集] 在frame中找到 ${frameLinks.length} 条`);
                        break;
                    }
                } catch (e) { }
            }
        }

        // 去重
        const uniqueLinks = [...new Map(allLinks.map(a => [a.title, a])).values()];
        console.log(`[公告采集] 共找到 ${uniqueLinks.length} 条公告`);
        results.collected = uniqueLinks.length;

        if (uniqueLinks.length === 0) {
            console.log('[公告采集] 未找到符合条件的公告');
            return results;
        }

        // 下载PDF
        for (const link of uniqueLinks) {
            const { year, quarter } = parseYearQuarter(link.title);
            const type = parseAnnouncementType(link.title);

            // 检查是否已存在
            const existing = await Announcement.findOne({
                stockCode,
                title: link.title
            });

            if (existing && existing.status === 'downloaded') {
                console.log(`  跳过: ${link.title.substring(0, 30)}...`);
                results.skipped++;
                continue;
            }

            // 生成文件名
            const fileName = link.title
                .replace(/[\\/:*?"<>|\s]/g, '_')
                .substring(0, 60) + '.pdf';
            const filePath = path.join(outputDir, fileName);

            console.log(`  下载: ${link.title.substring(0, 30)}...`);

            // 下载PDF
            const pdfPage = await page.browser().newPage();
            const result = await downloadPdf(pdfPage, link.href, filePath, link.title);
            await pdfPage.close();

            // 保存到数据库
            const announcementData = {
                stockCode,
                stockName,
                title: link.title,
                type,
                year,
                quarter,
                source,
                sourceUrl: link.href,
                pdfPath: result.success ? filePath : null,
                pdfSize: result.success ? result.size : null,
                pdfValid: result.success,
                status: result.success ? 'downloaded' : 'failed',
                errorMsg: result.success ? null : result.error
            };

            if (existing) {
                await Announcement.updateOne({ _id: existing._id }, {
                    ...announcementData,
                    retryCount: existing.retryCount + 1
                });
            } else {
                await Announcement.create(announcementData);
            }

            if (result.success) {
                console.log(`    ✅ ${(result.size / 1024).toFixed(0)} KB`);
                results.downloaded++;
            } else {
                console.log(`    ❌ ${result.error}`);
                results.failed++;
            }

            await new Promise(r => setTimeout(r, 2000));
        }

    } catch (e) {
        console.error(`[公告采集] 错误: ${e.message}`);
    } finally {
        await puppeteer.closePage(page);
    }

    console.log(`[公告采集] ${stockCode} 完成: 采集${results.collected} 下载${results.downloaded} 失败${results.failed} 跳过${results.skipped}`);
    return results;
}

/**
 * 采集所有订阅股票的公告
 */
async function collectAllSubscribed(options = {}) {
    const { getSubscriptionManager } = require('./subscriptionManager');
    const subscriptionManager = getSubscriptionManager();
    const stocks = subscriptionManager.getSubscribedStocks();

    console.log(`[公告采集] 开始采集${stocks.length}只订阅股票`);

    const allResults = [];

    for (const stock of stocks) {
        const result = await collectAnnouncements(stock.stockCode, stock.stockName, options);
        allResults.push({ ...stock, ...result });
    }

    console.log(`[公告采集] 全部完成`);
    return allResults;
}

/**
 * 重试失败的下载
 */
async function retryFailed() {
    const pending = await Announcement.getPending(10);

    if (pending.length === 0) {
        console.log('[公告采集] 没有待重试的公告');
        return [];
    }

    console.log(`[公告采集] 重试${pending.length}个失败的下载`);

    const page = await puppeteer.createPage({ timeout: 120000, blockResources: false });
    const results = [];

    try {
        for (const ann of pending) {
            const filePath = path.join(CONFIG.pdfDir, ann.stockCode,
                ann.title.replace(/[\\/:*?"<>|\s]/g, '_').substring(0, 60) + '.pdf');

            const pdfPage = await page.browser().newPage();
            const result = await downloadPdf(pdfPage, ann.sourceUrl, filePath, ann.title);
            await pdfPage.close();

            await Announcement.updateOne({ _id: ann._id }, {
                pdfPath: result.success ? filePath : null,
                pdfSize: result.success ? result.size : null,
                pdfValid: result.success,
                status: result.success ? 'downloaded' : 'failed',
                retryCount: ann.retryCount + 1
            });

            results.push({ id: ann._id, success: result.success });

            await new Promise(r => setTimeout(r, 2000));
        }
    } finally {
        await puppeteer.closePage(page);
    }

    return results;
}

module.exports = {
    collectAnnouncements,
    collectAllSubscribed,
    retryFailed,
    downloadPdf,
    validatePdf,
    CONFIG
};
