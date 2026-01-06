# MyWind & TradingAgents 单机部署方案 (All-in-One)

> **方案类型**: 单机集成 (小白友好/个人使用)
> **核心思想**: 使用 Docker Compose 在同一台机器上同时启动 MyWind 数据服务和 TradingAgents 应用，两者通过内部网络直接通信。
> **适用场景**: 个人电脑、单台 VPS、初学者快速体验

---

## 📦 架构概览

```mermaid
graph LR
    subgraph "单台机器 (PC / VPS)"
        direction TB
        TA[TradingAgents] -->|内部网络 http://mywind:8888| M[MyWind (AKTools)]
        M -->|公网请求| INT[外部互联网 (东方财富等)]
    end
    User[用户浏览器] -->|访问 :8501| TA
```

---

## 🛠️ 部署文件 (`docker-compose.yml`)

这是核心配置文件，将两个服务编排在一起。

```yaml
version: '3.8'

services:
  # MyWind 数据服务 (基于 AKTools)
  mywind:
    image: williamaoayers/mywind-aktools:latest
    container_name: mywind
    ports:
      - "8888:8888"  # 暴露端口供调试 (可选)
    environment:
      - TZ=Asia/Shanghai
    restart: always
    networks:
      - mywind-net

  # TradingAgents 应用
  tradingagents:
    image: williamaoayers/tradingagents-mywind:latest
    container_name: tradingagents
    ports:
      - "8501:8501"  # Web 访问端口
    environment:
      # 🔥 关键配置：直接使用容器服务名 "mywind" 连接
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

---

## 🚀 一键启动脚本

我们可以为小白用户提供简单的启动脚本。

### Windows (`start.bat`)

```batch
@echo off
echo 🚀 正在启动 MyWind + TradingAgents ...
docker-compose up -d
echo.
echo ✅ 启动成功！
echo 📊 请在浏览器访问: http://localhost:8501
pause
```

### Linux / Mac (`start.sh`)

```bash
#!/bin/bash
echo "🚀 正在启动 MyWind + TradingAgents ..."
docker-compose up -d
echo
echo "✅ 启动成功！"
echo "📊 请在浏览器访问: http://localhost:8501"
```

---

## 📝 用户使用指南 (`README.md`)

```markdown
# MyWind + TradingAgents 一键整合包

## 简介
这是一个"开箱即用"的量化分析系统，包含了数据服务 (MyWind) 和 AI 分析终端 (TradingAgents)。

## 快速开始

### 1. 准备环境
确保电脑上安装了 **Docker** (Docker Desktop)。

### 2. 启动
*   **Windows**: 双击运行 `start.bat`
*   **Mac/Linux**: 在终端运行 `./start.sh`

### 3. 使用
等待约 30 秒服务初始化，然后打开浏览器访问：
http://localhost:8501

## 常见问题
*   **端口冲突**: 如果启动失败，可能是 8501 或 8888 端口被占用。请修改 `docker-compose.yml` 中的端口映射。
    *   例如改 `8501:8501` 为 `9000:8501`，访问地址变为 `http://localhost:9000`
*   **停止服务**: 在终端运行 `docker-compose down`
```

---

## ✅ 方案优势
1.  **极简部署**: 只有一个 `docker-compose.yml`，一键启动。
2.  **网络高效**: 服务间走 Docker 内部网络，延迟极低且安全。
3.  **零配置**: 用户不需要知道 IP 地址，不需要配置防火墙。
4.  **资源集中**: 适合在性能较好的个人 PC 或 Mac 上运行。

---

## 📋 开发者准备工作
为了让小白能用上这个方案，我们需要做的工作 (与分离部署方案复用镜像)：
1.  **构建镜像**: `williamaoayers/mywind-aktools:latest` 和 `williamaoayers/tradingagents-mywind:latest`。
2.  **打包文件**: 将上述 yaml 和脚本文件打包成 `mywind-all-in-one.zip` 发布。
