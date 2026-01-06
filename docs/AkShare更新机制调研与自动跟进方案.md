# AkShare更新机制调研与MyWind自动跟进方案

> **调研日期**: 2026-01-06  
> **调研目的**: 研究AkShare的更新频率和机制，提出MyWind如何更容易、更简单地跟上AkShare更新的方案  
> **调研方法**: 官方文档逐字审查 + GitHub仓库分析 + 全网最佳实践研究

---

## 📊 调研发现

### 1. A kShare更新频率分析 ⚠️ **关键发现**

**官方GitHub数据**:
- **总版本数**: 129个版本（截至2026-01-06）
- **最新版本**: v1.18.7 (2026-01-05发布)
- **更新频率**: **几乎每天更新，甚至一天多次**
  - 例如：v1.18.7（1小时前）和v1.18.6（11小时前）在同一天发布
- **活跃程度**: 最近提交（2026-01-04）显示持续开发

**更新原因**（根据官方文档）:
1. **数据源变化**: 目标网站（东方财富、新浪财经等）频繁调整结构
2. **Bug修复**: 及时修复接口失效问题
3. **新接口添加**: 持续增加新的数据接口
4. **源码优化**: 代码质量和性能改进

**官方建议**: 
> 用户应**频繁更新**本地AkShare到最新版本，因为数据源网站的变化会导致接口需要调整

---

### 2. AkShare维护特点

#### 2.1 高频迭代的原因
- ❌ **爬虫特性**: AkShare本质是web scraping库，依赖目标网站HTML结构
- ⚠️ **CSS选择器易失效**: 网站一改版，接口就可能失效
- ✅ **快速响应**: 作者团队能快速修复（通常当天或次日）
- 🔄 **持续维护**: 作者承诺长期维护，确保数据可靠性

#### 2.2 版本发布策略
- **Semantic Versioning**: 遵循语义化版本（major.minor.patch）
- **详细Changelog**: 每个版本都有详细的变更日志
- **向后兼容**: 大部分更新保持API向后兼容
- **Breaking Changes**: 重大变更会在release notes中明确标注

---

## ⚠️ 问题分析：如果我们不跟进更新会怎样？

### 风险评估

| 风险 | 可能性 | 影响 | 说明 |
|------|--------|------|------|
| 接口失效 | ⭐⭐⭐⭐⭐ 极高 | 🔴 严重 | 数据源网站改版→接口失效→MyWind API返回空数据 |
| 新接口缺失 | ⭐⭐⭐⭐ 高 | 🟡 中等 | 错过新功能，TradingAgents无法获取新类型数据 |
| 性能问题 | ⭐⭐⭐ 中等 | 🟡 中等 | 旧版本可能有性能bug，影响响应时间 |
| 安全漏洞 | ⭐⭐ 低 | 🟠 高 | 依赖库漏洞（requests、pandas等）|

### 典型失效场景
**示例**（真实情况）:
1. 东方财富网修改了新闻列表页的CSS类名
2. AkShare的`stock_news_em()`接口失效
3. 作者当天发现并修复，发布v1.18.6
4. 如果MyWind没更新 → 新闻分析师完全失效！

---

## ✅ 解决方案：MyWind自动跟进策略

### 方案A：激进更新策略 ⭐ 推荐（非生产环境）

**适用场景**: 开发阶段、测试环境

**策略**: 每周自动更新AkShare到最新版本

**实施步骤**:

```yaml
# Dockerfile 或 requirements.txt
# 方式1：requirements.txt（不锁定版本）
akshare>=1.18.0  # 只指定最低版本

# 方式2：定期重新生成requirements.txt
akshare==1.18.7  # 每周更新这个版本号
```

**自动化流程**（GitHub Actions / Cron Job）:
```yaml
# .github/workflows/update-akshare.yml
name: Update AkShare Weekly
on:
  schedule:
    - cron: '0 0 * * 0'  # 每周日00:00
  workflow_dispatch:  # 也可手动触发

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Update AkShare to latest
        run: |
          pip install akshare --upgrade
          pip freeze | grep akshare > akshare-version.txt
          
      - name: Run integration tests
        run: |
          pytest tests/akshare_integration/
          
      - name: Create Pull Request
        if: success()
        uses: peter-evans/create-pull-request@v5
        with:
          title: "chore: Update AkShare to latest version"
          body: "Auto-generated PR to update AkShare dependency"
```

