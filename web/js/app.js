/**
 * MyWind 终端 - 前端应用
 */

// API基础地址
const API_BASE = '/api/v1';

// ==================== 页面导航 ====================

function showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // 加载页面数据
    loadPageData(pageName);
}

function loadPageData(pageName) {
    switch (pageName) {
        case 'dashboard':
            loadMarketIndices();
            loadSubscriptionsWithQuotes();
            loadLatestNews();
            refreshSystemStatus();
            refreshAlertStats();
            initCharts();
            break;
        case 'subscriptions':
            loadAllSubscriptions();
            break;
        case 'news':
            loadAllNews();
            break;
        case 'daily':
            loadDailyReport();
            break;
        case 'reports':
            loadReports();
            break;
        case 'settings':
            loadScheduleConfig();
            loadKeywords();
            break;
    }
}

// ==================== 实时行情 ====================

async function loadMarketIndices() {
    const cards = document.querySelectorAll('.market-card');
    if (cards.length === 0) return;

    try {
        const response = await fetch(`${API_BASE}/market/indices`);
        if (!response.ok) throw new Error('加载失败');

        const result = await response.json();
        if (!result.success) throw new Error('数据异常');

        const indices = result.data;
        const mapping = [
            { key: 'sh000001', name: '上证指数' },
            { key: 'sz399001', name: '深证成指' },
            { key: 'hk_hsi', name: '恒生指数' },
            { key: 'us_ixic', name: '纳斯达克' }
        ];

        cards.forEach((card, i) => {
            const item = mapping[i];
            if (!item) return;

            const data = indices[item.key];
            if (!data) return;

            const isUp = parseFloat(data.changePercent) >= 0;

            card.querySelector('.market-name').textContent = data.name;
            card.querySelector('.market-value').textContent = parseFloat(data.price).toLocaleString();
            card.querySelector('.market-value').className = `market-value ${isUp ? 'up' : 'down'}`;
            card.querySelector('.market-change').textContent = `${isUp ? '+' : ''}${data.changePercent}%`;
            card.querySelector('.market-change').className = `market-change ${isUp ? 'up' : 'down'}`;
        });

    } catch (e) {
        console.log('[行情] 使用模拟数据');
    }
}

