#!/usr/bin/env python
"""
MyWind AKTools 启动脚本
强制绑定 0.0.0.0 以允许外部访问
"""
import subprocess
import sys

# 使用环境变量覆盖aktools默认的127.0.0.1绑定
# aktools内部使用uvicorn，可以通过环境变量控制
import os
os.environ['HOST'] = '0.0.0.0'
os.environ['PORT'] = '8080'

# 直接运行aktools模块
subprocess.run([sys.executable, '-m', 'aktools', '--host', '0.0.0.0', '--port', '8080'])
