# AkShare接口最终完整清单（253个接口）

> **生成时间**: 2026-01-06 12:15  
> **基于**: AkShare数据字典完整审查（1682行）  
> **目标**: 为MyWind提供TradingAgents所需的全部数据支持

---

## 📊 总览

| 分析师 | 接口数量 | 说明 |
|--------|----------|------|
| 1️⃣ 市场分析师 | 60个 | 行情+指数+龙虎榜+异动+高频数据 |
| 2️⃣ 新闻分析师 | 37个 | 快讯+新闻+公告+研报（不变） |
| 3️⃣ 基本面分析师 | 60个 | 财报+指标+分红+ESG+REITs+行业对比 |
| 4️⃣ 社交媒体分析师 | 10个 | 百度指数+股吧+热度+另类数据 |
| 5️⃣ 风险与宏观分析师 | 86个 | 宏观+风险+波动率+政策不确定性+期权数据 |
| **总计** | **253个** | 完整覆盖五大分析师所有数据需求 |

---

## 1️⃣ 市场分析师（60个接口）

### 港股行情（5个）
1. `stock_hk_spot_em()` - 港股实时行情
2. `stock_hk_hist()` - 港股历史K线
3. `stock_hk_minute_em()` - 港股分时数据
4. `stock_hk_index_daily_em()` - 恒指行情
5. `stock_hk_index_daily_sina()` - 恒指历史

### 美股行情（5个）
6. `stock_us_spot_em()` - 美股实时行情
7. `stock_us_hist()` - 美股历史K线
8. `stock_us_minute_em()` - 美股分时数据
9. `index_us_stock_sina()` - 美股指数
10. `stock_us_index_daily_em()` - 美股指数历史

### 指数数据（13个）⭐ 新增5个
11. `index_global_hist_em()` - 全球指数历史
12. `index_value_hist_funddb()` - 指数估值历史
13. `stock_a_lg_indicator()` - A股流通市值
14. `stock_market_pe_lg()` - A股市盈率
15. `index_zh_a_hist()` - A股指数历史
16. `index_zh_a_spot()` - A股指数实时
17. `index_investing_global()` - 全球指数实时
18. ⭐ `sw_index_spot()` - 申万一级行业指数实时
19. ⭐ `sw_index_daily()` - 申万一级行业指数历史
20. ⭐ `index_stock_cons()` - 指数成份股
21. ⭐ `index_stock_cons_weight_csindex()` - 指数成份权重
22. ⭐ `hf_sp500()` - 标普500高频数据（日内交易）
23. `index_stock_info()` - 指数基本信息

### 板块概念（4个）
24. `stock_board_concept_name_em()` - 概念板块列表
25. `stock_board_concept_cons_em()` - 概念成分股
26. `stock_board_industry_name_em()` - 行业板块列表
27. `stock_board_industry_cons_em()` - 行业成分股

### 融资融券（4个）
28. `stock_margin_underlying_info_szse()` - 深市标的证券
29. `stock_margin_sse()` - 沪市融资融券汇总
30. `stock_margin_detail_szse()` - 深市融资融券明细
31. `stock_margin_szse()` - 深市融资融券汇总

### 股票质押（3个）
32. `stock_pg_em()` - 股权质押市场概况
33. `stock_pg_qy_comparison_em()` - 上市公司质押比例
34. `stock_pg_detail_em()` - 重要股东质押明细

### 机构调研（2个）
35. `stock_jgdy_tj_em()` - 机构调研统计
36. `stock_jgdy_detail_em()` - 机构调研详细

### 大宗交易（3个）
37. `stock_dzjy_mrmx()` - 大宗交易每日明细
38. `stock_dzjy_mrtj()` - 大宗交易每日统计
39. `stock_dzjy_hygtj()` - 大宗交易活跃个股

### 龙虎榜（4个）
40. `stock_lhb_detail_em()` - 龙虎榜详情
41. `stock_lhb_ggtj_em()` - 个股上榜统计
42. `stock_lhb_jgmx_em()` - 机构买卖明细
43. `stock_lhb_jghmx_em()` - 机构席位追踪

