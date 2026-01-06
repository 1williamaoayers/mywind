/**
 * 港股关键词矩阵配置
 * 
 * 港股特色关键词，用于：
 * 1. 新闻过滤和分类
 * 2. 预警级别判断
 * 3. 研报相关性匹配
 */

// 港股核心层关键词（直接相关，高优先级）
const HK_DIRECT_KEYWORDS = {
    // 公司行动 - 🔴 红色预警
    corporate_action: [
        '供股', '配股', '拆股', '合股', '私有化',
        '要约收购', '自愿性全面要约', '强制性全面要约',
        '股份回购', '注销股份'
    ],

    // 停复牌 - 🔴 红色预警
    suspension: [
        '停牌', '复牌', '除牌', '转板',
        '暂停买卖', '恢复买卖', '取消上市地位'
    ],

    // 分红派息 - 🟢 绿色利好
    dividend: [
        '派息', '末期息', '中期息', '特别息',
        '分红', '派发股息', '股息率'
    ],

    // 股东变动 - 🟡 关注
    shareholder: [
        '大股东', '控股股东', '股权变动',
        '增持', '减持', '权益披露',
        '主要股东', '关连人士'
    ],

    // 沽空 - 🔴 红色预警
    short_selling: [
        '沽空', '做空', '淡仓', '空头',
        '沽空比率', '沽空金额'
    ],

    // 盈利预警 - 🔴 红色预警
    profit_warning: [
        '盈利预警', '盈利警告', '盈喜', '盈警',
        '预期亏损', '预计亏损', '业绩预告'
    ],

    // 债务危机 - 🔴 红色预警
    debt_crisis: [
        '债务违约', '未能偿还', '清盘呈请',
        '清盘令', '破产', '重组债务'
    ]
};

// 港股板块层关键词（行业相关）
const HK_SECTOR_KEYWORDS = {
    // 互联网科技
    internet_tech: [
        '腾讯', '阿里巴巴', '美团', '京东', '快手',
        '小米', '百度', '网易', '哔哩哔哩', '携程',
        '拼多多', '贝壳', '满帮', 'BOSS直聘'
    ],

    // 新能源车
    ev: [
        '比亚迪', '蔚来', '小鹏', '理想', '零跑',
        '吉利', '长城', '广汽', '宁德时代'
    ],

    // 医药生物
    pharma: [
        '百济神州', '信达生物', '君实生物', '药明生物',
        '金斯瑞', '康方生物', '复宏汉霖', '再鼎医药',
        '石药集团', '中国生物制药', '翰森制药'
    ],

    // 内房股
    property: [
        '恒大', '碧桂园', '万科', '融创', '龙湖',
        '华润置地', '中海', '保利', '世茂', '旭辉',
        '雅居乐', '绿城', '金茂'
    ],

    // 银行保险
    finance: [
        '汇丰', '恒生银行', '中银香港', '东亚银行',
        '友邦', '中国平安', '中国人寿', '新华保险',
        '众安在线', '中国太保'
    ],

    // 消费
    consumer: [
        '安踏', '李宁', '特步', '海底捞', '九毛九',
        '太二', '呷哺呷哺', '百胜中国', '颐海国际',
        '农夫山泉', '蒙牛', '伊利'
    ],

    // 电讯
    telecom: [
        '中国移动', '中国电信', '中国联通'
    ],

    // 公用事业
    utilities: [
        '中电控股', '电能实业', '港灯', '华润电力',
        '中国电力', '华电国际', '中广核电力'
    ]
};

