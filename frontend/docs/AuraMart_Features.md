# AuraMart — Features

Event-driven e-commerce platform with an AI shopping assistant.
Solo-developer learning project: Spring Boot microservices, Kafka sagas, Spring AI RAG + tool calling, React.

---

## Summary by phase

| Phase | Name | User features | Engineering features | Total |
|---|---|---:|---:|---:|
| 1 | Foundation | 3 | 5 | 8 |
| 2 | Edge & speed | 1 | 3 | 4 |
| 3 | Event-driven checkout | 6 | 5 | 11 |
| 4 | AI assistant | 5 | 2 | 7 |
| 5 | Frontend | 1 | 0 | 1 |
| 6 | Production polish | 1 | 2 | 3 |
| **Total** | | **17** | **17** | **34** |

---

## What users see

### Shopping

| Feature | Description / example | Service | Phase |
|---|---|---|:---:|
| Browse products | Browse by category with paging and sorting by name or price | Catalog | 1 |
| Keyword search | Typo-tolerant search: "hedphones" still finds headphones | Catalog | 2 |
| Semantic search | Understands meaning: "something to keep tea hot on a train" finds the steel flask | Catalog (pgvector) | 4 |
| Stock status | Product pages show price and in-stock / out-of-stock | Catalog | 1 |

### Cart & checkout

| Feature | Description / example | Service | Phase |
|---|---|---|:---:|
| Cart and ordering | Add to cart, change quantities, place an order | Order | 3 |
| Checkout flow | Reserves stock, runs a simulated payment, then confirms the order | Order, Catalog | 3 |
| Clean cancellation | If payment fails or stock runs out, the order is cancelled and reserved stock is returned | Order, Catalog | 3 |
| Order tracking | Order history and status: Pending, Confirmed, Cancelled | Order | 3 |

### AI shopping assistant

| Feature | Description / example | Service | Phase |
|---|---|---|:---:|
| Natural-language shopping | "Suggest earbuds under ₹5,000 for the gym" | AI assistant | 4 |
| Grounded answers (RAG) | Answers only from the real catalogue, so it doesn't invent products | AI assistant, Catalog | 4 |
| Order lookup (tool calling) | "Where is my order?" triggers a tool call to the Order service | AI assistant, Order | 4 |
| Conversation memory | Remembers earlier messages, so "show me a cheaper one" makes sense | AI assistant | 4 |
| Streaming replies | Replies appear word by word in the chat panel | AI assistant, Frontend | 5 |

### Notifications

| Feature | Description / example | Service | Phase |
|---|---|---|:---:|
| Order notifications | Confirmation and cancellation messages, logged or emailed | Notification | 3 |

### Admin

| Feature | Description / example | Service | Phase |
|---|---|---|:---:|
| Product management | Create, update and deactivate products via API or Swagger UI | Catalog | 1 |
| Kafka monitoring | See topics, messages and failed (DLT) events in Kafka UI | Infrastructure | 3 |
| Health and tracing dashboards | Service health, request rates and traces in Grafana | All services | 6 |

---

## Engineering features (for your CV and interviews)

| Feature | What it shows you can do | Service(s) | Phase |
|---|---|---|:---:|
| Microservices, one database each | Split a system by business area | All services | 1 |
| API Gateway as single entry point | Routing, CORS, security at the edge | API Gateway | 2 |
| Kafka events with orderId as partition key | Keep events in order, process in parallel | Order, Kafka | 3 |
| Saga with compensation | Distributed transactions without 2-phase commit | Order, Catalog | 3 |
| Transactional outbox | Never lose an event when the database commits | Order | 3 |
| Retries with backoff + Dead Letter Topic | Handle failures without blocking the queue | Notification | 3 |
| Idempotent consumers | Safely handle duplicate messages | Notification, Catalog | 3 |
| Optimistic locking on stock | Prevent overselling under concurrent orders | Catalog | 1 |
| Redis cache with eviction | Faster reads, correct invalidation | Catalog | 2 |
| RAG with pgvector | AI grounded in your own data | AI assistant, Catalog | 4 |
| LLM tool calling | AI that takes real actions through APIs | AI assistant | 4 |
| Standard error responses (RFC 9457) | Clean, consistent API design | All services | 1 |
| Flyway migrations | Safe, versioned schema changes | All services | 1 |
| Testcontainers integration tests | Testing against real infrastructure | All services | 2 |
| Distributed tracing with OpenTelemetry | Follow one request across services | All services | 6 |
| Kubernetes deployment with autoscaling | Run and scale it like production | All services | 6 |
| Architecture Decision Records | Explain trade-offs the way senior engineers do | docs/adr | 1 |

---

## Interview story: one scenario that shows every major skill

| Step | What happens | Service(s) | Skill shown |
|:---:|---|---|---|
| 1 | User asks the AI assistant for a laptop bag | AI assistant | Natural-language chat |
| 2 | Assistant finds one through semantic search | AI assistant, Catalog | RAG, pgvector, tool calling |
| 3 | User orders it; the order event goes through Kafka | Order, Kafka | Outbox, partition keys |
| 4 | Stock is reserved with optimistic locking | Catalog | Optimistic locking, saga |
| 5 | Payment fails, so the saga cancels the order and returns the stock | Order, Catalog | Compensation |
| 6 | Notification consumer fails twice, retries, and the message ends up in the DLT | Notification | Retries, backoff, DLT |
| 7 | Show the whole path in one trace | All services | OpenTelemetry tracing |

> "A user asks the AI assistant for a laptop bag. It finds one through semantic search and the user orders it.
> The order event goes through Kafka. Stock is reserved with optimistic locking. Payment fails, so the saga
> cancels the order and returns the stock. The notification consumer fails twice, retries, and the message
> ends up in the DLT. I can show the whole path in one trace."
