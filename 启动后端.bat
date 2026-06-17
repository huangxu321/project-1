@echo off
chcp 65001 >nul
set "NODE_DIR=D:\王一岁\工作\CodeBuddy\node-v20.18.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ========= 启动后端服务 (:3890) =========
cd /d "%~dp0server"
node src/app.js
pause
