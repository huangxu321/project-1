@echo off
chcp 65001 >nul
set "NODE_DIR=D:\王一岁\工作\CodeBuddy\node-v20.18.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ========= 安装后端依赖 =========
cd /d "%~dp0server"
call npm install
echo.
echo 后端依赖安装完成！
echo ========= 启动后端服务 =========
node src/app.js
pause
