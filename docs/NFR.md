# Non-Functional Requirements (NFRs)

Targets from [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) §2.2 and §3. Every phase is tested against these.
Fill in **Measured** during load testing (Build Guide, Phase 11.5) to show target vs actual.

## Targets
| # | Attribute | Target | Measured | How it's measured |
|---|---|---|---|---|
| N1 | Peak throughput | 10,000 RPS for 15 min | — | k6 peak test |
| N2 | Average throughput | 2,500 RPS | — | k6 baseline |
| N3 | Read latency | p50 < 50 ms, p99 < 300 ms | — | k6 + Grafana |
| N4 | Write latency | p99 < 800 ms | — | k6 + Grafana |
| N5 | AI first token | < 1.5 s | — | k6 SSE script |
| N6 | Availability | 99.9% (≈ 43 min/month downtime) | — | Prometheus uptime |
| N7 | Error rate at peak | < 0.1% | — | k6 |
| N8 | Order loss | 0 (RPO = 0) | — | chaos test, order count reconciliation |
| N9 | Recovery time | RTO < 15 min | — | failover drill |
| N10 | Overselling | 0 (exactly N sold for N in stock) | — | flash-sale test |
| N11 | Cache hit rate | > 90% | — | Redis / Micrometer metric |
| N12 | Order reaches final state | 99% within 10 s | — | saga metric |
| N13 | Kafka consumer lag | < 1,000 messages | — | Kafka lag exporter |

## Capacity assumptions
| Item | Value |
|---|---|
| Read : write ratio | 90 : 10 |
| Daily active users | 2 M |
| Orders / day | ≈ 2.6 M |
| Products | 1 M |
| Redis cache | ~2 GB |

## Consistency
- **Strong:** stock reservation, payment, order state
- **Eventual:** catalogue cache, search index, embeddings, notifications
