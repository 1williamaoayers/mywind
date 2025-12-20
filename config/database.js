/**
 * 数据库配置
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/private_wind';

async function connectDatabase() {
    try {
        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log('✅ MongoDB 连接成功');

        // 连接事件监听
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB 连接错误:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB 连接断开，尝试重连...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB 重连成功');
        });

    } catch (error) {
        console.error('❌ MongoDB 连接失败:', error.message);
        process.exit(1);
    }
}

async function disconnectDatabase() {
    await mongoose.connection.close();
    console.log('MongoDB 连接已关闭');
}

module.exports = {
    connectDatabase,
    disconnectDatabase
};
