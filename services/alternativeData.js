/**
 * Alternative Data Service - 另类数据监控
 * 
 * 功能：
 * 1. 汇率 OCR 监控（USD/CNH）
 * 2. 美债收益率监控
 * 3. 其他另类指标
 */

const path = require('path');
const fs = require('fs');
const MarketStats = require('../models/MarketStats');

// 监控配置
const ALTERNATIVE_SOURCES = {
    // 离岸人民币汇率
    USD_CNH: {
        id: 'usd_cnh',
        name: '美元/离岸人民币',
        url: 'https://cn.investing.com/currencies/usd-cnh',
        indicator: 'usd_cnh',
        selector: '.text-5xl', // 价格选择器
        ocrRegion: { x: 300, y: 150, width: 300, height: 100 }
    },
    // 美国10年期国债收益率
    US_10Y: {
        id: 'us_10y',
        name: '美国10年期国债',
        url: 'https://cn.investing.com/rates-bonds/u.s.-10-year-bond-yield',
        indicator: 'us_10y_yield',
        ocrRegion: { x: 300, y: 150, width: 200, height: 100 }
    },
    // VIX 恐慌指数
    VIX: {
        id: 'vix',
        name: 'VIX 恐慌指数',
        url: 'https://cn.investing.com/indices/volatility-s-p-500',
        indicator: 'vix',
        ocrRegion: { x: 300, y: 150, width: 200, height: 100 }
    }
};

// 状态追踪
const altDataStatus = {
    isRunning: false,
    lastFetchTime: null,
    totalFetches: 0,
    successCount: 0,
    failCount: 0,
    recentLogs: []
};

// 添加日志
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const log = `[${timestamp}] ${message}`;
    altDataStatus.recentLogs.unshift(log);
    if (altDataStatus.recentLogs.length > 20) {
        altDataStatus.recentLogs.pop();
    }
    console.log(`[另类数据] ${message}`);
}

/**
 * OCR 提取数值
 */
async function extractNumberFromImage(imagePath) {
    try {
        const Tesseract = require('tesseract.js');

        const result = await Tesseract.recognize(imagePath, 'eng', {
            logger: () => { }
        });

        const text = result.data.text;

        // 提取数字（支持小数）
        const matches = text.match(/[\d,]+\.?\d*/g);
        if (matches && matches.length > 0) {
            // 取第一个有效数字
            const numStr = matches[0].replace(/,/g, '');
            const num = parseFloat(numStr);
            if (!isNaN(num)) {
                return { value: num, confidence: result.data.confidence };
            }
        }

        return null;
    } catch (error) {
        addLog(`OCR 失败: ${error.message}`);
        return null;
    }
}

/**
 * 采集单个指标
 */
async function fetchIndicator(source) {
    addLog(`采集 ${source.name}...`);

    try {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

        await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        // 截图指定区域
        const screenshotPath = `/tmp/alt_${source.id}_${Date.now()}.png`;

        if (source.ocrRegion) {
            await page.screenshot({
                path: screenshotPath,
                clip: source.ocrRegion
            });
        } else {
            await page.screenshot({ path: screenshotPath });
        }

        await browser.close();

        // OCR 识别
        const ocrResult = await extractNumberFromImage(screenshotPath);

        // 清理截图
        fs.unlinkSync(screenshotPath);

        if (ocrResult && ocrResult.value) {
            // 获取前一条记录计算变化率
            const lastRecord = await MarketStats.getLatest(source.indicator);
            let changePercent = 0;
            if (lastRecord) {
                changePercent = ((ocrResult.value - lastRecord.value) / lastRecord.value * 100);
            }

            // 入库
            await MarketStats.create({
                indicator: source.indicator,
                value: ocrResult.value,
                changePercent: parseFloat(changePercent.toFixed(4)),
                source: 'ocr',
                ocrConfidence: ocrResult.confidence
            });

            addLog(`✅ ${source.name}: ${ocrResult.value} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
            altDataStatus.successCount++;

            return { indicator: source.indicator, value: ocrResult.value, changePercent };
        } else {
            addLog(`${source.name} OCR 未识别到数值`);
            altDataStatus.failCount++;
            return { indicator: source.indicator, error: 'OCR 失败' };
        }

    } catch (error) {
        addLog(`${source.name} 采集失败: ${error.message}`);
        altDataStatus.failCount++;
        return { indicator: source.indicator, error: error.message };
    }
}

/**
 * 执行另类数据采集
 */
async function runAlternativeDataFetch(options = {}) {
    if (altDataStatus.isRunning) {
        addLog('另类数据采集正在运行中，跳过');
        return { skipped: true };
    }

    altDataStatus.isRunning = true;
    altDataStatus.totalFetches++;
    addLog('开始另类数据采集...');

    const results = [];
    const sources = options.sources || Object.values(ALTERNATIVE_SOURCES);

    for (const source of sources) {
        try {
            const result = await fetchIndicator(source);
            results.push(result);

            // 间隔避免过于频繁
            await sleep(5000);
        } catch (error) {
            results.push({ indicator: source.indicator, error: error.message });
        }
    }

    altDataStatus.isRunning = false;
    altDataStatus.lastFetchTime = new Date();

    const successCount = results.filter(r => r.value).length;
    addLog(`另类数据采集完成: ${successCount}/${results.length} 成功`);

    return { results, successCount };
}

/**
 * 获取状态
 */
function getAltDataStatus() {
    return {
        ...altDataStatus,
        sources: Object.values(ALTERNATIVE_SOURCES).map(s => ({
            id: s.id,
            name: s.name,
            indicator: s.indicator
        })),
        lastFetchTimeStr: altDataStatus.lastFetchTime
            ? altDataStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

/**
 * 获取图表数据
 */
async function getChartData(indicator, hours = 24) {
    const history = await MarketStats.getHistory(indicator, hours);
    return history.reverse().map(item => ({
        time: item.timestamp,
        value: item.value
    }));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    ALTERNATIVE_SOURCES,
    runAlternativeDataFetch,
    fetchIndicator,
    getAltDataStatus,
    getChartData
};
