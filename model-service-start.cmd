@echo off
setlocal
set "CONDA_PYTHON=D:\aconda\envs\YOLO\python.exe"
set "MODEL_DIR=e:\my-react-workspace\cotton-recognition-assistant\services\backend\model-service-python"
set "CUDA_VISIBLE_DEVICES=0"
set "LOG_FILE=e:\my-react-workspace\cotton-recognition-assistant\services\backend\model-service-python\model-service.log"
echo [%date% %time%] Starting model service... >> "%LOG_FILE%" 2>&1
if not exist "%CONDA_PYTHON%" (
  echo [ERROR] conda python not found: %CONDA_PYTHON%
  echo         check conda env YOLO, or edit CONDA_PYTHON in this script
  pause
  exit /b 1
)
if not exist "%MODEL_DIR%\model_service2.py" (
  echo [ERROR] model_service2.py not found: %MODEL_DIR%\model_service2.py
  pause
  exit /b 1
)
echo ============================================================
echo  Model service starting on port 5000   [Ctrl+C to stop]
echo    python : %CONDA_PYTHON%
echo    log    : %LOG_FILE%
echo ============================================================
"%CONDA_PYTHON%" "%MODEL_DIR%\model_service2.py" >> "%LOG_FILE%" 2>&1
echo.
echo [exited] last log lines:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath '%LOG_FILE%' -Tail 20"
pause
