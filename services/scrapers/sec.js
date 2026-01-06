/**
 * SEC EDGAR 爬虫
 * 
 * 数据源：美国证券交易委员会 EDGAR 系统
 * 采集方式：HTTP API（官方 API）
 * 内容：10-K、10-Q、8-K、6-K 等美股公告
 */

const http = require('../../utils/httpClient');

const secStatus = {
    lastFetchTime: null,
    totalFetched: 0,
    successCount: 0,
    failCount: 0
};

// SEC 官方要求的 User-Agent 格式
const SEC_USER_AGENT = 'MyWind Research (contact@example.com)';

// 常见的文件类型
const FORM_TYPES = {
    '10-K': '年度报告',
    '10-Q': '季度报告',
    '8-K': '重大事件',
    '6-K': '外国私发行人报告',
    'DEF 14A': '股东大会代理声明',
    '13F': '机构持仓报告',
    '4': '内部人交易',
    'S-1': 'IPO 招股书',
    '424B': '招股说明书补充'
};

/**
 * 获取最新的 SEC 提交
 */
async function scrapeSECFilings(options = {}) {
    const { maxItems = 50, formType = '' } = options;
    const results = [];

    try {
        // SEC RSS Feed - 最新提交
        const url = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=' +
            encodeURIComponent(formType) +
            '&company=&dateb=&owner=include&count=' + maxItems +
            '&output=atom';

        const response = await http.get(url, {
            headers: {
                'User-Agent': SEC_USER_AGENT,
                'Accept': 'application/atom+xml'
            },
            timeout: 30000
        });

        // 解析 Atom Feed
        const entries = response.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];

        for (const entry of entries) {
            const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
            const link = (entry.match(/<link[^>]*href="([^"]*)"/) || [])[1] || '';
            const updated = (entry.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
            const summary = (entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || '';

            // 解析公司名称和表格类型
            const formMatch = title.match(/^(.+?) \((\d+)\) \((.+?)\)/);

            results.push({
                title: title.replace(/<[^>]+>/g, '').trim(),
                content: summary.replace(/<[^>]+>/g, '').trim(),
                url: link,
                source: 'sec_edgar',
                sourceName: 'SEC EDGAR',
                dimension: 'official',
                publishTime: updated ? new Date(updated) : new Date(),
                crawlTime: new Date(),
                companyName: formMatch ? formMatch[1] : '',
                cik: formMatch ? formMatch[2] : '',
                formType: formMatch ? formMatch[3] : '',
                formTypeDesc: FORM_TYPES[formMatch ? formMatch[3] : ''] || ''
            });
        }

        secStatus.successCount++;
        console.log(`[SEC EDGAR] 采集成功: ${results.length} 条`);

    } catch (error) {
        secStatus.failCount++;
        console.error('[SEC EDGAR] 采集失败:', error.message);
    }

    secStatus.lastFetchTime = new Date();
    secStatus.totalFetched += results.length;

    return results;
}

/**
 * 搜索特定公司的 SEC 提交
 */
async function searchSECCompany(companyName, options = {}) {
    const { maxItems = 20, formType = '' } = options;
    const results = [];

    try {
        // 先搜索公司获取 CIK
        const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&dateRange=custom&startdt=2020-01-01&enddt=${new Date().toISOString().split('T')[0]}&forms=${formType}`;

        const response = await http.get(searchUrl, {
            headers: {
                'User-Agent': SEC_USER_AGENT
            },
            timeout: 30000
        });

        if (response.data && response.data.hits && response.data.hits.hits) {
            for (const hit of response.data.hits.hits.slice(0, maxItems)) {
                const source = hit._source;
                results.push({
                    title: `${source.display_names?.[0] || companyName} - ${source.form || 'Filing'}`,
                    content: source.file_description || '',
                    url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${source.ciks?.[0]}&type=${source.form}`,
                    source: 'sec_edgar',
                    sourceName: 'SEC EDGAR',
                    dimension: 'official',
                    publishTime: source.file_date ? new Date(source.file_date) : new Date(),
                    crawlTime: new Date(),
                    companyName: source.display_names?.[0] || companyName,
                    cik: source.ciks?.[0] || '',
                    formType: source.form || ''
                });
            }
        }

        console.log(`[SEC EDGAR] 公司搜索 ${companyName}: ${results.length} 条`);

    } catch (error) {
        console.error(`[SEC EDGAR] 公司搜索失败 ${companyName}:`, error.message);
    }

    return results;
}

/**
 * 获取 8-K（重大事件公告）
 */
async function scrapeSEC8K(options = {}) {
    return scrapeSECFilings({ ...options, formType: '8-K' });
}

/**
 * 获取 13F（机构持仓）
 */
async function scrapeSEC13F(options = {}) {
    return scrapeSECFilings({ ...options, formType: '13F' });
}

function getSECStatus() {
    return {
        ...secStatus,
        lastFetchTimeStr: secStatus.lastFetchTime
            ? secStatus.lastFetchTime.toLocaleString('zh-CN')
            : '从未运行',
        formTypes: Object.keys(FORM_TYPES)
    };
}

module.exports = {
    scrapeSECFilings,
    searchSECCompany,
    scrapeSEC8K,
    scrapeSEC13F,
    getSECStatus,
    FORM_TYPES
};