**优点**:
- ✅ 始终使用最新接口
- ✅ 自动获得bug修复
- ✅ 不会落后太多

**缺点**:
- ⚠️ 可能引入breaking changes
- ⚠️ 需要完善的自动化测试

---

### 方案B：保守更新策略 ⭐⭐ 推荐（生产环境）

**适用场景**: 生产环境、对稳定性要求高的场景

**策略**: 版本锁定 + 定期手动更新 + 充分测试

**实施步骤**:

#### Step 1: 使用Poetry管理依赖（推荐）

```toml
#  pyproject.toml
[tool.poetry.dependencies]
python = "^3.11"
akshare = "1.18.7"  # 锁定精确版本
fastapi = "^0.109.0"
redis = "^5.0.0"
```

```bash
# 生成lockfile
poetry lock

# 安装确切版本
poetry install
```

#### Step 2: 监控AkShare更新

**方式1: GitHub Watch**
- 在GitHub上Watch AkShare仓库
- 选择"Releases only"
- 每次发布会收到邮件通知

**方式2: RSS订阅**
```
https://github.com/akfamily/akshare/releases.atom
```

**方式3: 自动化监控脚本**
```python
# scripts/check_akshare_version.py
import requests
import subprocess

def get_latest_version():
    """从PyPI获取最新版本"""
    response = requests.get("https://pypi.org/pypi/akshare/json")
    return response.json()["info"]["version"]

def get_current_version():
    """获取当前安装版本"""
    result = subprocess.run(
        ["poetry", "show", "akshare"],
        capture_output=True,
        text=True
    )
    # 解析输出获取版本
    for  line in result.stdout.split("\n"):
        if line.startswith("version"):
            return line.split(":")[1].strip()

if __name__ == "__main__":
    latest = get_latest_version()
    current = get_current_version()
    
    if latest != current:
        print(f"⚠️ New AkShare version available: {latest} (current: {current})")
        print(f"📋 Changelog: https://github.com/akfamily/akshare/releases/tag/release-v{latest}")
    else:
        print(f"✅ AkShare is up to date: {current}")
```

每天通过cron运行，发现新版本时发送通知。

#### Step 3: 更新流程（每2周一次）

```bash
# 1. 创建更新分支
git checkout -b update-akshare-v1.18.8

# 2. 更新AkShare
poetry add akshare@^1.18.8

# 3. 运行完整测试套件
poetry run pytest tests/ -v

# 4. 手动测试关键接口
poetry run python scripts/test_critical_apis.py

# 5. 检查changelog
# 阅读 https://github.com/akfamily/akshare/releases

# 6. 如果测试通过，提交PR
git commit -am "chore: update akshare to v1.18.8"
git push origin update-akshare-v1.18.8
```

**优点**:
- ✅ 稳定性高，不会突然失效
- ✅ 有充分测试时间
- ✅ 可以评估breaking changes

**缺点**:
- ⚠️ 可能落后最新版本1-2周
- ⚠️ 如果关键接口失效需要紧急更新

---

### 方案C：混合策略 ⭐⭐⭐ 最佳推荐

**策略**: 开发环境激进更新 + 生产环境保守更新 + 紧急热修复机制

**架构**:

```
┌─────────────────────────────────────────────┐
│         Development Environment             │
│  - AkShare: latest (每周自动更新)             │
│  - 持续集成测试                               │
│  - 发现问题立即回滚                           │
└─────────────────┬───────────────────────────┘
                  │ 测试通过（1周后）
                  ▼
┌─────────────────────────────────────────────┐
│         Staging Environment                  │
│  - AkShare: 锁定版本（开发环境验证过的版本）   │
│  - 完整回归测试                               │
│  - 性能测试                                   │
└─────────────────┬───────────────────────────┘
                  │ 测试通过（3天后）
                  ▼
┌─────────────────────────────────────────────┐
│         Production Environment               │
│  - AkShare: 严格锁定版本                      │
│  - 只在充分验证后更新                         │
│  - 有rollback plan                           │
└─────────────────────────────────────────────┘

            ⚡ 紧急热修复通道 ⚡
     （关键接口失效时跳过staging直达生产）
```

