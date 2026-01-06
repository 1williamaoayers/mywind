/**
 * 从小米官网查找年报/中期报告
 */
const puppeteer = require('../utils/puppeteerBase');

async function findMiReport() {
    console.log('=== 搜索小米官网财报 ===');
    const page = await puppeteer.createPage({ timeout: 60000 });

    try {
        // 访问小米 IR 年报页面 (可能需要调整 URL)
        // 尝试: https://ir.mi.com/zh-hans/financial-information/annual-reports
        const url = 'https://ir.mi.com/zh-hans/financial-information/annual-reports';
        console.log(`访问: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        const pdfs = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .filter(a => a.href.endsWith('.pdf') && (a.textContent.includes('年报') || a.textContent.includes('报告')))
                .map(a => ({
                    title: a.textContent.trim(),
                    url: a.href
                }));
        });

        console.log(`\n找到 ${pdfs.length} 个PDF:`);
        pdfs.forEach(p => console.log(`- ${p.title}\n  ${p.url}`));

        if (pdfs.length > 0) {
            console.log(`\n建议使用: ${pdfs[0].url}`);
        } else {
            console.log('未找到PDF，尝试中期报告页面...');
            // 尝试中期报告
            await page.goto('https://ir.mi.com/zh-hans/financial-information/interim-reports', { waitUntil: 'networkidle0' });
            const interimPdfs = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links
                    .filter(a => a.href.endsWith('.pdf') && (a.textContent.includes('报告')))
                    .map(a => ({
                        title: a.textContent.trim(),
                        url: a.href
                    }));
            });
            console.log(`\n找到 ${interimPdfs.length} 个中期报告PDF:`);
            interimPdfs.forEach(p => console.log(`- ${p.title}\n  ${p.url}`));
        }

    } catch (e) {
        console.error('搜索出错:', e);
    } finally {
        await puppeteer.closePage(page);
    }
}

findMiReport();
