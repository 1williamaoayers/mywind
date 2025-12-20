/**
 * Stock Model - 股票与三层关键词矩阵
 * 
 * 矩阵层级说明：
 * - direct (核心层): 股票代码、标准简称 → 红色预警
 * - related (关联层): 核心人物、旗下业务、英文名 → 蓝色提醒
 * - context (板块层): 行业标签、竞争对手 → 背景聚合
 */

const mongoose = require('mongoose');

// 三层关键词矩阵子模式
const MatrixSchema = new mongoose.Schema({
    // 核心层: 用于高频扫描和红色预警
    // 包含: 股票代码、标准简称
    direct: {
        type: [String],
        default: [],
        index: true
    },

    // 关联层: 用于中频扫描
    // 包含: 核心人物、旗下业务、英文名
    related: {
        type: [String],
        default: []
    },

    // 板块层: 用于行业背景聚合，不触发即时预警
    // 包含: 行业标签、竞争对手
    context: {
        type: [String],
        default: []
    }
}, { _id: false });

// 股票主模式
const StockSchema = new mongoose.Schema({
    // 股票代码 (如: 600519, 09618, BABA)
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },

    // 市场标识
    // sh: 上海证券交易所
    // sz: 深圳证券交易所
    // hk: 香港联交所
    // us: 美股
    market: {
        type: String,
        required: true,
        enum: ['sh', 'sz', 'hk', 'us'],
        lowercase: true
    },

    // 清洗后的股票简称 (已剔除"股份"、"集团"等后缀)
    name: {
        type: String,
        required: true,
        trim: true
    },

    // 原始全称 (腾讯接口返回)
    fullName: {
        type: String,
        trim: true
    },

    // 三层关键词矩阵
    matrix: {
        type: MatrixSchema,
        default: () => ({
            direct: [],
            related: [],
            context: []
        })
    },

    // 是否激活监控
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // 用户自定义备注
    notes: {
        type: String,
        default: ''
    },

    // 最后更新时间戳
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'stocks'
});

// 复合索引: 市场 + 代码
StockSchema.index({ market: 1, code: 1 }, { unique: true });

// 全文索引: 支持矩阵关键词搜索
StockSchema.index({
    'matrix.direct': 'text',
    'matrix.related': 'text',
    'matrix.context': 'text',
    name: 'text'
});

/**
 * 实例方法: 获取所有关键词 (扁平化)
 */
StockSchema.methods.getAllKeywords = function () {
    return [
        ...this.matrix.direct,
        ...this.matrix.related,
        ...this.matrix.context
    ];
};

/**
 * 实例方法: 添加关键词到指定层级
 * @param {string} layer - 层级: 'direct' | 'related' | 'context'
 * @param {string|string[]} keywords - 关键词
 */
StockSchema.methods.addKeywords = function (layer, keywords) {
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    const uniqueKeywords = [...new Set([...this.matrix[layer], ...keywordArray])];
    this.matrix[layer] = uniqueKeywords;
    return this.save();
};

/**
 * 静态方法: 根据关键词查找匹配的股票
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<{stock: Stock, layer: string}[]>}
 */
StockSchema.statics.findByKeyword = async function (keyword) {
    const results = [];

    // 优先匹配核心层
    const directMatches = await this.find({
        'matrix.direct': { $regex: keyword, $options: 'i' },
        isActive: true
    });
    directMatches.forEach(stock => {
        results.push({ stock, layer: 'direct' });
    });

    // 匹配关联层
    const relatedMatches = await this.find({
        'matrix.related': { $regex: keyword, $options: 'i' },
        isActive: true,
        _id: { $nin: directMatches.map(s => s._id) }
    });
    relatedMatches.forEach(stock => {
        results.push({ stock, layer: 'related' });
    });

    // 匹配板块层
    const contextMatches = await this.find({
        'matrix.context': { $regex: keyword, $options: 'i' },
        isActive: true,
        _id: { $nin: [...directMatches, ...relatedMatches].map(s => s._id) }
    });
    contextMatches.forEach(stock => {
        results.push({ stock, layer: 'context' });
    });

    return results;
};

/**
 * 静态方法: 获取所有激活股票的关键词矩阵
 */
StockSchema.statics.getActiveMatrix = async function () {
    const stocks = await this.find({ isActive: true });
    return stocks.map(stock => ({
        code: stock.code,
        market: stock.market,
        name: stock.name,
        matrix: stock.matrix
    }));
};

module.exports = mongoose.model('Stock', StockSchema);
