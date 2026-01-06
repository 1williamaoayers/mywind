# MyWind + AKTools 详细实施计划

> **制定日期**: 2026-01-06  
> **战略转向**: 从"手动封装253个接口"改为"使用AKTools官方工具"  
> **核心优势**: 工作量从5周减少到3天，维护成本降低95%  
> **预计完成**: 7天（包含测试和文档）

---

## 📊 背景与决策

### 原计划的问题
- ❌ 需要手动封装253个AkShare接口（5周工作量）
- ❌ AkShare几乎每天更新，维护成本极高
- ❌ 每次更新需要重新测试所有接口
- ❌ 技术债累积严重

### 新方案的优势
- ✅ **AKTools官方工具**：一行命令启动HTTP API服务
- ✅ **零代码封装**：所有253个接口自动可用
- ✅ **自动跟随更新**：只需升级aktools包
- ✅ **工作量减少90%**：从5周→3天

---

## 🎯 实施目标

### 主要目标
1. 在你的服务器上部署MyWind数据中心（基于AKTools）
2. 修改TradingAgents支持连接外部MyWind API
3. 提供两套部署方案给用户：
   - **单机部署**：适合小白/个人使用
   - **分离部署**：适合多实例/VPS/NAS环境

### 成功标准
- [ ] MyWind服务稳定运行，API可访问
- [ ] TradingAgents能通过环境变量连接MyWind
- [ ] 提供一键部署脚本给用户
- [ ] 完整的部署文档和使用说明

---

## 📅 实施时间表（7天计划）

### Day 1-2: 基础设施准备

#### Task 1.1: 本地验证AKTools（优先级：P0）
**目标**: 确认AKTools可用性和性能

```bash
# 步骤
1. 安装aktools
   pip install aktools

2. 启动服务
   python -m aktools

3. 测试关键接口
   curl http://localhost:8080/api/public/stock_hk_spot_em
   curl http://localhost:8080/api/public/stock_zh_a_hist?symbol=600000
   
4. 访问自动生成的API文档
   http://localhost:8080/docs

5. 性能测试
   - 测试并发请求
   - 测试响应时间
   - 记录资源占用
```

**预期结果**: 
- 所有测试接口返回正确数据
- 响应时间 < 2秒
- 内存占用 < 500MB

**验收标准**: 创建测试报告 `aktools_validation_report.md`

---

#### Task 1.2: TradingAgents代码改造（优先级：P0）
**目标**: 使TradingAgents支持外部MyWind API

**文件位置**: `/anti/mywind/TradingAgents-arm32/tradingagents/dataflows/providers/china/akshare.py`

**改造方案**:

```python
# 在AKShareProvider类的__init__方法中添加
import os
import requests

class AKShareProvider(BaseStockDataProvider):
    def __init__(self):
        super().__init__("AKShare")
        
        # 🔥 检查是否使用外部MyWind API
        self.mywind_api_url = os.getenv('MYWIND_API_URL')
        
        if self.mywind_api_url:
            # 使用外部MyWind API模式
            logger.info(f"🌐 使用外部MyWind API: {self.mywind_api_url}")
            self.use_external_api = True
            self.http_session = requests.Session()
            self.http_session.headers.update({
                'User-Agent': 'TradingAgents/1.0'
            })
            self.connected = True
        else:
            # 使用本地AKShare库（原有逻辑）
            logger.info("📦 使用本地AKShare库")
            self.use_external_api = False
            self._initialize_akshare()  # 原有代码
```

**然后修改所有数据获取方法**:

```python
async def get_stock_quotes(self, code: str):
    """获取实时行情（支持本地或外部API）"""
    if self.use_external_api:
        return await self._get_from_mywind_api('stock_bid_ask_em', {'symbol': code})
    else:
        return await self._get_quotes_from_akshare(code)  # 原有代码

async def _get_from_mywind_api(self, endpoint: str, params: dict):
    """从MyWind API获取数据的通用方法"""
    try:
        url = f"{self.mywind_api_url}/{endpoint}"
        response = await asyncio.to_thread(
            self.http_session.get, url, params=params, timeout=10
        )
        response.raise_for_status()
        
        # AKTools返回的是DataFrame的JSON格式
        data = response.json()
        # 转换为与原AKShare相同的格式
        return self._parse_aktools_response(data)
    except Exception as e:
        logger.error(f"❌ MyWind API请求失败: {e}")
        return None

def _parse_aktools_response(self, data):
    """解析AKTools响应为标准格式"""
    # 根据实际AKTools返回格式进行转换
    # 需要测试确认具体格式
    pass
```

