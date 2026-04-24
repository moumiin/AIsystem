@echo off
echo.
echo  ^[^] 수화 학습 서비스 시작
echo.

:: 패키지 설치 확인
%LOCALAPPDATA%\Programs\Python\Python311\python.exe -c "import fastapi" 2>nul
if errorlevel 1 (
    echo  설치 중: fastapi, uvicorn...
    %LOCALAPPDATA%\Programs\Python\Python311\python.exe -m pip install fastapi "uvicorn[standard]" -q
)

echo  서버 시작 중...
echo  브라우저: http://localhost:8000
echo.
%LOCALAPPDATA%\Programs\Python\Python311\python.exe app.py
pause
