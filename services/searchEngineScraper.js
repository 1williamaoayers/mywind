/**
 * Search Engine Scraper - 搜索引擎增强采集模块
 * 
 * 功能：
 * 1. 百度搜索（主力）
 * 2. Bing 搜索（备用）
 * 3. site: 影子抓取（企查查/天眼查等需登录网站）
 * 
 * 反封锁策略：
 * - 随机延迟 5-15 秒
 * - User-Agent 轮换
 * - 搜索缓存（6小时内不重复）
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { getRandomUserAgent, sleep, getRandomDelay } = require('../utils/browserUtils');
const { shouldIngest } = require('../config/filterConfig');
const { generateHashId } = require('../utils/hashUtils');

// 搜索缓存（内存）
const searchCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 小时

// 搜索状态（用于前端展示）
const searchStatus = {
    lastSearchTime: null,
    lastKeyword: null,
    totalSearches: 0,
    successCount: 0,
    failCount: 0,
    recentLogs: []
};

/**
 * 添加日志
 */
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const log = `[${timestamp}] ${message}`;
    searchStatus.recentLogs.unshift(log);
    if (searchStatus.recentLogs.length > 20) {
        searchStatus.recentLogs.pop();
    }
    console.log(`[搜索引擎] ${message}`);
}

/**
 * 检查缓存
 */
function isCached(keyword, site = '') {
    const cacheKey = `${keyword}:${site}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.time) < CACHE_TTL) {
        return true;
    }
    return false;
}

/**
 * 设置缓存
 */
function setCache(keyword, site = '') {
    const cacheKey = `${keyword}:${site}`;
    searchCache.set(cacheKey, { time: Date.now() });
}

/**
 * 百度搜索
 * @param {string} keyword - 搜索关键词
 * @param {object} options - 选项 { site, intitle, news }
 */
async function searchBaidu(keyword, options = {}) {
    // 检查缓存
    if (isCached(keyword, options.site || '')) {
        addLog(`跳过搜索（缓存中）: ${keyword}`);
        return [];
    }

    // 构建搜索查询
    let query = keyword;
    if (options.intitle) {
        query = `intitle:${keyword}`;
    }
    if (options.site) {
        query = `site:${options.site} ${keyword}`;
    }
    if (options.news) {
        query += ' 资讯';
    }

    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10`;

    addLog(`正在通过百度检索: ${query}...`);
    searchStatus.lastSearchTime = new Date();
    searchStatus.lastKeyword = keyword;
    searchStatus.totalSearches++;

    try {
        // 随机延迟
        await sleep(getRandomDelay(5, 15) * 1000);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cookie': 'BAIDUID=' + Math.random().toString(36).substring(2)
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        // 解析搜索结果
        $('.result, .c-container').each((i, elem) => {
            if (i >= 5) return; // 只取前5条

            const $elem = $(elem);
            const title = $elem.find('h3 a, .t a').first().text().trim();
            const snippet = $elem.find('.c-abstract, .content-right_8Zs40').first().text().trim();
            const link = $elem.find('h3 a, .t a').first().attr('href') || '';

            if (title && snippet) {
                // 白名单过滤
                const filterResult = shouldIngest(title, snippet);
                if (filterResult.shouldIngest) {
                    results.push({
                        source: 'search_baidu',
                        sourceName: '百度搜索',
                        dimension: 'search_engine',
                        title: title.substring(0, 100),
                        content: snippet.substring(0, 500),
                        url: link,
                        publishTime: new Date(),
                        searchKeyword: keyword,
                        matchedKeywords: filterResult.matchedKeywords
                    });
                }
            }
        });

        setCache(keyword, options.site || '');
        searchStatus.successCount++;
        addLog(`百度搜索完成: 发现 ${results.length} 条匹配结果`);

        return results;

    } catch (error) {
        searchStatus.failCount++;
        addLog(`百度搜索失败: ${error.message}`);
        return [];
    }
}

/**
 * Bing 搜索（备用）
 */
