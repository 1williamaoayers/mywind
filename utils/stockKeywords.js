/**
 * 股票关键词工具
 * 
 * 功能：
 * 1. 根据股票信息自动生成关键词
 * 2. 行业分类关键词
 * 3. 股票代码标准化
 */

// ==================== 行业关键词映射 ====================

const INDUSTRY_KEYWORDS = {
    // 消费
    '白酒': ['白酒', '酒业', '酒类', '茅台', '五粮液', '泸州老窖'],
    '食品饮料': ['食品', '饮料', '乳业', '调味品', '休闲食品'],
    '家电': ['家电', '空调', '冰箱', '洗衣机', '小家电'],

    // 科技
    '半导体': ['半导体', '芯片', '晶圆', '封测', '设备', 'IC'],
    '消费电子': ['消费电子', '手机', '笔记本', '平板', '可穿戴'],
    '软件': ['软件', 'SaaS', '云计算', '数据库', 'ERP'],
    '人工智能': ['AI', '人工智能', '机器人', '大模型', 'GPT', '算力'],

    // 新能源
    '新能源汽车': ['新能源汽车', '电动车', 'EV', '造车', '智能驾驶'],
    '光伏': ['光伏', '太阳能', '组件', '电池片', '逆变器'],
    '锂电池': ['锂电池', '电池', '正极', '负极', '电解液', '隔膜'],
    '储能': ['储能', '电化学储能', '抽水蓄能'],

    // 金融
    '银行': ['银行', '贷款', '存款', '净息差', '不良率'],
    '保险': ['保险', '寿险', '财险', '保费', '理赔'],
    '券商': ['券商', '证券', '经纪', '投行', '自营'],

    // 医药
    '创新药': ['创新药', '研发', '临床', 'FDA', 'CDE'],
    '医疗器械': ['医疗器械', '耗材', '设备', '诊断'],
    '中药': ['中药', '中成药', '中医'],
    'CXO': ['CXO', 'CRO', 'CDMO', 'CMO', '外包'],

    // 周期
    '钢铁': ['钢铁', '钢材', '铁矿', '螺纹钢'],
    '有色': ['有色', '铜', '铝', '锂', '稀土'],
    '煤炭': ['煤炭', '动力煤', '焦煤', '焦炭'],
    '化工': ['化工', '化学', '塑料', '橡胶'],

    // 基建
    '房地产': ['房地产', '地产', '楼市', '房价', '销售'],
    '建筑': ['建筑', '基建', '工程', '施工'],
    '建材': ['建材', '水泥', '玻璃', '陶瓷']
};

// ==================== 市场代码映射 ====================

const MARKET_SUFFIX = {
    'SH': '.SH',
    'SZ': '.SZ',
    'HK': '.HK',
    'US': ''
};

const MARKET_NAMES = {
    'SH': '沪市',
    'SZ': '深市',
    'HK': '港股',
    'US': '美股'
};

// ==================== 核心函数 ====================

/**
 * 根据股票信息生成关键词
 */
function generateKeywords(stockInfo) {
    const keywords = new Set();

    const {
        stockCode,
        stockName,
        shortName,
        market = 'SH',
        industry,
        concepts = [],
        executives = [],
        alias = []
    } = stockInfo;

    // 1. 股票代码
    if (stockCode) {
        keywords.add(stockCode);
        // 带市场后缀的代码
        const suffix = MARKET_SUFFIX[market];
        if (suffix) {
            keywords.add(stockCode + suffix);
        }
    }

    // 2. 股票名称
    if (stockName) {
        keywords.add(stockName);
        // 提取简称（去掉股份、集团等后缀）
        const cleanName = extractShortName(stockName);
        if (cleanName) {
            keywords.add(cleanName);
        }
    }

    // 3. 简称
    if (shortName) {
        keywords.add(shortName);
    }

    // 4. 别名
    for (const a of alias) {
        keywords.add(a);
    }

    // 5. 行业关键词
    if (industry) {
        keywords.add(industry);
        // 添加行业相关关键词
        const industryKws = INDUSTRY_KEYWORDS[industry];
        if (industryKws) {
            for (const kw of industryKws.slice(0, 3)) { // 只取前3个
                keywords.add(kw);
            }
        }
    }

    // 6. 概念板块
    for (const concept of concepts.slice(0, 5)) { // 只取前5个
        keywords.add(concept);
    }

    // 7. 高管（可选，默认关闭）
    // for (const exec of executives.slice(0, 2)) {
    //     keywords.add(exec);
    // }

    return Array.from(keywords);
}

/**
 * 提取股票简称
 */
function extractShortName(fullName) {
    if (!fullName) return null;

    // 移除常见后缀
    const suffixes = [
        '股份有限公司', '有限公司', '股份', '集团',
        '控股', '科技', '实业', '投资'
    ];

    let name = fullName;
    for (const suffix of suffixes) {
        name = name.replace(suffix, '');
    }

    // 如果处理后太短，返回原名
    if (name.length < 2) {
        return null;
    }

    return name;
}

/**
 * 标准化股票代码
 */
function normalizeStockCode(code, market) {
    if (!code) return null;

    // 移除可能存在的后缀
    code = code.replace(/\.(SH|SZ|HK|SS|SZ)$/i, '');

    // 港股代码补零
    if (market === 'HK' && code.length < 5) {
        code = code.padStart(5, '0');
    }

    return code;
}

/**
 * 根据代码判断市场
 */
function detectMarket(code) {
    if (!code) return 'SH';

    // 港股（5位数字）
    if (/^\d{5}$/.test(code)) {
        return 'HK';
    }

    // 沪市（6开头）
    if (/^6\d{5}$/.test(code)) {
        return 'SH';
    }

    // 深市（0或3开头）
    if (/^[03]\d{5}$/.test(code)) {
        return 'SZ';
    }

    // 北交所（8开头）
    if (/^8\d{5}$/.test(code)) {
        return 'BJ';
    }

    // 美股（字母）
    if (/^[A-Z]+$/.test(code)) {
        return 'US';
    }

    return 'SH';
}

/**
 * 获取行业关键词
 */
function getIndustryKeywords(industry) {
    return INDUSTRY_KEYWORDS[industry] || [];
}

/**
 * 获取所有行业
 */
function getAllIndustries() {
    return Object.keys(INDUSTRY_KEYWORDS);
}

/**
 * 匹配文本中的股票代码
 */
function extractStockCodes(text) {
    if (!text) return [];

    const codes = [];

    // 匹配A股代码
    const aSharePattern = /[（(]([036]\d{5})[）)]/g;
    let match;
    while ((match = aSharePattern.exec(text)) !== null) {
        codes.push({ code: match[1], market: detectMarket(match[1]) });
    }

    // 匹配港股代码
    const hkPattern = /[（(](\d{5})[）)]|港股[：:]\s*(\d{5})/g;
    while ((match = hkPattern.exec(text)) !== null) {
        const code = match[1] || match[2];
        codes.push({ code, market: 'HK' });
    }

    return codes;
}

// ==================== 导出 ====================

module.exports = {
    generateKeywords,
    extractShortName,
    normalizeStockCode,
    detectMarket,
    getIndustryKeywords,
    getAllIndustries,
    extractStockCodes,
    INDUSTRY_KEYWORDS,
    MARKET_SUFFIX,
    MARKET_NAMES
};
