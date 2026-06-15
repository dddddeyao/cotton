FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY model_service2.py ./
COPY unet.py ./

EXPOSE 5000

CMD ["gunicorn", "-w", "1", "-k", "gthread", "-t", "180", "-b", "0.0.0.0:5000", "model_service2:app"]