async function searchBing(keyword, options = {}) {
    // 检查缓存
    if (isCached(keyword, 'bing:' + (options.site || ''))) {
        addLog(`跳过 Bing 搜索（缓存中）: ${keyword}`);
        return [];
    }

    let query = keyword;
    if (options.site) {
        query = `site:${options.site} ${keyword}`;
    }

    const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=10`;

    addLog(`正在通过 Bing 检索: ${query}...`);

    try {
        await sleep(getRandomDelay(5, 15) * 1000);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('.b_algo').each((i, elem) => {
            if (i >= 5) return;

            const $elem = $(elem);
            const title = $elem.find('h2 a').text().trim();
            const snippet = $elem.find('.b_caption p').text().trim();
            const link = $elem.find('h2 a').attr('href') || '';

            if (title && snippet) {
                const filterResult = shouldIngest(title, snippet);
                if (filterResult.shouldIngest) {
                    results.push({
                        source: 'search_bing',
                        sourceName: 'Bing搜索',
                        dimension: 'search_engine',
                        title: title.substring(0, 100),
                        content: snippet.substring(0, 500),
                        url: link,
                        publishTime: new Date(),
                        searchKeyword: keyword,
                        matchedKeywords: filterResult.matchedKeywords
                    });
                }
            }
        });

        setCache(keyword, 'bing:' + (options.site || ''));
        addLog(`Bing 搜索完成: 发现 ${results.length} 条匹配结果`);

        return results;

    } catch (error) {
        addLog(`Bing 搜索失败: ${error.message}`);
        return [];
    }
}

/**
 * 影子抓取 - 搜索需要登录的网站
 * 通过搜索引擎的快照获取信息
 */
async function shadowScrape(keyword, sites = ['qcc.com', 'tianyancha.com']) {
    addLog(`开始影子抓取: ${keyword} (${sites.join(', ')})`);

    const allResults = [];

    for (const site of sites) {
        // 合并搜索：诉讼|股权|警示
        const legalKeywords = ['诉讼', '股权变动', '警示', '处罚', '立案'];
        const query = `${keyword} ${legalKeywords[Math.floor(Math.random() * legalKeywords.length)]}`;

        const results = await searchBaidu(query, { site });
        allResults.push(...results);

        // 随机延迟避免封锁
        await sleep(getRandomDelay(10, 20) * 1000);
    }

    addLog(`影子抓取完成: 共发现 ${allResults.length} 条结果`);
    return allResults;
}

/**
 * 综合搜索 - 关键词增强模式
 * @param {string[]} keywords - 关键词列表
 */
async function enhancedSearch(keywords) {
    addLog(`启动搜索增强模式: ${keywords.length} 个关键词`);

    const allResults = [];

    for (const keyword of keywords) {
        // 1. 普通资讯搜索
        const newsResults = await searchBaidu(keyword, { news: true });
        allResults.push(...newsResults);

        // 2. 影子抓取（企查查、天眼查）
        const shadowResults = await shadowScrape(keyword);
        allResults.push(...shadowResults);

        // 控制频率
        await sleep(getRandomDelay(15, 30) * 1000);
    }

    addLog(`搜索增强完成: 共采集 ${allResults.length} 条有效数据`);
    return allResults;
}

/**
 * 获取搜索状态（供前端展示）
 */
function getSearchStatus() {
    return {
        ...searchStatus,
        cacheSize: searchCache.size,
        lastSearchTimeStr: searchStatus.lastSearchTime
            ? searchStatus.lastSearchTime.toLocaleString('zh-CN')
            : '从未搜索'
    };
}

/**
 * 清理缓存
 */
function clearCache() {
    searchCache.clear();
    addLog('搜索缓存已清理');
}

/**
 * Puppeteer 智能翻页搜索（深度模式）
 * 使用真实浏览器 + 自动翻页
 */
async function puppeteerSearch(keyword, options = {}) {
    const maxPages = options.maxPages || 3;

    // 检查缓存
    if (isCached(keyword, 'puppeteer')) {
        addLog(`跳过 Puppeteer 搜索（缓存中）: ${keyword}`);
        return [];
    }

    addLog(`启动 Puppeteer 深度搜索: ${keyword} (最多${maxPages}页)...`);
    searchStatus.lastSearchTime = new Date();
    searchStatus.lastKeyword = keyword;
    searchStatus.totalSearches++;

    let page = null;
    const allResults = [];
    const seenUrls = new Set();

    try {
        const browserService = require('./browserService');

        // 创建页面（极轻量模式 + 环境仿真）
        page = await browserService.createPage({ lightMode: true });

        // 构建搜索 URL
        let query = keyword;
        if (options.news) query += ' 资讯';
        if (options.site) query = `site:${options.site} ${query}`;

        const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10`;

        // 导航
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        addLog(`[Puppeteer] 已打开百度搜索页面`);

        // 智能翻页
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            addLog(`[Puppeteer] 正在处理第 ${pageNum} 页...`);

            // 模拟人类滚动
            await browserService.humanScroll(page);

            // 提取当前页结果
            const pageResults = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('.result, .c-container').forEach((elem, i) => {
                    if (i >= 10) return;

                    const titleElem = elem.querySelector('h3 a, .t a');
                    const snippetElem = elem.querySelector('.c-abstract, .content-right_8Zs40');

                    if (titleElem && snippetElem) {
                        items.push({
                            title: titleElem.textContent.trim().substring(0, 100),
                            snippet: snippetElem.textContent.trim().substring(0, 500),
                            url: titleElem.href || ''
                        });
                    }
                });
                return items;
            });

            // 白名单过滤 + 去重
            for (const item of pageResults) {
                if (seenUrls.has(item.url)) continue;

                const filterResult = shouldIngest(item.title, item.snippet);
                if (filterResult.shouldIngest) {
                    seenUrls.add(item.url);
                    allResults.push({
                        source: 'search_puppeteer',
                        sourceName: 'Puppeteer深度搜索',
                        dimension: 'search_engine',
                        title: item.title,
                        content: item.snippet,
                        url: item.url,
                        publishTime: new Date(),
                        searchKeyword: keyword,
                        matchedKeywords: filterResult.matchedKeywords
                    });
                }
            }

            addLog(`[Puppeteer] 第 ${pageNum} 页: ${pageResults.length} 条，命中 ${allResults.length} 条`);

            // 如果当前页有结果且需要翻页
            if (pageNum < maxPages) {
                // 查找"下一页"按钮
                const hasNext = await browserService.humanClick(page, 'a.n');
                if (!hasNext) {
                    addLog(`[Puppeteer] 没有更多页面`);
                    break;
                }

                // 等待页面加载
                await browserService.sleep(2000 + Math.random() * 1000);
            }
        }

        setCache(keyword, 'puppeteer');
        searchStatus.successCount++;
        addLog(`Puppeteer 搜索完成: 共发现 ${allResults.length} 条匹配结果`);

        return allResults;

    } catch (error) {
        searchStatus.failCount++;
        addLog(`Puppeteer 搜索失败: ${error.message}`);
        return [];
    } finally {
        if (page) {
            const browserService = require('./browserService');
            await browserService.closePage(page);
        }
    }
}

