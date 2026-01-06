# AKShare 快速入门

> 来源: https://akshare.akfamily.xyz/tutorial.html
> 抓取时间: 2026-01-06T00:59:12.015Z

---

# [AKShare](https://github.com/akfamily/akshare/) 快速入门[](#akshare "Link to this heading")

## 查看数据[](#id1 "Link to this heading")

具体函数使用详情, 请查看 [AKShare 文档](https://akshare.akfamily.xyz/) 每个接口的示例代码

[AKShare](https://github.com/akfamily/akshare/) 数据接口一览

 \# 交易所期货数据
 "get\_cffex\_daily",  \# 中国金融期货交易所每日交易数据
 "get\_cffex\_rank\_table",  \# 中国金融期货交易所前20会员持仓数据明细
 "get\_czce\_daily",  \# 郑州商品交易所每日交易数据
 "get\_rank\_table\_czce",  \# 郑州商品交易所前20会员持仓数据明细
 "get\_dce\_daily",  \# 大连商品交易所每日交易数据
 "get\_gfex\_daily",  \# 广州期货交易所每日交易数据
 "get\_ine\_daily",  \# 上海国际能源交易中心每日交易数据
 "futures\_settlement\_price\_sgx",  \# 新加坡交易所期货品种每日交易数据
 "get\_dce\_rank\_table",  \# 大连商品交易所前20会员持仓数据明细
 "get\_futures\_daily",  \# 中国金融期货交易所每日基差数据
 "get\_rank\_sum",  \# 四个期货交易所前5, 10, 15, 20会员持仓排名数据
 "get\_rank\_sum\_daily",  \# 每日四个期货交易所前5, 10, 15, 20会员持仓排名数据
 "futures\_dce\_position\_rank",  \# 大连商品交易所前 20 会员持仓排名数据
 "get\_receipt",  \# 大宗商品注册仓单数据
 "get\_roll\_yield",  \# 某一天某品种(主力和次主力)或固定两个合约的展期收益率
 "get\_roll\_yield\_bar",  \# 展期收益率
 "get\_shfe\_daily",  \# 上海期货交易所每日交易数据
 "get\_shfe\_rank\_table",  \# 上海期货交易所前20会员持仓数据明细
 "get\_shfe\_v\_wap",  \# 上海期货交易所日成交均价数据
 "futures\_spot\_price",  \# 具体交易日大宗商品现货价格及相应基差数据
 "futures\_spot\_price\_previous",  \# 具体交易日大宗商品现货价格及相应基差数据-该接口补充历史数据
 "futures\_spot\_price\_daily"  \# 一段交易日大宗商品现货价格及相应基差数据
 "futures\_warehouse\_receipt\_czce"  \# 郑州商品交易所-交易数据-仓单日报
 "futures\_shfe\_warehouse\_receipt"  \# 上海期货交易所-交易数据-仓单日报
 "futures\_warehouse\_receipt\_dce"  \# 大连商品交易所-交易数据-仓单日报
 "futures\_gfex\_warehouse\_receipt"  \# 广州期货交易所-行情数据-仓单日报
 "futures\_rule"  \# 国泰君安-交易日历
 \# 奇货可查数据
 "get\_qhkc\_index"  \# 奇货可查-指数-数值数据
 "get\_qhkc\_index\_profit\_loss"  \# 奇货可查-指数-累计盈亏数据
 "get\_qhkc\_index\_trend"  \# 奇货可查-指数-大资金动向数据
 "get\_qhkc\_fund\_bs"  \# 奇货可查-资金-净持仓分布数据
 "get\_qhkc\_fund\_position"  \# 奇货可查-资金-总持仓分布数据
 "get\_qhkc\_fund\_position\_change"  \# 奇货可查-资金-净持仓变化分布数据
 "get\_qhkc\_tool\_foreign"  \# 奇货可查-工具-外盘比价数据
 "get\_qhkc\_tool\_gdp"  \# 奇货可查-工具-各地区经济数据
 \# 中国银行间市场交易商协会-非金融企业债务融资工具注册信息系统
 "bond\_debt\_nafmii"  \# 中国银行间市场交易商协会-非金融企业债务融资工具注册信息系统
 \# 交易所商品期权数据
 "option\_hist\_dce"  \# 提供大连商品交易所商品期权数据
 "option\_hist\_czce"  \# 提供郑州商品交易所商品期权数据
 "option\_hist\_shfe"  \# 提供上海期货交易所商品期权数据
 "option\_hist\_gfex"  \# 提供广州期货交易所商品期权数据
 "option\_vol\_gfex"  \# 提供广州期货交易所-合约隐含波动率数据
 "option\_vol\_shfe"  \# 提供上海期货交易所-合约隐含波动率数据
 "option\_hist\_yearly\_czce"  \# 郑州商品交易所-交易数据-历史行情下载-期权历史行情下载
 \# 中国银行间市场债券行情数据
 "get\_bond\_market\_quote"  \# 债券市场行情-现券市场成交行情数据
 "get\_bond\_market\_trade"  \# 债券市场行情-现券市场做市报价数据
 \# 外汇
 "get\_fx\_spot\_quote"  \# 人民币外汇即期报价数据
 "get\_fx\_swap\_quote"  \# 人民币外汇远掉报价数据
 "get\_fx\_pair\_quote"  \# 外币对即期报价数据
 \# 宏观-欧洲
 "macro\_euro\_interest\_rate"  \# 欧洲央行决议报告
 \# 宏观-主要机构
 "macro\_cons\_gold"  \# 全球最大黄金ETF—SPDR Gold Trust持仓报告
 "macro\_cons\_silver"  \# 全球最大白银ETF--iShares Silver Trust持仓报告
 "macro\_cons\_opec\_month"  \# 欧佩克报告
 \# 期货-仓单有效期
 "get\_receipt\_date"  \# 期货仓单有效期数据
 \# 新浪财经-期货
 "futures\_zh\_spot"  \# 国内期货实时行情数据
 "futures\_zh\_realtime"  \# 国内期货实时行情数据(品种)
 "futures\_foreign\_commodity\_realtime"  \# 外盘期货实时行情数据
 "futures\_foreign\_hist"  \# 外盘期货历史行情数据
 "futures\_foreign\_detail"  \# 外盘期货合约详情
 "futures\_zh\_minute\_sina"  \# 内盘分时数据
 \# 交易所金融期权数据
 "get\_finance\_option"  \# 提供上海证券交易所期权数据
 \# 加密货币行情
 "crypto\_js\_spot"  \# 提供主流加密货币行情数据接口
 \# 新浪财经-港股
 "stock\_hk\_spot"  \# 港股的历史行情数据(包括前后复权因子)
 "stock\_hk\_daily"  \# 港股的实时行情数据(也可以用于获得所有港股代码)
 \# 东方财富
 "stock\_hk\_spot\_em"  \# 港股实时行情
 "stock\_hk\_main\_board\_spot\_em"  \# 港股主板实时行情
 \# 新浪财经-美股
 "get\_us\_stock\_name"  \# 获得美股的所有股票代码
 "stock\_us\_spot"  \# 美股行情报价
 "stock\_us\_daily"  \# 美股的历史数据(包括前复权因子)
 \# A+H股实时行情数据和历史行情数据
 "stock\_zh\_ah\_spot"  \#  A+H 股实时行情数据(延迟15分钟)
 "stock\_zh\_ah\_daily"  \#  A+H 股历史行情数据(日频)
 "stock\_zh\_ah\_name"  \#  A+H 股所有股票代码
 \# A股实时行情数据和历史行情数据
 "stock\_zh\_a\_spot"  \# 新浪 A 股实时行情数据
 "stock\_zh\_a\_spot\_em"  \# 东财 A 股实时行情数据
 "stock\_sh\_a\_spot\_em"  \# 东财沪 A 股实时行情数据
 "stock\_sz\_a\_spot\_em"  \# 东财深 A 股实时行情数据
 "stock\_bj\_a\_spot\_em"  \# 东财京 A 股实时行情数据
 "stock\_new\_a\_spot\_em"  \# 东财新股实时行情数据
 "stock\_kc\_a\_spot\_em"  \# 东财科创板实时行情数据
 "stock\_zh\_b\_spot\_em"  \# 东财 B 股实时行情数据
 "stock\_zh\_a\_daily"  \#  A 股历史行情数据(日频)
 "stock\_zh\_a\_minute"  \#  A 股分时历史行情数据(分钟)
 "stock\_zh\_a\_cdr\_daily"  \#  A 股 CDR 历史行情数据(日频)
 \# 科创板实时行情数据和历史行情数据
 "stock\_zh\_kcb\_spot"  \# 科创板实时行情数据
 "stock\_zh\_kcb\_daily"  \# 科创板历史行情数据(日频)
 \# 银保监分局本级行政处罚数据
 "bank\_fjcf\_table\_detail"  \# 银保监分局本级行政处罚-信息公开表
 \# 已实现波动率数据
 "article\_oman\_rv"  \# O-MAN已实现波动率
 "article\_rlab\_rv"  \# Risk-Lab已实现波动率
 \# FF多因子模型数据
 "ff\_crr"  \# FF当前因子
 \# 指数实时行情和历史行情
 "stock\_zh\_index\_daily"  \# 股票指数历史行情数据
 "stock\_zh\_index\_daily\_tx"  \# 股票指数历史行情数据-腾讯
 "stock\_zh\_index\_daily\_em"  \# 股票指数历史行情数据-东方财富
 "stock\_zh\_index\_spot\_sina"  \# 股票指数实时行情数据-新浪
 "stock\_zh\_index\_spot\_em"  \# 股票指数实时行情数据-东财
 \# 股票分笔数据
 "stock\_zh\_a\_tick\_tx\_js"  \# A 股票分笔行情数据-腾讯-当日数据
 \# 世界各地区日出和日落数据-日
 "weather\_daily"  \# 每日日出和日落数据
 \# 世界各地区日出和日落数据-月
 "weather\_monthly"  \# 每月日出和日落数据
 \# 河北空气质量数据(期货-钢铁)
 "air\_quality\_hebei"  \# 河北空气质量数据
 \# 经济政策不确定性(EPU)指数
 "article\_epu\_index"  \# 主要国家和地区的经济政策不确定性(EPU)指数
 \# 申万行业指数
 "sw\_index\_third\_info"  \# 申万三级信息
 "sw\_index\_third\_cons"  \# 申万三级信息成份
 \# 空气质量
 "air\_quality\_hist"  \# 空气质量历史数据
 "air\_quality\_rank"  \# 空气质量排行
 "air\_quality\_watch\_point"  \# 空气质量观测点历史数据
 "air\_city\_table"  \# 所有城市列表
 \# 财富世界五百强公司
 "fortune\_rank"  \# 财富世界500强公司历年排名
 \# 中国证券投资基金业协会-信息公示
 "amac\_member\_info" \# 中国证券投资基金业协会-信息公示-会员信息-会员机构综合查询
 "amac\_person\_fund\_org\_list" \# 中国证券投资基金业协会-信息公示-从业人员信息-基金从业人员资格注册信息
 "amac\_person\_bond\_org\_list" \# 中国证券投资基金业协会-信息公示-从业人员信息-债券投资交易相关人员公示
 "amac\_manager\_info" \# 中国证券投资基金业协会-信息公示-私募基金管理人公示-私募基金管理人综合查询
 "amac\_manager\_classify\_info" \# 中国证券投资基金业协会-信息公示-私募基金管理人公示-私募基金管理人分类公示
 "amac\_member\_sub\_info" \# 中国证券投资基金业协会-信息公示-私募基金管理人公示-证券公司私募基金子公司管理人信息公示
 "amac\_fund\_info" \# 中国证券投资基金业协会-信息公示-基金产品-私募基金管理人基金产品
 "amac\_securities\_info" \# 中国证券投资基金业协会-信息公示-基金产品-证券公司集合资管产品公示
 "amac\_aoin\_info" \# 中国证券投资基金业协会-信息公示-基金产品-证券公司直投基金
 "amac\_fund\_sub\_info" \# 中国证券投资基金业协会-信息公示-基金产品公示-证券公司私募投资基金
 "amac\_fund\_account\_info" \# 中国证券投资基金业协会-信息公示-基金产品公示-基金公司及子公司集合资管产品公示
 "amac\_fund\_abs" \# 中国证券投资基金业协会-信息公示-基金产品公示-资产支持专项计划
 "amac\_futures\_info" \# 中国证券投资基金业协会-信息公示-基金产品公示-期货公司集合资管产品公示
 "amac\_manager\_cancelled\_info" \# 中国证券投资基金业协会-信息公示-诚信信息-已注销私募基金管理人名单
 \# 全国银行间同业拆借中心-市场数据-市场行情-外汇市场行情
 "fx\_spot\_quote"  \# 市场行情-外汇市场行情-人民币外汇即期报价
 "fx\_swap\_quote"  \# 市场行情-债券市场行情-人民币外汇远掉报价
 "fx\_pair\_quote"  \# 市场行情-债券市场行情-外币对即期报价
 \# 能源-碳排放权
 "energy\_carbon\_domestic"  \# 碳排放权-国内
 "energy\_carbon\_bj"  \# 碳排放权-北京
 "energy\_carbon\_sz"  \# 碳排放权-深圳
 "energy\_carbon\_eu"  \# 碳排放权-国际
 "energy\_carbon\_hb"  \# 碳排放权-湖北
 "energy\_carbon\_gz"  \# 碳排放权-广州
 \# 商品现货价格指数
 "spot\_goods"  \# 商品现货价格指数
 \# 中国宏观杠杆率
 "macro\_cnbs"  \# 中国宏观杠杆率数据
 \# 金融期权
 "option\_finance\_board"  \# 金融期权数据
 \# 期货连续合约
 "futures\_main\_sina"  \# 新浪期货连续合约的历史数据
 \# 机构调研数据
 "stock\_jgdy\_tj\_em"  \# 机构调研数据-统计
 "stock\_jgdy\_detail\_em"  \# 机构调研数据-详细
 \# 股权质押数据
 "stock\_gpzy\_profile\_em"  \# 股权质押市场概况
 "stock\_gpzy\_pledge\_ratio\_em"  \# 上市公司质押比例
 "stock\_gpzy\_pledge\_ratio\_detail\_em"  \# 重要股东股权质押明细
 "stock\_gpzy\_distribute\_statistics\_company\_em"  \# 质押机构分布统计-证券公司
 "stock\_gpzy\_distribute\_statistics\_bank\_em"  \# 质押机构分布统计-银行
 "stock\_gpzy\_industry\_data\_em"  \# 上市公司质押比例-行业数据
 \# 商誉专题数据
 "stock\_sy\_profile\_em"  \# A股商誉市场概况
 "stock\_sy\_yq\_em"  \# 商誉减值预期明细
 "stock\_sy\_jz\_em"  \# 个股商誉减值明细
 "stock\_sy\_em"  \# 个股商誉明细
 "stock\_sy\_hy\_em"  \# 行业商誉
 \# 股票账户统计数据
 "stock\_account\_statistics\_em"  \# 股票账户统计数据
 \# 股票指数-成份股
 "index\_stock\_cons"  \# 股票指数-成份股-最新成份股
 "index\_stock\_cons\_csindex"  \# 中证指数-成份股
 "index\_stock\_cons\_weight\_csindex"  \# 中证指数成份股的权重
 "index\_stock\_info"  \# 股票指数-成份股-所有可以的指数表
 "index\_stock\_info\_sina"  \# 股票指数-成份股-所有可以的指数表-新浪新接口
 \# 义乌小商品指数
 "index\_yw"  \# 义乌小商品指数
 \# 世界银行间拆借利率
 "rate\_interbank"  \#  银行间拆借利率
 \# 主要央行利率
 "macro\_bank\_usa\_interest\_rate"  \# 美联储利率决议报告
 "macro\_bank\_euro\_interest\_rate"  \# 欧洲央行决议报告
 "macro\_bank\_newzealand\_interest\_rate"  \# 新西兰联储决议报告
 "macro\_bank\_switzerland\_interest\_rate"  \# 瑞士央行决议报告
 "macro\_bank\_english\_interest\_rate"  \# 英国央行决议报告
 "macro\_bank\_australia\_interest\_rate"  \# 澳洲联储决议报告
 "macro\_bank\_japan\_interest\_rate"  \# 日本央行决议报告
 "macro\_bank\_russia\_interest\_rate"  \# 俄罗斯央行决议报告
 "macro\_bank\_india\_interest\_rate"  \# 印度央行决议报告
 "macro\_bank\_brazil\_interest\_rate"  \# 巴西央行决议报告
 \# 中国
 "macro\_china\_urban\_unemployment"  \# 城镇调查失业率
 "macro\_china\_shrzgm"  \# 社会融资规模增量统计
 "macro\_china\_gdp\_yearly"  \# 金十数据中心-经济指标-中国-国民经济运行状况-经济状况-中国GDP年率报告
 "macro\_china\_cpi\_yearly"  \# 金十数据中心-经济指标-中国-国民经济运行状况-物价水平-中国CPI年率报告
 "macro\_china\_cpi\_monthly"  \# 金十数据中心-经济指标-中国-国民经济运行状况-物价水平-中国CPI月率报告
 "macro\_china\_ppi\_yearly"  \# 金十数据中心-经济指标-中国-国民经济运行状况-物价水平-中国PPI年率报告
 "macro\_china\_exports\_yoy"  \# 金十数据中心-经济指标-中国-贸易状况-以美元计算出口年率报告
 "macro\_china\_imports\_yoy"  \# 金十数据中心-经济指标-中国-贸易状况-以美元计算进口年率
 "macro\_china\_trade\_balance"  \# 金十数据中心-经济指标-中国-贸易状况-以美元计算贸易帐(亿美元)
 "macro\_china\_industrial\_production\_yoy"  \# 金十数据中心-经济指标-中国-产业指标-规模以上工业增加值年率
 "macro\_china\_pmi\_yearly"  \# 金十数据中心-经济指标-中国-产业指标-官方制造业PMI
 "macro\_china\_cx\_pmi\_yearly"  \# 金十数据中心-经济指标-中国-产业指标-财新制造业PMI终值
 "macro\_china\_cx\_services\_pmi\_yearly"  \# 金十数据中心-经济指标-中国-产业指标-财新服务业PMI
 "macro\_china\_non\_man\_pmi"  \# 金十数据中心-经济指标-中国-产业指标-中国官方非制造业PMI
 "macro\_china\_fx\_reserves\_yearly"  \# 金十数据中心-经济指标-中国-金融指标-外汇储备(亿美元)
 "macro\_china\_m2\_yearly"  \# 金十数据中心-经济指标-中国-金融指标-M2货币供应年率
 "macro\_china\_shibor\_all"  \# 金十数据中心-经济指标-中国-金融指标-上海银行业同业拆借报告
 "macro\_china\_hk\_market\_info"  \# 金十数据中心-经济指标-中国-金融指标-人民币香港银行同业拆息
 "macro\_china\_daily\_energy"  \# 金十数据中心-经济指标-中国-其他-中国日度沿海六大电库存数据
 "macro\_china\_rmb"  \# 金十数据中心-经济指标-中国-其他-中国人民币汇率中间价报告
 "macro\_china\_market\_margin\_sz"  \# 金十数据中心-经济指标-中国-其他-深圳融资融券报告
 "macro\_china\_market\_margin\_sh"  \# 金十数据中心-经济指标-中国-其他-上海融资融券报告
 "macro\_china\_au\_report"  \# 金十数据中心-经济指标-中国-其他-上海黄金交易所报告
 "macro\_china\_lpr"  \# 中国-利率-贷款报价利率
 "macro\_china\_new\_house\_price"  \# 中国-新房价指数
 "macro\_china\_enterprise\_boom\_index"  \# 中国-企业景气及企业家信心指数
 "macro\_china\_national\_tax\_receipts"  \# 中国-全国税收收入
 "macro\_china\_bank\_financing"  \# 中国-银行理财产品发行数量
 "macro\_china\_new\_financial\_credit"  \# 中国-新增信贷数据
 "macro\_china\_fx\_gold"  \# 中国-外汇和黄金储备
 "macro\_china\_stock\_market\_cap"  \# 中国-全国股票交易统计表
 "macro\_china\_cpi"  \# 中国-居民消费价格指数
 "macro\_china\_gdp"  \# 中国-国内生产总值
 "macro\_china\_ppi"  \# 中国-工业品出厂价格指数
 "macro\_china\_pmi"  \# 中国-采购经理人指数
 "macro\_china\_gdzctz"  \# 中国-城镇固定资产投资
 "macro\_china\_hgjck"  \# 中国-海关进出口增减情况一览表
 "macro\_china\_czsr"  \# 中国-财政收入
 "macro\_china\_whxd"  \# 中国-外汇贷款数据
 "macro\_china\_wbck"  \# 中国-本外币存款
 "macro\_china\_bond\_public"  \# 中国-债券发行
 \# 美国
 "macro\_usa\_gdp\_monthly"  \# 金十数据中心-经济指标-美国-经济状况-美国GDP
 "macro\_usa\_cpi\_monthly"  \# 金十数据中心-经济指标-美国-物价水平-美国CPI月率报告
 "macro\_usa\_cpi\_yoy"  \# 东方财富-经济数据一览-美国-CPI年率
 "macro\_usa\_core\_cpi\_monthly"  \# 金十数据中心-经济指标-美国-物价水平-美国核心CPI月率报告
 "macro\_usa\_personal\_spending"  \# 金十数据中心-经济指标-美国-物价水平-美国个人支出月率报告
 "macro\_usa\_retail\_sales"  \# 金十数据中心-经济指标-美国-物价水平-美国零售销售月率报告
 "macro\_usa\_import\_price"  \# 金十数据中心-经济指标-美国-物价水平-美国进口物价指数报告
 "macro\_usa\_export\_price"  \# 金十数据中心-经济指标-美国-物价水平-美国出口价格指数报告
 "macro\_usa\_lmci"  \# 金十数据中心-经济指标-美国-劳动力市场-LMCI
 "macro\_usa\_unemployment\_rate"  \# 金十数据中心-经济指标-美国-劳动力市场-失业率-美国失业率报告
 "macro\_usa\_job\_cuts"  \# 金十数据中心-经济指标-美国-劳动力市场-失业率-美国挑战者企业裁员人数报告
 "macro\_usa\_non\_farm"  \# 金十数据中心-经济指标-美国-劳动力市场-就业人口-美国非农就业人数报告
 "macro\_usa\_adp\_employment"  \# 金十数据中心-经济指标-美国-劳动力市场-就业人口-美国ADP就业人数报告
 "macro\_usa\_core\_pce\_price"  \# 金十数据中心-经济指标-美国-劳动力市场-消费者收入与支出-美国核心PCE物价指数年率报告
 "macro\_usa\_real\_consumer\_spending"  \# 金十数据中心-经济指标-美国-劳动力市场-消费者收入与支出-美国实际个人消费支出季率初值报告
 "macro\_usa\_trade\_balance"  \# 金十数据中心-经济指标-美国-贸易状况-美国贸易帐报告
 "macro\_usa\_current\_account"  \# 金十数据中心-经济指标-美国-贸易状况-美国经常帐报告
 "macro\_usa\_rig\_count"  \# 金十数据中心-经济指标-美国-产业指标-制造业-贝克休斯钻井报告
 \# 金十数据中心-经济指标-美国-产业指标-制造业-美国个人支出月率报告
 "macro\_usa\_ppi"  \# 金十数据中心-经济指标-美国-产业指标-制造业-美国生产者物价指数(PPI)报告
 "macro\_usa\_core\_ppi"  \# 金十数据中心-经济指标-美国-产业指标-制造业-美国核心生产者物价指数(PPI)报告
 "macro\_usa\_api\_crude\_stock"  \# 金十数据中心-经济指标-美国-产业指标-制造业-美国API原油库存报告
 "macro\_usa\_pmi"  \# 金十数据中心-经济指标-美国-产业指标-制造业-美国Markit制造业PMI初值报告
 "macro\_usa\_ism\_pmi"  \# 金十数据中心-经济指标-美国-产业指标-制造业-美国ISM制造业PMI报告
 "macro\_usa\_nahb\_house\_market\_index"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国NAHB房产市场指数报告
 "macro\_usa\_house\_starts"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国新屋开工总数年化报告
 "macro\_usa\_new\_home\_sales"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国新屋销售总数年化报告
 "macro\_usa\_building\_permits"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国营建许可总数报告
 "macro\_usa\_exist\_home\_sales"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国成屋销售总数年化报告
 "macro\_usa\_house\_price\_index"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国FHFA房价指数月率报告
 "macro\_usa\_spcs20" \# 金十数据中心-经济指标-美国-产业指标-房地产-美国S&P/CS20座大城市房价指数年率报告
 "macro\_usa\_pending\_home\_sales"  \# 金十数据中心-经济指标-美国-产业指标-房地产-美国成屋签约销售指数月率报告
 "macro\_usa\_cb\_consumer\_confidence"  \# 金十数据中心-经济指标-美国-领先指标-美国谘商会消费者信心指数报告
 "macro\_usa\_nfib\_small\_business" \# 金十数据中心-经济指标-美国-领先指标-美国NFIB小型企业信心指数报告
 "macro\_usa\_michigan\_consumer\_sentiment" \# 金十数据中心-经济指标-美国-领先指标-美国密歇根大学消费者信心指数初值报告
 "macro\_usa\_eia\_crude\_rate"  \# 金十数据中心-经济指标-美国-其他-美国EIA原油库存报告
 "macro\_usa\_initial\_jobless"  \# 金十数据中心-经济指标-美国-其他-美国初请失业金人数报告
 "macro\_usa\_crude\_inner"  \# 金十数据中心-经济指标-美国-其他-美国原油产量报告
 \# 宏观数据
 "macro\_cons\_gold\_volume"  \# 全球最大黄金ETF—SPDR Gold Trust持仓报告
 "macro\_cons\_gold\_change"  \# 全球最大黄金ETF—SPDR Gold Trust持仓报告
 "macro\_cons\_gold\_amount"  \# 全球最大黄金ETF—SPDR Gold Trust持仓报告
 "macro\_cons\_silver\_volume"  \# 全球最大白银ETF--iShares Silver Trust持仓报告
 "macro\_cons\_silver\_change"  \# 全球最大白银ETF--iShares Silver Trust持仓报告
 "macro\_cons\_silver\_amount"  \# 全球最大白银ETF--iShares Silver Trust持仓报告
 \# 伦敦金属交易所(LME)
 "macro\_euro\_lme\_holding"  \# 伦敦金属交易所(LME)-持仓报告
 "macro\_euro\_lme\_stock"  \# 伦敦金属交易所(LME)-库存报告
 \# 美国商品期货交易委员会
 "macro\_usa\_cftc\_nc\_holding"  \# 外汇类非商业持仓报告
 "macro\_usa\_cftc\_c\_holding"  \# 商品类非商业持仓报告
 "macro\_usa\_cftc\_merchant\_currency\_holding"  \# 外汇类商业持仓报告
 "macro\_usa\_cftc\_merchant\_goods\_holding"  \# 商品类商业持仓报告
 \# 货币对-投机情绪报告
 "macro\_fx\_sentiment"  \# 货币对-投机情绪报告
 \# 百度迁徙地图接口
 "migration\_area\_baidu"  \# 百度迁徙地图-迁入/出地详情
 "migration\_scale\_baidu"  \# 百度迁徙地图-迁徙规模
 \# 债券-沪深债券
 "bond\_zh\_hs\_daily"  \# 债券-沪深债券-历史行情数据
 "bond\_zh\_hs\_spot"  \# 债券-沪深债券-实时行情数据
 \# 债券-沪深可转债
 "bond\_zh\_hs\_cov\_daily"  \# 债券-沪深可转债-历史行情数据
 "bond\_zh\_hs\_cov\_spot"  \# 债券-沪深可转债-实时行情数据
 "bond\_zh\_cov"  \# 债券-可转债数据一览表
 "bond\_cov\_comparison"  \# 债券-可转债数据比价
 "bond\_cb\_jsl"  \# 可转债实时数据-集思录
 "bond\_cb\_adj\_logs\_jsl"  \# 可转债转股价变动-集思录
 "bond\_cb\_index\_jsl"  \# 可转债-集思录可转债等权指数
 "bond\_cb\_redeem\_jsl"  \# 可转债-集思录可转债-强赎
 \# 金融期权-新浪
 "option\_cffex\_sz50\_list\_sina"  \# 上证50期权列表
 "option\_cffex\_sz50\_spot\_sina"  \# 沪深300期权实时行情
 "option\_cffex\_sz50\_daily\_sina"  \# 沪深300期权历史行情-日频
 "option\_cffex\_hs300\_list\_sina"  \# 沪深300期权列表
 "option\_cffex\_hs300\_spot\_sina"  \# 沪深300期权实时行情
 "option\_cffex\_hs300\_daily\_sina"  \# 沪深300期权历史行情-日频
 "option\_cffex\_zz1000\_list\_sina"  \# 中证1000期权列表
 "option\_cffex\_zz1000\_spot\_sina"  \# 中证1000期权实时行情
 "option\_cffex\_zz1000\_daily\_sina"  \# 中证1000期权历史行情-日频
 "option\_sse\_list\_sina"  \# 上交所期权列表
 "option\_sse\_expire\_day\_sina"  \# 上交所期权剩余到期日
 "option\_sse\_codes\_sina"  \# 上交所期权代码
 "option\_sse\_spot\_price\_sina"  \# 上交所期权实时行情
 "option\_sse\_underlying\_spot\_price\_sina"  \# 上交所期权标的物实时行情
 "option\_sse\_greeks\_sina"  \# 上交所期权希腊字母
 "option\_sse\_minute\_sina"  \# 上交所期权分钟数据
 "option\_sse\_daily\_sina"  \# 上交所期权日频数据
 "option\_finance\_minute\_sina"  \# 金融股票期权分时数据
 "option\_minute\_em"  \# 股票期权分时数据
 \# 商品期权-新浪
 "option\_sina\_option\_commodity\_dict"  \# 商品期权合约字典查询
 "option\_sina\_option\_commodity\_contract\_list"  \# 商品期权合约查询
 "option\_sina\_option\_commodity\_hist"  \# 商品期权行情历史数据
 \# 微博舆情报告
 "stock\_js\_weibo\_report"  \# 微博舆情报告
 \# 自然语言处理
 "nlp\_ownthink"  \# 知识图谱
 "nlp\_answer"  \# 智能问答
 \# 货币
 "currency\_latest"  \# 最新货币报价
 "currency\_history"  \# 指定历史日期的所有货币报价
 "currency\_time\_series"  \# 指定日期间的时间序列数据-需要权限
 "currency\_currencies"  \# 查询所支持的货币信息
 "currency\_convert"  \# 货币换算
 "currency\_pair\_map"  \# 指定货币的所有可货币对的数据
 \# 公募基金
 "fund\_name\_em",  \# 基金基本信息
 "fund\_info\_index\_em",  \# 指数型基金-基本信息
 "fund\_purchase\_em",  \# 基金申购状态
 "fund\_open\_fund\_daily\_em",  \# 开放式基金-实时数据
 "fund\_open\_fund\_info\_em",  \# 开放式基金-历史数据
 "fund\_etf\_fund\_daily\_em",  \# 场内交易基金-实时数据
 "fund\_etf\_fund\_info\_em",  \# 场内交易基金-历史数据
 "fund\_financial\_fund\_daily\_em",  \# 理财型基金-实时数据
 "fund\_financial\_fund\_info\_em",  \# 理财型基金-历史数据
 "fund\_graded\_fund\_daily\_em",  \# 分级基金-实时数据
 "fund\_graded\_fund\_info\_em",  \# 分级基金-历史数据
 "fund\_money\_fund\_daily\_em",  \# 货币型基金-实时数据
 "fund\_money\_fund\_info\_em",  \# 货币型基金-历史数据
 "fund\_value\_estimation\_em",  \# 基金估值
 \# 分析师指数
 "stock\_analyst\_rank\_em"  \# 分析师排名
 "stock\_analyst\_detail\_em"  \# 分析师详情
 \# 千股千评
 "stock\_comment\_em"  \# 股市关注度
 "stock\_comment\_detail\_zlkp\_jgcyd\_em"  \# 机构参与度
 "stock\_comment\_detail\_zhpj\_lspf\_em"  \# 综合评价-历史评分
 "stock\_comment\_detail\_scrd\_focus\_em"  \# 市场热度-用户关注指数
 "stock\_comment\_detail\_scrd\_desire\_em"  \# 市场热度-市场参与意愿
 \# 沪深港通
 "stock\_hk\_ggt\_components\_em"  \# 港股通成份股
 "stock\_hsgt\_hold\_stock\_em"  \# 沪深港通持股-个股排行
 "stock\_hsgt\_stock\_statistics\_em"  \# 沪深港通持股-每日个股统计
 "stock\_hsgt\_institution\_statistics\_em"  \# 沪深港通持股-每日机构统计
 "stock\_hsgt\_hist\_em"  \# 沪深港通历史数据
 "stock\_hsgt\_board\_rank\_em"  \# 板块排行
 "stock\_hsgt\_fund\_flow\_summary\_em"  \# 沪深港通资金流向
 \# 两市停复牌
 "stock\_tfp\_em"  \# 两市停复牌数据
 \# 中国油价
 "energy\_oil\_hist"  \# 汽柴油历史调价信息
 "energy\_oil\_detail"  \# 地区油价
 \# 现货与股票
 "futures\_spot\_stock"  \# 现货与股票接口
 \# 中证商品指数
 "futures\_index\_ccidx"  \# 中证商品指数
 \# 打新收益率
 "stock\_dxsyl\_em"  \# 打新收益率
 "stock\_xgsglb\_em"  \# 新股申购与中签查询
 \# 年报季报
 "stock\_yjyg\_em"  \# 上市公司业绩预告
 "stock\_yysj\_em"  \# 上市公司预约披露时间
 \# 高频数据-标普500指数
 "hf\_sp\_500"  \# 标普500指数的分钟数据
 \# 商品期货库存数据
 "futures\_inventory\_em"  \# 库存数据-东方财富
 \# 个股资金流
 "stock\_individual\_fund\_flow"  \# 个股资金流
 "stock\_individual\_fund\_flow\_rank"  \# 个股资金流排名
 "stock\_market\_fund\_flow"  \# 大盘资金流
 "stock\_sector\_fund\_flow\_rank"  \# 板块资金流排名
 "stock\_sector\_fund\_flow\_summary"  \# xx行业个股资金流
 "stock\_sector\_fund\_flow\_hist"  \# 行业历史资金流
 "stock\_concept\_fund\_flow\_hist"  \# 概念历史资金流
 "stock\_main\_fund\_flow"  \# 主力净流入排名
 \# 股票基本面数据
 "stock\_financial\_abstract"  \# 财务摘要
 "stock\_financial\_report\_sina"  \# 三大财务报表
 "stock\_financial\_analysis\_indicator"  \# 财务指标
 "stock\_add\_stock"  \# 股票增发
 "stock\_ipo\_info"  \# 股票新股
 "stock\_history\_dividend\_detail"  \# 分红配股
 "stock\_history\_dividend"  \# 历史分红
 "stock\_dividend\_cninfo"  \# 个股历史分红
 "stock\_restricted\_release\_queue\_sina"  \# 限售解禁-新浪
 "stock\_restricted\_release\_summary\_em"  \# 东方财富网-数据中心-特色数据-限售股解禁
 "stock\_restricted\_release\_detail\_em"  \# 东方财富网-数据中心-限售股解禁-解禁详情一览
 "stock\_restricted\_release\_queue\_em"  \# 东方财富网-数据中心-个股限售解禁-解禁批次
 "stock\_restricted\_release\_stockholder\_em"  \# 东方财富网-数据中心-个股限售解禁-解禁股东
 "stock\_circulate\_stock\_holder"  \# 流动股东
 "stock\_fund\_stock\_holder"  \# 基金持股
 "stock\_main\_stock\_holder"  \# 主要股东
 \# 股票板块
 "stock\_sector\_spot"  \# 板块行情
 "stock\_sector\_detail"  \# 板块详情(具体股票)
 \# 股票信息
 "stock\_info\_sz\_name\_code"  \# 深证证券交易所股票代码和简称
 "stock\_info\_sh\_name\_code"  \# 上海证券交易所股票代码和简称
 "stock\_info\_bj\_name\_code"  \# 北京证券交易所股票代码和简称
 "stock\_info\_sh\_delist"  \# 上海证券交易所暂停和终止上市
 "stock\_info\_sz\_delist"  \# 深证证券交易所暂停和终止上市
 "stock\_info\_sz\_change\_name"  \# 深证证券交易所名称变更
 "stock\_info\_change\_name"  \# A 股股票曾用名列表
 "stock\_info\_a\_code\_name"  \# A 股股票代码和简称
 \# 机构持股
 "stock\_institute\_hold"  \# 机构持股一览表
 "stock\_institute\_hold\_detail"  \# 机构持股详情
 \# 机构推荐股票
 "stock\_institute\_recommend"  \# 机构推荐
 "stock\_institute\_recommend\_detail"  \# 股票评级记录
 \# 股票市场总貌
 "stock\_szse\_summary"  \# 深圳证券交易所-市场总貌-证券类别统计
 "stock\_szse\_area\_summary"  \# 深圳证券交易所-市场总貌-地区交易排序
  "stock\_szse\_sector\_summary"  \# 深圳证券交易所-统计资料-股票行业成交
 "stock\_sse\_summary"  \# 上海证券交易所-股票数据总貌
 "stock\_sse\_deal\_daily"  \# 上海证券交易所-每日股票情况
 \# 美股港股目标价
 "stock\_price\_js"  \# 美股港股目标价
 \# 券商业绩月报
 "stock\_qsjy\_em"  \# 券商业绩月报
 \# 彭博亿万富豪指数
 "index\_bloomberg\_billionaires"  \# 彭博亿万富豪指数
 "index\_bloomberg\_billionaires\_hist"  \# 彭博亿万富豪历史指数
 \# A 股市盈率和市净率
 "stock\_market\_pe\_lg"  \# 乐咕乐股-主板市盈率
 "stock\_index\_pe\_lg"  \# 乐咕乐股-指数市盈率
 "stock\_market\_pb\_lg"  \# 乐咕乐股-主板市净率
 "stock\_index\_pb\_lg"  \# 乐咕乐股-指数市净率
 "stock\_hk\_indicator\_eniu"  \# 港股股个股市盈率、市净率和股息率指标
 "stock\_a\_high\_low\_statistics"  \# 创新高和新低的股票数量
 "stock\_a\_below\_net\_asset\_statistics"  \# 破净股统计
 \# 交易日历
 "tool\_trade\_date\_hist"  \# 新浪财经-交易日历
 \# 基金行情
 "fund\_etf\_category\_sina"  \# 基金实时行情-新浪
 "fund\_etf\_hist\_sina"  \# 基金行情-新浪
 "fund\_etf\_dividend\_sina"  \# 新浪财经-基金-ETF 基金-累计分红
 "fund\_etf\_hist\_em"  \# 基金历史行情-东财
 "fund\_etf\_hist\_min\_em"  \# 基金分时行情-东财
 "fund\_etf\_spot\_em"  \# 基金实时行情-东财
 "fund\_etf\_spot\_ths"  \# 基金实时行情-同花顺
 \# 股票财务报告-预约披露
 "stock\_report\_disclosure"  \# 股票财务报告-预约披露时间
 \# 基金持股
 "stock\_report\_fund\_hold"  \# 个股-基金持股
 "stock\_report\_fund\_hold\_detail"  \# 个股-基金持股-明细
 \# 中证指数
 "stock\_zh\_index\_hist\_csindex"  \# 中证指数
 "stock\_zh\_index\_value\_csindex"  \# 中证指数-指数估值
 \# A股龙虎榜
 "stock\_lhb\_detail\_daily\_sina"  \# 龙虎榜-每日详情
 "stock\_lhb\_ggtj\_sina"  \# 龙虎榜-个股上榜统计
 "stock\_lhb\_yytj\_sina"  \# 龙虎榜-营业上榜统计
 "stock\_lhb\_jgzz\_sina"  \# 龙虎榜-机构席位追踪
 "stock\_lhb\_jgmx\_sina"  \# 龙虎榜-机构席位成交明细
 \# 注册制审核
 "stock\_register\_kcb"  \# IPO审核信息-科创板
 "stock\_register\_cyb"  \# IPO审核信息-创业板
 "stock\_register\_bj"  \# IPO审核信息-北交所
 "stock\_register\_sh"  \# IPO审核信息-上海主板
 "stock\_register\_sz"  \# IPO审核信息-深圳主板
 "stock\_register\_db"  \# 注册制审核-达标企业
 \# 次新股
 "stock\_zh\_a\_new"  \# 股票数据-次新股
 \# COMEX库存数据
 "futures\_comex\_inventory"  \# COMEX库存数据
 \# 消费者信心指数
 "macro\_china\_xfzxx"  \# 消费者信心指数
 \# 工业增加值增长
 "macro\_china\_gyzjz"  \# 工业增加值增长
 \# 存款准备金率
 "macro\_china\_reserve\_requirement\_ratio"  \# 存款准备金率
 \# 社会消费品零售总额
 "macro\_china\_consumer\_goods\_retail"  \# 社会消费品零售总额
 \# 海关进出口增减情况
 "macro\_china\_hgjck"  \# 海关进出口增减情况
 \# 全社会用电分类情况表
 "macro\_china\_society\_electricity"  \# 全社会用电分类情况表
 \# 全社会客货运输量
 "macro\_china\_society\_traffic\_volume"  \# 全社会客货运输量
 \# 邮电业务基本情况
 "macro\_china\_postal\_telecommunicational"  \# 邮电业务基本情况
 \# 国际旅游外汇收入构成
 "macro\_china\_international\_tourism\_fx"  \# 国际旅游外汇收入构成
 \# 民航客座率及载运率
 "macro\_china\_passenger\_load\_factor"  \# 民航客座率及载运率
 \# 航贸运价指数
 "macro\_china\_freight\_index"  \# 航贸运价指数
 \# 央行货币当局资产负债
 "macro\_china\_central\_bank\_balance"  \# 央行货币当局资产负债
 \# FR007利率互换曲线历史数据
 "macro\_china\_swap\_rate"  \# FR007利率互换曲线历史数据
 \# 收盘收益率曲线历史数据
 "bond\_china\_close\_return"  \# 收盘收益率曲线历史数据
 \# 保险业经营情况
 "macro\_china\_insurance"  \# 保险业经营情况
 \# 货币供应量
 "macro\_china\_supply\_of\_money"  \# 货币供应量
 \# 央行黄金和外汇储备
 "macro\_china\_foreign\_exchange\_gold"  \# 央行黄金和外汇储备
 \# 商品零售价格指数
 "macro\_china\_retail\_price\_index"  \# 商品零售价格指数
 \# 新闻联播文字稿
 "news\_cctv"  \# 新闻联播文字稿
 \# 电影票房
 "movie\_boxoffice\_realtime"  \# 电影实时票房
 "movie\_boxoffice\_daily"  \# 电影单日票房
 "movie\_boxoffice\_weekly"  \# 电影单周票房
 "movie\_boxoffice\_monthly"  \# 电影单月票房
 "movie\_boxoffice\_yearly"  \# 电影年度票房
 "movie\_boxoffice\_yearly\_first\_week"  \# 电影年度首周票房
 "movie\_boxoffice\_cinema\_daily"  \# 电影院单日票房
 "movie\_boxoffice\_cinema\_weekly"  \# 电影院单周票房
 \# 国房景气指数
 "macro\_china\_real\_estate"  \# 国房景气指数
 \# 加密货币历史数据
 "crypto\_name\_url\_table"  \# 加密货币货币名称
 \# 基金排行
 "fund\_open\_fund\_rank\_em"  \# 开放式基金排行
 "fund\_em\_exchange\_rank"  \# 场内交易基金排行
 "fund\_em\_money\_rank"  \# 货币型基金排行
 "fund\_em\_lcx\_rank"  \# 理财基金排行
 "fund\_em\_hk\_rank"  \# 香港基金排行
 \# 回购定盘利率
 "repo\_rate\_hist"  \# 回购定盘利率
 \# 福布斯中国榜单
 "forbes\_rank"  \# 福布斯中国榜单
 \# 新财富500富豪榜
 "xincaifu\_rank"  \# 新财富500富豪榜
 \# 胡润排行榜
 "hurun\_rank"  \# 胡润排行榜
 \# 期货合约详情
 "futures\_contract\_detail"  \# 新浪期货合约详情
 "futures\_contract\_detail\_em"  \# 东方财富期货合约详情
 \# 科创板报告
 "stock\_zh\_kcb\_report\_em"  \# 科创板报告
 \# 东方财富-期权
 "option\_current\_em"  \# 东方财富-期权
 \# 国证指数
 "index\_all\_cni"  \# 国证指数-所有指数
 "index\_hist\_cni"  \# 国证指数-指数行情
 "index\_detail\_cni"  \# 国证指数-样本详情
 "index\_detail\_hist\_cni"  \# 国证指数-历史样本
 "index\_detail\_hist\_adjust\_cni"  \# 国证指数-历史调样
 \# 大宗交易
 "stock\_dzjy\_sctj"  \# 大宗交易-市场统计
 "stock\_dzjy\_mrmx"  \# 大宗交易-每日明细
 "stock\_dzjy\_mrtj"  \# 大宗交易-每日统计
 "stock\_dzjy\_hygtj"  \# 大宗交易-活跃 A 股统计
 "stock\_dzjy\_yybph"  \# 大宗交易-营业部排行
 "stock\_dzjy\_hyyybtj"  \# 大宗交易-活跃营业部统计
 "stock\_dzjy\_yybph"  \# 大宗交易-营业部排行
 \# 一致行动人
 "stock\_yzxdr\_em"  \# 股票数据-一致行动人
 \# 新闻-个股新闻
 "stock\_news\_em"  \# 新闻-个股新闻
 \# 债券概览
 "bond\_cash\_summary\_sse"  \# 上登债券信息网-债券现券市场概览
 "bond\_deal\_summary\_sse"  \# 上登债券信息网-债券成交概览
 \# 中国货币供应量
 "macro\_china\_money\_supply"  \# 中国货币供应量
 \# 期货交割和期转现
 "futures\_to\_spot\_czce"  \# 郑商所期转现
 "futures\_to\_spot\_shfe"  \# 上期所期转现
 "futures\_to\_spot\_dce"  \# 大商所期转现
 "futures\_delivery\_dce"  \# 大商所交割统计
 "futures\_delivery\_czce"  \# 郑商所交割统计
 "futures\_delivery\_shfe"  \# 上期所交割统计
 "futures\_delivery\_match\_dce"  \# 大商所交割配对
 "futures\_delivery\_match\_czce"  \# 郑商所交割配对
 \# 融资融券
 "stock\_margin\_sse"  \# 上海证券交易所-融资融券汇总
 "stock\_margin\_detail\_sse"  \# 上海证券交易所-融资融券详情
 \# 基金评级
 "fund\_rating\_all"  \# 基金评级-基金评级总汇
 "fund\_rating\_sh"  \# 基金评级-上海证券评级
 "fund\_rating\_zs"  \# 基金评级-招商证券评级
 "fund\_rating\_ja"  \# 基金评级-济安金信评级
 \# 基金经理
 "fund\_manager\_em"  \# 基金经理-基金经理大全
 \# 盈利预测
 "stock\_profit\_forecast\_em"  \# 盈利预测-东财
 "stock\_profit\_forecast\_ths"  \# 盈利预测-同花顺
 \# 中美国债收益率
 "bond\_zh\_us\_rate"  \# 中美国债收益率
 \# 分红配送
 "stock\_fhps\_em"  \# 分红配送
 \# 业绩快报
 "stock\_yjkb\_em"  \# 业绩快报
 \# 业绩报告
 "stock\_yjbb\_em"  \# 业绩报告
 \# 三大表报
 "stock\_zcfz\_em"  \# 三大表报-资产负债表
 "stock\_zcfz\_bj\_em"  \# 三大表报-资产负债表-北交所
 "stock\_lrb\_em"  \# 三大表报-利润表
 "stock\_xjll\_em"  \# 三大表报-现金流量表
 \# 首发企业申报
 "stock\_ipo\_declare\_em"  \# 首发企业申报
 \# 行业板块
 "stock\_board\_industry\_index\_ths"  \# 同花顺-行业板块-指数日频数据
 \# 概念板块
 "stock\_board\_concept\_index\_ths"  \# 同花顺-概念板块-指数日频数据
 \# 营业部
 "stock\_lh\_yyb\_most"  \# 营业部排名-上榜次数最多
 "stock\_lh\_yyb\_capital"  \# 营业部排名-资金实力最强
 "stock\_lh\_yyb\_control"  \# 营业部排名-抱团操作实力
 \# 比特比持仓
 "crypto\_bitcoin\_hold\_report"  \# 比特比持仓
 \# 同花顺-数据中心-资金流向
 "stock\_fund\_flow\_individual"  \# 同花顺-数据中心-资金流向-个股资金流
 "stock\_fund\_flow\_industry"  \# 同花顺-数据中心-资金流向-行业资金流
 "stock\_fund\_flow\_concept"  \# 同花顺-数据中心-资金流向-概念资金流
 "stock\_fund\_flow\_big\_deal"  \# 同花顺-数据中心-资金流向-大单追踪
 \# 高管持股
 "stock\_ggcg\_em"  \# 高管持股
 \# 新发基金
 "fund\_new\_found\_em"  \# 新发基金
 \# 柯桥指数
 "index\_kq\_fz"  \# 柯桥纺织指数
 "index\_kq\_fashion"  \# 柯桥时尚指数
 \# Drewry 集装箱指数
 "drewry\_wci\_index"  \# Drewry 集装箱指数
 \# 浙江省排污权交易指数
 "index\_eri"  \# 浙江省排污权交易指数
 \# 赚钱效应分析
 "stock\_market\_activity\_legu"  \# 赚钱效应分析
 \# 中国公路物流运价指数
 "index\_price\_cflp"  \# 中国公路物流运价指数
 \# 中国公路物流运量指数
 "index\_volume\_cflp"  \# 中国公路物流运量指数
 \# 汽车销量
 "car\_sale\_rank\_gasgoo"  \# 盖世汽车-汽车行业制造企业数据库-销量数据
 "car\_market\_total\_cpca"  \# 乘联会-统计数据-总体市场
 "car\_market\_man\_rank\_cpca"  \# 乘联会-统计数据-厂商排名
 "car\_market\_cate\_cpca"  \# 乘联会-统计数据-车型大类
 "car\_market\_country\_cpca"  \# 乘联会-统计数据-国别细分市场
 "car\_market\_segment\_cpca"  \# 乘联会-统计数据-级别细分市场
 "car\_market\_fuel\_cpca"  \# 乘联会-统计数据-新能源细分市场
 \# 增发
 "stock\_qbzf\_em"  \# 增发
 \# 配股
 "stock\_pg\_em"  \# 配股
 \# 中国-香港-宏观经济指标
 "macro\_china\_hk\_cpi"  \# 中国-香港-消费者物价指数
 "macro\_china\_hk\_cpi\_ratio"  \# 中国-香港-消费者物价指数年率
 "macro\_china\_hk\_rate\_of\_unemployment"  \# 中国-香港-失业率
 "macro\_china\_hk\_gbp"  \# 中国-香港-香港 GDP
 "macro\_china\_hk\_gbp\_ratio"  \# 中国-香港-香港 GDP 同比
 "macro\_china\_hk\_building\_volume"  \# 中国-香港-香港楼宇买卖合约数量
 "macro\_china\_hk\_building\_amount"  \# 中国-香港-香港楼宇买卖合约成交金额
 "macro\_china\_hk\_trade\_diff\_ratio"  \# 中国-香港-香港商品贸易差额年率
 "macro\_china\_hk\_ppi"  \# 中国-香港-香港制造业 PPI 年率
 \# 涨停板行情
 "stock\_zt\_pool\_em"  \# 涨停板行情-涨停股池
 "stock\_zt\_pool\_previous\_em"  \# 涨停板行情-昨日涨停股池
 "stock\_zt\_pool\_strong\_em"  \# 涨停板行情-强势股池
 "stock\_zt\_pool\_sub\_new\_em"  \# 涨停板行情-次新股池
 "stock\_zt\_pool\_zbgc\_em"  \# 涨停板行情-炸板股池
 "stock\_zt\_pool\_dtgc\_em"  \# 涨停板行情-跌停股池
 \# 两网及退市
 "stock\_staq\_net\_stop"  \# 两网及退市
 \# 股东户数
 "stock\_zh\_a\_gdhs"  \# 股东户数
 "stock\_zh\_a\_gdhs\_detail\_em"  \# 股东户数详情
 \# 中行人民币牌价历史数据查询
 "currency\_boc\_sina"  \# 中行人民币牌价历史数据查询
 \# A 股日频率数据-东方财富
 "stock\_zh\_a\_hist"  \# A 股日频率数据-东方财富
 \# A 股日频率数据-腾讯
 "stock\_zh\_a\_hist\_tx"  \# A 股日频率数据-腾讯
 \# 盘口异动
 "stock\_changes\_em"  \# 盘口异动
 "stock\_board\_change\_em"  \# 板块异动
 \# CME 比特币成交量
 "crypto\_bitcoin\_cme"  \# CME 比特币成交量
 \# 基金规模和规模趋势
 "fund\_aum\_em"  \# 基金公司规模排名列表
 "fund\_aum\_trend\_em"  \# 基金市场管理规模走势图
 "fund\_aum\_hist\_em"  \# 基金市场管理规模历史
 \# 企业商品价格指数
 "macro\_china\_qyspjg"  \# 企业商品价格指数
 "macro\_china\_fdi"  \# 外商直接投资数据
 \# 未决房屋销售月率
 "macro\_usa\_phs"  \# 未决房屋销售月率
 \# 德国经济指标
 "macro\_germany\_ifo"  \# ifo商业景气指数
 "macro\_germany\_cpi\_monthly"  \# 消费者物价指数月率终值
 "macro\_germany\_cpi\_yearly"  \# 消费者物价指数年率终值
 "macro\_germany\_trade\_adjusted"  \# 贸易帐(季调后)
 "macro\_germany\_gdp"  \# GDP
 "macro\_germany\_retail\_sale\_monthly"  \# 实际零售销售月率
 "macro\_germany\_retail\_sale\_yearly"  \# 实际零售销售年率
 "macro\_germany\_zew"  \# ZEW经济景气指数
 \# 东方财富-概念板块
 "stock\_board\_concept\_name\_em"  \# 概念板块-名称
 "stock\_board\_concept\_spot\_em"  \# 概念板块-实时行情
 "stock\_board\_concept\_hist\_em"  \# 概念板块-历史行情
 "stock\_board\_concept\_hist\_min\_em"  \# 概念板块-分时历史行情
 "stock\_board\_concept\_cons\_em"  \# 概念板块-板块成份
 \# 瑞士-宏观
 "macro\_swiss\_svme"  \# 瑞士-宏观-SVME采购经理人指数
 "macro\_swiss\_trade"  \# 瑞士-宏观-贸易帐
 "macro\_swiss\_cpi\_yearly"  \# 瑞士-宏观-消费者物价指数年率
 "macro\_swiss\_gdp\_quarterly"  \# 瑞士-宏观-GDP季率
 "macro\_swiss\_gbd\_yearly"  \# 瑞士-宏观-GDP年率
 "macro\_swiss\_gbd\_bank\_rate"  \# 瑞士-宏观-央行公布利率决议
 \# 日本-宏观
 "macro\_japan\_bank\_rate"  \# 日本-央行公布利率决议
 "macro\_japan\_cpi\_yearly"  \# 日本-全国消费者物价指数年率
 "macro\_japan\_core\_cpi\_yearly"  \# 日本-全国核心消费者物价指数年率
 "macro\_japan\_unemployment\_rate"  \# 日本-失业率
 "macro\_japan\_head\_indicator"  \# 日本-领先指标终值
 \# 英国-宏观
 "macro\_uk\_halifax\_monthly"  \# 英国-Halifax 房价指数月率
 "macro\_uk\_halifax\_yearly"  \# 英国-Halifax 房价指数年率
 "macro\_uk\_trade"  \# 英国-贸易帐
 "macro\_uk\_bank\_rate"  \# 英国-央行公布利率决议
 "macro\_uk\_core\_cpi\_yearly"  \# 英国-核心消费者物价指数年率
 "macro\_uk\_core\_cpi\_monthly"  \# 英国-核心消费者物价指数月率
 "macro\_uk\_cpi\_yearly"  \# 英国-消费者物价指数年率
 "macro\_uk\_cpi\_monthly"  \# 英国-消费者物价指数月率
 "macro\_uk\_retail\_monthly"  \# 英国-零售销售月率
 "macro\_uk\_retail\_yearly"  \# 英国-零售销售年率
 "macro\_uk\_rightmove\_yearly"  \# 英国-Rightmove 房价指数年率
 "macro\_uk\_rightmove\_monthly"  \# 英国-Rightmove 房价指数月率
 "macro\_uk\_gdp\_quarterly"  \# 英国-GDP 季率初值
 "macro\_uk\_gdp\_yearly"  \# 英国-GDP 年率初值
 "macro\_uk\_unemployment\_rate"  \# 英国-失业率
 \# 融资融券-深圳
 "stock\_margin\_underlying\_info\_szse"  \# 标的证券信息
 "stock\_margin\_detail\_szse"  \# 融资融券明细
 "stock\_margin\_szse"  \# 融资融券汇总
 \# 宏观-澳大利亚
 "macro\_australia\_bank\_rate"  \# 央行公布利率决议
 "macro\_australia\_unemployment\_rate"  \# 失业率
 "macro\_australia\_trade"  \# 贸易帐
 "macro\_australia\_cpi\_quarterly"  \# 消费者物价指数季率
 "macro\_australia\_cpi\_yearly"  \# 消费者物价指数年率
 "macro\_australia\_ppi\_quarterly"  \# 生产者物价指数季率
 "macro\_australia\_retail\_rate\_monthly"  \# 零售销售月率
 \# 养猪数据中心
 "futures\_hog\_core"  \# 生猪信息-核心数据
 "futures\_hog\_cost"  \# 生猪信息-成本维度
 "futures\_hog\_supply"  \# 生猪信息-供应维度
 \# 宏观-加拿大
 "macro\_canada\_new\_house\_rate"  \# 新屋开工
 "macro\_canada\_unemployment\_rate"  \# 失业率
 "macro\_canada\_trade"  \# 贸易帐
 "macro\_canada\_retail\_rate\_monthly"  \# 零售销售月率
 "macro\_canada\_bank\_rate"  \# 央行公布利率决议
 "macro\_canada\_core\_cpi\_yearly"  \# 核心消费者物价指数年率
 "macro\_canada\_core\_cpi\_monthly"  \# 核心消费者物价指数月率
 "macro\_canada\_cpi\_yearly"  \# 消费者物价指数年率
 "macro\_canada\_cpi\_monthly"  \# 消费者物价指数月率
 "macro\_canada\_gdp\_monthly"  \# GDP 月率
 \# 港股财报
 "stock\_financial\_hk\_report\_em"  \# 东方财富-港股-财务报表-三大报表
 "stock\_financial\_hk\_analysis\_indicator\_em"  \# 东方财富-港股-财务分析-主要指标
 \# 全部 A 股-等权重市盈率、中位数市盈率
 "stock\_a\_ttm\_lyr"  \# 全部 A 股-等权重市盈率、中位数市盈率
 "stock\_a\_all\_pb"  \# 全部 A 股-等权重市净率、中位数市净率
 \# REITs
 "reits\_realtime\_em"  \#  REITs-实时行情
 "reits\_hist\_em"  \#  REITs-历史行情
 "reits\_hist\_min\_em"  \#  REITs-历史分钟行情
 \# A 股分时数据
 "stock\_zh\_a\_hist\_min\_em"  \# 东财-股票分时
 "stock\_zh\_a\_hist\_pre\_min\_em"  \# 东财-股票盘前分时
 \# 港股分时数据
 "stock\_hk\_hist\_min\_em"  \# 东财-港股分时数据
 \# 美股分时数据
 "stock\_us\_hist\_min\_em"  \# 东财-美股分时数据
 \# 可转债详情
 "bond\_zh\_cov\_info"  \# 东财-可转债详情
 \# 风险警示板
 "stock\_zh\_a\_st\_em"  \# 风险警示板
 \# 美股-粉单市场
 "stock\_us\_pink\_spot\_em"  \# 美股-粉单市场
 \# 美股-知名美股
 "stock\_us\_famous\_spot\_em"  \# 美股-知名美股
 \# 股票-投资评级
 "stock\_rank\_forecast\_cninfo"  \# 股票-投资评级
 \# 股票-行业市盈率
 "stock\_industry\_pe\_ratio\_cninfo"  \# 股票-行业市盈率
 \# 新股-新股过会
 "stock\_new\_gh\_cninfo"  \# 新股-新股过会
 \# 新股-IPO
 "stock\_new\_ipo\_cninfo"  \# 新股-IPO
 \# 股东人数及持股集中度
 "stock\_hold\_num\_cninfo"  \# 股东人数及持股集中度
 \# 实际控制人持股变动
 "stock\_hold\_control\_cninfo"  \# 实际控制人持股变动
 \# 高管持股变动明细
 "stock\_hold\_management\_detail\_cninfo"  \# 高管持股变动明细
 \# 巨潮资讯-数据中心-专题统计-股东股本-股本变动
 "stock\_hold\_change\_cninfo"  \# 巨潮资讯-数据中心-专题统计-股东股本-股本变动
 \# 期货手续费
 "futures\_comm\_info"  \# 期货手续费
 "futures\_fees\_info"  \# 期货交易费用参照表
 \# B 股实时行情数据和历史行情数据
 "stock\_zh\_b\_spot"  \# B 股实时行情数据
 "stock\_zh\_b\_daily"  \# B 股历史行情数据(日频)
 "stock\_zh\_b\_minute"  \# B 股分时历史行情数据(分钟)
 \# 公司治理-对外担保
 "stock\_cg\_guarantee\_cninfo"  \# 公司治理-对外担保
 \# 公司治理-公司诉讼
 "stock\_cg\_lawsuit\_cninfo"  \# 公司治理-公司诉讼
 \# 公司治理-股权质押
 "stock\_cg\_equity\_mortgage\_cninfo"  \# 公司治理-股权质押
 \# 债券报表-债券发行-国债发行
 "bond\_treasure\_issue\_cninfo"  \# 债券报表-债券发行-国债发行
 \# 债券报表-债券发行-地方债发行
 "bond\_local\_government\_issue\_cninfo"  \# 债券报表-债券发行-地方债
 \# 债券报表-债券发行-企业债发行
 "bond\_corporate\_issue\_cninfo"  \# 债券报表-债券发行-企业债
 \# 债券报表-债券发行-可转债发行
 "bond\_cov\_issue\_cninfo"  \# 债券报表-债券发行-可转债发行
 \# 债券报表-债券发行-可转债转股
 "bond\_cov\_stock\_issue\_cninfo"  \# 债券报表-债券发行-可转债转股
 \# 基金报表-基金重仓股
 "fund\_report\_stock\_cninfo"  \# 基金报表-基金重仓股
 \# 公告大全-沪深 A 股公告
 "stock\_notice\_report"  \# 公告大全-沪深 A 股公告
 \# 基金报表-基金行业配置
 "fund\_report\_industry\_allocation\_cninfo"  \# 基金报表-基金行业配置
 "fund\_report\_asset\_allocation\_cninfo"  \# 基金报表-基金资产配置
 \# 基金规模
 "fund\_scale\_open\_sina"  \# 基金规模-开放式基金
 "fund\_scale\_close\_sina"  \# 基金规模-封闭式基金
 "fund\_scale\_structured\_sina"  \# 基金规模-分级子基金
 \# 沪深港通持股
 "stock\_hsgt\_individual\_em"  \# 沪深港通持股-具体股票
 "stock\_hsgt\_individual\_detail\_em"  \# 沪深港通持股-具体股票-详情
 \# IPO 受益股
 "stock\_ipo\_benefit\_ths"  \# IPO 受益股
 "stock\_xgsr\_ths"  \# 新股上市首日
 \# 同花顺-数据中心-技术选股-创新高
 "stock\_rank\_cxg\_ths"  \# 创新高
 "stock\_rank\_cxd\_ths"  \# 创新低
 "stock\_rank\_lxsz\_ths"  \# 连续上涨
 "stock\_rank\_lxxd\_ths"  \# 连续下跌
 "stock\_rank\_cxfl\_ths"  \# 持续放量
 "stock\_rank\_cxsl\_ths"  \# 持续缩量
 "stock\_rank\_xstp\_ths"  \# 向上突破
 "stock\_rank\_xxtp\_ths"  \# 向下突破
 "stock\_rank\_ljqs\_ths"  \# 量价齐升
 "stock\_rank\_ljqd\_ths"  \# 量价齐跌
 "stock\_rank\_xzjp\_ths"  \# 险资举牌
 \# 可转债分时数据
 "bond\_zh\_hs\_cov\_min"  \# 可转债分时数据
 "bond\_zh\_hs\_cov\_pre\_min"  \# 可转债分时数据-分时行情-盘前
 \# 艺人
 "business\_value\_artist"  \# 艺人商业价值
 "online\_value\_artist"  \# 艺人流量价值
 \# 视频
 "video\_tv"  \# 电视剧集
 "video\_variety\_show"  \# 综艺节目
 \# 基金数据-分红送配
 "fund\_cf\_em"  \# 基金拆分
 "fund\_fh\_rank\_em"  \# 基金分红排行
 "fund\_fh\_em"  \# 基金分红
 \# 基金数据-规模变动
 "fund\_scale\_change\_em"  \# 规模变动
 "fund\_hold\_structure\_em"  \# 持有人结构
 \# 行业板块
 "stock\_board\_industry\_cons\_em"  \# 行业板块-板块成份
 "stock\_board\_industry\_hist\_em"  \# 行业板块-历史行情
 "stock\_board\_industry\_hist\_min\_em"  \# 行业板块-分时历史行情
 "stock\_board\_industry\_name\_em"  \# 行业板块-板块名称
 \# 股票回购数据
 "stock\_repurchase\_em"  \# 股票回购数据
 \# 期货品种字典
 "futures\_hq\_subscribe\_exchange\_symbol"  \# 期货品种字典
 \# 上海黄金交易所
 "spot\_hist\_sge"  \# 上海黄金交易所-历史行情走势
 "spot\_quotations\_sge"  \# 上海黄金交易所-实时行情走势
 "spot\_golden\_benchmark\_sge"  \# 上海金基准价
 "spot\_silver\_benchmark\_sge"  \# 上海银基准价
 \# 个股信息查询
 "stock\_individual\_info\_em"  \# 个股信息查询-东财
 "stock\_individual\_basic\_info\_xq"  \# 个股信息查询-雪球
 "stock\_individual\_basic\_info\_us\_xq"  \# 个股信息查询-雪球-美股
 "stock\_individual\_basic\_info\_hk\_xq"  \# 个股信息查询-雪球-港股
 \# 中国食糖指数
 "index\_sugar\_msweet"  \# 中国食糖指数
 \# 配额内进口糖估算指数
 "index\_inner\_quote\_sugar\_msweet"  \# 配额内进口糖估算指数
 \# 配额外进口糖估算指数
 "index\_outer\_quote\_sugar\_msweet"  \# 配额外进口糖估算指数
 \# 东方财富网-数据中心-股东分析-股东持股分析
 "stock\_gdfx\_free\_holding\_analyse\_em"  \# 股东持股分析-十大流通股东
 "stock\_gdfx\_holding\_analyse\_em"  \# 股东持股分析-十大股东
 "stock\_gdfx\_free\_top\_10\_em"  \# 东方财富网-个股-十大流通股东
 "stock\_gdfx\_top\_10\_em"  \# 东方财富网-个股-十大股东
 "stock\_gdfx\_free\_holding\_detail\_em"  \# 股东持股明细-十大流通股东
 "stock\_gdfx\_holding\_detail\_em"  \# 股东持股明细-十大股东
 "stock\_gdfx\_free\_holding\_change\_em"  \# 股东持股变动统计-十大流通股东
 "stock\_gdfx\_holding\_change\_em"  \# 股东持股变动统计-十大股东
 "stock\_gdfx\_free\_holding\_statistics\_em"  \# 股东持股统计-十大流通股东
 "stock\_gdfx\_holding\_statistics\_em"  \# 股东持股统计-十大股东
 "stock\_gdfx\_free\_holding\_teamwork\_em"  \# 股东协同-十大流通股东
 "stock\_gdfx\_holding\_teamwork\_em"  \# 股东协同-十大股东
 \# 期权龙虎榜
 "option\_lhb\_em"  \# 期权龙虎榜
 "option\_value\_analysis\_em"  \# 期权价值分析
 "option\_risk\_analysis\_em"  \# 期权风险分析
 "option\_premium\_analysis\_em"  \# 期权折溢价分析
 \# 财新指数
 "index\_pmi\_com\_cx"  \# 财新数据-指数报告-财新中国 PMI-综合 PMI
 "index\_pmi\_man\_cx"  \# 财新数据-指数报告-财新中国 PMI-制造业 PMI
 "index\_pmi\_ser\_cx"  \# 财新数据-指数报告-财新中国 PMI-服务业 PMI
 "index\_dei\_cx"  \# 财新数据-指数报告-数字经济指数
 "index\_ii\_cx"  \# 财新数据-指数报告-产业指数
 "index\_si\_cx"  \# 财新数据-指数报告-溢出指数
 "index\_fi\_cx"  \# 财新数据-指数报告-融合指数
 "index\_bi\_cx"  \# 财新数据-指数报告-基础指数
 "index\_nei\_cx"  \# 财新数据-指数报告-中国新经济指数
 "index\_li\_cx"  \# 财新数据-指数报告-劳动力投入指数
 "index\_ci\_cx"  \# 财新数据-指数报告-资本投入指数
 "index\_ti\_cx"  \# 财新数据-指数报告-科技投入指数
 "index\_neaw\_cx"  \# 财新数据-指数报告-新经济行业入职平均工资水平
 "index\_awpr\_cx"  \# 财新数据-指数报告-新经济入职工资溢价水平
 "index\_cci\_cx"  \# 财新数据-指数报告-大宗商品指数
 "index\_qli\_cx"  \# 财新数据-指数报告-高质量因子
 "index\_ai\_cx"  \# 财新数据-指数报告-AI策略指数
 "index\_bei\_cx"  \# 财新数据-指数报告-基石经济指数
 "index\_neei\_cx"  \# 财新数据-指数报告-新动能指数
 \# 指数历史数据
 "index\_zh\_a\_hist"  \# 中国股票指数历史数据
 \# 指数分时数据
 "index\_zh\_a\_hist\_min\_em"  \# 中国股票指数-指数分时数据
 \# 东方财富-个股人气榜-A股
 "stock\_hot\_rank\_em"  \# 东方财富-个股人气榜-人气榜
 "stock\_hot\_up\_em"  \# 东方财富-个股人气榜-飙升榜
 "stock\_hot\_rank\_detail\_em"  \# 东方财富-个股人气榜-历史趋势及粉丝特征
 "stock\_hot\_rank\_detail\_realtime\_em"  \# 东方财富-个股人气榜-实时变动
 "stock\_hot\_keyword\_em"  \# 东方财富-个股人气榜-关键词
 "stock\_hot\_rank\_latest\_em"  \# 东方财富-个股人气榜-最新排名
 "stock\_hot\_rank\_relate\_em"  \# 东方财富-个股人气榜-相关股票
 \# 东方财富-个股人气榜-港股
 "stock\_hk\_hot\_rank\_em"  \# 东方财富-个股人气榜-人气榜-港股
 "stock\_hk\_hot\_rank\_detail\_em"  \# 东方财富-个股人气榜-历史趋势-港股
 "stock\_hk\_hot\_rank\_detail\_realtime\_em"  \# 东方财富-个股人气榜-实时变动-港股
 "stock\_hk\_hot\_rank\_latest\_em"  \# 东方财富-个股人气榜-最新排名-港股
 \# 东方财富-股票数据-龙虎榜
 "stock\_lhb\_detail\_em"  \# 东方财富网-数据中心-龙虎榜单-龙虎榜详情
 "stock\_lhb\_stock\_statistic\_em"  \# 东方财富网-数据中心-龙虎榜单-个股上榜统计
 "stock\_lhb\_stock\_detail\_em"  \# 东方财富网-数据中心-龙虎榜单-个股龙虎榜详情
 "stock\_lhb\_jgmmtj\_em"  \# 东方财富网-数据中心-龙虎榜单-机构买卖每日统计
 "stock\_lhb\_hyyyb\_em"  \# 东方财富网-数据中心-龙虎榜单-每日活跃营业部
 "stock\_lhb\_yyb\_detail\_em"  \# 东方财富网-数据中心-龙虎榜单-营业部详情
 "stock\_lhb\_yybph\_em"  \# 东方财富网-数据中心-龙虎榜单-营业部排行
 "stock\_lhb\_jgstatistic\_em"  \# 东方财富网-数据中心-龙虎榜单-机构席位追踪
 "stock\_lhb\_traderstatistic\_em"  \# 东方财富网-数据中心-龙虎榜单-营业部统计
 \# 投资组合-基金持仓
 "fund\_portfolio\_hold\_em"  \# 天天基金网-基金档案-投资组合-基金持仓
 "fund\_portfolio\_bond\_hold\_em"  \# 天天基金网-基金档案-投资组合-债券持仓
 \# 投资组合-重大变动
 "fund\_portfolio\_change\_em"  \# 天天基金网-基金档案-投资组合-重大变动
 "fund\_portfolio\_industry\_allocation\_em"  \# 天天基金网-基金档案-投资组合-行业配置
 \# 中国宏观
 "macro\_china\_insurance\_income"  \# 原保险保费收入
 "macro\_china\_mobile\_number"  \# 手机出货量
 "macro\_china\_vegetable\_basket"  \# 菜篮子产品批发价格指数
 "macro\_china\_agricultural\_product"  \# 农产品批发价格总指数
 "macro\_china\_agricultural\_index"  \# 农副指数
 "macro\_china\_energy\_index"  \# 能源指数
 "macro\_china\_commodity\_price\_index"  \# 大宗商品价格
 "macro\_global\_sox\_index"  \# 费城半导体指数
 "macro\_china\_yw\_electronic\_index"  \# 义乌小商品指数-电子元器件
 "macro\_china\_construction\_index"  \# 建材指数
 "macro\_china\_construction\_price\_index"  \# 建材价格指数
 "macro\_china\_lpi\_index"  \# 物流景气指数
 "macro\_china\_bdti\_index"  \# 原油运输指数
 "macro\_china\_bsi\_index"  \# 超灵便型船运价指数
 \# 可转债溢价率分析和可转债价值分析
 "bond\_zh\_cov\_value\_analysis"  \# 可转债溢价率分析
 "bond\_zh\_cov\_value\_analysis"  \# 可转债价值分析
 \# 股票热度-雪球
 "stock\_hot\_follow\_xq"  \# 雪球-沪深股市-热度排行榜-关注排行榜
 "stock\_hot\_tweet\_xq"  \# 雪球-沪深股市-热度排行榜-讨论排行榜
 "stock\_hot\_deal\_xq"  \# 雪球-沪深股市-热度排行榜-分享交易排行榜
 \# 内部交易
 "stock\_inner\_trade\_xq"  \# 内部交易
 \# 股票-三大报表
 "stock\_balance\_sheet\_by\_report\_em"  \# 东方财富-股票-财务分析-资产负债表-按报告期
 "stock\_balance\_sheet\_by\_yearly\_em"  \# 东方财富-股票-财务分析-资产负债表-按年度
 "stock\_profit\_sheet\_by\_report\_em"  \# 东方财富-股票-财务分析-利润表-报告期
 "stock\_profit\_sheet\_by\_yearly\_em"  \# 东方财富-股票-财务分析-利润表-按年度
 "stock\_profit\_sheet\_by\_quarterly\_em"  \# 东方财富-股票-财务分析-利润表-按单季度
 "stock\_cash\_flow\_sheet\_by\_report\_em"  \# 东方财富-股票-财务分析-现金流量表-按报告期
 "stock\_cash\_flow\_sheet\_by\_yearly\_em"  \# 东方财富-股票-财务分析-现金流量表-按年度
 "stock\_cash\_flow\_sheet\_by\_quarterly\_em"  \# 东方财富-股票-财务分析-现金流量表-按单季度
 "stock\_balance\_sheet\_by\_report\_delisted\_em"  \# 东方财富-股票-财务分析-资产负债表-已退市股票-按报告期
 "stock\_profit\_sheet\_by\_report\_delisted\_em"  \# 东方财富-股票-财务分析-利润表-已退市股票-按报告期
 "stock\_cash\_flow\_sheet\_by\_report\_delisted\_em"  \# 东方财富-股票-财务分析-现金流量表-已退市股票-按报告期
 \# 宏观-全球事件
 "news\_economic\_baidu"  \# 宏观-全球事件
 \# 停复牌
 "news\_trade\_notify\_suspend\_baidu"  \# 停复牌
 \# 财报发行
 "news\_report\_time\_baidu"  \# 财报发行
 \# 金融期权
 "option\_risk\_indicator\_sse"  \# 上海证券交易所-产品-股票期权-期权风险指标
 \# 人民币汇率中间价
 "currency\_boc\_safe"  \# 人民币汇率中间价
 \# 主营构成
 "stock\_zygc\_em"  \# 主营构成-东财
 \# 行业分类数据
 "stock\_industry\_category\_cninfo"  \# 巨潮资讯-行业分类数据
 \# 上市公司行业归属的变动情况
 "stock\_industry\_change\_cninfo"  \# 巨潮资讯-上市公司行业归属的变动情况
 \# 公司股本变动
 "stock\_share\_change\_cninfo"  \# 巨潮资讯-公司股本变动
 \# 上海金属网
 "futures\_news\_shmet"  \# 上海金属网-快讯
 \# 分红配股
 "news\_trade\_notify\_dividend\_baidu"  \# 分红配股
 \# 中国债券信息网-中债指数-中债指数族系-总指数-综合类指数
 "bond\_new\_composite\_index\_cbond"  \# 中债-新综合指数
 "bond\_composite\_index\_cbond"  \# 中债-综合指数
 \# 沪深港股通-参考汇率和结算汇率
 "stock\_sgt\_settlement\_exchange\_rate\_szse"  \# 深港通-港股通业务信息-结算汇率
 "stock\_sgt\_reference\_exchange\_rate\_szse"  \# 深港通-港股通业务信息-参考汇率
 "stock\_sgt\_reference\_exchange\_rate\_sse"  \# 沪港通-港股通信息披露-参考汇率
 "stock\_sgt\_settlement\_exchange\_rate\_sse"  \# 沪港通-港股通信息披露-结算汇兑
 \# 配股实施方案-巨潮资讯
 "stock\_allotment\_cninfo"  \# 配股实施方案-巨潮资讯
 \# 巨潮资讯-个股-公司概况
 "stock\_profile\_cninfo"  \# 巨潮资讯-个股-公司概况
  \# 巨潮资讯-个股-上市相关
 "stock\_ipo\_summary\_cninfo"  \# 巨潮资讯-个股-上市相关
 \# 百度股市通-港股-财务报表-估值数据
 "stock\_hk\_valuation\_baidu"  \# 百度股市通-港股-财务报表-估值数据
 \# 百度股市通-A 股-财务报表-估值数据
 "stock\_zh\_valuation\_baidu"  \# 百度股市通-A 股-财务报表-估值数据
 \# 百度股市通- A 股或指数-股评-投票
 "stock\_zh\_vote\_baidu"  \# 百度股市通- A 股或指数-股评-投票
 \# 百度股市通-热搜股票
 "stock\_hot\_search\_baidu"  \# 百度股市通-热搜股票
 \# 乐估乐股-底部研究-巴菲特指标
 "stock\_buffett\_index\_lg"  \# 乐估乐股-底部研究-巴菲特指标
 \# 百度股市通-外汇-行情榜单
 "fx\_quote\_baidu"  \# 百度股市通-外汇-行情榜单
 \# 50ETF 期权波动率指数
 "index\_option\_50etf\_qvix"  \# 50ETF 期权波动率指数
 \# 50ETF 期权波动率指数 QVIX-分时
 "index\_option\_50etf\_min\_qvix"  \# 50ETF 期权波动率指数 QVIX-分时
 \# 300 ETF 期权波动率指数
 "index\_option\_300etf\_qvix"  \# 300 ETF 期权波动率指数
 \# 300 ETF 期权波动率指数 QVIX-分时
 "index\_option\_300etf\_min\_qvix"  \# 300 ETF 期权波动率指数 QVIX-分时
 \# 500 ETF 期权波动率指数
 "index\_option\_500etf\_qvix"  \# 500 ETF 期权波动率指数
 \# 500 ETF 期权波动率指数 QVIX-分时
 "index\_option\_500etf\_min\_qvix"  \# 500 ETF 期权波动率指数 QVIX-分时
 \# 创业板 期权波动率指数
 "index\_option\_cyb\_qvix"  \# 创业板 期权波动率指数
 \# 创业板 期权波动率指数 QVIX-分时
 "index\_option\_cyb\_min\_qvix"  \# 创业板 期权波动率指数 QVIX-分时
 \# 科创板 期权波动率指数
 "index\_option\_kcb\_qvix"  \# 科创板 期权波动率指数
 \# 科创板 期权波动率指数 QVIX-分时
 "index\_option\_kcb\_min\_qvix"  \# 科创板 期权波动率指数 QVIX-分时
 \# 深证100ETF 期权波动率指数
 "index\_option\_100etf\_qvix"  \# 深证100ETF 期权波动率指数
 \# 深证100ETF 期权波动率指数 QVIX-分时
 "index\_option\_100etf\_min\_qvix"  \# 深证100ETF 期权波动率指数 QVIX-分时
 \# 中证300股指 期权波动率指数
 "index\_option\_300index\_qvix"  \# 中证300股指 期权波动率指数
 \# 中证300股指 期权波动率指数 QVIX-分时
 "index\_option\_300index\_min\_qvix"  \# 中证300股指 期权波动率指数 QVIX-分时
 \# 中证1000股指 期权波动率指数
 "index\_option\_1000index\_qvix"  \# 中证1000股指 期权波动率指数
 \# 中证1000股指 期权波动率指数 QVIX-分时
 "index\_option\_1000index\_min\_qvix"  \# 中证1000股指 期权波动率指数 QVIX-分时
 \# 上证50股指 期权波动率指数
 "index\_option\_50index\_qvix"  \# 上证50股指 期权波动率指数
 \# 上证50股指 期权波动率指数 QVIX-分时
 "index\_option\_50index\_min\_qvix"  \# 上证50股指 期权波动率指数 QVIX-分时
 \# 申万指数实时行情
 "index\_realtime\_sw"  \# 申万指数实时行情
 \# 申万指数历史行情
 "index\_hist\_sw"  \# 申万指数历史行情
 \# 申万宏源研究-行业分类-全部行业分类
 "stock\_industry\_clf\_hist\_sw"  \# 申万宏源研究-行业分类-全部行业分类
 \# 申万指数分时行情
 "index\_min\_sw"  \# 申万指数分时行情
 \# 申万指数成分股
 "index\_component\_sw"  \# 申万指数成分股
 \# 申万宏源研究-指数分析
 "index\_analysis\_daily\_sw"  \# 申万宏源研究-指数分析-日报表
 "index\_analysis\_weekly\_sw"  \# 申万宏源研究-指数分析-周报表
 "index\_analysis\_monthly\_sw"  \# 申万宏源研究-指数分析-月报表
 "index\_analysis\_week\_month\_sw"  \# 申万宏源研究-指数分析-周/月-日期序列
 "index\_realtime\_fund\_sw"  \# 申万宏源研究-申万指数-指数发布-基金指数-实时行情
 "index\_hist\_fund\_sw"  \# 申万宏源研究-申万指数-指数发布-基金指数-历史行情
 \# 债券-信息查询结果
 "bond\_info\_cm"  \# 中国外汇交易中心暨全国银行间同业拆借中心-债券-信息查询结果
 "bond\_info\_detail\_cm"  \# 中国外汇交易中心暨全国银行间同业拆借中心-债券-债券详情
 \# 生猪市场价格指数
 "index\_hog\_spot\_price"  \# 生猪市场价格指数
 \# 乐咕乐股-股息率-A 股股息率
 "stock\_a\_gxl\_lg"  \# 乐咕乐股-股息率-A 股股息率
 "stock\_hk\_gxl\_lg"  \# 乐咕乐股-股息率-恒生指数股息率
 \# 乐咕乐股-大盘拥挤度
 "stock\_a\_congestion\_lg"  \# 乐咕乐股-大盘拥挤度
 \# 乐咕乐股-基金仓位
 "fund\_stock\_position\_lg"  \# 乐咕乐股-基金仓位-股票型基金仓位
 "fund\_balance\_position\_lg"  \# 乐咕乐股-基金仓位-平衡混合型基金仓位
 "fund\_linghuo\_position\_lg"  \# 乐咕乐股-基金仓位-灵活配置型基金仓位
 "stock\_zyjs\_ths"  \# 主营介绍
 \# 东方财富-行情报价
 "stock\_bid\_ask\_em"  \# 东方财富-行情报价
 \# 可转债
 "bond\_zh\_cov\_info\_ths"  \# 同花顺-数据中心-可转债
 \# 港股股票指数数据
 "stock\_hk\_index\_spot\_sina"  \# 新浪财经-行情中心-港股指数
 "stock\_hk\_index\_daily\_sina"  \# 新浪财经-港股指数-历史行情数据
 "stock\_hk\_index\_spot\_em"  \# 东方财富网-行情中心-港股-指数实时行情
 "stock\_hk\_index\_daily\_em"  \# 东方财富网-港股-股票指数数据
 \# 同花顺-财务指标-主要指标
 "stock\_financial\_abstract\_new\_ths"  \# 同花顺-财务指标-主要指标
 "stock\_financial\_debt\_new\_ths"  \# 同花顺-财务指标-资产负债表
 "stock\_financial\_benefit\_new\_ths"  \# 同花顺-财务指标-利润表
 "stock\_financial\_cash\_new\_ths"  \# 同花顺-财务指标-现金流量表
 \# LOF 行情
 "fund\_lof\_hist\_em"  \# 东方财富-LOF 行情
 "fund\_lof\_spot\_em"  \# 东方财富-LOF 实时行情
 "fund\_lof\_hist\_min\_em"  \# 东方财富-LOF 分时行情
 \# 新浪财经-ESG评级中心
 "stock\_esg\_msci\_sina"  \# 新浪财经-ESG评级中心-ESG评级-MSCI
 "stock\_esg\_rft\_sina"  \# 新浪财经-ESG评级中心-ESG评级-路孚特
 "stock\_esg\_rate\_sina"  \# 新浪财经-ESG评级中心-ESG评级-ESG评级数据
 "stock\_esg\_zd\_sina"  \# 新浪财经-ESG评级中心-ESG评级-秩鼎
 "stock\_esg\_hz\_sina"  \# 新浪财经-ESG评级中心-ESG评级-华证指数
 \# 基金公告
 "fund\_announcement\_dividend\_em"  \# 东方财富网站-天天基金网-基金档案-基金公告-分红配送
 "fund\_announcement\_report\_em"  \# 东方财富网站-天天基金网-基金档案-基金公告-定期报告
 "fund\_announcement\_personnel\_em"  \# 东方财富网站-天天基金网-基金档案-基金公告-人事调整
 \# 互动易
 "stock\_irm\_cninfo"  \# 互动易-提问
 "stock\_irm\_ans\_cninfo"  \# 互动易-回答
 \# 上证e互动
 "stock\_sns\_sseinfo"  \# 上证e互动-提问与回答
 \# 新浪财经-债券-可转债
 "bond\_cb\_profile\_sina"  \# 新浪财经-债券-可转债-详情资料
 "bond\_cb\_summary\_sina"  \# 新浪财经-债券-可转债-债券概况
 \# 东方财富网-数据中心-特色数据-高管持股
 "stock\_hold\_management\_detail\_em"  \# 东方财富网-数据中心-特色数据-高管持股-董监高及相关人员持股变动明细
 "stock\_hold\_management\_person\_em"  \# 东方财富网-数据中心-特色数据-高管持股-人员增减持股变动明细
 \# 股市日历
 "stock\_gsrl\_gsdt\_em"  \# 东方财富网-数据中心-股市日历-公司动态
 \# 东方财富网-数据中心-股东大会
 "stock\_gddh\_em"  \# 东方财富网-数据中心-股东大会
 \# 东方财富网-数据中心-重大合同-重大合同明细
 "stock\_zdhtmx\_em"  \# 重大合同明细
 \# 东方财富网-数据中心-研究报告-个股研报
 "stock\_research\_report\_em"  \# 个股研报
 \# 董监高及相关人员持股变动
 "stock\_share\_hold\_change\_sse"  \# 董监高及相关人员持股变动-上海证券交易所
 "stock\_share\_hold\_change\_szse"  \# 董监高及相关人员持股变动-深圳证券交易所
 "stock\_share\_hold\_change\_bse"  \# 董监高及相关人员持股变动-北京证券交易所
 \# 统计局接口
 "macro\_china\_nbs\_nation"  \# 国家统计局全国数据通用接口
 "macro\_china\_nbs\_region"  \# 国家统计局地区数据通用接口
 \# 新浪财经-美股指数行情
 "index\_us\_stock\_sina"  \# 新浪财经-美股指数行情
 \# 融资融券-标的证券名单及保证金比例查询
 "stock\_margin\_ratio\_pa"  \# 融资融券-标的证券名单及保证金比例查询
 \# 东财财富-日内分时数据
 "stock\_intraday\_em"  \# 东财财富-日内分时数据
 \# 新浪财经-日内分时数据
 "stock\_intraday\_sina"  \# 新浪财经-日内分时数据
 \# 筹码分布
 "stock\_cyq\_em"  \# 筹码分布
 \# 雪球基金-基金详情
 "fund\_individual\_basic\_info\_xq"  \# 雪球基金-基金详情
 "fund\_individual\_achievement\_xq"  \# 雪球基金-基金业绩
 "fund\_individual\_analysis\_xq"  \# 雪球基金-基金数据分析
 "fund\_individual\_profit\_probability\_xq"  \# 雪球基金-盈利概率
 "fund\_individual\_detail\_info\_xq"  \# 雪球基金-交易规则
 "fund\_individual\_detail\_hold\_xq"  \# 雪球基金-持仓详情
 \# 港股盈利预测
 "stock\_hk\_profit\_forecast\_et"  \# 港股盈利预测
 \# 雪球-行情中心-个股
 "stock\_individual\_spot\_xq"  \# 雪球-行情中心-个股
 \# 东方财富网-行情中心-期货市场-国际期货
 "futures\_global\_spot\_em"  \# 东方财富网-行情中心-期货市场-国际期货-实时行情
 "futures\_global\_hist\_em"  \# 东方财富网-行情中心-期货市场-国际期货-历史行情
 \# 东方财富-数据中心-沪深港通-市场概括-分时数据
 "stock\_hsgt\_fund\_min\_em"  \# 东方财富-数据中心-沪深港通-市场概括-分时数据
 \# 新浪财经-商品期货-成交持仓
 "futures\_hold\_pos\_sina"  \# 新浪财经-商品期货-成交持仓
 \# 生意社-商品与期货-现期图
 "futures\_spot\_sys"  \# 生意社-商品与期货-现期图
 \# 上海期货交易所指定交割仓库库存周报
 "futures\_stock\_shfe\_js"  \# 上海期货交易所指定交割仓库库存周报
 \# 期货合约信息
 "futures\_contract\_info\_shfe"  \# 上海期货交易所-期货合约信息
 "futures\_contract\_info\_ine"  \# 上海国际能源交易中心-期货合约信息
 "futures\_contract\_info\_dce"  \# 大连商品交易所-期货合约信息
 "futures\_contract\_info\_czce"  \# 郑州商品交易所-期货合约信息
 "futures\_contract\_info\_gfex"  \# 广州期货交易所-期货合约信息
 "futures\_contract\_info\_cffex"  \# 中国金融期货交易所-期货合约信息
 \# 资讯数据
 "stock\_info\_cjzc\_em"  \# 资讯数据-财经早餐-东方财富
 "stock\_info\_global\_em"  \# 资讯数据-东方财富
 "stock\_info\_global\_sina"  \# 资讯数据-新浪财经
 "stock\_info\_global\_futu"  \# 资讯数据-富途牛牛
 "stock\_info\_global\_ths"  \# 资讯数据-同花顺
 "stock\_info\_global\_cls"  \# 资讯数据-财联社
 \# 数库-A股新闻情绪指数
 "index\_news\_sentiment\_scope"  \# 数库-A股新闻情绪指数
 \# 华尔街见闻-日历-宏观
 "macro\_info\_ws"  \# 华尔街见闻-日历-宏观
 \# 现货走势
 "spot\_price\_qh"  \# 现货走势
 \# 东方财富网-数据中心-融资融券-融资融券账户统计-两融账户信息
 "stock\_margin\_account\_info"  \# 东方财富网-数据中心-融资融券-融资融券账户统计-两融账户信息
 \# 股票期权-每日统计
 "option\_daily\_stats\_sse"  \# 上海证券交易所-产品-股票期权-每日统计
 "option\_daily\_stats\_szse"  \# 深圳证券交易所-市场数据-期权数据-日度概况
 \# 商品期权手续费
 "option\_comm\_info"  \# 商品期权手续费
 \# 富途牛牛-主题投资-概念板块-成分股
 "stock\_concept\_cons\_futu"  \# 富途牛牛-主题投资-概念板块-成分股
 \# 同花顺-数据中心-宏观数据-股票筹资
 "macro\_stock\_finance"  \# 同花顺-数据中心-宏观数据-股票筹资
 \# 同花顺-数据中心-宏观数据-新增人民币贷款
 "macro\_rmb\_loan"  \# 同花顺-数据中心-宏观数据-新增人民币贷款
 \# 同花顺-数据中心-宏观数据-人民币存款余额
 "macro\_rmb\_deposit"  \# 同花顺-数据中心-宏观数据-人民币存款余额
 \# 知名港股
 "stock\_us\_famous\_spot\_em"  \# 知名港股
 \# 搜猪-生猪大数据-各省均价实时排行榜
 "spot\_hog\_soozhu"  \# 搜猪-生猪大数据-各省均价实时排行榜
 "spot\_hog\_year\_trend\_soozhu"  \# 搜猪-生猪大数据-今年以来全国出栏均价走势
 "spot\_hog\_lean\_price\_soozhu"  \# 搜猪-生猪大数据-全国瘦肉型肉猪
 "spot\_hog\_three\_way\_soozhu"  \# 搜猪-生猪大数据-全国三元仔猪
 "spot\_hog\_crossbred\_soozhu"  \# 搜猪-生猪大数据-全国后备二元母猪
 "spot\_corn\_price\_soozhu"  \# 搜猪-生猪大数据-全国玉米价格走势
 "spot\_soybean\_price\_soozhu"  \# 搜猪-生猪大数据-全国豆粕价格走势
 "spot\_mixed\_feed\_soozhu"  \# 搜猪-生猪大数据-全国育肥猪合料（含自配料）半月走势
 \# 财新网-财新数据通
 "stock\_news\_main\_cx"  \# 财新网-财新数据通
 \# QDII
 "qdii\_e\_index\_jsl"  \# 集思录-T+0 QDII-欧美市场-欧美指数
 "qdii\_e\_comm\_jsl"  \# 集思录-T+0 QDII-欧美市场-商品
 "qdii\_a\_index\_jsl"  \# 集思录-T+0 QDII-亚洲市场-亚洲指数
 \# 同花顺-公司大事-股东持股变动
 "stock\_shareholder\_change\_ths"  \# 同花顺-公司大事-股东持股变动
 "stock\_management\_change\_ths"  \# 同花顺-公司大事-高管持股变动
 \# 计算指标
 "volatility\_yz\_rv"  \# 已实现波动率计算
 \# 东方财富网-数据中心-估值分析-每日互动-每日互动-估值分析
 "stock\_value\_em"  \# 东方财富网-数据中心-估值分析-每日互动-每日互动-估值分析
 \# 基金基本概况
 "fund\_overview\_em"  \# 基金基本概况
 \# 基金费率
 "fund\_fee\_em"  \# 基金费率
 \# 期货行情-东方财富
 "futures\_hist\_em"  \# 期货行情-东方财富
 \# 美股财报
 "stock\_financial\_us\_report\_em"  \# 东方财富-美股-财务报表-三大报表
 "stock\_financial\_us\_analysis\_indicator\_em"  \# 东方财富-美股-财务分析-主要指标
 \# 东方财富网-行情中心-沪深港通
 "stock\_zh\_ah\_spot\_em"  \# 东方财富网-行情中心-沪深港通-AH股比价-实时行情
 "stock\_hsgt\_sh\_hk\_spot\_em"  \# 东方财富网-行情中心-沪深港通-港股通(沪>港)-股票
 \# 东方财富网-行情中心-外汇市场-所有汇率
 "forex\_spot\_em"  \# 东方财富网-行情中心-外汇市场-所有汇率-实时行情数据
 "forex\_hist\_em"  \# 东方财富网-行情中心-外汇市场-所有汇率-历史行情数据
 \# 东方财富网-行情中心-全球指数
 "index\_global\_spot\_em"  \# 东方财富网-行情中心-全球指数-实时行情数据
 "index\_global\_hist\_em"  \# 东方财富网-行情中心-全球指数-历史行情数据
 \# 新浪财经-行情中心-环球市场
 "index\_global\_name\_table"  \# 新浪财经-行情中心-环球市场-名称代码映射表
 "index\_global\_hist\_em"  \# 新浪财经-行情中心-环球市场-历史行情
 \# 股本结构
 "stock\_zh\_a\_gbjg\_em"  \# 股本结构
 \# 质押式回购
 "bond\_sh\_buy\_back\_em"  \# 上证质押式回购
 "bond\_sz\_buy\_back\_em"  \# 深证质押式回购
 "bond\_buy\_back\_hist\_em"  \# 质押式回购-历史数据
 \# 东方财富-港股-公司资料
 "stock\_hk\_security\_profile\_em"  \# 港股-证券资料
 "stock\_hk\_company\_profile\_em"  \# 港股-公司资料
 \# 东方财富-港股-核心必读
 "stock\_hk\_financial\_indicator\_em"  \# 港股-最新指标
 "stock\_hk\_dividend\_payout\_em"  \# 港股-分红派息
 \# 东方财富-港股-行业对比
 "stock\_hk\_growth\_comparison\_em"  \# 港股-行业对比-成长性对比
 "stock\_hk\_valuation\_comparison\_em"  \# 港股-行业对比-估值对比
 "stock\_hk\_scale\_comparison\_em"  \# 港股-行业对比-规模对比
 \# 东方财富-行情中心-同行比较
 "stock\_zh\_growth\_comparison\_em"  \# 行情中心-同行比较-成长性比较
 "stock\_zh\_valuation\_comparison\_em"  \# 行情中心-同行比较-估值比较
 "stock\_zh\_dupont\_comparison\_em"  \# 行情中心-同行比较-杜邦分析比较
 "stock\_zh\_scale\_comparison\_em"  \# 行情中心-同行比较-公司规模
 \# 期权保证金
 "option\_margin"  \# 期权保证金
 \# 全部AB股比价
 "stock\_zh\_ab\_comparison\_em"  \# 全部AB股比价
 \# 中证指数网站-指数列表
 "index\_csindex\_all"  \# 中证指数网站-指数列表
 \# 东方财富-A股-财务分析-主要指标
 "stock\_financial\_analysis\_indicator\_em"  \# 东方财富-A股-财务分析-主要指标
 \# 中国外汇交易中心暨全国银行间同业拆借中心-基准-外汇市场-外汇掉期曲线-外汇掉漆 C-Swap 定盘曲线
 "fx\_c\_swap\_cm"  \# 中国外汇交易中心暨全国银行间同业拆借中心-基准-外汇市场-外汇掉期曲线-外汇掉漆 C-Swap 定盘曲线
 \# 股票期权
 "option\_current\_day\_szse"  \# 深圳证券交易所-期权子网-行情数据-当日合约
 "option\_current\_day\_sse"  \# 上海证券交易所-产品-股票期权-信息披露-当日合约
 \# 期权合约信息
 "option\_contract\_info\_ctp"  \# 期权合约信息
 \# 百度股市通-美股-财务报表-估值数据
 "stock\_us\_valuation\_baidu"  \# 百度股市通-美股-财务报表-估值数据

## 案例演示[](#id2 "Link to this heading")

### 期货展期收益率[](#id3 "Link to this heading")

示例代码

import akshare as ak

get\_roll\_yield\_bar\_df \= ak.get\_roll\_yield\_bar(type\_method\="date", var\="RB", start\_day\="20180618", end\_day\="20180718")
print(get\_roll\_yield\_bar\_df)

结果显示: 日期, 展期收益率, 最近合约, 下一期合约

              roll\_yield  near\_by deferred
2018\-06\-19    0.191289  RB1810   RB1901
2018\-06\-20    0.192123  RB1810   RB1901
2018\-06\-21    0.183304  RB1810   RB1901
2018\-06\-22    0.190642  RB1810   RB1901
2018\-06\-25    0.194838  RB1810   RB1901
2018\-06\-26    0.204314  RB1810   RB1901
2018\-06\-27    0.213667  RB1810   RB1901
2018\-06\-28    0.211701  RB1810   RB1901
2018\-06\-29    0.205892  RB1810   RB1901
2018\-07\-02    0.224809  RB1810   RB1901
2018\-07\-03    0.229198  RB1810   RB1901
2018\-07\-04    0.222853  RB1810   RB1901
2018\-07\-05    0.247187  RB1810   RB1901
2018\-07\-06    0.261259  RB1810   RB1901
2018\-07\-09    0.253283  RB1810   RB1901
2018\-07\-10    0.225832  RB1810   RB1901
2018\-07\-11    0.210659  RB1810   RB1901
2018\-07\-12    0.212805  RB1810   RB1901
2018\-07\-13    0.170282  RB1810   RB1901
2018\-07\-16    0.218066  RB1810   RB1901
2018\-07\-17    0.229768  RB1810   RB1901
2018\-07\-18    0.225529  RB1810   RB1901