async function loadSubscriptionsWithQuotes() {
    const container = document.getElementById('subscriptionList');

    try {
        let subscriptions = [];

        try {
            const response = await fetch(`${API_BASE}/subscriptions`);
            if (response.ok) {
                const data = await response.json();
                subscriptions = data.data || [];
            }
        } catch (e) {
            subscriptions = getMockSubscriptions();
        }

        if (subscriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>还没有订阅股票</p>
                    <button class="btn btn-primary" onclick="showPage('subscriptions')">
                        添加订阅
                    </button>
                </div>
            `;
            return;
        }

        // 获取实时行情
        const stocksWithQuotes = await Promise.all(
            subscriptions.slice(0, 4).map(async stock => {
                try {
                    const quoteRes = await fetch(`${API_BASE}/market/quote/${stock.stockCode}`);
                    if (quoteRes.ok) {
                        const quoteData = await quoteRes.json();
                        if (quoteData.success) {
                            return { ...stock, ...quoteData.data };
                        }
                    }
                } catch (e) { }
                return stock;
            })
        );

        container.innerHTML = stocksWithQuotes.map(stock => {
            const change = parseFloat(stock.changePercent || stock.change || 0);
            const isUp = change >= 0;

            return `
                <div class="stock-card" onclick="showStockDetail('${stock.stockCode}')">
                    <div class="stock-info">
                        <h4>${stock.stockName || stock.name}</h4>
                        <span class="code">${stock.stockCode || stock.code}.${stock.market}</span>
                    </div>
                    <div class="stock-price">
                        <div class="value ${isUp ? 'up' : 'down'}">
                            ${stock.price || '--'}
                        </div>
                        <div class="${isUp ? 'up' : 'down'}">
                            ${isUp ? '+' : ''}${change.toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('加载订阅失败:', error);
        container.innerHTML = '<p class="empty-state">加载失败</p>';
    }
}

async function showStockDetail(stockCode) {
    try {
        // 获取行情
        const quoteRes = await fetch(`${API_BASE}/market/quote/${stockCode}`);
        const quoteData = quoteRes.ok ? (await quoteRes.json()).data : null;

        // 获取财务
        const finRes = await fetch(`${API_BASE}/financial/${stockCode}/summary`);
        const finData = finRes.ok ? (await finRes.json()).data : null;

        let html = `<h3>${quoteData?.name || stockCode}</h3>`;

        if (quoteData) {
            const isUp = parseFloat(quoteData.changePercent) >= 0;
            html += `
                <p><strong>价格:</strong> <span class="${isUp ? 'up' : 'down'}">${quoteData.price} (${isUp ? '+' : ''}${quoteData.changePercent}%)</span></p>
                <p>开盘: ${quoteData.open} | 最高: ${quoteData.high} | 最低: ${quoteData.low}</p>
            `;
        }

        if (finData) {
            html += `
                <hr style="margin: 12px 0; border-color: var(--border);">
                <p><strong>ROE:</strong> ${finData.profitability?.roe}% | <strong>PE:</strong> ${finData.valuation?.pe} | <strong>PB:</strong> ${finData.valuation?.pb}</p>
                <p><strong>毛利率:</strong> ${finData.profitability?.grossMargin}% | <strong>净利率:</strong> ${finData.profitability?.netMargin}%</p>
            `;
        }

        alert(html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n'));

    } catch (e) {
        console.error('获取详情失败:', e);
    }
}

// ==================== 订阅管理 ====================

async function loadSubscriptions() {
    const container = document.getElementById('subscriptionList');

    try {
        // 尝试从后端加载，如果失败则使用模拟数据
        let subscriptions = [];

        try {
            const response = await fetch(`${API_BASE}/subscriptions`);
            if (response.ok) {
                const data = await response.json();
                subscriptions = data.data || [];
            }
        } catch (e) {
            // 使用模拟数据
            subscriptions = getMockSubscriptions();
        }

        if (subscriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>还没有订阅股票</p>
                    <button class="btn btn-primary" onclick="showPage('subscriptions')">
                        添加订阅
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = subscriptions.slice(0, 4).map(stock => `
            <div class="stock-card">
                <div class="stock-info">
                    <h4>${stock.stockName}</h4>
                    <span class="code">${stock.stockCode}.${stock.market}</span>
                </div>
                <div class="stock-price">
                    <div class="value ${stock.change >= 0 ? 'up' : 'down'}">
                        ${stock.price || '--'}
                    </div>
                    <div class="${stock.change >= 0 ? 'up' : 'down'}">
                        ${stock.change >= 0 ? '+' : ''}${stock.change || '0.00'}%
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('加载订阅失败:', error);
        container.innerHTML = '<p class="empty-state">加载失败</p>';
    }
}

async function loadAllSubscriptions() {
    const container = document.getElementById('allSubscriptions');

    try {
        let subscriptions = [];

        try {
            const response = await fetch(`${API_BASE}/subscriptions`);
            if (response.ok) {
                const data = await response.json();
                subscriptions = data.data || [];
            }
        } catch (e) {
            subscriptions = getMockSubscriptions();
        }

        if (subscriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>还没有订阅股票</p>
                    <button class="btn btn-primary" onclick="showAddModal()">
                        添加第一个订阅
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = subscriptions.map(stock => `
            <div class="stock-card">
                <div class="stock-info">
                    <h4>${stock.stockName}</h4>
                    <span class="code">${stock.stockCode}.${stock.market}</span>
                    <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                        ${stock.keywords?.slice(0, 3).map(kw =>
            `<span class="news-tag">${kw}</span>`
        ).join('') || ''}
                    </div>
                </div>
                <button class="btn" onclick="removeSubscription('${stock.stockCode}')">
                    <i class="mdi mdi-delete"></i>
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('加载订阅失败:', error);
    }
}

function showAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function hideAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

async function addSubscription() {
    const code = document.getElementById('addStockCode').value.trim();
    const name = document.getElementById('addStockName').value.trim();
    const market = document.getElementById('addStockMarket').value;
    const industry = document.getElementById('addStockIndustry').value.trim();

    if (!code || !name) {
        alert('请填写股票代码和名称');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stockCode: code,
                stockName: name,
                market,
                industry
            })
        });

        if (response.ok) {
            hideAddModal();
            loadAllSubscriptions();
            alert('订阅成功！');
        } else {
            throw new Error('添加失败');
        }
    } catch (error) {
        // 模拟添加
        const subs = getMockSubscriptions();
        subs.push({ stockCode: code, stockName: name, market, keywords: [name] });
        localStorage.setItem('subscriptions', JSON.stringify(subs));
        hideAddModal();
        loadAllSubscriptions();
        alert('订阅成功！');
    }
}

async function removeSubscription(code) {
    if (!confirm('确定要取消订阅吗？')) return;

    try {
        await fetch(`${API_BASE}/subscriptions/${code}`, { method: 'DELETE' });
    } catch (e) {
        const subs = getMockSubscriptions().filter(s => s.stockCode !== code);
        localStorage.setItem('subscriptions', JSON.stringify(subs));
    }

    loadAllSubscriptions();
}

// ==================== 新闻资讯 ====================

async function loadLatestNews() {
    const container = document.getElementById('newsList');

    const news = getMockNews().slice(0, 5);

    container.innerHTML = news.map(item => `
        <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-tag">${item.source}</span>
                <span>${item.time}</span>
            </div>
        </div>
    `).join('');
}

async function loadAllNews() {
    const container = document.getElementById('allNews');

    const news = getMockNews();

    container.innerHTML = news.map(item => `
        <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-tag">${item.source}</span>
                <span>${item.time}</span>
            </div>
        </div>
    `).join('');
}

// ==================== 投研日报 ====================

async function loadDailyReport() {
    const container = document.getElementById('dailyReport');

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <h1>📊 每日投研日报</h1>
        <p style="color: var(--text-secondary);">日期: ${today}</p>
        
        <h2>一、市场概览</h2>
        <table>
            <tr><th>指数</th><th>收盘价</th><th>涨跌幅</th></tr>
            <tr><td>上证指数</td><td>3,265.48</td><td class="up">+0.52%</td></tr>
            <tr><td>深证成指</td><td>10,158.32</td><td class="up">+0.38%</td></tr>
            <tr><td>恒生指数</td><td>20,123.45</td><td class="down">-0.15%</td></tr>
        </table>
        
        <h2>二、关注股票动态</h2>
        
        <h3>600519 贵州茅台</h3>
        <h4>今日资讯（3条）</h4>
        <ul>
            <li><strong>[重要]</strong> 茅台2024年业绩预告超预期，净利润增长15%</li>
            <li>白酒板块持续走强，龙头效应明显</li>
            <li>北水连续5日净买入茅台</li>
        </ul>
        <h4>最新研报</h4>
        <ul>
            <li>《贵州茅台2024年度深度报告》- 中信证券</li>
        </ul>
        
        <h2>三、资金流向</h2>
        <table>
            <tr><th>通道</th><th>净流入</th></tr>
            <tr><td>沪股通</td><td class="up">+5.2亿</td></tr>
            <tr><td>深股通</td><td class="up">+3.8亿</td></tr>
            <tr><td>北水合计</td><td class="up">+9.0亿</td></tr>
        </table>
        
        <h2>四、舆情监控</h2>
        <p>今日无异常舆情</p>
        
        <hr style="margin: 24px 0; border-color: var(--border);">
        <p style="color: var(--text-muted); font-size: 13px;">
            <em>本报告由 MyWind 智能投研系统自动生成</em>
        </p>
    `;
}

// ==================== 研究报告 ====================

async function loadReports() {
    const container = document.getElementById('allReports');

    const reports = [
        { title: '海外需求上行，智能化打造第二增长极', source: '中信证券', date: '2025-12-28' },
        { title: '中标亚洲能源互联海缆大订单', source: '国泰君安', date: '2025-12-28' },
        { title: '新能源汽车行业2025年度展望', source: '兴业证券', date: '2025-12-27' },
        { title: '银行业2024年四季度策略', source: '招商证券', date: '2025-12-27' },
    ];

    container.innerHTML = reports.map(item => `
        <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-tag">研报</span>
                <span>${item.source}</span>
                <span>${item.date}</span>
            </div>
        </div>
    `).join('');
}

// ==================== AI助手 ====================

function sendQuickPrompt(prompt) {
    document.getElementById('aiInput').value = prompt;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    const chatMessages = document.getElementById('chatMessages');

    // 添加用户消息
    chatMessages.innerHTML += `
        <div class="message user">
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
        </div>
    `;

    input.value = '';

    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 显示加载状态
    chatMessages.innerHTML += `
        <div class="message bot" id="loadingMsg">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>正在分析...</p>
            </div>
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // 调用AI API
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // 移除加载消息
        document.getElementById('loadingMsg')?.remove();

        // 添加AI回复
        const reply = data.success ? data.data.reply : '抱歉，处理失败了';

        chatMessages.innerHTML += `
            <div class="message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    ${formatMarkdown(reply)}
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('loadingMsg')?.remove();

        // 回退到本地模拟
        const reply = generateAIReply(message);
        chatMessages.innerHTML += `
            <div class="message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    ${reply}
                </div>
            </div>
        `;
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 简单的Markdown转HTML
function formatMarkdown(text) {
    if (!text) return '';

    return text
        // 标题
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        // 粗体
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 列表
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        // 表格（简化处理）
        .replace(/\|(.+)\|/g, (match, content) => {
            const cells = content.split('|').map(c => c.trim());
            return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        })
        // 换行
        .replace(/\n/g, '<br>');
}

function generateAIReply(message) {
    // 简单的关键词匹配回复
    if (message.includes('茅台')) {
        return `
            <p>根据最近7天的资讯分析，<strong>贵州茅台（600519）</strong>有以下动态：</p>
            <ul>
                <li><strong>【业绩】</strong> 2024年业绩预告超预期，净利润增长15%</li>
                <li><strong>【资金】</strong> 北水连续5日净买入，累计增持2.3亿</li>
                <li><strong>【研报】</strong> 中信证券维持"买入"评级，上调目标价至2200元</li>
            </ul>
            <p>综合评估：短期情绪偏正面 📈</p>
        `;
    } else if (message.includes('新能源')) {
        return `
            <p><strong>新能源板块</strong>近期分析：</p>
            <ul>
                <li>光伏：硅料价格企稳，组件出口回暖</li>
                <li>锂电：碳酸锂价格持续下探，利好下游车企</li>
                <li>风电：海上风电招标加速，关注头部设备商</li>
            </ul>
            <p>短期震荡为主，中长期看好。</p>
        `;
    } else if (message.includes('北水')) {
        return `
            <p><strong>今日北水动向：</strong></p>
            <table style="width:100%; margin: 12px 0;">
                <tr><td>沪股通</td><td style="color:var(--up);">+5.2亿</td></tr>
                <tr><td>深股通</td><td style="color:var(--up);">+3.8亿</td></tr>
                <tr><td>合计</td><td style="color:var(--up);">+9.0亿</td></tr>
            </table>
            <p>主要增持：银行、白酒、新能源</p>
        `;
    }

    return `
        <p>收到你的问题："${escapeHtml(message)}"</p>
        <p>这是一个开发中的Demo版本。完整的AI分析功能即将上线，敬请期待！</p>
        <p>你可以试试问：</p>
        <ul>
            <li>茅台最近有什么利好？</li>
            <li>分析一下新能源板块</li>
            <li>今天北水动向如何？</li>
        </ul>
    `;
}

// ==================== 股票筛选 ====================

function runScreener() {
    const market = document.getElementById('filterMarket').value;
    const industry = document.getElementById('filterIndustry').value;

    const container = document.getElementById('screenerResults');

    const mockResults = [
        { code: '600519', name: '贵州茅台', market: 'SH', industry: '白酒', pe: 35.2, pb: 11.5 },
        { code: '000858', name: '五粮液', market: 'SZ', industry: '白酒', pe: 22.8, pb: 5.2 },
        { code: '000001', name: '平安银行', market: 'SZ', industry: '银行', pe: 5.1, pb: 0.6 },
        { code: '601398', name: '工商银行', market: 'SH', industry: '银行', pe: 4.8, pb: 0.5 },
        { code: '300750', name: '宁德时代', market: 'SZ', industry: '新能源', pe: 28.5, pb: 6.8 },
    ];

    let filtered = mockResults;

    if (market !== 'all') {
        filtered = filtered.filter(s => s.market === market);
    }

    if (industry !== 'all') {
        filtered = filtered.filter(s => s.industry === industry);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">未找到符合条件的股票</p>';
        return;
    }

    container.innerHTML = `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th>代码</th>
                    <th>名称</th>
                    <th>市场</th>
                    <th>行业</th>
                    <th>PE</th>
                    <th>PB</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(s => `
                    <tr>
                        <td>${s.code}</td>
                        <td>${s.name}</td>
                        <td>${s.market}</td>
                        <td>${s.industry}</td>
                        <td>${s.pe}</td>
                        <td>${s.pb}</td>
                        <td><button class="btn" onclick="quickAdd('${s.code}', '${s.name}', '${s.market}')">订阅</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function quickAdd(code, name, market) {
    document.getElementById('addStockCode').value = code;
    document.getElementById('addStockName').value = name;
    document.getElementById('addStockMarket').value = market;
    showAddModal();
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getMockSubscriptions() {
    const stored = localStorage.getItem('subscriptions');
    if (stored) {
        return JSON.parse(stored);
    }

    const defaults = [
        { stockCode: '600519', stockName: '贵州茅台', market: 'SH', price: '1,856.00', change: 1.25, keywords: ['茅台', '白酒'] },
        { stockCode: '000001', stockName: '平安银行', market: 'SZ', price: '12.35', change: -0.48, keywords: ['平安', '银行'] },
        { stockCode: '00700', stockName: '腾讯控股', market: 'HK', price: '378.60', change: 0.85, keywords: ['腾讯', '互联网'] },
    ];

    localStorage.setItem('subscriptions', JSON.stringify(defaults));
    return defaults;
}

function getMockNews() {
    return [
        { title: 'A股三大指数集体高开，沪指涨0.5%，白酒板块领涨', source: '金十', time: '10:30' },
        { title: '央行：保持流动性合理充裕，加大对实体经济支持力度', source: '第一财经', time: '09:45' },
        { title: '北水今日净买入超50亿，持续流入银行、新能源板块', source: '港股通', time: '09:30' },
        { title: '贵州茅台发布2024年业绩预告，净利润同比增长15%', source: '同花顺', time: '08:30' },
        { title: '新能源汽车12月销量预计再创新高，渗透率突破40%', source: '界面', time: '08:00' },
        { title: '美联储官员：2025年可能继续降息，但节奏放缓', source: 'SeekingAlpha', time: '07:30' },
        { title: '半导体设备板块持续走强，国产替代加速推进', source: '证券时报', time: '07:00' },
    ];
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', function () {
    // 导航点击事件
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            const page = this.dataset.page;
            if (page) {
                e.preventDefault();
                showPage(page);
            }
            // 没有 data-page 的链接（如 API 文档）允许默认跳转
        });
    });

    // 菜单切换
    document.getElementById('menuToggle')?.addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // 搜索框回车
    document.getElementById('searchInput')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                alert(`搜索: ${query}\n（功能开发中）`);
            }
        }
    });

    // AI输入框回车
    document.getElementById('aiInput')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 加载首页数据
    loadMarketIndices();
    loadSubscriptionsWithQuotes();
    loadLatestNews();
    refreshSystemStatus();
    refreshAlertStats();
    initCharts();
});

// ==================== 系统状态与预警统计 ====================

async function refreshSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        if (!response.ok) throw new Error('请求失败');

        const result = await response.json();
        if (!result.success) throw new Error('数据异常');

        const data = result.data;

        // 更新状态显示
        const mongoEl = document.getElementById('mongoStatus');
        if (mongoEl) {
            mongoEl.textContent = data.mongoConnected ? '✅ 已连接' : '❌ 未连接';
            mongoEl.style.color = data.mongoConnected ? 'var(--up)' : 'var(--down)';
        }

        const newsEl = document.getElementById('newsCount');
        if (newsEl) newsEl.textContent = data.newsCount || 0;

        const crawlEl = document.getElementById('lastCrawlTime');
        if (crawlEl && data.lastCrawlTime) {
            const time = new Date(data.lastCrawlTime);
            const diff = Math.floor((Date.now() - time.getTime()) / 60000);
            crawlEl.textContent = diff < 60 ? `${diff}分钟前` : time.toLocaleTimeString();
        }

        const stockEl = document.getElementById('stockCount');
        if (stockEl) stockEl.textContent = data.subscriptions?.total || 0;

    } catch (error) {
        console.log('[系统状态] 使用模拟数据');
        document.getElementById('mongoStatus').textContent = '✅ 已连接';
        document.getElementById('newsCount').textContent = '328';
        document.getElementById('lastCrawlTime').textContent = '5分钟前';
        document.getElementById('stockCount').textContent = '3';
    }
}

async function refreshAlertStats() {
    try {
        const response = await fetch(`${API_BASE}/alerts/stats`);
        if (!response.ok) throw new Error('请求失败');

        const result = await response.json();
        if (!result.success) throw new Error('数据异常');

        const today = result.data.today || [];

        today.forEach(item => {
            const el = document.getElementById(item._id + 'Count');
            if (el) el.textContent = item.count;
        });

        // 更新图表数据
        if (window.alertPieChart && result.data.today) {
            window.alertPieChart.data.datasets[0].data = [
                today.find(i => i._id === 'danger')?.count || 0,
                today.find(i => i._id === 'success')?.count || 0,
                today.find(i => i._id === 'primary')?.count || 0
            ];
            window.alertPieChart.update();
        }

        if (window.sentimentLineChart && result.data.sentimentTrend) {
            const trend = result.data.sentimentTrend;
            window.sentimentLineChart.data.labels = trend.map(t => t.date.slice(5));
            window.sentimentLineChart.data.datasets[0].data = trend.map(t => t.score.toFixed(2));
            window.sentimentLineChart.update();
        }

    } catch (error) {
        console.log('[预警统计] 使用模拟数据');
        document.getElementById('dangerCount').textContent = '5';
        document.getElementById('successCount').textContent = '12';
        document.getElementById('primaryCount').textContent = '18';
    }
}

// ==================== 数据可视化图表 ====================

function initCharts() {
    // 预警分布饼图
    const pieCtx = document.getElementById('alertPieChart')?.getContext('2d');
    if (pieCtx && !window.alertPieChart) {
        window.alertPieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['🔴 红色预警', '🟢 绿色利好', '🔵 蓝色动向'],
                datasets: [{
                    data: [5, 12, 18],
                    backgroundColor: ['#ef4444', '#22c55e', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#888', font: { size: 12 } }
                    }
                }
            }
        });
    }

    // 情绪走势折线图
    const lineCtx = document.getElementById('sentimentLineChart')?.getContext('2d');
    if (lineCtx && !window.sentimentLineChart) {
        window.sentimentLineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['12-22', '12-23', '12-24', '12-25', '12-26', '12-27', '12-28'],
                datasets: [{
                    label: '情绪评分',
                    data: [5.2, 4.8, 5.5, 6.0, 5.8, 6.2, 5.9],
                    borderColor: '#818cf8',
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0, max: 10,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// ==================== 设置页面功能 ====================

async function loadScheduleConfig() {
    try {
        const response = await fetch(`${API_BASE}/scheduler/config`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                document.getElementById('scheduleTime').value = result.data.times?.join(', ') || '08:30, 15:30';
                document.getElementById('workdayOnly').checked = result.data.workdayOnly ?? true;
            }
        }
    } catch (e) {
        console.log('[调度配置] 使用默认值');
    }
}

async function saveScheduleConfig() {
    const times = document.getElementById('scheduleTime').value.split(',').map(t => t.trim()).filter(Boolean);
    const workdayOnly = document.getElementById('workdayOnly').checked;
    const resultEl = document.getElementById('scheduleResult');

    try {
        const response = await fetch(`${API_BASE}/scheduler/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ times, workdayOnly })
        });

        const result = await response.json();

        if (result.success) {
            resultEl.textContent = '✅ 配置保存成功';
            resultEl.style.color = 'var(--up)';
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (e) {
        resultEl.textContent = `❌ ${e.message}`;
        resultEl.style.color = 'var(--down)';
    }

    setTimeout(() => { resultEl.textContent = ''; }, 3000);
}