/**
 * 增强版综合搜索（包含 Puppeteer 深度搜索）
 */
async function enhancedSearchWithPuppeteer(keywords, options = {}) {
    addLog(`启动增强搜索模式 (含Puppeteer): ${keywords.length} 个关键词`);

    const allResults = [];

    for (const keyword of keywords) {
        // 1. 先尝试快速 HTTP 搜索
        const httpResults = await searchBaidu(keyword, { news: true });
        allResults.push(...httpResults);

        // 2. 如果 HTTP 搜索结果少于 3 条，启用 Puppeteer 深度搜索
        if (httpResults.length < 3 && options.usePuppeteer !== false) {
            addLog(`HTTP 结果不足，启用 Puppeteer 深度搜索: ${keyword}`);
            const puppeteerResults = await puppeteerSearch(keyword, { news: true, maxPages: 2 });
            allResults.push(...puppeteerResults);
        }

        // 3. 影子抓取
        if (options.shadowScrape !== false) {
            const shadowResults = await shadowScrape(keyword);
            allResults.push(...shadowResults);
        }

        // 控制频率
        await sleep(getRandomDelay(15, 30) * 1000);
    }

    addLog(`增强搜索完成: 共采集 ${allResults.length} 条有效数据`);
    return allResults;
}

module.exports = {
    searchBaidu,
    searchBing,
    shadowScrape,
    enhancedSearch,
    puppeteerSearch,
    enhancedSearchWithPuppeteer,
    getSearchStatus,
    clearCache,
    addLog
};
