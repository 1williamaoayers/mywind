/**
 * 数据清理脚本
 * 
 * 功能：
 * 1. 清理过期数据
 * 2. 压缩历史数据
 * 3. 生成清理报告
 * 
 * 用法：node scripts/dataCleanup.js
 */

const fs = require('fs');
const path = require('path');
const { DATA_TYPE_CONFIG } = require('../utils/dataFilter');

// 数据目录
const DATA_DIR = path.join(__dirname, '../data');

// 清理统计
let stats = {
    startTime: new Date(),
    endTime: null,
    deleted: 0,
    archived: 0,
    errors: []
};

/**
 * 连接数据库（示例，需要根据实际情况修改）
 */
async function connectDB() {
    // 如果使用MongoDB
    // const mongoose = require('mongoose');
    // await mongoose.connect('mongodb://localhost/mywind');

    console.log('[清理] 数据库连接成功');
    return true;
}

/**
 * 清理过期快讯（7天）
 */
async function cleanFlashNews() {
    const maxAge = DATA_TYPE_CONFIG.flash.maxAge;
    const cutoff = new Date(Date.now() - maxAge);

    console.log(`[清理] 删除${cutoff.toLocaleDateString()}之前的快讯...`);

    // 示例：MongoDB操作
    // const result = await db.news.deleteMany({
    //     type: 'flash',
    //     createdAt: { $lt: cutoff }
    // });
    // stats.deleted += result.deletedCount;

    // 文件系统清理示例
    const flashDir = path.join(DATA_DIR, 'flash');
    if (fs.existsSync(flashDir)) {
        const files = fs.readdirSync(flashDir);
        for (const file of files) {
            const filePath = path.join(flashDir, file);
            const fileStat = fs.statSync(filePath);
            if (fileStat.mtime < cutoff) {
                fs.unlinkSync(filePath);
                stats.deleted++;
            }
        }
    }

    console.log(`[清理] 快讯清理完成`);
}

/**
 * 清理过期新闻（30天）
 */
async function cleanNews() {
    const maxAge = DATA_TYPE_CONFIG.news.maxAge;
    const cutoff = new Date(Date.now() - maxAge);

    console.log(`[清理] 删除${cutoff.toLocaleDateString()}之前的新闻...`);

    // 文件系统清理示例
    const newsDir = path.join(DATA_DIR, 'news');
    if (fs.existsSync(newsDir)) {
        const files = fs.readdirSync(newsDir);
        for (const file of files) {
            const filePath = path.join(newsDir, file);
            const fileStat = fs.statSync(filePath);
            if (fileStat.mtime < cutoff) {
                fs.unlinkSync(filePath);
                stats.deleted++;
            }
        }
    }

    console.log(`[清理] 新闻清理完成`);
}

/**
 * 归档过期研报（90天以上）
 */
async function archiveReports() {
    const maxAge = DATA_TYPE_CONFIG.report.maxAge;
    const cutoff = new Date(Date.now() - maxAge);

    console.log(`[清理] 归档${cutoff.toLocaleDateString()}之前的研报...`);

    const reportsDir = path.join(DATA_DIR, 'reports');
    const archiveDir = path.join(DATA_DIR, 'archive', 'reports');

    // 确保归档目录存在
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir);
        for (const file of files) {
            const filePath = path.join(reportsDir, file);
            const fileStat = fs.statSync(filePath);
            if (fileStat.mtime < cutoff) {
                // 移动到归档目录
                const archivePath = path.join(archiveDir, file);
                fs.renameSync(filePath, archivePath);
                stats.archived++;
            }
        }
    }

    console.log(`[清理] 研报归档完成`);
}

/**
 * 清理告警日志
 */
async function cleanAlertLogs() {
    const alertLog = path.join(DATA_DIR, 'alerts.log');

    if (!fs.existsSync(alertLog)) {
        return;
    }

    console.log('[清理] 清理过期告警日志...');

    const content = fs.readFileSync(alertLog, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7); // 保留7天

    const filtered = lines.filter(line => {
        const match = line.match(/\[([\d/\s:]+)\]/);
        if (match) {
            const date = new Date(match[1]);
            return date > cutoff;
        }
        return false;
    });

    const deleted = lines.length - filtered.length;
    fs.writeFileSync(alertLog, filtered.join('\n') + '\n');

    console.log(`[清理] 删除${deleted}条过期告警`);
    stats.deleted += deleted;
}

/**
 * 清理健康检查历史
 */
async function cleanHealthHistory() {
    const historyFile = path.join(DATA_DIR, 'health-history.json');

    if (!fs.existsSync(historyFile)) {
        return;
    }

    console.log('[清理] 清理健康检查历史...');

    try {
        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

        // 只保留最近30条
        if (history.length > 30) {
            const newHistory = history.slice(-30);
            fs.writeFileSync(historyFile, JSON.stringify(newHistory, null, 2));
            stats.deleted += history.length - 30;
        }
    } catch (e) {
        stats.errors.push({ task: 'cleanHealthHistory', error: e.message });
    }

    console.log('[清理] 健康检查历史清理完成');
}

/**
 * 生成清理报告
 */
function generateReport() {
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;

    const report = {
        time: stats.endTime.toISOString(),
        duration: `${duration.toFixed(1)}秒`,
        deleted: stats.deleted,
        archived: stats.archived,
        errors: stats.errors
    };

    // 保存报告
    const reportPath = path.join(DATA_DIR, 'cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
}

/**
 * 主函数
 */
async function main() {
    console.log('=== 数据清理任务开始 ===');
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('');

    try {
        // 连接数据库
        await connectDB();

        // 执行清理任务
        await cleanFlashNews();
        await cleanNews();
        await archiveReports();
        await cleanAlertLogs();
        await cleanHealthHistory();

        // 生成报告
        const report = generateReport();

        console.log('');
        console.log('=== 清理完成 ===');
        console.log(`删除: ${report.deleted} 项`);
        console.log(`归档: ${report.archived} 项`);
        console.log(`耗时: ${report.duration}`);

        if (report.errors.length > 0) {
            console.log(`错误: ${report.errors.length} 个`);
            report.errors.forEach(e => console.log(`  - ${e.task}: ${e.error}`));
        }

    } catch (error) {
        console.error('[清理] 任务失败:', error.message);
        process.exit(1);
    }
}

// 命令行入口
if (require.main === module) {
    main().then(() => process.exit(0));
}

module.exports = {
    cleanFlashNews,
    cleanNews,
    archiveReports,
    cleanAlertLogs,
    cleanHealthHistory,
    main
};
