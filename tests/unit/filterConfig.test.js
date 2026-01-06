/**
 * filterConfig 单元测试
 * 
 * 测试白名单关键词过滤逻辑
 */

// 模拟 fs 模块，避免真实文件操作
jest.mock('fs', () => ({
    existsSync: jest.fn(() => false),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

describe('filterConfig', () => {
    let filterConfig;

    beforeEach(() => {
        // 重置模块缓存，确保每次测试干净的状态
        jest.resetModules();
        filterConfig = require('../../config/filterConfig');
    });

    describe('getKeywords', () => {
        it('应该返回关键词数组', () => {
            const keywords = filterConfig.getKeywords();
            expect(Array.isArray(keywords)).toBe(true);
        });

        it('应该包含默认关键词', () => {
            const keywords = filterConfig.getKeywords();
            // 检查是否包含一些默认关键词
            expect(keywords).toContain('英伟达');
            expect(keywords).toContain('人工智能');
        });
    });

    describe('addKeyword', () => {
        it('应该成功添加新关键词', () => {
            const result = filterConfig.addKeyword('测试关键词');
            expect(result.success).toBe(true);
            expect(result.keyword).toBe('测试关键词');
        });

        it('应该拒绝空关键词', () => {
            const result = filterConfig.addKeyword('');
            expect(result.success).toBe(false);
            expect(result.error).toBe('关键词不能为空');
        });

        it('应该拒绝重复关键词', () => {
            filterConfig.addKeyword('唯一关键词');
            const result = filterConfig.addKeyword('唯一关键词');
            expect(result.success).toBe(false);
            expect(result.error).toBe('关键词已存在');
        });
    });

    describe('removeKeyword', () => {
        it('应该成功删除存在的关键词', () => {
            filterConfig.addKeyword('待删除');
            const result = filterConfig.removeKeyword('待删除');
            expect(result.success).toBe(true);
        });

        it('应该拒绝删除不存在的关键词', () => {
            const result = filterConfig.removeKeyword('不存在的关键词');
            expect(result.success).toBe(false);
            expect(result.error).toBe('关键词不存在');
        });
    });

    describe('shouldIngest', () => {
        it('应该匹配标题中的关键词', () => {
            const result = filterConfig.shouldIngest('英伟达发布新显卡', '');
            expect(result.shouldIngest).toBe(true);
            expect(result.matchedKeywords).toContain('英伟达');
        });

        it('应该匹配内容中的关键词', () => {
            const result = filterConfig.shouldIngest('科技新闻', '人工智能技术突破');
            expect(result.shouldIngest).toBe(true);
            expect(result.matchedKeywords).toContain('人工智能');
        });

        it('应该返回多个匹配的关键词', () => {
            const result = filterConfig.shouldIngest('英伟达AI芯片', '人工智能发展');
            expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2);
        });

        it('不匹配时应该返回 false', () => {
            const result = filterConfig.shouldIngest('普通新闻标题', '普通新闻内容');
            expect(result.shouldIngest).toBe(false);
            expect(result.matchedKeywords).toHaveLength(0);
        });

        it('应该忽略大小写', () => {
            const result = filterConfig.shouldIngest('NVIDIA发布新品', '');
            expect(result.shouldIngest).toBe(true);
        });
    });

    describe('filterNews', () => {
        it('应该过滤出匹配关键词的新闻', () => {
            const newsList = [
                { title: '英伟达股价上涨', content: '' },
                { title: '普通新闻', content: '' },
                { title: '美联储议息会议', content: '' }
            ];

            const filtered = filterConfig.filterNews(newsList);
            expect(filtered.length).toBe(2);
        });

        it('应该在新闻对象上添加 _matchedKeywords 属性', () => {
            const newsList = [{ title: '英伟达发布新品', content: '' }];
            const filtered = filterConfig.filterNews(newsList);

            expect(filtered[0]._matchedKeywords).toBeDefined();
            expect(filtered[0]._matchedKeywords).toContain('英伟达');
        });
    });
});
