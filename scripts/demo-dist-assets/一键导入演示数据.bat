@echo off
setlocal EnableDelayedExpansion
title SCGP Demo Data Import

rem SCGP demo data one-click import: auto-quit check, auto backup, replace DB.
rem Run AFTER installing SCGP and closing it. Login: admin / admin123

set "TARGET_DIR=%APPDATA%\scgp"
set "TARGET_DB=%TARGET_DIR%\database.sqlite"
set "SOURCE_DB=%~dp0database.sqlite"

echo.
echo ============================================
echo   SCGP 演示数据一键导入
echo ============================================
echo.

if not exist "%SOURCE_DB%" (
    echo [错误] 未找到演示数据库文件 database.sqlite，请确保它与本脚本在同一文件夹内。
    goto :fail
)
echo [1/4] 已找到演示数据库文件

echo [2/4] 检查 SCGP 是否在运行 ...
rem 平铺 goto 结构：检测/等待循环不放括号块内（块内标签 + goto 语义脆弱）
tasklist /FI "IMAGENAME eq 星愿能力发展训练系统.exe" 2>nul | find /I "星愿能力发展训练系统.exe" >nul
if errorlevel 1 (
    echo        SCGP 未在运行
    goto :after_check
)
echo        检测到 SCGP 正在运行，正在自动退出 ...
taskkill /IM 星愿能力发展训练系统.exe /F >nul 2>&1
set /a wait=0
:wait_exit
timeout /t 1 /nobreak >nul
set /a wait+=1
tasklist /FI "IMAGENAME eq 星愿能力发展训练系统.exe" 2>nul | find /I "星愿能力发展训练系统.exe" >nul
if not errorlevel 1 if %wait% lss 10 goto :wait_exit
echo        已退出
:after_check

if not exist "%TARGET_DB%" (
    echo.
    echo [错误] 未找到 SCGP 数据库：%TARGET_DB%
    echo 请先安装 SCGP 应用并启动一次后关闭，再重新运行本脚本。
    goto :fail
)
if not exist "%TARGET_DIR%\backups" mkdir "%TARGET_DIR%\backups" >nul 2>&1
for /f "tokens=1-3 delims=/- " %%a in ("%date%") do set "dstamp=%%a%%b%%c"
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set "tstamp=%%a%%b"
set "tstamp=%tstamp: =0%"
set "BACKUP=%TARGET_DIR%\backups\database.sqlite.bak-%dstamp%-%tstamp%"
copy /Y "%TARGET_DB%" "%BACKUP%" >nul
if errorlevel 1 (
    echo [错误] 备份原数据库失败，已中止（未做任何修改）。
    goto :fail
)
echo [3/4] 原数据库已自动备份到：%BACKUP%

copy /Y "%SOURCE_DB%" "%TARGET_DB%" >nul
if errorlevel 1 (
    echo [错误] 演示数据库复制失败，正在恢复原库 ...
    copy /Y "%BACKUP%" "%TARGET_DB%" >nul
    goto :fail
)
echo [4/4] 演示数据已写入

echo.
echo ============================================
echo   导入完成！重新启动 SCGP 即可。
echo   登录账号：admin    密码：admin123
echo.
echo   如需恢复学校真实数据，把上面备份路径的文件
echo   复制回 %TARGET_DB% 即可（先退出 SCGP）。
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo 导入未完成，请按上方提示处理后重新运行本脚本。
echo.
pause
exit /b 1