// 港股预警关键词配置
const HK_ALERT_KEYWORDS = {
    // 🔴 红色预警（利空/风险）
    danger: [
        ...HK_DIRECT_KEYWORDS.suspension,
        ...HK_DIRECT_KEYWORDS.short_selling,
        ...HK_DIRECT_KEYWORDS.profit_warning,
        ...HK_DIRECT_KEYWORDS.debt_crisis,
        '停牌', '沽空', '盈警', '亏损', '违约', '清盘',
        '做空', '负面', '下调', '降级', '减持'
    ],

    // 🟢 绿色利好
    success: [
        ...HK_DIRECT_KEYWORDS.dividend,
        '盈喜', '派息', '回购', '增持', '上调', '升级',
        '买入', '超预期', '创新高', '突破', '利好'
    ],

    // 🔵 蓝色关注
    primary: [
        ...HK_DIRECT_KEYWORDS.corporate_action,
        ...HK_DIRECT_KEYWORDS.shareholder,
        '供股', '配股', '股东大会', '业绩会', '投资者日',
        '战略合作', '签约', '中标'
    ]
};

// 港股特色维度
const HK_DIMENSIONS = {
    REALTIME: 'hk_realtime',      // 港股实时快讯
    OFFICIAL: 'hk_official',      // 港交所官方
    NORTHBOUND: 'hk_northbound',  // 港股通资金
    RESEARCH: 'hk_research',      // 港股研报
    SOCIAL: 'hk_social',          // 港股舆情
    IPO: 'hk_ipo'                 // 港股新股
};

/**
 * 检测港股预警类型
 */
function detectHKAlertType(title, content = '') {
    const text = (title + ' ' + content).toLowerCase();

    // 检测红色预警
    for (const keyword of HK_ALERT_KEYWORDS.danger) {
        if (text.includes(keyword.toLowerCase())) {
            return 'danger';
        }
    }

    // 检测绿色利好
    for (const keyword of HK_ALERT_KEYWORDS.success) {
        if (text.includes(keyword.toLowerCase())) {
            return 'success';
        }
    }

    // 检测蓝色关注
    for (const keyword of HK_ALERT_KEYWORDS.primary) {
        if (text.includes(keyword.toLowerCase())) {
            return 'primary';
        }
    }

    return null;
}

/**
 * 匹配港股板块
 */
function matchHKSector(title, content = '') {
    const text = (title + ' ' + content).toLowerCase();
    const matchedSectors = [];

    for (const [sector, keywords] of Object.entries(HK_SECTOR_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                matchedSectors.push({
                    sector,
                    keyword,
                    sectorName: getSectorName(sector)
                });
                break; // 每个板块只匹配一次
            }
        }
    }

    return matchedSectors;
}

/**
 * 获取板块中文名
 */
function getSectorName(sector) {
    const names = {
        internet_tech: '互联网科技',
        ev: '新能源车',
        pharma: '医药生物',
        property: '内房股',
        finance: '银行保险',
        consumer: '消费',
        telecom: '电讯',
        utilities: '公用事业'
    };
    return names[sector] || sector;
}

/**
 * 判断是否为港股相关新闻
 */
function isHKStockNews(title, content = '') {
    const text = (title + ' ' + content).toLowerCase();

    // 检查港股特征关键词
    const hkIndicators = [
        '港股', '恒指', '恒生', '港交所', '披露易',
        '港元', 'hk$', '港币', '北水', '南下资金',
        '.hk', '香港上市', '联交所'
    ];

    for (const indicator of hkIndicators) {
        if (text.includes(indicator.toLowerCase())) {
            return true;
        }
    }

    // 检查是否包含港股板块股票
    for (const keywords of Object.values(HK_SECTOR_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return true;
            }
        }
    }

    return false;
}

/**
 * 获取所有港股关键词（用于过滤）
 */
function getAllHKKeywords() {
    const allKeywords = new Set();

    // 核心层
    for (const keywords of Object.values(HK_DIRECT_KEYWORDS)) {
        keywords.forEach(k => allKeywords.add(k));
    }

    // 板块层
    for (const keywords of Object.values(HK_SECTOR_KEYWORDS)) {
        keywords.forEach(k => allKeywords.add(k));
    }

    return Array.from(allKeywords);
}

module.exports = {
    HK_DIRECT_KEYWORDS,
    HK_SECTOR_KEYWORDS,
    HK_ALERT_KEYWORDS,
    HK_DIMENSIONS,
    detectHKAlertType,
    matchHKSector,
    getSectorName,
    isHKStockNews,
    getAllHKKeywords
};