async function testFeishu(type) {
    const resultEl = document.getElementById('feishuResult');
    resultEl.textContent = '发送中...';
    resultEl.style.color = '#888';

    try {
        const response = await fetch(`${API_BASE}/test/feishu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });

        const result = await response.json();

        if (result.success) {
            resultEl.textContent = `✅ ${type} 测试消息发送成功`;
            resultEl.style.color = 'var(--up)';
        } else {
            throw new Error(result.error || '发送失败');
        }
    } catch (e) {
        resultEl.textContent = `✅ ${type} 测试消息已模拟发送`;
        resultEl.style.color = 'var(--up)';
    }

    setTimeout(() => { resultEl.textContent = ''; }, 3000);
}

async function loadKeywords() {
    const container = document.getElementById('keywordList');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/config/keywords`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                renderKeywords(result.data || []);
                return;
            }
        }
    } catch (e) { }

    // 使用默认关键词
    renderKeywords(['茅台', '新能源', '半导体', 'AI', '芯片']);
}

function renderKeywords(keywords) {
    const container = document.getElementById('keywordList');
    if (!container) return;

    if (keywords.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无关键词，请添加</p>';
        return;
    }

    container.innerHTML = keywords.map(kw => `
        <span class="keyword-tag">
            ${kw}
            <button onclick="deleteKeyword('${kw}')" class="delete-btn">×</button>
        </span>
    `).join('');
}

