/**
 * HKEX 财报深度搜索脚本 (支持翻页)
 * 目标: 找到指定股票的 "年报" 或 "中期报告" PDF
 */
const puppeteer = require('../utils/puppeteerBase');

async function searchReport(stockCode, keywords = ['年報', '中期報告', 'Annual Report', 'Interim Report']) {
    console.log(`=== 深度搜索 ${stockCode} 财报 ===`);
    const page = await puppeteer.createPage({ timeout: 60000 });
    let foundUrl = null;

    try {
        // 1. 访问 HKEX 简易搜索页
        await page.goto('https://www.hkexnews.hk/index_c.htm', { waitUntil: 'networkidle2' });

        // 2. 输入代码
        await page.evaluate((code) => {
            const input = document.querySelector('#searchStockCode');
            input.value = code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, stockCode);
        await new Promise(r => setTimeout(r, 2000)); // 等待下拉

        // 3. 点击下拉项
        await page.evaluate(() => {
            const tr = document.querySelector('.autocomplete-suggestions table tr');
            if (tr) tr.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // 4. 提交搜索
        await page.evaluate(() => {
            document.querySelector('form[action*="titlesearch"]').submit();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // 5. 翻页查找
        let pageNum = 1;
        const maxPages = 10; // 最多翻10页

        while (pageNum <= maxPages) {
            console.log(`正在检查第 ${pageNum} 页...`);

            // 提取当前页的所有 PDF 链接
            const docs = await page.evaluate(() => {
                const rows = document.querySelectorAll('tr');
                return Array.from(rows).map(row => {
                    const link = row.querySelector('.doc-link a');
                    const date = row.querySelector('.date')?.textContent?.trim();
                    if (link && link.href) {
                        return {
                            title: link.textContent.trim(),
                            url: link.href,
                            date: date
                        };
                    }
                    return null;
                }).filter(i => i);
            });

            // 检查匹配项
            for (const doc of docs) {
                // 排除 "摘要", "通知", "公告" 等非主文件，只找主报告
                const isMatch = keywords.some(kw => doc.title.includes(kw));
                const isPDF = doc.url.toLowerCase().endsWith('.pdf');
                // 排除通知信、摘要等小文件
                const isMainReport = !doc.title.includes('摘要') && !doc.title.includes('通知') && !doc.title.includes('表格');

                if (isMatch && isPDF && isMainReport) {
                    console.log(`\n🎉 找到目标文件!`);
                    console.log(`标题: ${doc.title}`);
                    console.log(`日期: ${doc.date}`);
                    console.log(`URL: ${doc.url}`);
                    foundUrl = doc.url;
                    break;
                }
            }

            if (foundUrl) break;

            // 没找到，尝试下一页
            // HKEX 的下一页按钮通常有 class="next"
            const hasNext = await page.evaluate(() => {
                const nextBtn = document.querySelector('a.next');
                if (nextBtn && !nextBtn.className.includes('disabled')) {
                    nextBtn.click();
                    return true;
                }
                return false;
            });

            if (hasNext) {
                await new Promise(r => setTimeout(r, 3000)); // 等待加载
                pageNum++;
            } else {
                console.log('没有下一页了。');
                break;
            }
        }

    } catch (e) {
        console.error('搜索出错:', e);
    } finally {
        await puppeteer.closePage(page);
    }

    return foundUrl;
}

// 执行搜索
searchReport('01810');
