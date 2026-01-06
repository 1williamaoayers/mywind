# AKShare 策略示例

> 来源: https://akshare.akfamily.xyz/demo.html
> 抓取时间: 2026-01-06T00:59:24.534Z

---

# [AKShare](https://github.com/akfamily/akshare) 策略示例[](#akshare "Link to this heading")

本策略示例文档的主要目的是为了方便的展示 [AKShare](https://github.com/akfamily/akshare) 的数据接口 调用、基本的数据处理和回测框架使用，并不涉及任何投资建议，提供的示例代码也仅供参考。

本策略示例是基于 Python 编程语言的开源投研和交易框架 [PyBroker](https://www.pybroker.com) 和 [Backtrader](https://www.backtrader.com) 来演示！ 注意：本教程的开发是基于：Python (64 位) 3.12.4 来进行的

## PyBroker 介绍[](#pybroker "Link to this heading")

你是否希望借助 Python 和机器学习的力量来优化您的交易策略？ 那么你需要了解一下 PyBroker！这个 Python 框架专为开发算法交易策略而设计， 尤其关注使用机器学习的策略。借助 PyBroker，你可以轻松创建和微调交易规则， 构建强大的模型，并深入了解你的策略表现。

### PyBroker 安装[](#id1 "Link to this heading")

PyBroker 支持在 Windows、macOS 和 Linux 中的 Python 3.9（建议使用 Python 3.11）及以上版本使用。其安装非常简单， 只需要 `pip install lib-pybroker` 就可以实现一键安装。

## PyBroker 系列教程[](#id2 "Link to this heading")

1.  [AKQuant-开源项目](https://akquant.akfamily.xyz)
    

## PyBroker 策略示例[](#id3 "Link to this heading")

\# 导入所需的库和模块
import pybroker as pb
from pybroker import Strategy, ExecContext
from pybroker.ext.data import AKShare

\# 定义全局参数 "stock\_code"（股票代码）、"percent"（持仓百分比）和 "stop\_profit\_pct"（止盈百分比）
pb.param(name\='stock\_code', value\='600000')
pb.param(name\='percent', value\=1)
pb.param(name\='stop\_loss\_pct', value\=10)
pb.param(name\='stop\_profit\_pct', value\=10)

\# 初始化 AKShare 数据源
akshare \= AKShare()

\# 使用 AKShare 数据源查询特定股票（由 "stock\_code" 参数指定）在指定日期范围内的数据
df \= akshare.query(symbols\=\[pb.param(name\='stock\_code')\], start\_date\='20200131', end\_date\='20230228')

\# 定义交易策略：如果当前没有持有该股票，则买入股票，并设置止盈点位
def buy\_with\_stop\_loss(ctx: ExecContext):
    pos \= ctx.long\_pos()
    if not pos:
        \# 计算目标股票数量，根据 "percent" 参数确定应购买的股票数量
        ctx.buy\_shares \= ctx.calc\_target\_shares(pb.param(name\='percent'))
        ctx.hold\_bars \= 100
    else:
        ctx.sell\_shares \= pos.shares
        \# 设置止盈点位，根据 "stop\_profit\_pct" 参数确定止盈点位
        ctx.stop\_profit\_pct \= pb.param(name\='stop\_profit\_pct')

\# 创建策略配置，初始资金为 500000
my\_config \= pb.StrategyConfig(initial\_cash\=500000)
\# 使用配置、数据源、起始日期、结束日期，以及刚才定义的交易策略创建策略对象
strategy \= Strategy(akshare, start\_date\='20200131', end\_date\='20230228', config\=my\_config)
\# 添加执行策略，设置股票代码和要执行的函数
strategy.add\_execution(fn\=buy\_with\_stop\_loss, symbols\=\[pb.param(name\='stock\_code')\])
\# 执行回测，并打印出回测结果的度量值（四舍五入到小数点后四位）
result \= strategy.backtest()
print(result.metrics\_df.round(4))

Loading bar data...
Loaded bar data: 0:00:00
Backtesting: 2020\-01-31 00:00:00 to 2023\-02-28 00:00:00
Loading bar data...
Loaded bar data: 0:00:00
Test split: 2020\-02-03 00:00:00 to 2023\-02-28 00:00:00
100% (748 of 748) |######################| Elapsed Time: 0:00:00 Time:  0:00:00
Finished backtest: 0:00:03
                      name        value
0              trade\_count     373.0000
1     initial\_market\_value  500000.0000
2         end\_market\_value  467328.0900
3                total\_pnl  \-33322.7800
4           unrealized\_pnl     650.8700
5         total\_return\_pct      \-6.6646
6             total\_profit  530528.5100
7               total\_loss \-563851.2900
8               total\_fees       0.0000
9             max\_drawdown \-113004.2700
10        max\_drawdown\_pct     \-20.2704
11                win\_rate      45.9215
12               loss\_rate      54.0785
13          winning\_trades     152.0000
14           losing\_trades     179.0000
15                 avg\_pnl     \-89.3372
16          avg\_return\_pct      \-0.0160
17          avg\_trade\_bars       1.0000
18              avg\_profit    3490.3191
19          avg\_profit\_pct       0.6958
20  avg\_winning\_trade\_bars       1.0000
21                avg\_loss   \-3150.0072
22            avg\_loss\_pct      \-0.6241
23   avg\_losing\_trade\_bars       1.0000
24             largest\_win   31157.9400
25         largest\_win\_pct       5.9200
26        largest\_win\_bars       1.0000
27            largest\_loss  \-12682.6000
28        largest\_loss\_pct      \-2.3100
29       largest\_loss\_bars       1.0000
30                max\_wins       8.0000
31              max\_losses       7.0000
32                  sharpe      \-0.0132
33                 sortino      \-0.0231
34           profit\_factor       0.9638
35             ulcer\_index       1.7639
36                     upi      \-0.0039
37               equity\_r2       0.5876
38               std\_error   27448.1177

## Backtrader 介绍[](#backtrader "Link to this heading")

[Backtrader](https://www.backtrader.com) 是基于 Python 编程语言的主要用于量化投资开源回测和交易的框架，可以用于多种资产的回测。 目前，[Backtrader](https://www.backtrader.com) 可以用于实现股票、期货、期权、外汇、加密货币等资产的回测，同时该开源框架也有强大的第三方社区支持，目前已经实现了 基于 IB、Oanda、VC、CCXT、MT5 等接口量化交易，随着该框架的流行，后期会有更多的小伙伴提供更多的第三方模块，学习和使用该框架是一个不错的选择！

### Backtrader 下载和安装[](#id4 "Link to this heading")

[Backtrader](https://www.backtrader.com) 的下载和安装都比较简单，尤其是在配置好 [AKShare](https://github.com/akfamily/akshare) 的 基础上，我们只需要 `pip install backtrader` 就可以实现一键安装。如果需要了解 [AKShare](https://github.com/akfamily/akshare) 的 环境配置，请参考 [AKShare 环境配置](https://akshare.akfamily.xyz/anaconda.html) 来设置本地环境。想要通过源码来安装的小伙伴，可以访问 [Backtrader 的 GitHub 地址](https://github.com/mementum/backtrader) 来下 载安装，由于源码安装比较繁琐，建议直接通过 `pip` 或 `conda` 来安装和使用。需要注意的是如果要输出图形，请安装 `pip install matplotlib==3.2.2`

## Backtrader 系列教程[](#id5 "Link to this heading")

1.  [Backtrader-系列教程-01-介绍](https://zhuanlan.zhihu.com/p/418247765)
    
2.  [Backtrader-系列教程-02-环境配置](https://zhuanlan.zhihu.com/p/418255493)
    

## Backtrader 股票策略[](#id6 "Link to this heading")

### 基本策略[](#id7 "Link to this heading")

#### 代码[](#id8 "Link to this heading")

from datetime import datetime

import backtrader as bt  \# 升级到最新版
import matplotlib.pyplot as plt  \# 由于 Backtrader 的问题，此处要求 pip install matplotlib==3.2.2
import akshare as ak  \# 升级到最新版
import pandas as pd

plt.rcParams\["font.sans-serif"\] \= \["SimHei"\]
plt.rcParams\["axes.unicode\_minus"\] \= False

\# 利用 AKShare 获取股票的后复权数据，这里只获取前 7 列
stock\_hfq\_df \= ak.stock\_zh\_a\_hist(symbol\="000001", adjust\="hfq").iloc\[:, :7\]
\# 删除 \`股票代码\` 列
del stock\_hfq\_df\['股票代码'\]
\# 处理字段命名，以符合 Backtrader 的要求
stock\_hfq\_df.columns \= \[
    'date',
    'open',
    'close',
    'high',
    'low',
    'volume',
\]
\# 把 date 作为日期索引，以符合 Backtrader 的要求
stock\_hfq\_df.index \= pd.to\_datetime(stock\_hfq\_df\['date'\])

class MyStrategy(bt.Strategy):
    """
    主策略程序
    """
    params \= (("maperiod", 20),)  \# 全局设定交易策略的参数

    def \_\_init\_\_(self):
        """
        初始化函数
        """
        self.data\_close \= self.datas\[0\].close  \# 指定价格序列
        \# 初始化交易指令、买卖价格和手续费
        self.order \= None
        self.buy\_price \= None
        self.buy\_comm \= None
        \# 添加移动均线指标
        self.sma \= bt.indicators.SimpleMovingAverage(
            self.datas\[0\], period\=self.params.maperiod
        )

    def next(self):
        """
        执行逻辑
        """
        if self.order:  \# 检查是否有指令等待执行,
            return
        \# 检查是否持仓
        if not self.position:  \# 没有持仓
            if self.data\_close\[0\] \> self.sma\[0\]:  \# 执行买入条件判断：收盘价格上涨突破20日均线
                self.order \= self.buy(size\=100)  \# 执行买入
        else:
            if self.data\_close\[0\] < self.sma\[0\]:  \# 执行卖出条件判断：收盘价格跌破20日均线
                self.order \= self.sell(size\=100)  \# 执行卖出

cerebro \= bt.Cerebro()  \# 初始化回测系统
start\_date \= datetime(1991, 4, 3)  \# 回测开始时间
end\_date \= datetime(2020, 6, 16)  \# 回测结束时间
data \= bt.feeds.PandasData(dataname\=stock\_hfq\_df, fromdate\=start\_date, todate\=end\_date)  \# 加载数据
cerebro.adddata(data)  \# 将数据传入回测系统
cerebro.addstrategy(MyStrategy)  \# 将交易策略加载到回测系统中
start\_cash \= 1000000
cerebro.broker.setcash(start\_cash)  \# 设置初始资本为 100000
cerebro.broker.setcommission(commission\=0.002)  \# 设置交易手续费为 0.2%
cerebro.run()  \# 运行回测系统

port\_value \= cerebro.broker.getvalue()  \# 获取回测结束后的总资金
pnl \= port\_value \- start\_cash  \# 盈亏统计

print(f"初始资金: {start\_cash}\\n回测期间：{start\_date.strftime('%Y%m%d')}:{end\_date.strftime('%Y%m%d')}")
print(f"总资金: {round(port\_value, 2)}")
print(f"净收益: {round(pnl, 2)}")

cerebro.plot(style\='candlestick')  \# 画图

#### 结果[](#id9 "Link to this heading")

初始资金: 1000000
回测期间：20000101:20200421
总资金: 1010238.65
净收益: 10238.65

#### 可视化[](#id10 "Link to this heading")

![https://jfds-1252952517.cos.ap-chengdu.myqcloud.com/akshare/readme/strategy/Figure_0.png](https://jfds-1252952517.cos.ap-chengdu.myqcloud.com/akshare/readme/strategy/Figure_0.png)

### 参数优化[](#id11 "Link to this heading")

#### 代码[](#id12 "Link to this heading")

from datetime import datetime

import akshare as ak
import backtrader as bt
import matplotlib.pyplot as plt  \# 由于 Backtrader 的问题，此处要求 pip install matplotlib==3.2.2
import pandas as pd

plt.rcParams\["font.sans-serif"\] \= \["SimHei"\]  \# 设置画图时的中文显示
plt.rcParams\["axes.unicode\_minus"\] \= False  \# 设置画图时的负号显示

class MyStrategy(bt.Strategy):
    """
    主策略程序
    """
    params \= (("maperiod", 20),
              ('printlog', False),)  \# 全局设定交易策略的参数, maperiod是 MA 均值的长度

    def \_\_init\_\_(self):
        """
        初始化函数
        """
        self.data\_close \= self.datas\[0\].close  \# 指定价格序列
        \# 初始化交易指令、买卖价格和手续费
        self.order \= None
        self.buy\_price \= None
        self.buy\_comm \= None
        \# 添加移动均线指标
        self.sma \= bt.indicators.SimpleMovingAverage(
            self.datas\[0\], period\=self.params.maperiod
        )

    def next(self):
        """
        主逻辑
        """

        \# self.log(f'收盘价, {data\_close\[0\]}')  # 记录收盘价
        if self.order:  \# 检查是否有指令等待执行,
            return
        \# 检查是否持仓
        if not self.position:  \# 没有持仓
            \# 执行买入条件判断：收盘价格上涨突破15日均线
            if self.data\_close\[0\] \> self.sma\[0\]:
                self.log("BUY CREATE, %.2f" % self.data\_close\[0\])
                \# 执行买入
                self.order \= self.buy()
        else:
            \# 执行卖出条件判断：收盘价格跌破15日均线
            if self.data\_close\[0\] < self.sma\[0\]:
                self.log("SELL CREATE, %.2f" % self.data\_close\[0\])
                \# 执行卖出
                self.order \= self.sell()

    def log(self, txt, dt\=None, do\_print\=False):
        """
        Logging function fot this strategy
        """
        if self.params.printlog or do\_print:
            dt \= dt or self.datas\[0\].datetime.date(0)
            print('%s, %s' % (dt.isoformat(), txt))

    def notify\_order(self, order):
        """
        记录交易执行情况
        """
        \# 如果 order 为 submitted/accepted,返回空
        if order.status in \[order.Submitted, order.Accepted\]:
            return
        \# 如果order为buy/sell executed,报告价格结果
        if order.status in \[order.Completed\]:
            if order.isbuy():
                self.log(
                    f"买入:\\n价格:{order.executed.price},\\
                成本:{order.executed.value},\\
                手续费:{order.executed.comm}"
                )
                self.buyprice \= order.executed.price
                self.buycomm \= order.executed.comm
            else:
                self.log(
                    f"卖出:\\n价格：{order.executed.price},\\
                成本: {order.executed.value},\\
                手续费{order.executed.comm}"
                )
            self.bar\_executed \= len(self)

            \# 如果指令取消/交易失败, 报告结果
        elif order.status in \[order.Canceled, order.Margin, order.Rejected\]:
            self.log("交易失败")
        self.order \= None

    def notify\_trade(self, trade):
        """
        记录交易收益情况
        """
        if not trade.isclosed:
            return
        self.log(f"策略收益：\\n毛收益 {trade.pnl:.2f}, 净收益 {trade.pnlcomm:.2f}")

    def stop(self):
        """
        回测结束后输出结果
        """
        self.log("(MA均线： %2d日) 期末总资金 %.2f" % (self.params.maperiod, self.broker.getvalue()), do\_print\=True)

def main(code\="600070", start\_cash\=1000000, stake\=100, commission\_fee\=0.001):
    cerebro \= bt.Cerebro()  \# 创建主控制器
    cerebro.optstrategy(MyStrategy, maperiod\=range(3, 31))  \# 导入策略参数寻优
    \# 利用 AKShare 获取股票的后复权数据，这里只获取前 7 列
    stock\_hfq\_df \= ak.stock\_zh\_a\_hist(symbol\=code, adjust\="hfq", start\_date\='20000101', end\_date\='20210617').iloc\[:, :7\]
    \# 删除 \`股票代码\` 列
    del stock\_hfq\_df\['股票代码'\]
    \# 处理字段命名，以符合 Backtrader 的要求
    stock\_hfq\_df.columns \= \[
        'date',
        'open',
        'close',
        'high',
        'low',
        'volume',
    \]
    \# 把 date 作为日期索引，以符合 Backtrader 的要求
    stock\_hfq\_df.index \= pd.to\_datetime(stock\_hfq\_df\['date'\])
    start\_date \= datetime(1991, 4, 3)  \# 回测开始时间
    end\_date \= datetime(2021, 6, 16)  \# 回测结束时间
    data \= bt.feeds.PandasData(dataname\=stock\_hfq\_df, fromdate\=start\_date, todate\=end\_date)  \# 规范化数据格式
    cerebro.adddata(data)  \# 将数据加载至回测系统
    cerebro.broker.setcash(start\_cash)  \# broker设置资金
    cerebro.broker.setcommission(commission\=commission\_fee)  \# broker手续费
    cerebro.addsizer(bt.sizers.FixedSize, stake\=stake)  \# 设置买入数量
    print("期初总资金: %.2f" % cerebro.broker.getvalue())
    cerebro.run(maxcpus\=1)  \# 用单核 CPU 做优化
    print("期末总资金: %.2f" % cerebro.broker.getvalue())

if \_\_name\_\_ \== '\_\_main\_\_':
    main(code\="600070", start\_cash\=1000000, stake\=100, commission\_fee\=0.001)

#### 结果[](#id13 "Link to this heading")

期初总资金: 1000000.00
2020-06-12, (MA均线：  3日) 期末总资金 1004105.69
2020-06-12, (MA均线：  4日) 期末总资金 1002384.49
2020-06-12, (MA均线：  5日) 期末总资金 1002063.96
2020-06-12, (MA均线：  6日) 期末总资金 1002113.63
2020-06-12, (MA均线：  7日) 期末总资金 1001715.32
2020-06-12, (MA均线：  8日) 期末总资金 999702.60
2020-06-12, (MA均线：  9日) 期末总资金 1001658.65
2020-06-12, (MA均线： 10日) 期末总资金 999698.63
2020-06-12, (MA均线： 11日) 期末总资金 1003370.08
2020-06-12, (MA均线： 12日) 期末总资金 1002183.37
2020-06-12, (MA均线： 13日) 期末总资金 1006154.29
2020-06-12, (MA均线： 14日) 期末总资金 1007900.55
2020-06-12, (MA均线： 15日) 期末总资金 1008421.63
2020-06-12, (MA均线： 16日) 期末总资金 1008708.77
2020-06-12, (MA均线： 17日) 期末总资金 1008734.88
2020-06-12, (MA均线： 18日) 期末总资金 1010371.15
2020-06-12, (MA均线： 19日) 期末总资金 1010186.34
2020-06-12, (MA均线： 20日) 期末总资金 1010201.81
2020-06-12, (MA均线： 21日) 期末总资金 1010782.44
2020-06-12, (MA均线： 22日) 期末总资金 1011271.23
2020-06-12, (MA均线： 23日) 期末总资金 1011711.92
2020-06-12, (MA均线： 24日) 期末总资金 1012475.96
2020-06-12, (MA均线： 25日) 期末总资金 1010726.64
2020-06-12, (MA均线： 26日) 期末总资金 1012502.74
2020-06-12, (MA均线： 27日) 期末总资金 1011219.53
2020-06-12, (MA均线： 28日) 期末总资金 1013569.11
2020-06-12, (MA均线： 29日) 期末总资金 1014176.30
2020-06-12, (MA均线： 30日) 期末总资金 1014076.32
期末总资金: 1014076.32
