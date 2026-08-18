@echo off
chcp 65001 > nul
echo ========================================================
echo   [Stock Asset Manager] 주식 자산관리 웹앱 실행 중...
echo ========================================================
echo.

start "" "http://localhost:3000"
python server/proxy.py

pause
