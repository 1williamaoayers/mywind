const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('正在访问 Gemini 分享链接...');
    await page.goto('https://gemini.google.com/share/cda82bf37e3d', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    // 等待页面加载
    await new Promise(r => setTimeout(r, 8000));

    // 滚动到页面底部以加载所有内容
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    await new Promise(r => setTimeout(r, 3000));

    // 获取页面所有文本内容
    const content = await page.evaluate(() => {
        return document.body.innerText;
    });

    // 保存到文件
    fs.writeFileSync('gemini-share-content.txt', content, 'utf8');
    console.log('内容已保存到 gemini-share-content.txt');
    console.log('内容长度:', content.length, '字符');

    await browser.close();
})();
