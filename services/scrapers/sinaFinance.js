/**
 * 新浪财经港股财务数据采集器
 * 
 * 数据源: https://stock.finance.sina.com.cn/hkstock/finance/{stockCode}.html
 * 
 * 采集内容:
 * - 重要财务指标 (营业额、损益额、每股盈利等)
 * - 资产负债表 (资产、负债、股东权益等)
 * - 现金流量表 (经营/投资/融资现金流)
 * - 综合损益表 (营业额、税项、盈利等)
 * 
 * 创建日期: 2026-01-02
 */

const puppeteer = require('../../utils/puppeteerBase');

const SOURCE_NAME = 'sina_finance';

/**
 * 采集单只股票的财务数据
 * @param {string} stockCode - 港股代码，如 '09618'
 * @returns {Promise<Object>} 财务数据
 */
async function scrapeStockFinance(stockCode) {
    const url = `https://stock.finance.sina.com.cn/hkstock/finance/${stockCode}.html`;
    let page = null;

    try {
        page = await puppeteer.createPage({
            timeout: 60000,
            blockResources: false
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        // 提取表格数据
        const data = await page.evaluate(() => {
            const result = {
                tables: {}
            };

            // 表格名称映射
            const tableNames = ['financialIndicators', 'balanceSheet', 'cashFlow', 'incomeStatement'];
            const tableNamesCN = ['重要财务指标', '资产负债表', '现金流量表', '综合损益表'];

            // 查找所有表格
            document.querySelectorAll('table').forEach((table, idx) => {
                if (idx >= 4) return;  // 只取前4个主要表格

                const rows = [];
                table.querySelectorAll('tr').forEach(tr => {
                    const cells = [];
                    tr.querySelectorAll('th, td').forEach(cell => {
                        const text = cell.textContent?.trim();
                        if (text) cells.push(text);
                    });
                    if (cells.length > 0) rows.push(cells);
                });

                if (rows.length > 0) {
                    const tableName = tableNames[idx] || `table${idx}`;
                    result.tables[tableName] = {
                        nameCN: tableNamesCN[idx] || `表格${idx + 1}`,
                        headers: rows[0],
                        data: rows.slice(1).map(row => {
                            const obj = {};
                            row.forEach((cell, i) => {
                                if (i === 0) {
                                    obj.metric = cell;
                                } else if (rows[0][i]) {
                                    obj[rows[0][i]] = cell;
                                }
                            });
                            return obj;
                        })
                    };
                }
            });

            return result;
        });

        return {
            source: SOURCE_NAME,
            stockCode: stockCode,
            url: url,
            crawlTime: new Date().toISOString(),
            success: true,
            ...data.tables
        };

    } catch (error) {
        return {
            source: SOURCE_NAME,
            stockCode: stockCode,
            url: url,
            crawlTime: new Date().toISOString(),
            success: false,
            error: error.message
        };
    } finally {
        if (page) {
            await puppeteer.closePage(page);
        }
    }
}

/**
 * 批量采集多只股票的财务数据
 * @param {string[]} stockCodes - 港股代码列表
 * @returns {Promise<Object[]>} 财务数据列表
 */
async function scrapeMultipleStocks(stockCodes) {
    const results = [];

    for (const code of stockCodes) {
        const result = await scrapeStockFinance(code);
        results.push(result);

        // 间隔避免请求过快
        await new Promise(r => setTimeout(r, 2000));
    }

    return results;
}

module.exports = {
    name: SOURCE_NAME,
    displayName: '新浪财经',
    description: '港股财务数据采集 - 财务指标、资产负债表、现金流量表、综合损益表',
    scrapeStockFinance,
    scrapeMultipleStocks
};
