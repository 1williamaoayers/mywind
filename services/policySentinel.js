/**
 * Policy Sentinel - 政策哨兵
 * 
 * 功能：
 * 1. 监控央行、发改委等政府官网
 * 2. 哈希对比检测页面变动
 * 3. 变动时截图 + 飞书推送
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 政策源配置
const POLICY_SOURCES = {
    // 中国人民银行 - 货币政策
    PBC: {
        id: 'pbc',
        name: '中国人民银行',
        url: 'http://www.pbc.gov.cn/',
        category: 'monetary',
        description: '货币政策、降准降息'
    },
    // 国家发改委 - 产业政策
    NDRC: {
        id: 'ndrc',
        name: '国家发改委',
        url: 'https://www.ndrc.gov.cn/',
        category: 'industry',
        description: '产业政策、项目审批'
    },
    // 国务院新闻办
    SCIO: {
        id: 'scio',
        name: '国务院新闻办',
        url: 'http://www.scio.gov.cn/',
        category: 'policy',
        description: '重大政策发布'
    },
    // 证监会
    CSRC: {
        id: 'csrc',
        name: '证监会',
        url: 'http://www.csrc.gov.cn/',
        category: 'regulation',
        description: '资本市场监管'
    },
    // 财政部
    MOF: {
        id: 'mof',
        name: '财政部',
        url: 'http://www.mof.gov.cn/',
        category: 'fiscal',
        description: '财政政策、税收'
    }
};

// 哈希存储（内存 + 文件持久化）
const HASH_FILE = '/tmp/policy_hashes.json';
let pageHashes = {};

// 状态追踪
const sentinelStatus = {
    isRunning: false,
    lastCheckTime: null,
    totalChecks: 0,
    changesDetected: 0,
    recentLogs: []
};

// 加载历史哈希
function loadHashes() {
    try {
        if (fs.existsSync(HASH_FILE)) {
            pageHashes = JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
        }
    } catch (error) {
        pageHashes = {};
    }
}

// 保存哈希
function saveHashes() {
    try {
        fs.writeFileSync(HASH_FILE, JSON.stringify(pageHashes, null, 2));
    } catch (error) {
        console.error('[政策哨兵] 保存哈希失败:', error.message);
    }
}

// 添加日志
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const log = `[${timestamp}] ${message}`;
    sentinelStatus.recentLogs.unshift(log);
    if (sentinelStatus.recentLogs.length > 30) {
        sentinelStatus.recentLogs.pop();
    }
    console.log(`[政策哨兵] ${message}`);
}

// 计算页面内容哈希
function calculateHash(content) {
    // 移除动态内容（时间戳、随机数等）
    const cleanContent = content
        .replace(/\d{4}-\d{2}-\d{2}/g, '') // 移除日期
        .replace(/\d{2}:\d{2}:\d{2}/g, '') // 移除时间
        .replace(/\s+/g, ' ')              // 合并空白
        .trim();

    return crypto.createHash('md5').update(cleanContent).digest('hex');
}

/**
 * 检查单个政策源
 */
async function checkPolicySource(source) {
    addLog(`检查 ${source.name}...`);

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

        // 设置超时
        await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2000);

        // 获取页面主要内容
        const content = await page.evaluate(() => {
            // 尝试获取主要内容区域
            const main = document.querySelector('main, .main, #main, .content, #content, article');
            return main ? main.innerText : document.body.innerText;
        });

        // 计算哈希
        const newHash = calculateHash(content);
        const oldHash = pageHashes[source.id];

        let hasChanged = false;
        let screenshotPath = null;

        if (oldHash && oldHash !== newHash) {
            // 检测到变动！
            hasChanged = true;
            sentinelStatus.changesDetected++;
            addLog(`🚨 ${source.name} 检测到内容变动！`);

            // 截图保存
            screenshotPath = `/tmp/policy_${source.id}_${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: false });
            addLog(`📸 截图已保存: ${screenshotPath}`);

            // 推送飞书通知
            await sendPolicyAlert(source, screenshotPath, content.substring(0, 500));
        } else if (!oldHash) {
            addLog(`${source.name} 首次检查，记录基准哈希`);
        } else {
            addLog(`${source.name} 无变动`);
        }

        // 更新哈希
        pageHashes[source.id] = newHash;
        saveHashes();

        await browser.close();

        return { source: source.id, changed: hasChanged, screenshot: screenshotPath };

    } catch (error) {
        addLog(`${source.name} 检查失败: ${error.message}`);
        return { source: source.id, error: error.message };
    }
}

/**
 * 发送政策变动预警到飞书
 */
async function sendPolicyAlert(source, screenshotPath, contentPreview) {
    try {
        const { sendTestMessage } = require('./notificationService');

        const message = {
            level: 'danger',
            title: `🚨 政策哨兵: ${source.name} 内容变动`,
            content: [
                `**来源**: ${source.name}`,
                `**类别**: ${source.description}`,
                `**网址**: ${source.url}`,
                `**时间**: ${new Date().toLocaleString('zh-CN')}`,
                '',
                `**内容预览**:`,
                contentPreview.substring(0, 300) + '...'
            ].join('\n')
        };

        await sendTestMessage(message.level);
        addLog(`📤 飞书通知已发送`);
    } catch (error) {
        addLog(`飞书通知失败: ${error.message}`);
    }
}

/**
 * 执行政策巡检
 */
async function runPolicySentinel(options = {}) {
    if (sentinelStatus.isRunning) {
        addLog('政策哨兵正在运行中，跳过');
        return { skipped: true };
    }

    sentinelStatus.isRunning = true;
    sentinelStatus.totalChecks++;
    addLog('开始政策巡检...');

    loadHashes();

    const results = [];
    const sources = options.sources || Object.values(POLICY_SOURCES);

    for (const source of sources) {
        try {
            const result = await checkPolicySource(source);
            results.push(result);

            // 每个源之间间隔，避免过于频繁
            await sleep(3000);
        } catch (error) {
            results.push({ source: source.id, error: error.message });
        }
    }

    sentinelStatus.isRunning = false;
    sentinelStatus.lastCheckTime = new Date();

    const changedCount = results.filter(r => r.changed).length;
    addLog(`政策巡检完成: 检查 ${results.length} 个源，${changedCount} 个有变动`);

    return { results, changedCount };
}

/**
 * 获取哨兵状态
 */
function getSentinelStatus() {
    return {
        ...sentinelStatus,
        sources: Object.values(POLICY_SOURCES).map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            lastHash: pageHashes[s.id] ? pageHashes[s.id].substring(0, 8) + '...' : '未检查'
        })),
        lastCheckTimeStr: sentinelStatus.lastCheckTime
            ? sentinelStatus.lastCheckTime.toLocaleString('zh-CN')
            : '从未运行'
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 初始化加载哈希
loadHashes();

module.exports = {
    POLICY_SOURCES,
    runPolicySentinel,
    checkPolicySource,
    getSentinelStatus,
    addLog
};
