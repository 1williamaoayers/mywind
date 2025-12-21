/**
 * 测试脚本：发现报告登录助手
 * 
 * 测试流程：
 * 1. 启动持久化浏览器
 * 2. 检测登录状态
 * 3. 如需登录 → 截图二维码
 * 4. 等待手动扫码
 * 5. 保存 Cookie
 * 6. 采集研报
 */

const path = require('path');
const fs = require('fs');

// 确保当前目录正确
process.chdir(path.join(__dirname, '..'));

const { LoginHelper, createPersistentBrowser, getAllLoginStatus, COOKIE_DIR } = require('../utils/loginHelper');
const { createStealthPage, humanScroll, randomDelay } = require('../utils/humanBehavior');

async function testFxbaogaoLogin() {
    console.log('\n========================================');
    console.log('🔐 发现报告登录助手测试');
    console.log('========================================\n');

    // 1. 显示当前登录状态
    console.log('[测试] 当前登录状态:');
    const loginStatus = getAllLoginStatus();
    console.log(JSON.stringify(loginStatus, null, 2));
    console.log('');

    // 2. 启动持久化浏览器
    console.log('[测试] 启动持久化浏览器...');
    let browser = null;

    try {
        browser = await createPersistentBrowser('fxbaogao', { headless: true });
        console.log('[测试] ✅ 浏览器启动成功');

        // 3. 创建增强页面
        const page = await createStealthPage(browser);
        console.log('[测试] ✅ 增强页面创建成功');

        // 4. 创建登录助手
        const loginHelper = new LoginHelper(page, 'fxbaogao', {
            screenshotDir: '/tmp/login-test'
        });

        // 5. 执行登录流程
        console.log('\n[测试] 开始登录流程...');
        console.log('[测试] 如果需要扫码，请在 120 秒内完成');
        console.log('');

        const loginResult = await loginHelper.ensureLoggedIn();

        console.log('\n----------------------------------------');
        console.log(`[测试] 登录结果: ${loginResult.success ? '✅ 成功' : '❌ 失败'}`);
        console.log(`[测试] 登录方式: ${loginResult.method}`);
        console.log('----------------------------------------\n');

        if (loginResult.success) {
            // 6. 测试采集功能
            console.log('[测试] 开始测试研报采集...');

            // 访问研报页面
            await page.goto('https://www.fxbaogao.com/', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await randomDelay(2000, 3000);

            // 滚动加载
            await humanScroll(page);
            await humanScroll(page);

            // 提取研报
            const reports = await page.evaluate(() => {
                const items = [];
                const selectors = [
                    '.report-item',
                    '.list-item',
                    'a[href*="/view/"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((el, i) => {
                            if (i < 5) {
                                const title = el.innerText?.trim()?.substring(0, 50) || '';
                                if (title.length > 5) {
                                    items.push(title);
                                }
                            }
                        });
                        break;
                    }
                }

                return items;
            });

            console.log(`\n[测试] 采集到 ${reports.length} 份研报:`);
            reports.forEach((title, i) => {
                console.log(`  ${i + 1}. ${title}`);
            });

            // 7. 截图保存
            const screenshotPath = '/tmp/login-test/fxbaogao_result.png';
            if (!fs.existsSync('/tmp/login-test')) {
                fs.mkdirSync('/tmp/login-test', { recursive: true });
            }
            await page.screenshot({ path: screenshotPath });
            console.log(`\n[测试] 结果截图: ${screenshotPath}`);
        }

        // 8. 显示最终登录状态
        console.log('\n[测试] 最终登录状态:');
        const finalStatus = getAllLoginStatus();
        console.log(JSON.stringify(finalStatus, null, 2));

        // 检查 Cookie 文件
        const cookiePath = path.join(COOKIE_DIR, 'fxbaogao.json');
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

// 运行测试
testFxbaogaoLogin().catch(console.error);
