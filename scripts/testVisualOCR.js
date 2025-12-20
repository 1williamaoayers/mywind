/**
 * 视觉化 OCR 采集测试脚本
 * 
 * 测试流程：
 * 1. Puppeteer 打开今日头条首页
 * 2. 截取第一条新闻的图片
 * 3. 使用 Tesseract.js 识别标题
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// 启用 Stealth 插件
puppeteer.use(StealthPlugin());

// 输出目录
const OUTPUT_DIR = '/tmp/ocr-test';

async function main() {
    console.log('='.repeat(60));
    console.log('🔍 视觉化 OCR 采集测试');
    console.log('='.repeat(60));

    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let browser = null;

    try {
        // 1. 启动浏览器
        console.log('\n📦 步骤 1: 启动 Puppeteer (Stealth 模式)...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9'
        });

        console.log('✅ 浏览器启动成功');

        // 2. 打开今日头条
        console.log('\n🌐 步骤 2: 打开今日头条首页...');
        await page.goto('https://www.toutiao.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ 页面加载完成');

        // 等待页面稳定
        await sleep(3000);

        // 3. 截取整页截图（用于调试）
        const fullPagePath = path.join(OUTPUT_DIR, 'toutiao_fullpage.png');
        await page.screenshot({ path: fullPagePath, fullPage: false });
        console.log(`📸 整页截图已保存: ${fullPagePath}`);

        // 4. 尝试定位新闻列表项
        console.log('\n🔎 步骤 3: 定位第一条新闻...');

        // 今日头条的新闻选择器（可能需要根据实际页面调整）
        const newsSelectors = [
            '.feed-card-article-l',
            '.feed-card',
            '[data-log-name="article"]',
            '.main-content a[href*="/article/"]',
            '.article-card',
            '.item-content'
        ];

        let newsElement = null;
        for (const selector of newsSelectors) {
            newsElement = await page.$(selector);
            if (newsElement) {
                console.log(`✅ 找到新闻元素: ${selector}`);
                break;
            }
        }

        if (!newsElement) {
            console.log('⚠️ 未找到标准新闻元素，尝试截取页面主要区域...');
            // 截取页面中心区域作为备选
            const mainAreaPath = path.join(OUTPUT_DIR, 'toutiao_main.png');
            await page.screenshot({
                path: mainAreaPath,
                clip: { x: 200, y: 100, width: 800, height: 400 }
            });
            console.log(`📸 主区域截图已保存: ${mainAreaPath}`);

            // 使用主区域进行 OCR
            await performOCR(mainAreaPath);
        } else {
            // 5. 截取单条新闻
            const newsPath = path.join(OUTPUT_DIR, 'toutiao_news_1.png');
            await newsElement.screenshot({ path: newsPath });
            console.log(`📸 新闻截图已保存: ${newsPath}`);

            // 6. OCR 识别
            await performOCR(newsPath);
        }

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🔒 浏览器已关闭');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('测试完成！');
    console.log('='.repeat(60));
}

/**
 * 执行 OCR 识别
 */
async function performOCR(imagePath) {
    console.log('\n🔤 步骤 4: 启动 Tesseract.js OCR 识别...');
    console.log('(首次运行需要下载中文语言包，可能需要几分钟...)\n');

    try {
        const startTime = Date.now();

        const result = await Tesseract.recognize(
            imagePath,
            'chi_sim+eng', // 中文简体 + 英文
            {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        process.stdout.write(`\r⏳ OCR 进度: ${Math.round(info.progress * 100)}%`);
                    }
                }
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n\n✅ OCR 识别完成 (耗时 ${duration}s)`);

        // 输出识别结果
        console.log('\n' + '-'.repeat(40));
        console.log('📝 识别结果:');
        console.log('-'.repeat(40));

        const text = result.data.text.trim();
        if (text) {
            // 提取可能的标题（第一行或最长的一行）
            const lines = text.split('\n').filter(line => line.trim().length > 5);

            console.log('\n【完整文本】');
            console.log(text);

            if (lines.length > 0) {
                console.log('\n【提取的标题候选】');
                lines.slice(0, 3).forEach((line, i) => {
                    console.log(`  ${i + 1}. ${line.trim()}`);
                });
            }

            console.log('\n【置信度】');
            console.log(`  整体置信度: ${(result.data.confidence).toFixed(1)}%`);

        } else {
            console.log('⚠️ 未识别到文本，可能是图片问题或需要调整截图区域');
        }

        console.log('-'.repeat(40));

        // 保存识别结果到文件
        const resultPath = path.join(OUTPUT_DIR, 'ocr_result.txt');
        fs.writeFileSync(resultPath, `识别时间: ${new Date().toLocaleString()}\n\n${text}`);
        console.log(`\n💾 结果已保存: ${resultPath}`);

        return text;

    } catch (error) {
        console.error('❌ OCR 识别失败:', error.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
main().catch(console.error);