**改造步骤**:
1. 备份原文件
2. 添加环境变量检测代码
3. 实现`_get_from_mywind_api`方法
4. 修改主要接口方法（20个左右）
5. 本地测试验证

**预期结果**: 
- 设置`MYWIND_API_URL`时使用外部API
- 未设置时保持原有行为（向后兼容）

**验收标准**: 
- 单元测试通过
- 手动测试确认两种模式都能正常工作

---

### Day 3: Docker镜像构建

#### Task 3.1: 构建MyWind Docker镜像（优先级：P0）

**创建文件**: `/anti/mywind/Dockerfile.mywind`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装AKTools和AKShare
RUN pip install --no-cache-dir \
    aktools==0.0.90 \
    akshare==1.18.7 \
    uvicorn

# 创建自定义启动脚本
COPY run_aktools.py .

# 暴露端口
EXPOSE 8888

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8888/ || exit 1

# 启动命令
CMD ["python", "run_aktools.py"]
```

**创建文件**: `/anti/mywind/run_aktools.py`

```python
#!/usr/bin/env python
"""
MyWind AKTools 自定义启动脚本
修改默认端口为8888，绑定0.0.0.0允许外部访问
"""
import uvicorn
from aktools.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",  # 允许外部访问
        port=8888,       # MyWind专用端口
        log_level="info",
        access_log=True
    )
```

**构建命令**:
```bash
cd /anti/mywind
docker build -t williamaoayers/mywind-aktools:latest -f Dockerfile.mywind .
docker push williamaoayers/mywind-aktools:latest
```

---

#### Task 3.2: 构建TradingAgents Docker镜像（优先级：P0）

**前置条件**: Task 1.2完成，代码已改造

**创建/更新**: `/anti/mywind/TradingAgents-arm32/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露Web UI端口
EXPOSE 8501

# 启动命令
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

**构建命令**:
```bash
cd /anti/mywind/TradingAgents-arm32
docker build -t williamaoayers/tradingagents-mywind:latest .
docker push williamaoayers/tradingagents-mywind:latest
```

---

### Day 4-5: 部署脚本开发

#### Task 4.1: 单机部署方案文件（优先级：P1）

**创建目录结构**:
```
mywind-all-in-one/
├── docker-compose.yml
├── start.sh
├── start.bat
└── README.md
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  mywind:
    image: williamaoayers/mywind-aktools:latest
    container_name: mywind
    ports:
      - "8888:8888"
    environment:
      - TZ=Asia/Shanghai
    restart: always
    networks:
      - mywind-net

  tradingagents:
    image: williamaoayers/tradingagents-mywind:latest
    container_name: tradingagents
    ports:
      - "8501:8501"
    environment:
      - MYWIND_API_URL=http://mywind:8888/api/public
      - TZ=Asia/Shanghai
    depends_on:
      - mywind
    restart: always
    networks:
      - mywind-net

networks:
  mywind-net:
    driver: bridge
```

**打包发布**:
```bash
zip -r mywind-all-in-one-v1.0.zip mywind-all-in-one/
```

---

#### Task 4.2: 分离部署方案文件（优先级：P1）

**MyWind服务端**:

创建 `mywind-server/docker-compose.yml`:
```yaml
version: '3.8'

services:
  mywind:
    image: williamaoayers/mywind-aktools:latest
    container_name: mywind
    ports:
      - "8888:8888"
    environment:
      - TZ=Asia/Shanghai
    restart: unless-stopped
```

创建 `mywind-server/install.sh`:
```bash
#!/bin/bash
echo "🚀 部署MyWind数据中心..."
docker-compose up -d
echo "✅ 部署完成！"
echo "📡 API地址: http://$(curl -s ifconfig.me):8888"
echo ""
echo "⚠️  请确保防火墙开放8888端口："
echo "   sudo ufw allow 8888"
```

**TradingAgents客户端**:

