/**
 * AkShare 官方文档抓取脚本
 * 目标: 抓取 https://akshare.akfamily.xyz/ 的全部文档内容
 * 输出: Markdown 文件保存到 docs/akshare-docs/
 */

const puppeteer = require('puppeteer');
const TurndownService = require('turndown');
const fs = require('fs').promises;
const path = require('path');

// 初始化 HTML 到 Markdown 转换器
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});

// 保存目录
const OUTPUT_DIR = path.join(__dirname, 'docs', 'akshare-docs');

/**
 * 确保输出目录存在
 */
async function ensureOutputDir() {
    try {
        await fs.access(OUTPUT_DIR);
    } catch {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`✅ 创建输出目录: ${OUTPUT_DIR}`);
    }
}

/**
 * 提取侧边栏所有文档链接
 */
async function extractAllDocLinks(page) {
    console.log('📋 正在提取文档链接...');

    const links = await page.evaluate(() => {
        const items = [];
        // 查找侧边栏导航链接 (常见的文档结构)
        const selectors = [
            '.sidebar a',
            '.menu a',
            '.navigation a',
            'nav a',
            '.toctree a',
            '.md-nav__link'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(el => {
                    const href = el.getAttribute('href');
                    const text = el.textContent?.trim();
                    if (href && text && !href.startsWith('http') && !href.startsWith('#')) {
                        items.push({ href, text });
                    }
                });
                break; // 找到有效的选择器就停止
            }
        }

        return items;
    });

    console.log(`✅ 找到 ${links.length} 个文档链接`);
    return links;
}

/**
 * 抓取单个页面并转换为 Markdown
 */
async function scrapePage(page, url, title) {
    console.log(`📄 抓取: ${title} - ${url}`);

    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // 等待主内容加载
        await page.waitForSelector('article, main, .content, .document', {
            timeout: 10000
        }).catch(() => {
            console.log(`   ⚠️  未找到标准内容容器,使用全页抓取`);
        });

        // 提取主要内容的 HTML
        const html = await page.evaluate(() => {
            // 尝试多个常见的内容容器
            const selectors = [
                'article',
                'main',
                '.content',
                '.document',
                '.markdown-body',
                '#main-content'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element.innerHTML;
                }
            }

            // 如果没有找到,返回 body
            return document.body.innerHTML;
        });

        // 转换为 Markdown
        const markdown = turndownService.turndown(html);

        // 添加元信息头部
        const output = `# ${title}

> 来源: ${url}
> 抓取时间: ${new Date().toISOString()}

---

${markdown}
`;

        return output;

    } catch (error) {
        console.error(`   ❌ 抓取失败: ${error.message}`);
        return null;
    }
}

/**
 * 生成目录索引
 */
async function generateIndex(scrapedPages) {
    const indexContent = `# AkShare 官方文档索引

> 抓取时间: ${new Date().toISOString()}
> 总页面数: ${scrapedPages.length}

## 文档清单

${scrapedPages.map((page, index) =>
        `${index + 1}. [${page.title}](${page.filename})`
    ).join('\n')}

---

*本文档由 Puppeteer 自动抓取生成*
`;

    const indexPath = path.join(OUTPUT_DIR, 'INDEX.md');
    await fs.writeFile(indexPath, indexContent, 'utf-8');
    console.log(`✅ 生成索引文件: ${indexPath}`);
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始抓取 AkShare 官方文档...\n');

    // 确保输出目录存在
    await ensureOutputDir();

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        // 访问首页
        const BASE_URL = 'https://akshare.akfamily.xyz';
        console.log(`📍 访问首页: ${BASE_URL}\n`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // 提取所有文档链接
        const docLinks = await extractAllDocLinks(page);

        if (docLinks.length === 0) {
            console.log('⚠️  未找到文档链接,尝试抓取当前页面...');
            const content = await scrapePage(page, BASE_URL, 'AkShare 首页');
            if (content) {
                const filename = 'index.md';
                await fs.writeFile(path.join(OUTPUT_DIR, filename), content, 'utf-8');
                console.log(`✅ 已保存: ${filename}\n`);
            }
        } else {
            // 抓取所有页面
            const scrapedPages = [];

            for (let i = 0; i < docLinks.length; i++) {
                const { href, text } = docLinks[i];
                // 修复 URL 拼接:相对路径需要加斜杠
                const fullUrl = href.startsWith('http')
                    ? href
                    : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;

                const content = await scrapePage(page, fullUrl, text);

                if (content) {
                    // 生成安全的文件名
                    const safeFilename = text
                        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_')
                        .substring(0, 100) + '.md';

                    const filePath = path.join(OUTPUT_DIR, safeFilename);
                    await fs.writeFile(filePath, content, 'utf-8');

                    scrapedPages.push({
                        title: text,
                        filename: safeFilename,
                        url: fullUrl
                    });

                    console.log(`   ✅ 已保存: ${safeFilename}`);
                }

                // 进度显示
                console.log(`   进度: ${i + 1}/${docLinks.length}\n`);

                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 生成索引
            await generateIndex(scrapedPages);

            console.log(`\n✅ 抓取完成! 共 ${scrapedPages.length} 个页面`);
            console.log(`📁 保存位置: ${OUTPUT_DIR}`);
        }

    } catch (error) {
        console.error('❌ 脚本执行失败:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// 执行
main().catch(console.error);
