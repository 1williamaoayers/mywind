/**
 * 测试脚本：雪球登录助手
 */

const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..'));

const { LoginHelper, createPersistentBrowser, getAllLoginStatus, COOKIE_DIR } = require('../utils/loginHelper');
const { createStealthPage, humanScroll, randomDelay } = require('../utils/humanBehavior');

async function testXueqiuLogin() {
    console.log('\n========================================');
    console.log('🔐 雪球登录助手测试');
    console.log('========================================\n');

    console.log('[测试] 当前登录状态:');
    const loginStatus = getAllLoginStatus();
    console.log(JSON.stringify(loginStatus, null, 2));
    console.log('');

    let browser = null;

    try {
        console.log('[测试] 启动持久化浏览器...');
        browser = await createPersistentBrowser('xueqiu', { headless: true });
        console.log('[测试] ✅ 浏览器启动成功');

        const page = await createStealthPage(browser);
        console.log('[测试] ✅ 增强页面创建成功');

        const loginHelper = new LoginHelper(page, 'xueqiu');

        console.log('\n[测试] 开始登录流程...');
        const loginResult = await loginHelper.ensureLoggedIn();

        console.log('\n----------------------------------------');
        console.log(`[测试] 登录结果: ${loginResult.success ? '✅ 成功' : '❌ 失败'}`);
        console.log(`[测试] 登录方式: ${loginResult.method}`);
        console.log('----------------------------------------\n');

        if (loginResult.success) {
            console.log('[测试] 开始测试采集...');

            await page.goto('https://xueqiu.com/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await randomDelay(2000, 3000);
            await humanScroll(page);

            const pageTitle = await page.title();
            console.log(`[测试] 页面标题: ${pageTitle}`);

            const screenshotPath = '/tmp/login-test/xueqiu_result.png';
            if (!fs.existsSync('/tmp/login-test')) {
                fs.mkdirSync('/tmp/login-test', { recursive: true });
            }
            await page.screenshot({ path: screenshotPath });
            console.log(`[测试] 结果截图: ${screenshotPath}`);
        }

        console.log('\n[测试] 最终登录状态:');
        const finalStatus = getAllLoginStatus();
        console.log(JSON.stringify(finalStatus, null, 2));

        const cookiePath = path.join(COOKIE_DIR, 'xueqiu.json');
        if (fs.existsSync(cookiePath)) {
            const cookieData = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
            console.log(`\n[测试] Cookie 文件已保存:`);
            console.log(`  - 路径: ${cookiePath}`);
            console.log(`  - Cookie 数量: ${cookieData.cookies?.length || 0}`);
            console.log(`  - 保存时间: ${cookieData.savedAt}`);
        }

    } catch (error) {
        console.error('\n[测试] ❌ 测试失败:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n[测试] 浏览器已关闭');
        }
    }

    console.log('\n========================================');
    console.log('🏁 测试完成');
    console.log('========================================\n');
}

testXueqiuLogin().catch(console.error);
