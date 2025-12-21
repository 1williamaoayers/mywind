/**
 * 测试脚本：二维码自动检测
 * 
 * 功能：
 * 1. 打开微信登录页面（跳过雪球首页）
 * 2. 截图保存
 * 3. 使用 jsQR 检测是否有二维码
 * 4. 汇报结果
 */

const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..'));

const Jimp = require('jimp');
const jsQR = require('jsqr');
const puppeteer = require('puppeteer');

// 截图目录
const SCREENSHOT_DIR = './data/screenshots';

// 微信登录页面（雪球的微信登录跳转 URL）
const WECHAT_LOGIN_URL = 'https://open.weixin.qq.com/connect/qrconnect?appid=wx0c5bd6af79a89c2d&redirect_uri=https%3A%2F%2Fxueqiu.com%2Fservice%2Fwx_callback&response_type=code&scope=snsapi_login&state=xueqiu';

/**
 * 检测图片中是否有二维码
 */
async function detectQRCode(imagePath) {
    try {
        console.log(`[二维码检测] 分析图片: ${imagePath}`);

        const image = await Jimp.read(imagePath);
        const { data, width, height } = image.bitmap;

        // 转换为 RGBA 格式
        const imageData = new Uint8ClampedArray(data);

        const code = jsQR(imageData, width, height);

        if (code) {
            console.log(`[二维码检测] ✅ 检测到二维码！`);
            console.log(`[二维码检测] 内容: ${code.data.substring(0, 100)}...`);
            console.log(`[二维码检测] 位置: (${code.location.topLeftCorner.x}, ${code.location.topLeftCorner.y})`);
            return {
                found: true,
                data: code.data,
                location: code.location
            };
        } else {
            console.log(`[二维码检测] ❌ 未检测到二维码`);
            return { found: false };
        }
    } catch (error) {
        console.error(`[二维码检测] 检测失败:`, error.message);
        return { found: false, error: error.message };
    }
}

/**
 * 主测试函数
 */
async function testQRCodeDetection() {
    console.log('\n========================================');
    console.log('🔍 二维码自动检测测试');
    console.log('========================================\n');

    // 确保截图目录存在
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    let browser = null;

    try {
        // 启动浏览器
        console.log('[测试] 启动浏览器...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        console.log('[测试] ✅ 浏览器启动成功');

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // 方案 1：直接打开微信登录页面
        console.log('\n[测试] === 方案 1：直接打开微信登录页面 ===');
        console.log(`[测试] 导航到: ${WECHAT_LOGIN_URL}`);

        await page.goto(WECHAT_LOGIN_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // 等待页面加载
        console.log('[测试] 等待页面加载...');
        await new Promise(r => setTimeout(r, 5000));

        // 截图
        const timestamp = Date.now();
        const screenshotPath1 = path.join(SCREENSHOT_DIR, `qrcode_wechat_${timestamp}.png`);
        await page.screenshot({ path: screenshotPath1, fullPage: false });
        console.log(`[测试] 截图保存: ${screenshotPath1}`);

        // 检测二维码
        const result1 = await detectQRCode(screenshotPath1);

        console.log('\n[测试] === 方案 1 结果 ===');
        console.log(`二维码检测: ${result1.found ? '✅ 成功' : '❌ 失败'}`);
        if (result1.found) {
            console.log(`二维码内容预览: ${result1.data.substring(0, 50)}...`);
        }

        // 方案 2：打开雪球首页看登录框
        console.log('\n[测试] === 方案 2：打开雪球首页 ===');
        await page.goto('https://xueqiu.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(r => setTimeout(r, 3000));

        const screenshotPath2 = path.join(SCREENSHOT_DIR, `qrcode_xueqiu_home_${timestamp}.png`);
        await page.screenshot({ path: screenshotPath2, fullPage: false });
        console.log(`[测试] 截图保存: ${screenshotPath2}`);

        const result2 = await detectQRCode(screenshotPath2);

        console.log('\n[测试] === 方案 2 结果 ===');
        console.log(`二维码检测: ${result2.found ? '✅ 成功' : '❌ 失败'}`);

        // 方案 3：尝试点击二维码登录标签
        console.log('\n[测试] === 方案 3：点击二维码登录标签 ===');
        try {
            const elements = await page.$$('xpath=//a[contains(text(), "二维码登录")] | //span[contains(text(), "二维码登录")]');
            if (elements.length > 0) {
                await elements[0].click();
                console.log('[测试] 已点击二维码登录标签');
                await new Promise(r => setTimeout(r, 3000));
            } else {
                console.log('[测试] 未找到二维码登录标签');
            }
        } catch (e) {
            console.log('[测试] 点击失败:', e.message);
        }

        const screenshotPath3 = path.join(SCREENSHOT_DIR, `qrcode_xueqiu_tab_${timestamp}.png`);
        await page.screenshot({ path: screenshotPath3, fullPage: false });
        console.log(`[测试] 截图保存: ${screenshotPath3}`);

        const result3 = await detectQRCode(screenshotPath3);

        console.log('\n[测试] === 方案 3 结果 ===');
        console.log(`二维码检测: ${result3.found ? '✅ 成功' : '❌ 失败'}`);

        // 汇总结果
        console.log('\n========================================');
        console.log('📊 测试结果汇总');
        console.log('========================================');
        console.log(`方案 1 (微信登录页): ${result1.found ? '✅ 检测到二维码' : '❌ 未检测到'}`);
        console.log(`方案 2 (雪球首页):   ${result2.found ? '✅ 检测到二维码' : '❌ 未检测到'}`);
        console.log(`方案 3 (点击标签):   ${result3.found ? '✅ 检测到二维码' : '❌ 未检测到'}`);
        console.log('\n截图文件:');
        console.log(`  - ${screenshotPath1}`);
        console.log(`  - ${screenshotPath2}`);
        console.log(`  - ${screenshotPath3}`);

        return {
            wechat: result1,
            xueqiuHome: result2,
            xueqiuTab: result3,
            screenshots: [screenshotPath1, screenshotPath2, screenshotPath3]
        };

    } catch (error) {
        console.error('\n[测试] ❌ 测试失败:', error.message);
        console.error(error.stack);
        return { error: error.message };
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n[测试] 浏览器已关闭');
        }
    }
}

// 运行测试
testQRCodeDetection()
    .then(result => {
        console.log('\n========================================');
        console.log('🏁 测试完成');
        console.log('========================================\n');
        console.log('返回结果:', JSON.stringify(result, null, 2));
    })
    .catch(console.error);
