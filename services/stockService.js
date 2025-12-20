/**
 * Stock Service - 股票识别与矩阵生成服务
 * 
 * 核心功能：
 * 1. 调用腾讯财经接口获取股票信息
 * 2. GBK 转码处理
 * 3. 名称清洗 (剔除干扰后缀)
 * 4. 自动生成三层关键词矩阵
 */

const axios = require('axios');
const iconv = require('iconv-lite');
const Stock = require('../models/Stock');

// 市场前缀映射
const MARKET_PREFIX = {
    sh: 'sh',      // 上海证券交易所
    sz: 'sz',      // 深圳证券交易所
    hk: 'r_hk',    // 香港联交所
    us: 'us'       // 美股
};

// 需要清洗的干扰后缀
const SUFFIX_PATTERNS = [
    /股份有限公司$/,
    /有限公司$/,
    /集团$/,
    /控股$/,
    /-SW$/i,
    /-W$/i,
    /-S$/i,
    /\(.*\)$/,    // 括号内容
    /股份$/,
    /有限$/,
    /公司$/
];

/**
 * 清洗股票名称
 * @param {string} name - 原始名称
 * @returns {string} 清洗后的简称
 */
function cleanStockName(name) {
    if (!name) return '';

    let cleaned = name.trim();

    // 逐一剔除干扰后缀
    for (const pattern of SUFFIX_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

/**
 * 解析腾讯接口返回数据
 * @param {string} raw - 原始 GBK 编码字符串
 * @param {string} market - 市场标识
 * @returns {object|null} 解析后的股票信息
 */
function parseStockData(raw, market) {
    if (!raw || raw.includes('pv_none')) {
        return null;
    }

    // 格式: v_sh600519="1~贵州茅台~600519~1799.00~..."
    const match = raw.match(/="([^"]+)"/);
    if (!match) return null;

    const fields = match[1].split('~');
    if (fields.length < 5) return null;

    // 字段映射 (腾讯财经格式)
    // [0] 未知
    // [1] 股票名称
    // [2] 股票代码
    // [3] 当前价格
    // [4] 昨收价格
    // ...更多字段

    const code = fields[2];
    const fullName = fields[1];
    const name = cleanStockName(fullName);
    const price = parseFloat(fields[3]) || 0;
    const prevClose = parseFloat(fields[4]) || 0;

    return {
        code,
        market,
        name,
        fullName,
        price,
        prevClose,
        changePercent: prevClose > 0 ? ((price - prevClose) / prevClose * 100).toFixed(2) : 0
    };
}

/**
 * 从腾讯接口获取股票信息
 * @param {string} market - 市场: sh/sz/hk/us
 * @param {string} code - 股票代码
 * @returns {Promise<object|null>} 股票信息
 */
async function fetchStock(market, code) {
    const prefix = MARKET_PREFIX[market];
    if (!prefix) {
        throw new Error(`不支持的市场类型: ${market}`);
    }

    const url = `http://qt.gtimg.cn/q=${prefix}${code}`;

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // GBK 转码为 UTF-8
        const rawData = iconv.decode(Buffer.from(response.data), 'gbk');

        return parseStockData(rawData, market);
    } catch (error) {
        console.error(`获取股票信息失败 [${market}${code}]:`, error.message);
        return null;
    }
}

/**
 * 批量获取股票信息
 * @param {Array<{market: string, code: string}>} stocks - 股票列表
 * @returns {Promise<object[]>} 股票信息数组
 */
async function fetchMultipleStocks(stocks) {
    // 腾讯接口支持批量查询
    const queryParts = stocks.map(s => `${MARKET_PREFIX[s.market]}${s.code}`);
    const url = `http://qt.gtimg.cn/q=${queryParts.join(',')}`;

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const rawData = iconv.decode(Buffer.from(response.data), 'gbk');
        const lines = rawData.split(';').filter(line => line.trim());

        const results = [];
        for (let i = 0; i < lines.length; i++) {
            const parsed = parseStockData(lines[i], stocks[i]?.market);
            if (parsed) {
                results.push(parsed);
            }
        }

        return results;
    } catch (error) {
        console.error('批量获取股票信息失败:', error.message);
        return [];
    }
}

/**
 * 生成初始三层关键词矩阵
 * @param {object} stockInfo - 股票基础信息
 * @returns {object} 矩阵对象
 */
function generateInitialMatrix(stockInfo) {
    const { code, name, fullName, market } = stockInfo;

    const matrix = {
        direct: [],
        related: [],
        context: []
    };

    // 核心层: 代码 + 清洗后简称
    matrix.direct.push(code);
    if (name) {
        matrix.direct.push(name);
    }

    // 关联层: 全称 (如果与简称不同)
    if (fullName && fullName !== name) {
        matrix.related.push(cleanStockName(fullName));
    }

    // 板块层: 根据市场添加默认标签
    switch (market) {
        case 'sh':
            matrix.context.push('沪市', 'A股');
            break;
        case 'sz':
            matrix.context.push('深市', 'A股');
            break;
        case 'hk':
            matrix.context.push('港股', '港交所');
            break;
        case 'us':
            matrix.context.push('美股', '中概股');
            break;
    }

    return matrix;
}

