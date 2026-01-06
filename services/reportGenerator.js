/**
 * 投研报告生成器
 * 
 * 功能：
 * 1. 生成每日投研日报
 * 2. 按股票汇总资讯
 * 3. 研报摘要
 * 4. Markdown格式输出
 */

const fs = require('fs');
const path = require('path');
const { getSubscriptionManager } = require('./subscriptionManager');

// 报告存储目录
const REPORTS_DIR = path.join(__dirname, '../data/reports');

// 确保目录存在
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * 报告生成器类
 */
class ReportGenerator {
    constructor() {
        this.subscriptionManager = getSubscriptionManager();
    }

    /**
     * 生成每日投研日报
     */
    generateDailyReport(data, options = {}) {
        const { date = new Date() } = options;
        const dateStr = this.formatDate(date);

        const sections = [];

        // 标题
        sections.push(`# 每日投研日报`);
        sections.push(`**日期**: ${dateStr}`);
        sections.push(`**生成时间**: ${new Date().toLocaleString('zh-CN')}`);
        sections.push('');
        sections.push('---');
        sections.push('');

        // 一、市场概览
        sections.push('## 一、市场概览');
        sections.push('');
        if (data.market) {
            sections.push(`- 上证指数: ${data.market.sh || '--'}`);
            sections.push(`- 深证成指: ${data.market.sz || '--'}`);
            sections.push(`- 恒生指数: ${data.market.hsi || '--'}`);
            sections.push(`- 纳斯达克: ${data.market.nasdaq || '--'}`);
        } else {
            sections.push('暂无市场数据');
        }
        sections.push('');

        // 二、关注股票动态
        sections.push('## 二、关注股票动态');
        sections.push('');

        const subscriptions = this.subscriptionManager.getAll();

        if (subscriptions.length === 0) {
            sections.push('暂无订阅股票');
        } else {
            for (const sub of subscriptions) {
                const stockData = data.byStock?.[sub.stockCode] || {};
                sections.push(this.generateStockSection(sub, stockData));
            }
        }
        sections.push('');

        // 三、重点研报摘要
        sections.push('## 三、重点研报摘要');
        sections.push('');
        if (data.reports && data.reports.length > 0) {
            for (let i = 0; i < Math.min(5, data.reports.length); i++) {
                const report = data.reports[i];
                sections.push(`### ${i + 1}. ${report.title}`);
                sections.push(`- **来源**: ${report.source || '未知'}`);
                if (report.summary) {
                    sections.push(`- **摘要**: ${report.summary.substring(0, 200)}...`);
                }
                sections.push('');
            }
        } else {
            sections.push('今日暂无重点研报');
        }
        sections.push('');

        // 四、资金流向
        sections.push('## 四、资金流向');
        sections.push('');
        if (data.flow) {
            sections.push('| 通道 | 净流入 |');
            sections.push('|------|--------|');
            if (data.flow.hk2sh) sections.push(`| 沪股通 | ${data.flow.hk2sh}亿 |`);
            if (data.flow.hk2sz) sections.push(`| 深股通 | ${data.flow.hk2sz}亿 |`);
            if (data.flow.total) sections.push(`| 北水合计 | ${data.flow.total}亿 |`);
        } else {
            sections.push('暂无资金流向数据');
        }
        sections.push('');

        // 五、舆情监控
        sections.push('## 五、舆情监控');
        sections.push('');
        if (data.sentiment && data.sentiment.length > 0) {
            for (const item of data.sentiment.slice(0, 5)) {
                sections.push(`- ${item.title}`);
            }
        } else {
            sections.push('今日无异常舆情');
        }
        sections.push('');

        // 六、明日关注
        sections.push('## 六、明日关注');
        sections.push('');
        if (data.upcoming && data.upcoming.length > 0) {
            for (const item of data.upcoming) {
                sections.push(`- ${item}`);
            }
        } else {
            sections.push('暂无特别关注事项');
        }
        sections.push('');

        // 页脚
        sections.push('---');
        sections.push('*本报告由MyWind智能投研系统自动生成*');

        const content = sections.join('\n');

        // 保存报告
        const filename = `daily_${dateStr.replace(/-/g, '')}.md`;
        const filepath = path.join(REPORTS_DIR, filename);
        fs.writeFileSync(filepath, content);

        console.log(`[报告生成] 每日报告已生成: ${filename}`);

        return {
            content,
            filepath,
            date: dateStr
        };
    }

