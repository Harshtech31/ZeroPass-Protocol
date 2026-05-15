# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Optimization: Use a cache mount for pip to speed up re-installs
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*
RUN groupadd -r zeropass && useradd -r -g zeropass zeropass

COPY --from=builder /install /usr/local
COPY . .
RUN chown -R zeropass:zeropass /app

USER zeropass
EXPOSE 8000

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
