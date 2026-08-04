@echo off
echo =======================================================
echo          SecurePass Local Setup ^& Runner
echo =======================================================

echo.
echo [*] Installing dependencies...
pip install -r requirements.txt

echo.
echo [*] Starting SecurePass...
python app.py

pause
