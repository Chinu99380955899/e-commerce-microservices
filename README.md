# AuraMart — E-commerce Microservices

Event-driven e-commerce platform with an AI shopping assistant, designed for **10,000 requests/second**.

## Tech stack
| Area | Technologies |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Cloud Gateway, OpenFeign, Spring Security (JWT) |
| Data | PostgreSQL + pgvector, MySQL, MongoDB, Redis |
| Messaging | Apache Kafka (saga, outbox, DLT) |
| AI | Spring AI, Google Gemini, RAG, tool calling, SSE streaming |
| Frontend | React, TypeScript, Tailwind CSS |
| DevOps | Docker Compose, GitHub Actions, AWS (EC2, S3, IAM), Kibana, Grafana |

## Services
| Service | Port | Status |
|---|---|---|
| api-gateway | 8080 | ⏳ planned |
| auth-service | 8081 | ⏳ planned |
| catalog-service | 8082 | ⏳ planned |
| order-service | 8083 | ⏳ planned |
| inventory-service | 8084 | ⏳ planned |
| payment-service | 8085 | ⏳ planned |
| ai-assistant-service | 8086 | ⏳ planned |
| notification-service | 8087 | ⏳ planned |

## Prerequisites
- JDK 21
- Docker Desktop
- Node.js 20+
- IntelliJ IDEA (bundled Maven)

## How to run
```bash
# Backend (from IntelliJ Maven window: AuraMart → Lifecycle → verify)

# Frontend (demo mode, no backend needed)
cd frontend
npm install
npm run dev
```

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [System design (10k RPS)](docs/SYSTEM_DESIGN.md)
- [Build guide](docs/BUILD_GUIDE.md)
- [Architecture decision records](docs/adr/)

## Git workflow
- `main` is protected; every change goes through a pull request
- Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org)
