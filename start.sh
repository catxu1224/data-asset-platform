#!/bin/bash

echo "========================================"
echo "  Data Asset Platform - 启动脚本"
echo "========================================"
echo ""

# 启动后端
echo "[1/2] 启动后端服务器..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "[2/2] 启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  服务已启动！"
echo "========================================"
echo ""
echo "  前端：http://localhost:5173"
echo "  后端：http://localhost:3000"
echo "  API:   http://localhost:3000/api"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待进程
wait
