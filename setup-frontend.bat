@echo off
chcp 65001 >nul
set "NODE_DIR=D:\王一岁\工作\CodeBuddy\node-v20.18.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ========= 安装前端依赖 =========
cd /d "%~dp0frontend"
call npm install
echo.
echo 前端依赖安装完成！
echo ========= 启动前端开发服务器 =========
npx vite --host --port 5173
pause
