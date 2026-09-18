@echo off
set "CONDA_PYTHON=D:\aconda\envs\YOLO\python.exe"
set "MODEL_DIR=e:\my-react-workspace\cotton-recognition-assistant\services\backend\model-service-python"
set "CUDA_VISIBLE_DEVICES=0"
set "LOG_FILE=e:\my-react-workspace\cotton-recognition-assistant\services\backend\model-service-python\model-service.log"
echo [%date% %time%] Starting model service... >> "%%LOG_FILE%%" 2>&1
"%%CONDA_PYTHON%%" "%%MODEL_DIR%%\model_service2.py" >> "%%LOG_FILE%%" 2>&1
