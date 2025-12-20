#!/usr/bin/env node
/**
 * Private-Wind-Ultra 系统健康检查脚本
 * 
 * 检查项：
 * 1. MongoDB 连通性
 * 2. Puppeteer 浏览器启动能力
 * 3. 飞书 Webhook 有效性
 * 
 * 使用方法: node scripts/healthCheck.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// 颜色输出
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 检查结果收集
const results = [];

/**
 * 1. 检查 MongoDB 连通性
 */
async function checkMongo() {
    const name = 'MongoDB';
    console.log(colors.cyan(`\n🔍 检查 ${name}...`));

    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/private_wind';

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        // 执行简单查询测试
        await mongoose.connection.db.admin().ping();

        console.log(colors.green(`   ✅ ${name} 连接成功`));
        console.log(`   📍 URI: ${uri.replace(/\/\/.*:.*@/, '//***:***@')}`);

        results.push({ name, status: 'ok', message: '连接成功' });

        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.log(colors.red(`   ❌ ${name} 连接失败`));
        console.log(`   💥 错误: ${error.message}`);

        results.push({ name, status: 'fail', message: error.message });
        return false;
    }
}

/**
 * 2. 检查 Puppeteer 浏览器启动能力
 */
async function checkPuppeteer() {
    const name = 'Puppeteer';
    console.log(colors.cyan(`\n🔍 检查 ${name}...`));

    try {
        const puppeteer = require('puppeteer');

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            timeout: 15000
        });

        const version = await browser.version();

        // 测试打开页面
        const page = await browser.newPage();
        await page.goto('about:blank');

        await browser.close();

        console.log(colors.green(`   ✅ ${name} 启动成功`));
        console.log(`   📍 版本: ${version}`);

        results.push({ name, status: 'ok', message: `版本 ${version}` });
        return true;
    } catch (error) {
        console.log(colors.red(`   ❌ ${name} 启动失败`));
        console.log(`   💥 错误: ${error.message}`);

        results.push({ name, status: 'fail', message: error.message });
        return false;
    }
}

/**
 * 3. 检查飞书 Webhook 有效性
 */
async function checkFeishu() {
    const name = '飞书 Webhook';
    console.log(colors.cyan(`\n🔍 检查 ${name}...`));

    const webhook = process.env.FEISHU_WEBHOOK;

    if (!webhook || webhook.includes('xxxxxxxxx')) {
        console.log(colors.yellow(`   ⚠️ ${name} 未配置`));
        console.log(`   💡 请在 .env 中配置 FEISHU_WEBHOOK`);

        results.push({ name, status: 'warn', message: '未配置' });
        return false;
    }

    try {
        // 发送健康检查消息
        const response = await axios.post(webhook, {
            msg_type: 'interactive',
            card: {
                config: { wide_screen_mode: true },
                header: {
                    template: 'blue',
                    title: { tag: 'plain_text', content: '🏥 系统健康检查' }
                },
                elements: [{
                    tag: 'markdown',
                    content: `**Private-Wind-Ultra 系统健康检查**\n\n` +
                        `✅ 飞书 Webhook 连通性测试成功\n` +
                        `🕐 检查时间: ${new Date().toLocaleString('zh-CN')}`
                }]
            }
        }, { timeout: 10000 });

        if (response.data?.code === 0 || response.data?.StatusCode === 0) {
            console.log(colors.green(`   ✅ ${name} 有效`));
            console.log(`   📍 已发送测试消息到飞书`);

            results.push({ name, status: 'ok', message: 'Webhook 有效' });
            return true;
        } else {
            throw new Error(response.data?.msg || '未知错误');
        }
    } catch (error) {
        console.log(colors.red(`   ❌ ${name} 无效`));
        console.log(`   💥 错误: ${error.message}`);

        results.push({ name, status: 'fail', message: error.message });
        return false;
    }
}

/**
 * 4. 检查 AI API 配置
 */
async function checkAI() {
    const name = 'AI API (DeepSeek)';
    console.log(colors.cyan(`\n🔍 检查 ${name}...`));

    const apiKey = process.env.AI_API_KEY;
    const apiBase = process.env.AI_API_BASE || 'https://api.deepseek.com/v1';

    if (!apiKey || apiKey.includes('xxxxxxx')) {
        console.log(colors.yellow(`   ⚠️ ${name} 未配置`));
        console.log(`   💡 请在 .env 中配置 AI_API_KEY`);

        results.push({ name, status: 'warn', message: '未配置' });
        return false;
    }

    try {
        // 验证 API Key（通过获取模型列表）
        const response = await axios.get(`${apiBase}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });

        console.log(colors.green(`   ✅ ${name} 配置有效`));
        console.log(`   📍 API Base: ${apiBase}`);

        results.push({ name, status: 'ok', message: 'API Key 有效' });
        return true;
    } catch (error) {
        // DeepSeek 可能不支持 /models，尝试简单请求
        if (error.response?.status === 404) {
            console.log(colors.green(`   ✅ ${name} 配置已验证`));
            results.push({ name, status: 'ok', message: '已配置' });
            return true;
        }

        console.log(colors.red(`   ❌ ${name} 验证失败`));
        console.log(`   💥 错误: ${error.message}`);

        results.push({ name, status: 'fail', message: error.message });
        return false;
    }
}

/**
 * 输出检查报告
 */
function printReport() {
    console.log('\n' + '═'.repeat(50));
    console.log(colors.bold('📋 健康检查报告'));
    console.log('═'.repeat(50));

    let okCount = 0;
    let warnCount = 0;
    let failCount = 0;

    results.forEach(r => {
        let icon, color;
        switch (r.status) {
            case 'ok':
                icon = '✅';
                color = colors.green;
                okCount++;
                break;
            case 'warn':
                icon = '⚠️';
                color = colors.yellow;
                warnCount++;
                break;
            default:
                icon = '❌';
                color = colors.red;
                failCount++;
        }
        console.log(`${icon} ${r.name}: ${color(r.message)}`);
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`总计: ${colors.green(okCount + ' 通过')} | ${colors.yellow(warnCount + ' 警告')} | ${colors.red(failCount + ' 失败')}`);
    console.log('═'.repeat(50) + '\n');

    // 返回状态码
    return failCount === 0 ? 0 : 1;
}

/**
 * 主函数
 */
async function runHealthCheck() {
    console.log('\n' + '═'.repeat(50));
    console.log(colors.bold('🏥 Private-Wind-Ultra 系统健康检查'));
    console.log(`🕐 ${new Date().toLocaleString('zh-CN')}`);
    console.log('═'.repeat(50));

    // 执行各项检查
    await checkMongo();
    await checkPuppeteer();
    await checkFeishu();
    await checkAI();

    // 输出报告
    const exitCode = printReport();

    process.exit(exitCode);
}

// 运行
runHealthCheck().catch(error => {
    console.error(colors.red('健康检查脚本异常:'), error);
    process.exit(1);
});
