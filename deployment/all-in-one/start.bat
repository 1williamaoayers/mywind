@echo off
REM MyWind + TradingAgents 一键启动脚本 (Windows)
REM 作者: William Aoayers
REM 日期: 2026-01-06

echo ==========================================
echo   MyWind + TradingAgents 一键部署
echo ==========================================
echo.

REM 检查Docker是否运行
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Docker未运行
    echo 请先启动Docker Desktop
    pause
    exit /b 1
)

echo ✅ Docker环境检查通过
echo.

REM 停止旧容器（如果存在）
echo 🧹 清理旧容器...
docker compose down 2>nul
echo.

REM 拉取最新镜像
echo 📥 拉取最新镜像...
docker compose pull
echo.

REM 启动服务
echo 🚀 启动服务...
docker compose up -d
echo.

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 10 /nobreak >nul
echo.

REM 检查服务状态
echo 📊 服务状态:
docker compose ps
echo.

REM 成功提示
echo ==========================================
echo ✅ 部署成功！
echo ==========================================
echo.
echo 🌐 访问地址:
echo    TradingAgents: http://localhost:8501
echo    MyWind API:    http://localhost:8888
echo    API文档:       http://localhost:8888/docs
echo.
echo 📝 常用命令:
echo    查看日志: docker compose logs -f
echo    停止服务: docker compose stop
echo    重启服务: docker compose restart
echo    删除服务: docker compose down
echo.
echo ❓ 遇到问题？查看 README.md
echo ==========================================
echo.
pause
