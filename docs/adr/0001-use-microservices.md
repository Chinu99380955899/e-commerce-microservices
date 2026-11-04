# ADR-0001: Use a microservices architecture

- **Status:** Accepted
- **Date:** 2026-11-04

## Context
AuraMart must handle 10,000 RPS at peak with 99.9% availability.
The workloads are very different:
- Browsing/search: ~70% of traffic, read-heavy, cacheable
- Checkout: low volume, but must be strongly consistent (stock, payment)
- AI assistant: slow, expensive external LLM calls

They also need different data stores: relational (orders), vectors (AI),
documents (notifications), key-value (cart, cache).
A goal of the project is also to learn and demonstrate distributed-system patterns.

## Decision
Split the system into 8 services by business capability (gateway, auth, catalog,
inventory, order, payment, notification, ai-assistant). Each service owns its own
database. Services talk synchronously via REST/Feign for queries and
asynchronously via Kafka events for workflows (checkout saga).

## Alternatives considered
| Option | Pros | Cons |
|---|---|---|
| Monolith | Simple to build, test, deploy; local transactions | Scales as one unit; one slow part (AI) can hurt checkout; one DB for all data shapes |
| Modular monolith | Clear module boundaries, still simple ops | Still one deployable and one scaling unit; less to learn about distributed systems |
| **Microservices** | Scale each service on its own; failures isolated; right DB per job; independent deploys | Operational complexity; no cross-service transactions; harder debugging |

## Consequences
**Positive**
- Catalog can run 8 pods while payment runs 2 (scale where the load is)
- An LLM outage only disables the assistant; shopping and checkout keep working
- Each service uses the best-fit store (Postgres, MySQL, MongoDB, Redis, pgvector)

**Negative → mitigation**
- No ACID across services → saga with compensation + transactional outbox (ADR to follow)
- Network calls can fail → timeouts, retries, circuit breakers (Resilience4j)
- Hard to debug one request across services → request IDs + OpenTelemetry tracing + Kibana
- Many moving parts locally → one-command Docker Compose
- Duplicate boilerplate → shared `common-lib` (kept small)