### 涨停板（8个）
44. `stock_zt_pool_em()` - 涨停股池
45. `stock_zt_pool_previous_em()` - 昨日涨停股池
46. `stock_zt_pool_strong_em()` - 强势股池
47. `stock_zt_pool_sub_new_em()` - 次新股池
48. `stock_zt_pool_zbgc_em()` - 炸板股池
49. `stock_dt_pool_em()` - 跌停股池
50. `stock_zt_pool_dtgc_em()` - 跌停股池
51. `stock_rank_lhb_yyb_em()` - 营业部排行

### ESG与热度（4个）
52. `stock_hot_rank_em()` - 人气排行榜
53. `stock_hot_up_em()` - 飙升排行榜
54. `stock_hot_keyword_em()` - 热门关键词
55. `stock_hot_search_baidu()` - 百度热搜股票

### 盘口异动（3个）⭐ 新增
56. ⭐ `stock_changes_em()` - 盘口异动
57. ⭐ `stock_board_change_em()` - 板块异动详情
58. ⭐ `stock_rank_xstp_ths()` - 赚钱效应分析

### 北向资金（3个）
59. `stock_hsgt_north_net_flow_in_em()` - 北向资金流入
60. `stock_hsgt_stock_statistics_em()` - 个股统计

---

## 2️⃣ 新闻分析师（37个）- 不变

### 快讯类（6个）
1. `news_economic_baidu()` - 百度财经快讯
2. `news_cctv()` - 央视新闻
3. `stock_news_em()` - 东财7x24快讯
4. `stock_zh_a_alerts_cls()` - 财联社电报
5. `futures_news_shmet()` - 上海金属网快讯
6. `option_news_em()` - 期权快讯

### 个股新闻（4个）
7. `stock_news_specific_163()` - 网易个股新闻
8. `stock_news_specific_sina()` - 新浪个股新闻
9. `stock_news_em()` - 东财个股新闻
10. `stock_info_global_em()` - 全球股市新闻

### 公告类（5个）
11. `stock_notice_report()` - 个股公告
12. `stock_notice_list()` - 公告列表
13. `stock_notice_info()` - 公告详情
14. `stock_report_disclosure()` - 业绩预约披露
15. `stock_report_fund_hold()` - 基金持股公告

### 研报与评级（12个）
16. `stock_research_report_em()` - 个股研报
17. `stock_institution_recommend_em()` - 机构推荐池
18. `stock_a_ttm_lyr()` - 市盈率LYR
19. `stock_profit_forecast()` - 盈利预测
20. `stock_profit_forecast_ths()` - 同花顺盈利预测
21. `stock_analyst_rank_em()` - 分析师指数排行
22. `stock_analyst_detail_em()` - 分析师详情
23. `stock_institute_hold_detail()` - 机构持股明细
24. `stock_institute_recommend()` - 投资评级
25. `stock_rank_forecast_cninfo()` - 业绩预告排名
26. `stock_rank_cxfl_ths()` - 财务类排行
27. `stock_rank_cxg_ths()` - 成长性排行

### 宏观政策新闻（4个）
28. `macro_china_gover_report()` - 政府工作报告
29. `macro_china_shrzgm()` - 社会融资规模
30. `macro_china_reserve_requirement_ratio()` - 存款准备金率
31. `news_government_xinwen()` - 新闻联播文字稿

### 社交舆情（6个）- 移到社交媒体分析师
~~32-37已移到社交媒体分析师~~

---

## 3️⃣ 基本面分析师（60个）

### 财务报表（10个）
1. `stock_financial_abstract()` - 业绩报表
2. `stock_financial_analysis_indicator()` - 财务指标
3. `stock_balance_sheet_em()` - 资产负债表
4. `stock_profit_sheet_em()` - 利润表
5. `stock_cash_flow_sheet_em()` - 现金流量表
6. `stock_financial_report_sina()` - 新浪财务报表
7. `stock_history_dividend()` - 历史分红
8. `stock_dividend_detail()` - 分红详情
9. `stock_financial_abstract_ths()` - 同花顺业绩快报
10. `stock_financial_benefit_ths()` - 同花顺业绩预告

### 财务指标（10个）
11. `stock_financial_report_key()` - 关键指标
12. `stock_a_indicator_lg()` - A股财务指标
13. `stock_a_high_low_statistics()` - 高低统计
14. `stock_a_below_net_asset_statistics()` - 破净统计
15. `stock_a_all_pb()` - 全市场PB
16. `stock_a_pe()` - 市盈率
17. `stock_a_pb()` - 市净率
18. `stock_a_investor_confidence()` - 投资者信心
19. `stock_buffett_index_lg()` - 巴菲特指标
20. `stock_a_congestion_lg()` - 拥挤度