**紧急更新机制**:
```python
# services/akshare_health_checker.py
"""
每小时检查关键接口健康状态
"""
import akshare as ak
from datetime import datetime

CRITICAL_APIS = [
    ("stock_hk_spot_em", {}),  # 港股实时行情
    ("stock_news_em", {"symbol": "BK0001"}),  # 新闻
    ("macro_china_gdp", {}),  # GDP数据
]

def check_api_health(func_name, params):
    """检查单个API是否正常"""
    try:
        func = getattr(ak, func_name)
        result = func(**params)
        return len(result) > 0  # 至少返回数据
    except Exception as e:
        return False

def health_check():
    failed = []
    for func_name, params in CRITICAL_APIS:
        if not check_api_health(func_name, params):
            failed.append(func_name)
    
    if failed:
        # 发送告警
        send_alert(f"⚠️ Critical AkShare APIs failed: {failed}")
        # 检查是否有新版本
        check_and_suggest_update()
```

---

## 🛠️ 技术实施细节

### 1. 依赖管理工具选择

**推荐：Poetry** ⭐⭐⭐

**理由**:
1. ✅ 自动管理虚拟环境
2. ✅ `pyproject.toml` + `poetry.lock` 双重保证
3. ✅ 依赖解析强大，避免冲突
4. ✅ 支持development/production分组依赖
5. ✅ 命令行直观易用

**安装**:
```bash
curl -sSL https://install.python-poetry.org | python3 -

# 或者
pip install poetry
```

**项目初始化**:
```bash
cd mywind-fastapi
poetry init

# pyproject.toml会自动生成
[tool.poetry]
name = "mywind-akshare-api"
version = "1.0.0"
description = "MyWind AkShare Data API for TradingAgents"
authors = ["Your Name <email@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
akshare = "1.18.7"
fastapi = "^0.109.0"
uvicorn = "^0.27.0"
redis = "^5.0.0"
pymongo = "^4.6.0"
pandas = "^2.1.0"
pydantic = "^2.5.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.23.0"
black = "^23.12.0"
ruff = "^0.1.9"
```

**使用**:
```bash
#安装所有依赖
poetry install

# 只安装生产依赖（部署时）
poetry install --no-dev

# 添加新依赖
poetry add requests

# 更新特定包
poetry update akshare

# 查看依赖树
poetry show --tree
```

---

### 2. Docker部署策略

**多阶段构建 + 版本锁定**:

```dockerfile
# Dockerfile
FROM python:3.11-slim as builder

# 安装Poetry
RUN pip install poetry==1.7.0

WORKDIR /app

# 复制依赖文件
COPY pyproject.toml poetry.lock ./

# 配置Poetry不创建虚拟环境（Docker已经是隔离环境）
RUN poetry config virtualenvs.create false

# 安装依赖到系统Python
RUN poetry install --no-dev --no-root

# 生产镜像
FROM python:3.11-slim

WORKDIR /app

# 从builder复制安装好的包
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8888

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  mywind-api:
    build: .
    ports:
      - "8888:8888"
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URL=mongodb://mongo:27017
      - AKSHARE_VERSION=1.18.7  # 记录使用的版本
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

### 3. 自动化测试策略

**关键：Contract Testing（契约测试）**

```python
# tests/akshare_integration/test_akshare_contracts.py
"""
测试AkShare接口契约（返回字段、数据类型）
如果AkShare更新后字段变化，测试会失败
"""
import pytest
import akshare as ak
import pandas as pd

class TestStockHKContracts:
    """港股行情接口契约测试"""
    
    def test_stock_hk_spot_em_returns_dataframe(self):
        """测试返回DataFrame"""
        result = ak.stock_hk_spot_em()
        assert isinstance(result, pd.DataFrame)
    
    def test_stock_hk_spot_em_required_columns(self):
        """测试必需字段存在"""
        result = ak.stock_hk_spot_em()
        required_columns = ["代码", "名称", "最新价", "涨跌额", "涨跌幅", "今开", "最高", "最低", "成交量"]
        
        for col in required_columns:
            assert col in result.columns, f"Missing required column: {col}"
    
    def test_stock_hk_spot_em_data_types(self):
        """测试数据类型"""
        result = ak.stock_hk_spot_em()
        
        # 价格应该是数字
        assert pd.api.types.is_numeric_dtype(result["最新价"])
        # 代码应该是字符串
        assert pd.api.types.is_string_dtype(result["代码"]) or pd.api.types.is_object_dtype(result["代码"])

