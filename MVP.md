# MVP Architecture Diagram — Passwordless Authentication Platform

## Project Goal

Build a secure passwordless authentication platform using:

- WebAuthn / FIDO2
- JWT Authentication
- FastAPI Backend
- PostgreSQL
- Redis
- C++ Security Engine
- Docker Deployment
- Monitoring + Logging

This MVP focuses on:

- Secure passwordless login
- Device trust management
- Audit logging
- API security
- Session management
- Monitoring

---

# 1. High-Level MVP Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser / Mobile App                                        │
│  - Next.js Frontend                                          │
│  - Tailwind UI                                               │
│  - WebAuthn APIs                                             │
│  - Passkey/Biometrics                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS + TLS 1.3
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY LAYER                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  NGINX                                                       │
│  - TLS termination                                           │
│  - Reverse proxy                                             │
│  - Rate limiting                                             │
│  - Request filtering                                         │
│  - Security headers                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Core Modules:                                               │
│                                                              │
│  1. Authentication Module                                    │
│     - WebAuthn registration                                  │
│     - WebAuthn login                                         │
│     - JWT issuing                                            │
│     - Refresh tokens                                         │
│                                                              │
│  2. User Management Module                                   │
│     - User profiles                                          │
│     - Trusted devices                                        │
│     - Account recovery                                       │
│                                                              │
│  3. Security Module                                          │
│     - RBAC                                                   │
│     - API validation                                         │
│     - Threat checks                                          │
│                                                              │
│  4. Audit Logging Module                                     │
│     - Login tracking                                         │
│     - Device tracking                                        │
│     - Security events                                        │
│                                                              │
│  5. Monitoring Module                                        │
│     - Metrics                                                │
│     - Health checks                                          │
│     - Alerts                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
              │                     │                     │
              │                     │                     │
              ▼                     ▼                     ▼
┌─────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│  PostgreSQL     │   │       Redis          │   │ C++ Security     │
│                 │   │                      │   │ Engine            │
├─────────────────┤   ├──────────────────────┤   ├──────────────────┤
│ Users           │   │ Session Cache        │   │ JWT Validation    │
│ Devices         │   │ WebAuthn Challenges  │   │ Signature Verify  │
│ Credentials     │   │ Rate Limiting        │   │ Risk Scoring      │
│ Audit Logs      │   │ Temporary Tokens     │   │ Threat Analysis   │
│ Roles           │   │ OTP Storage          │   │ Crypto Operations │
│ Sessions        │   │                      │   │                   │
└─────────────────┘   └──────────────────────┘   └──────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  MONITORING + OBSERVABILITY                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Prometheus                                                  │
│  - Metrics collection                                        │
│                                                              │
│  Grafana                                                     │
│  - Dashboards                                                │
│  - Visualization                                             │
│                                                              │
│  Loki                                                        │
│  - Centralized logging                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 2. Authentication Flow Diagram

## User Registration Flow

```text
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ Enter Email
     ▼
┌──────────────┐
│ Frontend UI  │
└────┬─────────┘
     │
     │ Request WebAuthn Challenge
     ▼
┌──────────────┐
│ FastAPI API  │
└────┬─────────┘
     │
     │ Generate Challenge
     ▼
┌──────────────┐
│ Redis Cache  │
└────┬─────────┘
     │
     │ Return Challenge
     ▼
┌──────────────┐
│ Browser      │
│ WebAuthn API │
└────┬─────────┘
     │
     │ Create Passkey
     ▼
┌──────────────┐
│ Authenticator│
│ Face/Finger  │
└────┬─────────┘
     │
     │ Public Key + Signature
     ▼
┌──────────────┐
│ FastAPI API  │
└────┬─────────┘
     │
     │ Verify Signature
     ▼
┌──────────────┐
│ C++ Engine   │
└────┬─────────┘
     │
     │ Valid
     ▼
┌──────────────┐
│ PostgreSQL   │
│ Store Device │
└──────────────┘
```

---

# 3. Login Flow Diagram

