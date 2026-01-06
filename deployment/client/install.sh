#!/bin/bash

# TradingAgents 客户端一键部署脚本
# 适用于: 本地电脑/NAS/树莓派

set -e

echo "=========================================="
echo "  TradingAgents - 客户端部署"
echo "=========================================="
echo ""

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到Docker"
    echo "请先安装Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未检测到Docker Compose"
    exit 1
fi

echo "✅ Docker环境检查通过"
echo ""

# 询问MyWind服务器地址
read -p "请输入MyWind服务器IP地址或域名: " MYWIND_IP

if [ -z "$MYWIND_IP" ]; then
    echo "❌ 错误: IP地址不能为空"
    exit 1
fi

echo ""
echo "📝 配置信息:"
echo "   MyWind API: http://${MYWIND_IP}:8888/api/public"
echo ""

# 确认
read -p "确认以上配置是否正确? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消部署"
    exit 1
fi

# 替换docker-compose.yml中的IP
sed -i.bak "s/YOUR_MYWIND_IP/${MYWIND_IP}/g" docker-compose.yml

# 测试连接
echo ""
echo "🔍 测试MyWind服务器连接..."
if curl -s --connect-timeout 5 "http://${MYWIND_IP}:8888/" > /dev/null; then
    echo "✅ MyWind服务器连接成功"
else
    echo "⚠️  警告: 无法连接到MyWind服务器"
    echo "   请检查: "
    echo "   1. IP地址是否正确"
    echo "   2. MyWind服务是否已启动"
    echo "   3. 防火墙是否已开放8888端口"
    echo ""
    read -p "是否继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        # 恢复备份
        mv docker-compose.yml.bak docker-compose.yml
        exit 1
    fi
fi

# 停止旧容器
echo ""
echo "🧹 清理旧容器..."
docker compose down 2>/dev/null || true

# 拉取最新镜像
echo "📥 拉取最新镜像..."
docker compose pull

# 启动服务
echo "🚀 启动TradingAgents..."
docker compose up -d

# 等待启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查状态
echo "📊 服务状态:"
docker compose ps

# 成功提示
echo ""
echo "=========================================="
echo "✅ TradingAgents客户端部署成功！"
echo "=========================================="
echo ""
echo "🌐 访问地址: http://localhost:8501"
echo ""
echo "📝 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   停止服务: docker compose stop"
echo "   重启服务: docker compose restart"
echo ""
echo "❓ 如果TradingAgents无法获取数据:"
echo "   1. 检查MyWind服务是否正常"
echo "   2. 访问 http://${MYWIND_IP}:8888/docs 测试API"
echo "   3. 查看日志: docker compose logs tradingagents"
echo "=========================================="

# 清理备份文件
rm -f docker-compose.yml.bak
