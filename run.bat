@echo off
chcp 65001 >nul
cd /d %~dp0
where python >nul 2>nul
if %errorlevel%==0 (set PY=python) else (set PY=C:\Python314\python.exe)
echo 启动心象宫殿 http://127.0.0.1:8000/index.html
start "" http://127.0.0.1:8000/index.html
%PY% -m http.server 8000
pause
