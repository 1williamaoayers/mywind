/**
 * 探测 HKEX 高级搜索页 DOM
 */
const puppeteer = require('./utils/puppeteerBase');

async function probe() {
    console.log('=== 探测 HKEX 高级搜索页 ===');
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        await page.goto('https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=zh', { waitUntil: 'networkidle0' });

        // 打印所有 input 和 select
        const elements = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                tag: 'input',
                id: i.id,
                name: i.name,
                type: i.type,
                placeholder: i.placeholder,
                value: i.value
            }));

            const selects = Array.from(document.querySelectorAll('select')).map(s => ({
                tag: 'select',
                id: s.id,
                name: s.name,
                options: Array.from(s.options).map(o => o.text).slice(0, 5) // 只看前5个选项
            }));

            const links = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('搜索') || a.textContent.includes('Search'));

            return [...inputs, ...selects, ...links.map(l => ({ tag: 'a', text: l.textContent, id: l.id }))];
        });

        console.log(JSON.stringify(elements, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await puppeteer.closePage(page);
    }
}

probe();
