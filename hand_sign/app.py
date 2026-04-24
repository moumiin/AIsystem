"""
수화 학습 웹 서비스

실행:
  C:\\Python311\\python.exe app.py

접속:
  http://localhost:8000
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="수화 학습 서비스")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "frontend", "static")), name="static")

@app.get("/")
def index():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "index.html"))

if __name__ == "__main__":
    print("\n수화 학습 시작!")
    print("📌 브라우저에서 열기: http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
