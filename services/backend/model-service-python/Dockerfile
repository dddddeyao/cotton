FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# ── 使用国内镜像源，避免国际网络慢 / 不可达导致构建卡死 ──
# Debian apt 源 → 清华镜像
RUN set -eux; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends libglib2.0-0 libgomp1; \
    rm -rf /var/lib/apt/lists/*

# PyPI 源（可用 --build-arg 覆盖）
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

COPY requirements.txt ./
RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} --trusted-host ${PIP_TRUSTED_HOST} -r requirements.txt

COPY model_service2.py ./
COPY unet.py ./

EXPOSE 5000

CMD ["gunicorn", "-w", "1", "-k", "gthread", "-t", "180", "-b", "0.0.0.0:5000", "model_service2:app"]
