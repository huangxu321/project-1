@echo off
chcp 65001 >nul
set "NODE_DIR=C:\Users\王一岁\.workbuddy\binaries\node\versions\20.18.0.installing.17360.__extract_temp__\node-v20.18.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ========================================
echo    正在将项目复制到 D 盘，请稍候...
echo ========================================

mkdir D:\unified-user-management 2>nul

echo 复制项目文件...
xcopy "C:\Users\王一岁\CodeBuddy\测试\unified-user-management" "D:\unified-user-management" /E /I /H /Y /Q

echo.
echo ========================================
echo    复制完成！正在创建启动脚本...
echo ========================================

REM 创建 D 盘的后端启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo set "NODE_DIR=C:\Users\王一岁\.workbuddy\binaries\node\versions\20.18.0.installing.17360.__extract_temp__\node-v20.18.0-win-x64"
echo set "PATH=%%NODE_DIR%%;%%PATH%%"
echo.
echo echo ========= 启动后端服务 ^(:3890^) =========
echo cd /d "D:\unified-user-management\server"
echo node src/app.js
echo pause
) > "D:\unified-user-management\启动后端.bat"

REM 创建 D 盘的前端启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo set "NODE_DIR=C:\Users\王一岁\.workbuddy\binaries\node\versions\20.18.0.installing.17360.__extract_temp__\node-v20.18.0-win-x64"
echo set "PATH=%%NODE_DIR%%;%%PATH%%"
echo.
echo echo ========= 启动前端服务 ^(:3000^) =========
echo cd /d "D:\unified-user-management"
echo npx vite --host
echo pause
) > "D:\unified-user-management\启动前端.bat"

echo.
echo ===== 搞定！ =====
echo 项目已复制到: D:\unified-user-management
echo 启动方式:
echo   1. 双击 D:\unified-user-management\启动后端.bat
echo   2. 双击 D:\unified-user-management\启动前端.bat
echo   3. 浏览器打开 http://localhost:3000
echo.
pause
