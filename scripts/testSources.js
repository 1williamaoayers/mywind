/**
 * 多源采集连通性测试
 * 测试所有数据源的实际可用性
 */

require('dotenv').config();
const axios = require('axios');
const { SOURCES, buildUrl, getSourceConfig, getAllSources } = require('../utils/urlBuilder');

const testKeyword = '京东';
const testResults = [];

async function testSource(source, name, url) {
    const start = Date.now();
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            validateStatus: () => true
        });

        const duration = Date.now() - start;
        const success = response.status >= 200 && response.status < 400;
        const dataSize = typeof response.data === 'string'
            ? response.data.length
            : JSON.stringify(response.data).length;

        return {
            source,
            name,
            status: success ? '✅ 可用' : `⚠️ HTTP ${response.status}`,
            duration: `${duration}ms`,
            dataSize: `${(dataSize / 1024).toFixed(1)}KB`
        };
    } catch (error) {
        return {
            source,
            name,
            status: '❌ 失败',
            error: error.message.substring(0, 50),
            duration: `${Date.now() - start}ms`
        };
    }
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 多源采集连通性测试');
    console.log('='.repeat(70));
    console.log(`测试关键词: "${testKeyword}"\n`);

    // 测试实时资讯
    console.log('【实时资讯】');

    // 财联社
    let result = await testSource('cls', '财联社',
        `https://www.cls.cn/api/search?keyword=${encodeURIComponent(testKeyword)}&type=telegram&page=1`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 华尔街见闻
    result = await testSource('wallstreet', '华尔街见闻',
        `https://api-one.wallstcn.com/apiv1/search/article?query=${encodeURIComponent(testKeyword)}&limit=10`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 新浪财经
    result = await testSource('sina', '新浪财经',
        `https://zhibo.sina.com.cn/api/zhibo/feed?page=1&num=10&zhibo_id=152`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 测试深度搜索
    console.log('\n【深度搜索】');

    // 雪球
    result = await testSource('xueqiu', '雪球',
        `https://xueqiu.com/query/v1/search/status.json?q=${encodeURIComponent(testKeyword)}&page=1&count=10`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 慧博
    result = await testSource('hibor', '慧博研报',
        `https://www.hibor.com.cn/search?keyword=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 富途
    result = await testSource('futu', '富途社区',
        `https://www.futunn.com/search?q=${encodeURIComponent(testKeyword)}&type=post`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 测试官方信披
    console.log('\n【官方信披】');

    // 巨潮
    result = await testSource('cninfo', '巨潮资讯(A股)',
        `http://www.cninfo.com.cn/new/fulltextSearch?searchkey=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 披露易
    result = await testSource('hkexnews', '披露易(港股)',
        `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=ZH&t=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 上交所互动
    result = await testSource('sse_e', '上交所e互动',
        `http://sns.sseinfo.com/ajax/feeds.do?type=11&keyword=${encodeURIComponent(testKeyword)}&pageSize=10`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 测试社交情绪
    console.log('\n【社交情绪】');

    // 东财股吧
    result = await testSource('guba', '东财股吧',
        `http://guba.eastmoney.com/list,JD.html`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 同花顺
    result = await testSource('ths', '同花顺热榜',
        `https://search.10jqka.com.cn/search?keyword=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 测试合规风险
    console.log('\n【合规风险】');

    // 企查查
    result = await testSource('qichacha', '企查查',
        `https://www.qcc.com/web/search?key=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 天眼查
    result = await testSource('tianyancha', '天眼查',
        `https://www.tianyancha.com/search?key=${encodeURIComponent(testKeyword)}`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 测试全球影响
    console.log('\n【全球影响】');

    // 英为财情
    result = await testSource('investing', '英为财情',
        `https://cn.investing.com/search/?q=${encodeURIComponent(testKeyword)}&tab=news`);
    console.log(`  ${result.name}: ${result.status} (${result.duration}) ${result.dataSize || result.error || ''}`);
    testResults.push(result);

    // 汇总
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试汇总');
    console.log('─'.repeat(70));

    const successful = testResults.filter(r => r.status.includes('✅')).length;
    const warning = testResults.filter(r => r.status.includes('⚠️')).length;
    const failed = testResults.filter(r => r.status.includes('❌')).length;

    console.log(`  ✅ 可用: ${successful}个`);
    console.log(`  ⚠️ 异常: ${warning}个`);
    console.log(`  ❌ 失败: ${failed}个`);
    console.log(`  总计: ${testResults.length}个数据源`);
    console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
