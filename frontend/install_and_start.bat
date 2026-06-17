@echo off
set PATH=C:\Users\王一岁\.workbuddy\binaries\node\versions\20.18.0.installing.17360.__extract_temp__\node-v20.18.0-win-x64;%PATH%
cd /d c:\Users\王一岁\CodeBuddy\测试\unified-user-management\frontend
echo Installing dependencies...
call npm install
echo Starting Vite dev server...
call npx vite --host 0.0.0.0 --port 5173
pause