```text
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ Enter Email
     ▼
┌──────────────┐
│ Frontend UI  │
└────┬─────────┘
     │
     │ Request Login Challenge
     ▼
┌──────────────┐
│ FastAPI API  │
└────┬─────────┘
     │
     │ Generate Challenge
     ▼
┌──────────────┐
│ Redis Cache  │
└────┬─────────┘
     │
     │ Return Challenge
     ▼
┌──────────────┐
│ Browser      │
│ WebAuthn API │
└────┬─────────┘
     │
     │ Face ID / Fingerprint
     ▼
┌──────────────┐
│ Authenticator│
└────┬─────────┘
     │
     │ Signed Response
     ▼
┌──────────────┐
│ FastAPI API  │
└────┬─────────┘
     │
     │ Signature Verification
     ▼
┌──────────────┐
│ C++ Engine   │
└────┬─────────┘
     │
     │ Success
     ▼
┌──────────────┐
│ JWT Issued   │
└────┬─────────┘
     │
     │ Store Session
     ▼
┌──────────────┐
│ Redis Cache  │
└────┬─────────┘
     │
     │ Access Granted
     ▼
┌──────────────┐
│ Dashboard    │
└──────────────┘
```

---

# 4. Database Schema (MVP)

## Users Table

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| email      | VARCHAR   |
| created_at | TIMESTAMP |
| status     | VARCHAR   |

---

## Devices Table

| Field         | Type      |
| ------------- | --------- |
| id            | UUID      |
| user_id       | UUID      |
| credential_id | TEXT      |
| public_key    | TEXT      |
| device_name   | VARCHAR   |
| created_at    | TIMESTAMP |

---

## Sessions Table

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| user_id    | UUID      |
| jwt_id     | TEXT      |
| expires_at | TIMESTAMP |
| ip_address | VARCHAR   |

---

## Audit Logs Table

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| user_id    | UUID      |
| action     | VARCHAR   |
| risk_score | INTEGER   |
| timestamp  | TIMESTAMP |

---

# 5. Folder Structure

```text
project/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── auth/
│   └── utils/
│
├── backend/
│   ├── api/
│   ├── auth/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   ├── monitoring/
│   └── security/
│
├── cpp-security-engine/
│   ├── grpc/
│   ├── crypto/
│   ├── verification/
│   └── risk-analysis/
│
├── docker/
├── nginx/
├── monitoring/
├── scripts/
└── ci-cd/
```

---

# 6. Docker Architecture

```text
┌─────────────────────────────┐
│        Docker Network       │
├─────────────────────────────┤
│                             │
│  nginx-container            │
│  frontend-container         │
│  fastapi-container          │
│  cpp-engine-container       │
│  postgres-container         │
│  redis-container            │
│  grafana-container          │
│  prometheus-container       │
│  loki-container             │
│                             │
└─────────────────────────────┘
```

---

# 7. MVP Security Features

## Authentication Security

- WebAuthn
- Passkeys
- JWT
- Refresh Tokens
- Device Trust

---

## API Security

- TLS 1.3
- Input validation
- Rate limiting
- Request filtering
- RBAC

---

## Monitoring Security

- Audit logs
- Suspicious login detection
- Failed login tracking
- Metrics monitoring

---

# 8. MVP Deliverables

## Core Deliverables

### Frontend

- Login page
- Registration page
- Device management dashboard

### Backend

- WebAuthn registration APIs
- Login APIs
- JWT APIs
- Session APIs

### Infrastructure

- Docker setup
- NGINX reverse proxy
- PostgreSQL database
- Redis cache

### Monitoring

- Grafana dashboards
- API metrics
- Authentication logs

---

# 9. Recommended Development Order

## Phase 1

1. Setup frontend
2. Setup FastAPI
3. Setup PostgreSQL
4. Setup Redis
5. Implement WebAuthn registration

---

## Phase 2

6. Implement login flow
7. Add JWT authentication
8. Add audit logging
9. Add rate limiting

---

## Phase 3

10. Setup Docker
11. Setup NGINX
12. Setup monitoring stack
13. Add C++ engine integration

---

# 10. Final MVP Goal

The MVP should allow:

✅ Users to register using passkeys
✅ Passwordless login using biometrics
✅ JWT-based authenticated sessions
✅ Secure API access
✅ Device trust management
✅ Audit logging
✅ Monitoring dashboards
✅ Docker deployment
✅ Basic threat detection

This MVP is already strong enough for:

- hackathons
- college major projects
- cybersecurity portfolios
- startup MVPs
- authentication SaaS foundations