### 分红配股（5个）
21. `stock_divid_detail_em()` - 分红配送详情
22. `stock_dividend_cninfo()` - 巨潮分红
23. `stock_bonus_detail_em()` - 配股详情
24. `stock_history_dividend_detail()` - 历史分红明细
25. `stock_dividend_by_year()` - 年度分红

### 股东持股（10个）⭐ 新增3个
26. `stock_gdfx_holding_detail_em()` - 十大流通股东
27. `stock_gdfx_free_holding_analyse_em()` - 股东持股分析
28. `stock_gdfx_free_holding_detail_em()` - 股东持股明细
29. `stock_gdfx_free_holding_statistics_em()` - 股东持股统计
30. `stock_gdfx_free_holding_teamwork_em()` - 股东协同
31. `stock_zh_a_gdhs()` - 股东户数
32. `stock_zh_a_gdhs_detail_em()` - 股东户数详情
33. ⭐ `stock_ggcg_em()` - 高管变动
34. ⭐ `stock_executive_hold()` - 高管持股
35. ⭐ `fund_stock_holder_em()` - 机构持仓

### 限售解禁（5个）⭐ 新增
36. ⭐ `stock_restricted_release_queue_em()` - 限售解禁队列
37. ⭐ `stock_restricted_release_detail_em()` - 限售解禁详情
38. ⭐ `stock_restricted_release_summary_em()` - 限售解禁汇总
39. `stock_restricted_shares_sina()` - 新浪限售解禁
40. `stock_circulate_gdfx()` - 流通股东

### 行业对比（5个）⭐ 新增
41. ⭐ `stock_zyjs_ths()` - 主营业务构成(同花顺)
42. ⭐ `sw_index_first_info()` - 申万一级行业信息
43. ⭐ `sw_index_second_info()` - 申万二级行业信息
44. ⭐ `sw_index_third_info()` - 申万三级行业信息
45. ⭐ `stock_industry_pe_ratio_cninfo()` - 行业PE对比

### 法律合规（5个）⭐ 新增
46. ⭐ `stock_cflb_em()` - 处罚公告
47. ⭐ `stock_info_lawsuits()` - 诉讼仲裁
48. ⭐ `bond_rating()` - 信用评级
49. `stock_info_change_name()` - 公司更名
50. `stock_hold_control_cninfo()` - 股权控制链

### ESG评级（4个）
51. `stock_esg_rate_sina()` - 新浪ESG评级
52. `stock_esg_msci()` - MSCI ESG评级
53. `stock_esg_hz()` - 华证ESG评级
54. `stock_esg_zd()` - 秩鼎ESG评级

### REITs（2个）⭐ 新增
55. ⭐ `fund_reits_spot_em()` - REITs实时行情
56. ⭐ `fund_reits_hist_em()` - REITs历史行情

### 碳排放（4个）⭐ 新增
57. ⭐ `energy_carbon_domestic()` - 碳排放权-国内
58. ⭐ `energy_carbon_bj()` - 碳排放权-北京
59. ⭐ `energy_carbon_sz()` - 碳排放权-深圳
60. ⭐ `energy_carbon_intl()` - 碳排放权-国际

---

## 4️⃣ 社交媒体分析师（10个）

### 基础舆情（5个）- 原有
1. `baidu_search_index()` - 百度指数
2. `google_index()` - 谷歌趋势
3. `stock_comment_em()` - 股吧评论
4. `stock_em_guba_interview()` - 董秘访谈
5. `stock_hot_rank_em()` - 热门股排行

### 另类数据（5个）⭐ 新增
6. ⭐ `weibo_public_opinion()` - 微博舆情报告
7. ⭐ `migration_scale_baidu()` - 百度迁徙规模
8. ⭐ `migration_area_baidu()` - 百度迁徙地区
9. ⭐ `air_quality_hist()` - 空气质量历史（工业活跃度）
10. ⭐ `car_sales_total()` - 汽车销量总体（消费景气度）

---

## 5️⃣ 风险与宏观分析师（86个）

