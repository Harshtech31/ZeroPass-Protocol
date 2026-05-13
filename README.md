# ZeroPass Protocol

A production-grade **passwordless authentication system** using WebAuthn/FIDO2, FastAPI, C++20, and Next.js.

## Architecture

```
React (Next.js) → FastAPI Gateway → C++ Security Engine (gRPC)
                         ↓
                  PostgreSQL + Redis
                         ↓
              Prometheus + Grafana (Monitoring)
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + SimpleWebAuthn |
| Backend | FastAPI (Python 3.12) |
| Security Engine | C++20 + gRPC + OpenSSL |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse Proxy | NGINX |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions |
| Deployment | Docker + Coolify |

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start all services
docker compose up --build

# 3. Access services
# Frontend:   http://localhost:3000
# API Docs:   http://localhost:8000/docs
# Grafana:    http://localhost:3001
# Prometheus: http://localhost:9090
```

## Authentication Flow

```
User → WebAuthn Challenge → FastAPI → C++ Signature Verification → JWT Issued → Redis Session → Access Granted
```

## Project Structure

```
├── frontend/              # Next.js app
├── backend/               # FastAPI app
│   ├── routers/           # API route handlers
│   ├── models/            # SQLAlchemy models
│   ├── services/          # Business logic
│   ├── db/                # Database setup
│   └── core/              # Config & utilities
├── cpp-security-engine/   # C++20 gRPC service
│   ├── src/               # Source files
│   └── proto/             # Protobuf definitions
├── nginx/                 # Reverse proxy config
├── docker/                # Dockerfiles
├── monitoring/            # Prometheus/Grafana configs
└── .github/workflows/     # CI/CD pipelines
```

## Security Features

- WebAuthn/FIDO2 passkey authentication
- C++ high-performance signature verification
- JWT with short expiry + Redis session management
- TLS 1.3 via NGINX
- Risk scoring per login request
- Automated security scanning (Bandit, Trivy)
