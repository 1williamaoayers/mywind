/**
 * Logger - 日志工具
 * 
 * 功能：
 * 1. 控制台彩色输出（开发环境）
 * 2. 文件日志（生产环境）
 * 3. 按天自动轮转
 */

const winston = require('winston');
const path = require('path');

// 日志目录
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

// 日志级别颜色
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

winston.addColors(colors);

// 自定义格式：时间 + 级别 + 消息
const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
});

// 控制台格式（带颜色）
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    customFormat
);

// 文件格式（纯文本）
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
);

// 创建 logger 实例
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// 生产环境添加文件日志
if (process.env.NODE_ENV === 'production') {
    try {
        // 尝试加载日志轮转模块
        const DailyRotateFile = require('winston-daily-rotate-file');

        // 普通日志（按天轮转）
        logger.add(new DailyRotateFile({
            filename: path.join(LOG_DIR, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: fileFormat
        }));

        // 错误日志（单独文件）
        logger.add(new DailyRotateFile({
            filename: path.join(LOG_DIR, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        }));
    } catch (e) {
        // 如果轮转模块不可用，使用普通文件
        const fs = require('fs');
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }

        logger.add(new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            format: fileFormat
        }));

        logger.add(new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            format: fileFormat
        }));
    }
}

// 便捷方法
const log = {
    error: (message, meta = {}) => logger.error(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    info: (message, meta = {}) => logger.info(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),

    // 带模块前缀的日志
    module: (moduleName) => ({
        error: (message, meta = {}) => logger.error(`[${moduleName}] ${message}`, meta),
        warn: (message, meta = {}) => logger.warn(`[${moduleName}] ${message}`, meta),
        info: (message, meta = {}) => logger.info(`[${moduleName}] ${message}`, meta),
        debug: (message, meta = {}) => logger.debug(`[${moduleName}] ${message}`, meta)
    })
};

module.exports = log;
module.exports.logger = logger;