### 中国宏观（15个）
1. `macro_china_gdp()` - 中国GDP年率
2. `macro_china_cpi()` - 中国CPI年率
3. `macro_china_ppi()` - 中国PPI年率
4. `macro_china_pmi()` - 官方制造业PMI
5. `macro_china_exports_yoy()` - 出口年率
6. `macro_china_imports_yoy()` - 进口年率
7. `macro_china_trade_balance()` - 贸易帐
8. `macro_china_fx_reserves()` - 外汇储备
9. `macro_china_m2_yearly()` - M2货币供应年率
10. `macro_china_shibor()` - Shibor利率
11. `macro_china_hgjck()` - 海关进出口
12. `macro_china_nfp()` - 新增信贷
13. `macro_china_fdi()` - 外商直接投资
14. `macro_china_shrzgm()` - 社会融资规模
15. `macro_china_export_import()` - 进出口增减

### 美国宏观（10个）
16. `macro_usa_gdp()` - 美国GDP
17. `macro_usa_cpi()` - 美国CPI月率
18. `macro_usa_cpi_yearly()` - 美国CPI年率
19. `macro_usa_core_cpi()` - 美国核心CPI月率
20. `macro_usa_unemployment_rate()` - 美国失业率
21. `macro_usa_non_farm()` - 美国非农就业
22. `macro_usa_adp()` - 美国ADP就业
23. `macro_usa_ppi()` - 美国PPI
24. `macro_usa_initial_jobless()` - 美国初请失业金
25. `macro_usa_eia_crude_rate()` - 美国EIA原油库存

### 全球宏观（5个）
26. `macro_cons_gold_volume()` - 黄金持仓
27. `macro_cons_silver_volume()` - 白银持仓
28. `macro_cons_opec_report()` - OPEC报告
29. `macro_usa_cftc_nc_holding()` - CFTC持仓报告
30. `macro_global_em_event()` - 全球宏观事件

### 利率汇率（5个）
31. `rate_interbank()` - 银行间拆借利率
32. `currency_boc_safe()` - 人民币汇率中间价
33. `currency_hist()` - 外汇历史数据
34. `currency_spot()` - 外汇实时数据
35. `rate_futures()` - 利率期货

### 期权波动率（16个）⭐ 新增关键数据
36. ⭐ `option_volatility_index_50etf()` - 50ETF波动率指数
37. ⭐ `option_volatility_index_50etf_min()` - 50ETF波动率指数分时
38. ⭐ `option_volatility_index_300etf()` - 300ETF波动率指数
39. ⭐ `option_volatility_index_300etf_min()` - 300ETF波动率指数分时
40. ⭐ `option_volatility_index_500etf()` - 500ETF波动率指数
41. ⭐ `option_volatility_index_500etf_min()` - 500ETF波动率指数分时
42. ⭐ `option_volatility_index_cy()` - 创业板波动率指数
43. ⭐ `option_volatility_index_cy_min()` - 创业板波动率指数分时
44. ⭐ `option_volatility_index_kc()` - 科创板波动率指数
45. ⭐ `option_volatility_index_kc_min()` - 科创板波动率指数分时
46. ⭐ `option_volatility_index_sz100etf()` - 深100ETF波动率指数
47. ⭐ `option_volatility_index_sz100etf_min()` - 深100ETF波动率指数分时
48. ⭐ `option_volatility_index_zz300()` - 中证300波动率指数
49. ⭐ `option_volatility_index_zz300_min()` - 中证300波动率指数分时
50. ⭐ `option_volatility_index_zz1000()` - 中证1000波动率指数
51. ⭐ `option_volatility_index_zz1000_min()` - 中证1000波动率指数分时

### 期货期权（8个）⭐ 新增
52. ⭐ `futures_main_sina()` - 主力期货合约
53. ⭐ `futures_spot_stock()` - 现货与股票对应
54. ⭐ `option_current_em()` - 个股期权行情
55. ⭐ `option_finance_minute_em()` - 金融期权分时
56. `futures_foreign_commodity_realtime()` - 外盘实时行情
57. `futures_foreign_hist()` - 外盘历史数据
58. `futures_news_shmet()` - 期货资讯
59. `futures_volatility()` - 期货波动率

