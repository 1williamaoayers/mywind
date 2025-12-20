/**
 * 爬虫手动测试脚本
 * 用法: node scripts/testScraper.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { shouldIngest, getKeywords } = require('../config/filterConfig');

// 数据库连接
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/private_wind';

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🕷️  Private-Wind-Ultra 爬虫手动测试');
    console.log('='.repeat(60) + '\n');

    // 1. 显示当前白名单
    const keywords = getKeywords();
    console.log('📋 当前白名单关键词 (' + keywords.length + '个):');
    console.log('   ' + keywords.slice(0, 10).join(', ') + (keywords.length > 10 ? '...' : ''));
    console.log('');

    // 2. 连接数据库
    console.log('🔌 正在连接数据库...');
    try {
        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB 连接成功\n');
    } catch (error) {
        console.error('❌ MongoDB 连接失败:', error.message);
        process.exit(1);
    }

    // 3. 加载服务
    const Stock = require('../models/Stock');
    const { scrapeByDimension, processAndSave, DIMENSIONS } = require('../services/scraperService');

    // 4. 获取股票列表
    const stocks = await Stock.find({ isActive: true });
    console.log(`📊 找到 ${stocks.length} 只激活的股票\n`);

    if (stocks.length === 0) {
        console.log('⚠️  没有激活的股票，请先添加股票');
        await mongoose.connection.close();
        return;
    }

    // 5. 开始采集
    let totalRaw = 0;
    let totalFiltered = 0;
    let totalInserted = 0;

    for (const stock of stocks) {
        const keyword = stock.name || stock.code;
        console.log('─'.repeat(50));
        console.log(`🎯 采集目标: ${stock.name} (${stock.code})`);
        console.log('');

        // 采集实时资讯
        console.log('🌐 正在打开网页...');
        console.log('   → 采集财联社、华尔街见闻、新浪财经...');

        try {
            const rawItems = await scrapeByDimension(DIMENSIONS.REALTIME, keyword, {
                directKeywords: stock.matrix?.direct || [stock.code, stock.name]
            });

            totalRaw += rawItems.length;
            console.log(`📰 已发现资讯 ${rawItems.length} 条`);
            console.log('');

            if (rawItems.length > 0) {
                // 详细展示白名单过滤
                console.log('🔍 正在通过白名单过滤...');
                let passCount = 0;
                let blockCount = 0;

                for (const item of rawItems.slice(0, 10)) { // 只显示前10条
                    const result = shouldIngest(item.title, item.content);
                    const shortTitle = (item.title || '').substring(0, 40) + (item.title?.length > 40 ? '...' : '');

                    if (result.shouldIngest) {
                        passCount++;
                        console.log(`   ✅ 入库: "${shortTitle}"`);
                        console.log(`      命中: [${result.matchedKeywords.join(', ')}]`);
                    } else {
                        blockCount++;
                        console.log(`   ❌ 拦截: "${shortTitle}"`);
                        console.log(`      原因: 未命中任何白名单关键词`);
                    }
                }

                if (rawItems.length > 10) {
                    console.log(`   ... 还有 ${rawItems.length - 10} 条未显示`);
                }

                totalFiltered += blockCount;
                console.log('');

                // 执行入库
                console.log('💾 正在入库...');
                const result = await processAndSave(rawItems, stocks);
                totalInserted += result.inserted;
                console.log(`   已入库: ${result.inserted} 条, 重复: ${result.duplicates} 条, 过滤: ${result.filtered || 0} 条`);
            }

        } catch (error) {
            console.log(`   ❌ 采集失败: ${error.message}`);
        }

        console.log('');
    }

    // 6. 汇总
    console.log('='.repeat(60));
    console.log('📊 采集汇总');
    console.log('─'.repeat(60));
    console.log(`   发现资讯:  ${totalRaw} 条`);
    console.log(`   白名单拦截: ${totalFiltered} 条`);
    console.log(`   成功入库:  ${totalInserted} 条`);
    console.log('='.repeat(60) + '\n');

    // 关闭连接
    await mongoose.connection.close();
    console.log('✅ 测试完成，数据库连接已关闭');
}

main().catch(err => {
    console.error('脚本执行失败:', err);
    process.exit(1);
});
