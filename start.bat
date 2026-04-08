@echo off
echo ========================================
echo   Data Asset Platform - 启动脚本
echo ========================================
echo.

REM 检查 PostgreSQL
echo [1/3] 检查 PostgreSQL 连接...
pg_isready -h %DB_HOST% -p %DB_PORT% 2>nul
if errorlevel 1 (
    echo [警告] PostgreSQL 可能未运行，请确保数据库已启动
) else (
    echo [OK] PostgreSQL 已连接
)

REM 启动后端
echo.
echo [2/3] 启动后端服务器...
start "Backend Server" cmd /k "cd server && node server.js"
timeout /t 3 /nobreak >nul

REM 启动前端
echo.
echo [3/3] 启动前端开发服务器...
start "Frontend Dev" cmd /k "npm run dev"

echo.
echo ========================================
echo   服务已启动！
echo ========================================
echo.
echo   前端：http://localhost:5173
echo   后端：http://localhost:3000
echo   API:   http://localhost:3000/api
echo.
echo 按任意键退出...
pause >nul
