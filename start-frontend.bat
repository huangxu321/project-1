@echo off
chcp 65001 >nul
set "NODE_DIR=C:\Users\王一岁\.workbuddy\binaries\node\versions\20.18.0.installing.17360.__extract_temp__\node-v20.18.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ========= 启动前端服务 (:3000) =========
cd /d "C:\Users\王一岁\CodeBuddy\测试\unified-user-management"
npx vite --host
pause