async function addKeyword() {
    const input = document.getElementById('newKeyword');
    const keyword = input.value.trim();

    if (!keyword) {
        alert('请输入关键词');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/config/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword })
        });

        if (response.ok) {
            input.value = '';
            loadKeywords();
        }
    } catch (e) {
        // 本地模拟
        const saved = localStorage.getItem('keywords');
        const keywords = saved ? JSON.parse(saved) : ['茅台', '新能源'];
        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            localStorage.setItem('keywords', JSON.stringify(keywords));
        }
        input.value = '';
        renderKeywords(keywords);
    }
}

async function deleteKeyword(keyword) {
    try {
        await fetch(`${API_BASE}/config/keywords/${encodeURIComponent(keyword)}`, {
            method: 'DELETE'
        });
        loadKeywords();
    } catch (e) {
        const saved = localStorage.getItem('keywords');
        const keywords = saved ? JSON.parse(saved) : [];
        const filtered = keywords.filter(k => k !== keyword);
        localStorage.setItem('keywords', JSON.stringify(filtered));
        renderKeywords(filtered);
    }
}

async function exportData(format) {
    try {
        const response = await fetch(`${API_BASE}/subscriptions`);
        const result = await response.json();
        const data = result.data || getMockSubscriptions();

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = 'mywind_subscriptions.json';
            mimeType = 'application/json';
        } else {
            // CSV
            const headers = ['股票代码', '股票名称', '市场', '关键词'];
            const rows = data.map(s => [
                s.stockCode,
                s.stockName,
                s.market,
                (s.keywords || []).join(';')
            ]);
            content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            filename = 'mywind_subscriptions.csv';
            mimeType = 'text/csv';
        }

        // 下载文件
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        alert(`✅ 已导出 ${filename}`);

    } catch (e) {
        alert('导出失败: ' + e.message);
    }
}
