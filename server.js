/**
 * Private-Wind-Ultra 应用入口
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');

const app = express();
const PORT = process.env.APP_PORT || process.env.PORT || 8088;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Private-Wind-Ultra'
    });
});

// 静态文件服务 (前端)
app.use(express.static('public'));

// 截图目录服务 (登录助手二维码)
app.use('/screenshots', express.static('data/screenshots'));

// API 路由
app.use('/api', require('./routes/api'));

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务
async function startServer() {
    try {
        // 连接数据库
        await connectDatabase();

        // 初始化调度引擎
        const { initScheduler } = require('./services/schedulerService');
        initScheduler();

        // 启动 HTTP 服务
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║     Private-Wind-Ultra 投研系统            ║
║     服务已启动: http://localhost:${PORT}      ║
╚════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('启动失败:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
