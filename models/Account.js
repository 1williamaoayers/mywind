/**
 * Account Model - 托管账号存储
 * 
 * 安全特性：
 * - 密码使用 AES-256-GCM 加密存储
 * - 支持多平台账号管理
 * - Session 状态追踪
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

// 支持的平台列表
const PLATFORMS = {
    XUEQIU: { id: 'xueqiu', name: '雪球', loginUrl: 'https://xueqiu.com/login' },
    TOUTIAO: { id: 'toutiao', name: '今日头条', loginUrl: 'https://www.toutiao.com/login/' },
    FUTU: { id: 'futu', name: '富途', loginUrl: 'https://www.futunn.com/login' },
    EASTMONEY: { id: 'eastmoney', name: '东方财富', loginUrl: 'https://passport.eastmoney.com/login' },
    THS: { id: 'ths', name: '同花顺', loginUrl: 'https://passport.10jqka.com.cn/' }
};

const AccountSchema = new mongoose.Schema({
    // 平台标识
    platform: {
        type: String,
        required: true,
        enum: Object.keys(PLATFORMS).map(k => PLATFORMS[k].id)
    },

    // 账号名称（用于显示）
    displayName: {
        type: String,
        required: true,
        trim: true
    },

    // 登录用户名
    username: {
        type: String,
        required: true,
        trim: true
    },

    // 加密后的密码
    encryptedPassword: {
        type: String,
        required: true
    },

    // 登录状态
    status: {
        type: String,
        enum: ['idle', 'logging_in', 'logged_in', 'need_captcha', 'need_verify', 'failed'],
        default: 'idle'
    },

    // 状态消息
    statusMessage: {
        type: String,
        default: ''
    },

    // 最后登录时间
    lastLoginTime: {
        type: Date,
        default: null
    },

    // Session 是否有效
    sessionValid: {
        type: Boolean,
        default: false
    },

    // 最后截图路径（用于人工辅助）
    lastScreenshot: {
        type: String,
        default: ''
    },

    // 是否启用
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'accounts'
});

// 索引
AccountSchema.index({ platform: 1, username: 1 }, { unique: true });

/**
 * 虚拟字段：获取平台信息
 */
AccountSchema.virtual('platformInfo').get(function () {
    return Object.values(PLATFORMS).find(p => p.id === this.platform);
});

/**
 * 实例方法：设置密码（自动加密）
 */
AccountSchema.methods.setPassword = function (plainPassword) {
    this.encryptedPassword = encrypt(plainPassword);
};

/**
 * 实例方法：获取密码（自动解密）
 */
AccountSchema.methods.getPassword = function () {
    return decrypt(this.encryptedPassword);
};

/**
 * 实例方法：更新状态
 */
AccountSchema.methods.updateStatus = async function (status, message = '') {
    this.status = status;
    this.statusMessage = message;
    if (status === 'logged_in') {
        this.lastLoginTime = new Date();
        this.sessionValid = true;
    } else if (status === 'failed') {
        this.sessionValid = false;
    }
    await this.save();
};

/**
 * 静态方法：获取平台列表
 */
AccountSchema.statics.getPlatforms = function () {
    return Object.values(PLATFORMS);
};

/**
 * 静态方法：获取指定平台的有效账号
 */
AccountSchema.statics.getActiveAccount = async function (platformId) {
    return this.findOne({
        platform: platformId,
        isActive: true
    }).sort({ lastLoginTime: -1 });
};

/**
 * 转换为 JSON 时隐藏密码
 */
AccountSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.encryptedPassword;
    return obj;
};

// 导出平台列表
module.exports = mongoose.model('Account', AccountSchema);
module.exports.PLATFORMS = PLATFORMS;