/**
 * 添加股票到监控列表
 * @param {string} market - 市场
 * @param {string} code - 股票代码
 * @param {object} customMatrix - 自定义矩阵关键词
 * @returns {Promise<Stock>} 保存的股票文档
 */
async function addStock(market, code, customMatrix = {}) {
    // 从腾讯接口获取基础信息
    const stockInfo = await fetchStock(market, code);

    if (!stockInfo) {
        throw new Error(`无法获取股票信息: ${market}${code}`);
    }

    // 生成初始矩阵
    const initialMatrix = generateInitialMatrix(stockInfo);

    // 合并自定义关键词
    const matrix = {
        direct: [...new Set([...initialMatrix.direct, ...(customMatrix.direct || [])])],
        related: [...new Set([...initialMatrix.related, ...(customMatrix.related || [])])],
        context: [...new Set([...initialMatrix.context, ...(customMatrix.context || [])])]
    };

    // 创建或更新股票记录
    const stock = await Stock.findOneAndUpdate(
        { code: code.toUpperCase(), market },
        {
            code: code.toUpperCase(),
            market,
            name: stockInfo.name,
            fullName: stockInfo.fullName,
            matrix,
            isActive: true,
            lastUpdated: new Date()
        },
        { upsert: true, new: true }
    );

    return stock;
}

/**
 * 批量添加股票
 * @param {Array<{market: string, code: string, customMatrix?: object}>} stockList
 * @returns {Promise<Stock[]>}
 */
async function addMultipleStocks(stockList) {
    const results = [];

    for (const item of stockList) {
        try {
            const stock = await addStock(item.market, item.code, item.customMatrix);
            results.push({ success: true, stock });
        } catch (error) {
            results.push({
                success: false,
                code: item.code,
                market: item.market,
                error: error.message
            });
        }

        // 限流: 每个请求间隔 200ms
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}

/**
 * 更新股票矩阵关键词
 * @param {string} stockId - 股票 MongoDB ID
 * @param {string} layer - 层级: direct/related/context
 * @param {string[]} keywords - 要添加的关键词
 * @returns {Promise<Stock>}
 */
async function updateMatrix(stockId, layer, keywords) {
    const stock = await Stock.findById(stockId);
    if (!stock) {
        throw new Error('股票不存在');
    }

    if (!['direct', 'related', 'context'].includes(layer)) {
        throw new Error('无效的矩阵层级');
    }

    // 合并并去重
    stock.matrix[layer] = [...new Set([...stock.matrix[layer], ...keywords])];
    stock.lastUpdated = new Date();

    return stock.save();
}

/**
 * 刷新股票价格信息
 * @param {string} stockId - 股票 MongoDB ID
 * @returns {Promise<object>} 更新后的价格信息
 */
async function refreshPrice(stockId) {
    const stock = await Stock.findById(stockId);
    if (!stock) {
        throw new Error('股票不存在');
    }

    const info = await fetchStock(stock.market, stock.code);
    if (!info) {
        throw new Error('无法获取最新价格');
    }

    return {
        code: stock.code,
        name: stock.name,
        price: info.price,
        changePercent: info.changePercent
    };
}

/**
 * 获取所有活跃股票
 * @returns {Promise<Stock[]>}
 */
async function getActiveStocks() {
    return Stock.find({ isActive: true }).sort({ market: 1, code: 1 });
}

/**
 * 停用股票监控
 * @param {string} stockId - 股票 MongoDB ID
 */
async function deactivateStock(stockId) {
    return Stock.findByIdAndUpdate(stockId, { isActive: false }, { new: true });
}

/**
 * 激活股票监控
 * @param {string} stockId - 股票 MongoDB ID
 */
async function activateStock(stockId) {
    return Stock.findByIdAndUpdate(stockId, { isActive: true }, { new: true });
}

/**
 * 删除股票
 * @param {string} stockId - 股票 MongoDB ID
 */
async function deleteStock(stockId) {
    return Stock.findByIdAndDelete(stockId);
}

module.exports = {
    // 腾讯接口
    fetchStock,
    fetchMultipleStocks,

    // 名称处理
    cleanStockName,

    // 矩阵生成
    generateInitialMatrix,

    // CRUD 操作
    addStock,
    addMultipleStocks,
    updateMatrix,
    getActiveStocks,
    deactivateStock,
    activateStock,
    deleteStock,
    refreshPrice
};
