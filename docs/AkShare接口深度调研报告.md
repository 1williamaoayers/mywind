# AkShare 接口深度调研分析报告

> **调研日期**: 2026-01-06
> **调研对象**: https://github.com/akfamily/akshare
> **项目优先级**: 港股 > 美股 > A股（暂缓）

---

## 📋 调研结论

AkShare 官方文档显示有 **268+ 个接口分类**，我们当前报告仅收录约 **93个**。

以下是**尚未收录但对 MyWind 港股项目有价值**的接口类别：

---

## 🔴 一、高优先级（港股专用）

### 1. 沪深港通资金流向 ⭐⭐⭐

**为什么重要**: 北向资金（外资）是港股和A股联动的关键指标，"聪明钱"的动向能预判大盘方向。

| 函数名 | 说明 |
|--------|------|
| `stock_hsgt_fund_flow_summary_em()` | 沪深港通资金流向汇总 |
| `stock_hsgt_board_rank_em(symbol="北向资金增持榜")` | 北向资金增持/减持排行 |
| `stock_hsgt_individual_em(symbol="00700")` | 个股北向资金持股详情 |
| `stock_hsgt_hist_em(symbol="沪股通")` | 沪深港通历史数据 |
| `stock_hk_ggt_components_em()` | 港股通成份股列表 |

### 2. 港股分红派息 ⭐⭐

**为什么重要**: 港股以高股息著称，分红数据是基本面分析师的核心指标。

| 函数名 | 说明 |
|--------|------|
| `stock_hk_fhpx_em(symbol="00700")` | 港股分红派息详情 |
| `stock_hk_dividend_ths(symbol="00700")` | 港股分红配送详情-同花顺 |
| `stock_hk_valuation_baidu(symbol="09618", indicator="股息率")` | 港股股息率 |

### 3. 港股行业对比 ⭐⭐

**为什么重要**: 找同行业估值洼地，看竞争对手。

| 函数名 | 说明 |
|--------|------|
| `stock_hk_industry_spot_em()` | 港股行业板块行情 |
| `stock_hk_industry_history_em(symbol="资讯科技业")` | 港股行业历史数据 |

---

## 🟠 二、中优先级（通用重要）

### 4. 涨停板行情 ⭐⭐

**为什么重要**: 虽然港股没有涨停板，但分析A股涨停能识别热点概念（如AI、机器人），这些概念会传导到港股。

| 函数名 | 说明 |
|--------|------|
| `stock_zt_pool_em(date="...")` | 涨停股池 |
| `stock_zt_pool_strong_em(date="...")` | 强势股池 |
| `stock_zt_pool_dtgc_em(date="...")` | 跌停股池 |
| `stock_zt_pool_zbgc_em(date="...")` | 炸板股池 |

### 5. 龙虎榜（游资动向）⭐⭐

**为什么重要**: 追踪知名游资（如章盟主、炒股养家）的动向，识别短线热点。

| 函数名 | 说明 |
|--------|------|
| `stock_lhb_detail_em(symbol="...")` | 个股龙虎榜详情 |
| `stock_lhb_stock_statistic_em()` | 龙虎榜活跃股统计 |
| `stock_lhb_jgmmtj_em(date="...")` | 机构买卖统计 |
| `stock_lhb_yybph_em()` | 营业部排行 |

### 6. ESG评级 ⭐⭐

**为什么重要**: ESG 是机构投资的新风向标，港股很多公司有 MSCI ESG 评级。

| 函数名 | 说明 |
|--------|------|
| `stock_esg_rate_sina()` | ESG评级数据 |
| `stock_esg_msci_sina(symbol="...")` | MSCI ESG评级 |
| `stock_esg_hz_sina()` | 华证ESG评级 |

### 7. 技术指标信号 ⭐⭐

**为什么重要**: 快速筛选技术形态符合条件的股票（突破、放量等）。

| 函数名 | 说明 |
|--------|------|
| `stock_rank_cxg_em()` | 创新高股票 |
| `stock_rank_cxd_em()` | 创新低股票 |
| `stock_rank_lxsz_em()` | 连续上涨股票 |
| `stock_rank_lxxd_em()` | 连续下跌股票 |
| `stock_rank_cxfl_em()` | 持续放量股票 |
| `stock_rank_ljqs_em()` | 量价齐升股票 |

---

## 🟡 三、低优先级（备选）

### 8. 股票热度 ⭐

**为什么重要**: 雪球热度可用于反向指标（散户热捧=见顶）。

| 函数名 | 说明 |
|--------|------|
| `stock_hot_rank_em()` | 东财热门股排行 |
| `stock_hot_keyword_em()` | 热门关键词 |
| `stock_hot_search_baidu()` | 百度热搜股票 |

### 9. 停复牌信息 ⭐

| 函数名 | 说明 |
|--------|------|
| `stock_tfp_em(date="...")` | 停复牌信息列表 |

### 10. 新股数据 ⭐

| 函数名 | 说明 |
|--------|------|
| `stock_new_gh_cninfo()` | 新股申购与中签 |
| `stock_ipo_benefit_ths()` | IPO受益股 |

### 11. 股票回购 ⭐

| 函数名 | 说明 |
|--------|------|
| `stock_repurchase_em()` | 股票回购数据 |

### 12. 一致行动人 ⭐

| 函数名 | 说明 |
|--------|------|
| `stock_yzxdr_em()` | 一致行动人数据 |

---

## 📊 建议优先接入顺序

| 优先级 | 接口类别 | 原因 |
|--------|----------|------|
| **P0** | 沪深港通资金流向 | 港股核心指标，北向资金是"聪明钱" |
| **P0** | 港股分红派息 | 港股投资者最关心的指标之一 |
| **P1** | 龙虎榜 | 识别热点概念 |
| **P1** | ESG评级 | 机构投资新趋势 |
| **P2** | 涨停板行情 | 辅助识别A股热点传导 |
| **P2** | 技术指标信号 | 快速筛选策略 |

---

## 🔧 建议的代码补充

```python
import akshare as ak

# ===== P0: 沪深港通 =====
# 获取北向资金流向
hsgt_df = ak.stock_hsgt_fund_flow_summary_em()

# 获取个股北向资金持股（腾讯）
hk_hsgt_df = ak.stock_hsgt_individual_em(symbol="00700")

# 港股通成份股
ggt_df = ak.stock_hk_ggt_components_em()

# ===== P0: 港股分红 =====
# 港股分红详情
hk_div_df = ak.stock_hk_fhpx_em(symbol="00700")

# ===== P1: 龙虎榜 =====
# 机构买卖统计
lhb_df = ak.stock_lhb_jgmmtj_em(date="20260101")

# ===== P1: ESG =====
# ESG评级
esg_df = ak.stock_esg_rate_sina()
```

---

## 📎 总结

| 指标 | 数值 |
|------|------|
| AkShare 总接口分类 | 268+ |
| 当前报告已收录 | ~93个 |
| 本次调研发现遗漏 | ~40个 |
| **建议补充到报告** | **12个类别** |

**核心结论**: 沪深港通资金流向和港股分红派息是 MyWind 港股项目**必须接入**的接口，它们直接关系到港股投资决策。