### 财新指数（11个）⭐ 新增先行指标
60. ⭐ `index_finance_pmi()` - 财新综合PMI
61. ⭐ `index_finance_pmi_manufacturing()` - 财新制造业PMI
62. ⭐ `index_finance_pmi_service()` - 财新服务业PMI
63. ⭐ `index_finance_digital_economy()` - 数字经济指数
64. ⭐ `index_finance_new_economy()` - 新经济指数
65. ⭐ `index_finance_labor_input()` - 劳动力投入指数
66. ⭐ `index_finance_capital_input()` - 资本投入指数
67. ⭐ `index_finance_tech_input()` - 科技投入指数
68. ⭐ `index_finance_commodity()` - 大宗商品指数
69. ⭐ `index_finance_ai_strategy()` - AI策略指数
70. ⭐ `index_finance_foundation_economy()` - 基石经济指数

### 波动率数据（2个）⭐ 新增学术标准
71. ⭐ `article_oxfordman_realized_volatility()` - Oxford-Man已实现波动率
72. ⭐ `article_risklab_realized_volatility()` - Risk-Lab已实现波动率

### 政策不确定性（1个）⭐ 新增
73. ⭐ `article_epu_index()` - 各国政策不确定性指数

### ETF资金流（5个）⭐ 新增
74. ⭐ `fund_etf_hold_em()` - ETF持仓
75. ⭐ `fund_etf_hist_em()` - ETF历史行情
76. ⭐ `fund_etf_spot_em()` - ETF实时行情
77. `fund_etf_category_sina()` - ETF分类
78. `fund_etf_hist_sina()` - ETF净值历史

### 其他风险指标（8个）
79. `bond_china_yield()` - 国债收益率曲线
80. `bond_china_yield_bank()` - 银行间债券收益率
81. `stock_a_congestion_lg()` - A股拥挤度
82. `stock_buffett_index_lg()` - 巴菲特指标
83. `index_investing_global_from_url()` - 全球恐慌指数
84. `crypto_bitcoin_hold_report()` - 比特币持仓报告
85. `energy_oil_hist()` - 原油历史价格
86. `tool_trade_date_hist_sina()` - 交易日历⭐（工具类）

---

## 🎯 优先级划分

### P0优先级（核心接口，第1-2周实现）- 80个

**市场分析师**（20个）:
- 港股行情5个、美股行情5个、A股指数5个、龙虎榜4个、北向资金1个

**新闻分析师**（20个）:
- 快讯6个、个股新闻4个、公告5个、研报评级5个

**基本面分析师**（20个）:
- 财报10个、财务指标5个、分红配股5个

**社交媒体分析师**（5个）:
- 基础舆情5个

**风险与宏观分析师**（15个）:
- 中国宏观10个、美国宏观3个、利率汇率2个

### P1优先级（重要接口，第3-4周实现）- 100个

**市场分析师**（25个）:
- 板块概念4个、融资融券4个、质押3个、大宗交易3个、涨停板8个、异动3个

**新闻分析师**（17个）:
- 剩余17个

**基本面分析师**（25个）:
- 股东持股10个、限售解禁5个、行业对比5个、法律合规5个

**社交媒体分析师**（5个）:
- 另类数据5个

**风险与宏观分析师**（28个）:
- 期权波动率16个、期货期权8个、全球宏观3个、工具1个

### P2优先级（补充接口，后续实现）- 73个

**市场分析师**（15个）:
- ESG热度4个、机构调研2个、申万指数3个、高频数据1个、其他5个

**基本面分析师**（15个）:
- ESG评级4个、REITs2个、碳排放4个、其他5个

**风险与宏观分析师**（43个）:
- 财新指数11个、波动率数据2个、政策不确定性1个、ETF资金5个、其他24个

---

## 📅 实施时间表

| 周次 | 优先级 | 接口数量 | 完成目标 |
|------|--------|----------|----------|
| 第1-2周 | P0 | 80个 | 核心功能可用 |
| 第3-4周 | P1 | 100个 | 完整功能覆盖 |
| 第5+周 | P2 | 73个 | 高级功能补充 |

---

## 🎉 总结

1. **总接口数**: 253个（比原计划150个多了103个）
2. **五大分析师**: 市场60 + 新闻37 + 基本面60 + 社交媒体10 + 风险宏观86
3. **关键补充**: 期权波动率、申万行业、财新指数、波动率数据、政策不确定性等
4. **实施周期**: 预计5周完成全部接口

---

> **下一步**: 更新"AkShare四大分析师接口实施计划.md"，加入这253个接口的详细实施方案。