# 为所有253个接口编写契约测试
# 这样AkShare更新后，如果字段变化会立即发现
```

**CI/CD集成**:
```yaml
# .github/workflows/test.yml
name: Test AkShare Integration

on:
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # 每天测试一次

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Poetry
        run: pip install poetry
      
      - name: Install dependencies
        run: poetry install
      
      - name: Run contract tests
        run: poetry run pytest tests/akshare_integration/ -v
      
      - name: Report failures
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'AkShare integration tests failed! Possible API changes.'
```

---

## 📋 最终建议方案

### 部署架构推荐

```
环境分离 + 渐进式更新 + 自动化监控
```

| 环境 | AkShare版本策略 | 更新频率 | 测试要求 |
|------|----------------|----------|----------|
| **Dev** | 激进（latest） | 每周一自动 | 自动化测试 |
| **Staging** | 保守（Dev验证通过） | 每2周 | 完整回归测试 |
| **Prod** | 严格锁定 | 每月/紧急时 | 充分验证+灰度发布 |

### 具体实施步骤（5步走）

#### Phase 1: 建立基础（Week 1）
```bash
# 1. 安装Poetry
pip install poetry

# 2. 初始化项目
cd mywind-fastapi
poetry init

# 3. 添加AkShare（锁定当前稳定版本）
poetry add akshare==1.18.7

# 4. 生成lock文件
poetry lock

# 5. 提交到Git
git add pyproject.toml poetry.lock
git commit -m "chore: add Poetry dependency management"
```

#### Phase 2: 建立测试体系（Week 2）
```bash
# 1. 添加测试依赖
poetry add --group dev pytest pytest-asyncio pytest-cov

# 2. 编写契约测试（至少覆盖P0的80个接口）
# tests/akshare_integration/test_*.py

# 3. 配置CI
# .github/workflows/test.yml

# 4. 首次运行测试
poetry run pytest
```

#### Phase 3: 建立监控（Week 3）
```bash
# 1. 创建版本检查脚本
# scripts/check_akshare_version.py

# 2. 创建健康检查
# services/akshare_health_checker.py

# 3. 配置cron job每小时运行
0 * * * * cd /app && poetry run python services/akshare_health_checker.py

# 4. 配置告警（Slack/Email/钉钉）
```

#### Phase 4: 建立更新流程（Week 4）
```bash
# 1. 文档化更新SOP
# docs/AKSHARE_UPDATE_PROCEDURE.md

# 2. 配置自动更新PR（Dev环境）
# .github/workflows/update-akshare.yml

# 3. 准备回滚脚本
# scripts/rollback_akshare.sh
```

#### Phase 5: 持续优化（Ongoing）
- 每周review Dev环境测试结果
- 每2周评估是否更新Staging
- 每月固定窗口更新Production（除非紧急）
- 持续补充测试用例

---

## 🎯 总结

### 核心原则
1. **不要害怕更新** - AkShare必须保持更新才能正常工作
2. **但要科学地更新** - 通过测试、分环境、渐进式发布降低风险
3. **自动化是关键** - 监控、测试、部署都要自动化
4. **快速响应能力** - 建立紧急更新通道，关键接口失效24小时内修复

### 推荐配置（TL;DR）

**依赖管理**: Poetry  
**版本策略**: 生产环境锁定版本 (`akshare==1.18.7`)  
**更新频率**: 
- Dev: 每周自动
- Staging: 每2周手动
- Prod: 每月固定窗口 + 紧急热修复

**监控**: 每小时健康检查 + 每天版本检查  
**测试**: 253个接口的契约测试

### 立即行动清单

- [ ] 安装Poetry
- [ ] 创建pyproject.toml锁定akshare==1.18.7
- [ ] 编写前20个P0接口的契约测试
- [ ] 配置GitHub Actions CI
- [ ] 创建健康检查脚本
- [ ] 文档化更新流程

---

**文档版本**: v1.0  
**最后更新**: 2026-01-06  
**下一步**: 开始Phase 1 - 建立Poetry依赖管理
