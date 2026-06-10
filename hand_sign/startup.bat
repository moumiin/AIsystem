@echo off
chcp 65001 >nul
echo.
echo Starting Sign Language Service...
echo.

C:\Users\USER\AppData\Local\Programs\Python\Python311\python.exe -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing packages...
    C:\Users\USER\AppData\Local\Programs\Python\Python311\python.exe -m pip install fastapi "uvicorn[standard]" httpx python-dotenv -q
)

echo Server starting...
echo Browser: http://localhost:8000
echo.
C:\Users\USER\AppData\Local\Programs\Python\Python311\python.exe app.py
pause