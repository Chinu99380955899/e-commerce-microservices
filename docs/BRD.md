# Business Requirements Document: AuraMart

Version 1.0 · Owner: Chinu (portfolio project) · Status: Draft

## 1. Purpose

AuraMart is an e-commerce platform with an AI shopping assistant. It shows how an event-driven
microservices backend, a conversational assistant and a modern web front end work together. It is a
portfolio project, so the goal is a credible, working end-to-end system, not a commercial launch.

## 2. Business objectives

| # | Objective | Measure of success |
|---|---|---|
| O1 | Let shoppers find products quickly, including by meaning | Semantic search returns a relevant product in the top 3 for natural-language queries |
| O2 | Make checkout reliable when stock or payment fails | Failed orders always end CANCELLED with stock restored, and the customer sees a clear reason |
| O3 | Help shoppers with questions in plain language | The assistant answers the core question set correctly, and never invents products |
| O4 | Show a production-style architecture for a portfolio | Services, events, gateway, auth and deployment are all demonstrable |

## 3. Scope

**In scope**
- Product catalogue with keyword and semantic search, and admin product management.
- Cart, checkout, order tracking and order history.
- AI shopping assistant with streaming replies and product cards.
- Sign-in with roles (shopper, admin) through Keycloak.
- Notifications for order confirmation and cancellation.
- A demo mode that runs the front end with no backend.

**Out of scope**
- Real payment processing (payment is simulated).
- Shipping, returns and tax calculation.
- Multi-currency and multi-language support (INR and English only).
- Native mobile apps.

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| Developer (owner) | Builds and demonstrates the system |
| Shopper (persona: Asha) | Finds, buys and tracks products |
| Admin (persona: Ravi) | Maintains the catalogue and stock |
| Recruiters and reviewers | Assess the architecture and code quality |

## 5. Business requirements

| ID | Requirement | Priority |
|---|---|---|
| BR-01 | Shoppers can browse, filter, sort and page through active products | Must |
| BR-02 | Shoppers can search by keyword (typo-tolerant) and by meaning | Must |
| BR-03 | Shoppers can add items to a cart and change quantities up to 10 per line | Must |
| BR-04 | Checkout places an order and confirms or cancels it asynchronously | Must |
| BR-05 | A cancelled order states the reason (out of stock or payment failed) | Must |
| BR-06 | Stock is reserved at placement and released when payment fails | Must |
| BR-07 | Shoppers can view their order history and live order status | Must |
| BR-08 | Guests can keep a cart, and it moves to their account on sign-in | Should |
| BR-09 | The assistant streams replies, shows product cards and remembers the conversation | Should |
| BR-10 | The assistant only recommends products that exist in the catalogue | Must |
| BR-11 | Admins can create, edit and deactivate products, with the same validation everywhere | Must |
| BR-12 | Admins see stock levels and low-stock alerts | Should |
| BR-13 | Customers receive a confirmation or cancellation notification | Should |
| BR-14 | Users sign in with roles, and admin functions are restricted to admins | Must |
| BR-15 | Errors use one consistent format that shows the cause | Must |

## 6. Functional requirements (summary)

- **Catalogue:** list, filter by category, sort (name, price, newest), paginate (12, 24 or 48 per page).
- **Search:** keyword search over name, brand and category; semantic search over meaning, with a match score.
- **Cart:** add, change quantity, remove, clear; totals in INR.
- **Checkout:** delivery address with validation (10-digit phone, 6-digit PIN code, Indian state);
  review; place order.
- **Orders:** status PENDING, CONFIRMED or CANCELLED; timeline of events; history list.
- **Assistant:** answers product, stock, budget, order and general questions; declines unrelated requests.
- **Admin:** dashboard (active products, out of stock, low stock, stock value, products per category);
  product list with search and paging; create and edit forms; deactivate with confirmation.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Catalogue and search respond within 1 second under normal demo load |
| Availability | Core shopping flows work when the assistant is unavailable |
| Reliability | Checkout is consistent: no stock lost and no order stuck in PENDING after its saga finishes |
| Security | Signed-in access with roles; admin actions restricted; no secrets in the front end |
| Accessibility | WCAG 2.2 AA contrast, keyboard use, labelled controls, respects reduced motion |
| Usability | Works at 360 px wide, in light and dark themes |
| Maintainability | Typed code, unit and component tests, end-to-end tests for the main flows |
| Portability | Runs on Windows, macOS and Linux |

## 8. Assumptions and constraints

- Payments, shipping and tax are simulated.
- The catalogue is seeded with 40 demo products.
- The AI assistant runs on a large language model with tool calling; demo mode uses a deterministic simulator.
- The project is built by one developer, so scope is kept to the core flows above.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Saga failures leave orders in an unclear state | High | Clear state machine, tests for every transition, retries |
| Assistant gives wrong or invented product information | High | Answers come only from catalogue tool calls; tests check links |
| Scope creep from extra features | Medium | Out-of-scope list above; new ideas go to a backlog |
| Front end and back end contracts drift apart | Medium | Shared API contract; response validation in development |

## 10. Acceptance criteria

The project is accepted when:
1. A shopper can search, add to cart, check out and see the order CONFIRMED.
2. A failed payment ends the order CANCELLED with the right message, and the stock is restored.
3. The assistant answers the core question set as specified.
4. An admin can create a product and gets the duplicate-SKU error for an existing SKU.
5. The end-to-end tests pass, and the CI pipeline runs lint, typecheck, unit tests and the build.

## 11. Glossary

- **Saga:** a sequence of steps across services that either completes or compensates on failure.
- **Semantic search:** matching products by meaning rather than exact words.
- **SKU:** stock-keeping unit, the unique product code.
- **PENDING / CONFIRMED / CANCELLED:** the states of an order.