创建 `tradingagents-client/docker-compose.yml`:
```yaml
version: '3.8'

services:
  tradingagents:
    image: williamaoayers/tradingagents-mywind:latest
    container_name: tradingagents
    ports:
      - "8501:8501"
    environment:
      - MYWIND_API_URL=http://YOUR_MYWIND_IP:8888/api/public
      - TZ=Asia/Shanghai
    restart: unless-stopped
```

创建 `tradingagents-client/install.sh`:
```bash
#!/bin/bash
echo "🚀 部署TradingAgents..."
read -p "请输入MyWind服务器IP: " MYWIND_IP

# 下载配置
curl -fsSL https://raw.githubusercontent.com/williamaoayers/tradingagents/main/docker-compose.yml -o docker-compose.yml

# 替换IP
sed -i "s/YOUR_MYWIND_IP/$MYWIND_IP/g" docker-compose.yml

# 启动
docker-compose up -d

echo "✅ 部署完成！访问: http://localhost:8501"
```

---

### Day 6: 测试验证

#### Task 6.1: 单机部署测试（优先级：P0）

**测试环境**: 
- 本地Mac/Windows
- 云服务器（Ubuntu 22.04）

**测试步骤**:
1. 解压 `mywind-all-in-one-v1.0.zip`
2. 运行启动脚本
3. 等待服务初始化（约30秒）
4. 访问 http://localhost:8501
5. 测试核心功能：
   - 股票查询
   - 数据刷新
   - AI分析
6. 检查日志是否有错误
7. 测试重启和恢复

**预期结果**:
- 一键启动成功率 100%
- 所有功能正常
- 无报错日志

---

#### Task 6.2: 分离部署测试（优先级：P0）

**测试环境**:
- 服务端：阿里云VPS（2核4G）
- 客户端1：本地Mac
- 客户端2：群晖NAS（模拟）

**测试步骤**:

**服务端部署**:
```bash
# 在VPS上
ssh root@your-vps
cd /opt
git clone https://github.com/williamaoayers/mywind.git
cd mywind/mywind-server
./install.sh
# 记录API地址: http://123.45.67.89:8888
```

**客户端部署**:
```bash
# 在本地Mac
cd ~/Desktop
mkdir tradingagents && cd tradingagents
curl -fsSL https://xxx/install.sh -o install.sh
chmod +x install.sh
./install.sh
# 输入: 123.45.67.89
```

**测试项目**:
- [ ] 服务端API可访问
- [ ] 客户端能连接服务端
- [ ] 数据正常获取
- [ ] 多客户端同时连接测试
- [ ] 网络中断恢复测试

---

### Day 7: 文档和发布

#### Task 7.1: 完善文档（优先级：P0）

**需要的文档**:
1. **快速开始指南** (`QUICKSTART.md`)
   - 5分钟快速体验
   - 常见问题FAQ
   
2. **部署指南** (`DEPLOYMENT.md`)
   - 单机部署详细步骤
   - 分离部署详细步骤
   - 故障排查
   
3. **API文档** (`API.md`)
   - MyWind API使用说明
   - 接口列表和示例
   - 环境变量配置

4. **开发者文档** (`DEVELOPMENT.md`)
   - 架构说明
   - 如何修改和扩展
   - 如何贡献代码

---

#### Task 7.2: GitHub发布（优先级：P1）

**MyWind仓库**:
```bash
cd /anti/mywind
git add .
git commit -m "feat: add AKTools-based deployment solution"
git tag v1.0.0
git push origin main --tags
```

**发布内容**:
- Release Notes
- 部署包下载链接
- 文档链接
- 更新日志

**TradingAgents仓库**:
```bash
cd /anti/mywind/TradingAgents-arm32
git add .
git commit -m "feat: support external MyWind API via MYWIND_API_URL"
git tag v2.0.0-mywind
git push origin main --tags
```

---

## 📋 详细任务清单

### Phase 1: 准备与验证（Day 1-2）
- [ ] 本地安装并测试aktools
- [ ] 记录API响应格式
- [ ] 备份TradingAgents原代码
- [ ] 修改akshare.py添加环境变量支持
- [ ] 实现HTTP请求转发逻辑
- [ ] 本地测试两种模式（本地/外部）
- [ ] 编写单元测试
- [ ] 创建测试报告