    /**
     * 生成单个股票的section
     */
    generateStockSection(subscription, data) {
        const lines = [];

        lines.push(`### ${subscription.stockCode} ${subscription.stockName}`);
        lines.push('');

        // 今日资讯
        const news = data.news || [];
        lines.push(`#### 今日资讯（${news.length}条）`);
        if (news.length > 0) {
            for (const item of news.slice(0, 5)) {
                const tag = item.score >= 80 ? '**[重要]**' : '';
                lines.push(`- ${tag} ${item.title}`);
            }
        } else {
            lines.push('暂无相关资讯');
        }
        lines.push('');

        // 最新研报
        const reports = data.reports || [];
        lines.push(`#### 最新研报（${reports.length}份）`);
        if (reports.length > 0) {
            for (const item of reports.slice(0, 3)) {
                lines.push(`- 《${item.title}》${item.source ? `- ${item.source}` : ''}`);
            }
        } else {
            lines.push('暂无相关研报');
        }
        lines.push('');

        // 资金流向
        if (data.flow) {
            lines.push(`#### 资金流向`);
            lines.push(`- 主力净流入: ${data.flow.mainFlow || '--'}`);
            lines.push(`- 北水持仓: ${data.flow.northHolding || '--'}`);
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * 生成周报
     */
    generateWeeklyReport(weekData, options = {}) {
        const sections = [];

        sections.push('# 每周投研周报');
        sections.push(`**周期**: ${options.startDate} 至 ${options.endDate}`);
        sections.push('');

        // 周度汇总
        sections.push('## 本周概览');
        sections.push('');
        sections.push(`- 采集新闻: ${weekData.stats?.newsCount || 0} 条`);
        sections.push(`- 采集研报: ${weekData.stats?.reportCount || 0} 份`);
        sections.push(`- 关注股票: ${weekData.stats?.stockCount || 0} 只`);
        sections.push('');

        // 周度热点
        sections.push('## 本周热点');
        sections.push('');
        if (weekData.hotTopics && weekData.hotTopics.length > 0) {
            for (const topic of weekData.hotTopics) {
                sections.push(`- ${topic}`);
            }
        }
        sections.push('');

        // 页脚
        sections.push('---');
        sections.push('*本报告由MyWind智能投研系统自动生成*');

        const content = sections.join('\n');
        return { content };
    }

    /**
     * 格式化日期
     */
    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * 获取最近的报告
     */
    getRecentReports(days = 7) {
        if (!fs.existsSync(REPORTS_DIR)) {
            return [];
        }

        const files = fs.readdirSync(REPORTS_DIR)
            .filter(f => f.startsWith('daily_') && f.endsWith('.md'))
            .sort()
            .reverse()
            .slice(0, days);

        return files.map(f => ({
            filename: f,
            date: f.replace('daily_', '').replace('.md', ''),
            path: path.join(REPORTS_DIR, f)
        }));
    }

    /**
     * 读取报告内容
     */
    readReport(filename) {
        const filepath = path.join(REPORTS_DIR, filename);
        if (fs.existsSync(filepath)) {
            return fs.readFileSync(filepath, 'utf8');
        }
        return null;
    }
}

// 单例
let instance = null;

function getReportGenerator() {
    if (!instance) {
        instance = new ReportGenerator();
    }
    return instance;
}

module.exports = {
    ReportGenerator,
    getReportGenerator,
    REPORTS_DIR
};
