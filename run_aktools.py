#!/usr/bin/env python
"""
MyWind AKTools 自定义启动脚本
修改默认端口为8888，绑定0.0.0.0允许外部访问
"""
import uvicorn
from aktools.main import app

if __name__ == "__main__":
    print("🚀 启动MyWind AKTools服务...")
    print("📡 监听地址: 0.0.0.0:8888")
    print("📖 API文档: http://localhost:8888/docs")
    print("")
    
    uvicorn.run(
        app,
        host="0.0.0.0",  # 允许外部访问
        port=8888,       # MyWind专用端口
        log_level="info",
        access_log=True
    )