### Phase 2: Docker构建（Day 3）
- [ ] 编写Dockerfile.mywind
- [ ] 编写run_aktools.py
- [ ] 本地构建测试MyWind镜像
- [ ] 推送MyWind镜像到Docker Hub
- [ ] 编写/更新TradingAgents Dockerfile
- [ ] 构建TradingAgents镜像
- [ ] 推送TradingAgents镜像

### Phase 3: 部署方案（Day 4-5）
- [ ] 创建单机部署docker-compose.yml
- [ ] 编写start.sh和start.bat
- [ ] 编写单机部署README
- [ ] 打包mywind-all-in-one.zip
- [ ] 创建服务端部署文件
- [ ] 创建客户端部署文件
- [ ] 编写install.sh脚本
- [ ] 测试自动化脚本

### Phase 4: 测试（Day 6）
- [ ] 单机部署测试（本地）
- [ ] 单机部署测试（云服务器）
- [ ] 分离部署服务端测试
- [ ] 分离部署客户端测试
- [ ] 多客户端并发测试
- [ ] 故障恢复测试
- [ ] 性能压力测试
- [ ] 记录测试结果

### Phase 5: 文档和发布（Day 7）
- [ ] 编写QUICKSTART.md
- [ ] 编写DEPLOYMENT.md
- [ ] 编写API.md
- [ ] 编写DEVELOPMENT.md
- [ ] 更新主README
- [ ] 准备Release Notes
- [ ] 创建GitHub Release
- [ ] 发布到Docker Hub
- [ ] 社区宣传

---

## 🎯 关键里程碑

| 里程碑 | 时间点 | 验收标准 |
|--------|--------|----------|
| M1: 本地验证完成 | Day 2 | AKTools正常运行，TradingAgents代码改造完成并测试通过 |
| M2: Docker镜像就绪 | Day 3 | 两个镜像成功构建并推送到Docker Hub |
| M3: 部署包完成 | Day 5 | 单机和分离部署包完成，脚本可用 |
| M4: 测试通过 | Day 6 | 所有测试场景验证通过，无重大bug |
| M5: 正式发布 | Day 7 | 文档完善，GitHub Release发布 |

---

## ⚠️ 风险和应对

### 风险1: AKTools响应格式不兼容
**影响**: TradingAgents无法正确解析数据  
**应对**: 
- 提前测试记录所有接口的响应格式
- 编写格式转换层
- 如果差异太大，考虑在MyWind层做适配

### 风险2: 性能问题
**影响**: 多用户并发时响应慢  
**应对**:
- 添加Nginx缓存层
- 增加MyWind服务器配置
- 实施限流策略

### 风险3: Docker镜像体积过大
**影响**: 下载和启动速度慢  
**应对**:
- 使用slim基础镜像
- 多阶段构建
- 优化依赖项

### 风险4: 用户环境差异大
**影响**: 部署失败率高  
**应对**:
- 提供详细的环境检测脚本
- 完善故障排查文档
- 提供视频教程

---

## 📊 资源需求

### 人力资源
- 开发工程师: 1人（你）
- 测试工程师: 1人（可选）
- 文档工程师: 1人（可选）

### 硬件资源
- 开发机: 1台（Mac/PC，用于本地测试）
- 测试VPS: 1台（2核4G，用于服务端测试）
- Docker Hub账号: 免费版足够

### 时间资源
- 总工时: 约40-50小时
- 日历时间: 7天
- 可压缩至3-4天（如果全职投入）

---

## 📈 后续优化计划

### Phase 2功能（发布后1-2周）
- [ ] 添加监控告警（Prometheus + Grafana）
- [ ] 实施自动备份
- [ ] 性能优化和压力测试
- [ ] 支持HTTPS
- [ ] 添加认证机制

### Phase 3功能（发布后1个月）
- [ ] Web管理界面
- [ ] 多租户支持
- [ ] API使用统计
- [ ] 自动更新机制
- [ ] 高可用部署方案

---

## ✅ 成功标准

项目成功的标志：
1. ✅ MyWind服务稳定运行超过7天，可用性>99%
2. ✅ 至少3个真实用户成功部署并使用
3. ✅ GitHub Star数>50
4. ✅ Docker Hub下载量>100
5. ✅ 无严重bug报告

---

**制定人**: AI Assistant  
**审批人**: William Aoayers  
**版本**: v1.0  
**下一次review**: Phase 1完成后
