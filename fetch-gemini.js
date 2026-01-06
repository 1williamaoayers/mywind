const puppeteer = require('puppeteer');

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

    // 获取页面所有文本内容
    const content = await page.evaluate(() => {
        return document.body.innerText;
    });

    console.log('=== 页面内容开始 ===');
    console.log(content);
    console.log('=== 页面内容结束 ===');

    await browser.close();
})();
