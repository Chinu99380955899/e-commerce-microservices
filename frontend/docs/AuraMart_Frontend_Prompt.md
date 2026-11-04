# Build the AuraMart web frontend: complete, end to end, with demo data

You are a senior frontend engineer working inside the AuraMart monorepo. Build the complete shopper and
admin web app for AuraMart in one go: every page and feature in this file, working end to end on
realistic demo data. It must run with `npm run dev` and no backend at all, and switch to the real
backend with one setting.

## 0. How to work

1. Read this whole file first. Then look around the repo (README.md, docs/, services/catalog-service)
   to understand the backend that exists today.
2. Turn sections 3–13 into a task list and build in this order, finishing each phase before the next:
   1. Scaffold, tooling, config, design-system components, layouts, routing, API client, MSW and the
      seeded mock database.
   2. Catalogue, search and product details.
   3. Cart, checkout, order tracking and order history, with the saga simulation.
   4. AI assistant: streaming client, chat UI and the assistant simulation.
   5. Auth, account and admin.
   6. About page, demo controls, accessibility, dark mode, responsive polish.
   7. Remaining tests, end-to-end tests, CI job, Docker, documentation, final verification.
   Write unit and component tests together with each feature, not all at the end.
3. Don't ask me questions. When something is unclear, choose the sensible option and record it under
   "Decisions" in the frontend README.
4. After every phase run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`, and fix
   every error and warning before moving on.
5. No placeholders: no TODOs, lorem ipsum, dead buttons, commented-out code or "coming soon" pages.
   Every control does something real (in demo mode, against the mock API).
6. Leave the backend untouched. Outside `frontend/auramart-web` you may only add the CI job
   (section 11) and a short "Frontend" section to the root README.
7. Work on a new branch `feature/AM-46-frontend` created from main. Commit at the end of each phase
   with a Conventional Commit message, for example `feat(web): catalogue with filters and paging`.
   Don't push or open a pull request unless I ask.
8. Everything must work on Windows 11 (PowerShell) as well as macOS and Linux. No `rm -rf`, `export`
   or inline environment variables in npm scripts: use Vite modes and Node-based tools.
9. If you are not inside the AuraMart repo (there is no `services/` folder), create
   `frontend/auramart-web` in the current folder, skip the CI and root README changes, and skip the
   branch and commits if it isn't a Git repository.

## 1. Context

AuraMart is an event-driven e-commerce platform with an AI shopping assistant, built by one developer
as a portfolio project.

- Backend: Spring Boot 4 / Java 21 microservices behind a Spring Cloud Gateway on
  `http://localhost:8080`:
  - catalog-service (8081): products, keyword search (pg_trgm) and semantic search (pgvector).
  - order-service (8082): carts and orders. Checkout is a Kafka saga: OrderPlaced → StockReserved or
    StockRejected → simulated payment → OrderConfirmed or OrderCancelled.
  - ai-assistant-service (8083): Spring AI chat with tool calling (searchProducts, getOrderStatus) and
    conversation memory, streamed over server-sent events.
  - notification-service (8084): sends confirmation and cancellation messages; no browser API.
  - Keycloak (8180, realm `auramart`): login with the roles `shopper` and `admin`, added late in the
    project.
- Today only catalog-service exists. Section 5 defines the other APIs: this file is their contract,
  and the backend will be built to match it.
- Errors follow RFC 9457 problem+json. Money is in INR. The UI is in English with the en-IN locale.

## 2. Tech stack

Use the latest stable versions; confirm them with `npm view <package> version`. These are the majors
expected at the time of writing. Use them or newer.

| Purpose | Choice |
|---|---|
| Build | Vite 7 and TypeScript 5 in strict mode |
| UI | React 19 and Tailwind CSS 4 via `@tailwindcss/vite` (CSS-first: `@import "tailwindcss"` and `@theme`; no tailwind.config.js) |
| Routing | React Router 7 in data mode (`createBrowserRouter`), imported from `react-router` |
| Server state | TanStack Query 5, with the devtools in development |
| Forms | React Hook Form 7 with Zod 4 through `@hookform/resolvers` |
| Accessible primitives | Radix UI (dialog, dropdown menu, toast, tooltip) or an equivalent headless library |
| Icons | lucide-react |
| Chat Markdown | react-markdown with remark-gfm, no raw HTML |
| Login (oidc mode) | oidc-client-ts with react-oidc-context |
| Mock API | MSW 2: the browser worker for the app, the node server for tests |
| Tests | Vitest, React Testing Library, @testing-library/user-event and jsdom; Playwright end to end |
| Code quality | ESLint flat config (typescript-eslint, react-hooks, react-refresh, jsx-a11y) and Prettier |

Not allowed: Next.js or any server-side rendering, CSS-in-JS, Redux, chart libraries, and any external
images, fonts, analytics or other runtime calls to third-party services. Keep dependencies lean.

## 3. Location, scripts and configuration

Create the app in `frontend/auramart-web` with Node 24 LTS and npm, for example with
`npm create vite@latest auramart-web -- --template react-ts` inside `frontend/`.

| npm script | What it does |
|---|---|
| `dev` | Vite dev server on port 5173 in demo mode: mock API and demo login |
| `dev:real` | `vite --mode real`: no mocks; `/api` is proxied to the backend |
| `build` | Type-check, then the production build (mocks off) |
| `build:demo` | `vite build --mode demo`: a static build with the mock API inside, deployable anywhere as a live demo |
| `preview` | Serves the last build on port 4173 |
| `typecheck` | `tsc` without emitting (or `tsc -b`) |
| `lint`, `format` | ESLint and Prettier |
| `test` | Vitest once (`vitest run`); `test:watch` for watch mode |
| `test:e2e` | Playwright against `build:demo` served by `preview` |

Configuration goes through one typed `src/config.ts`. Commit `.env.example`, `.env.development`,
`.env.real`, `.env.demo` and `.env.production`.

| Variable | Meaning | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Origin of the API; empty means same origin | Empty everywhere |
| `VITE_PROXY_TARGET` | Dev server only (read in vite.config.ts with `loadEnv`): where `/api` is proxied | `http://localhost:8080` (the gateway); set `http://localhost:8081` to use catalog-service directly before the gateway exists |
| `VITE_USE_MOCKS` | `true` or `false` | `true` in development and demo; `false` in real and production |
| `VITE_AUTH_MODE` | `demo` (pick a demo user), `anonymous` (no login, generated customer ID) or `oidc` (Keycloak) | `demo` with mocks; `anonymous` in real and production |
| `VITE_OIDC_AUTHORITY` | Keycloak realm URL | `http://localhost:8180/realms/auramart` |
| `VITE_OIDC_CLIENT_ID` | Keycloak client ID | `auramart-web` |
| `VITE_REPO_URL` | Link on the About page | `https://github.com/<your-github-username>/auramart` |

The browser always calls relative `/api/...` URLs (plus `VITE_API_BASE_URL`, normally empty). In
development the Vite proxy forwards them; in production nginx does (section 11); in demo mode MSW
answers them.

## 4. App architecture

```
src/
  main.tsx          starts MSW first when VITE_USE_MOCKS=true, then renders the app
  config.ts         typed configuration
  app/              router, providers (QueryClient, auth, theme, toasts), layouts, error boundary
  api/              HTTP client, problem+json errors, types, Zod schemas, one module per resource
                    (products, cart, orders, assistant) with query keys and TanStack Query hooks
  features/         catalog, search, product, cart, checkout, orders, assistant, auth, account,
                    admin, about, demo
  components/ui/    design system: Button, Input, Select, Badge, Card, Dialog, Drawer, Toast,
                    Skeleton, Pagination, EmptyState, ErrorState, Price, StockBadge, QuantityStepper…
  lib/              money and date formatting, SSE parser, storage helpers, shared hooks
  mocks/            MSW handlers, in-memory database, seed data, saga, search and assistant simulators
  test/             test setup and helpers
e2e/                Playwright specs
```

Rules:

- One HTTP client (`api/client.ts`) built on fetch. It adds the base URL; sends and parses JSON; sends
  `X-Customer-Id` (and `Authorization: Bearer <token>` in oidc mode) and a fresh `X-Request-Id` UUID on
  every request; turns every non-2xx response into a typed `ApiError` that carries the problem+json body
  (type, title, status, detail, errors); and accepts an AbortSignal.
- Every response has a Zod schema. In development, check responses against it and log a clear console
  warning on a mismatch, without crashing, so the frontend and backend can't drift apart silently.
- TanStack Query: a query-key factory per resource; defaults of a 30-second staleTime, no retry on 4xx
  and one retry on 5xx or network errors; mutations invalidate or update the right queries; cart changes
  are optimistic with rollback.
- Route-level code splitting (`lazy`) for the admin, assistant and about pages. Scroll restoration. A
  document title on every page, such as "Cabin Trolley Bag 55cm · AuraMart".

## 5. API contract

The mock handlers implement exactly this, and the real services will too. Also write it up as
`frontend/auramart-web/API_CONTRACT.md`, with TypeScript-style shapes, status codes and an example per
endpoint.

### 5.1 Common rules

- Base path `/api/v1`. JSON with camelCase fields. Timestamps are ISO-8601 strings in UTC.
- Money is a JSON number with 2 decimals plus a `currency` field ("INR"). Format it with
  `Intl.NumberFormat('en-IN', { style: 'currency', currency })`, which gives ₹1,299.00.
- Paged responses use Spring's PagedModel shape:
  `{ content: T[], page: { size, number, totalElements, totalPages } }`, where `number` is 0-based.
- Errors are `application/problem+json`: `{ type, title, status, detail, instance?, errors? }`. `type`
  is `https://auramart.dev/problems/<slug>`, and `errors` maps field names to messages on validation
  failures.
- Customer identity: until login exists, the browser sends `X-Customer-Id: <uuid>` on cart, order and
  assistant calls. In oidc mode it also sends the access token, and the gateway takes the customer from
  the token.

### 5.2 Products (catalog-service, exists today)

`Product = { id, sku, name, description, category, brand: string | null, price, currency, stockQuantity, inStock, updatedAt }`

| Method and path | Result |
|---|---|
| `GET /products?category=&page=&size=&sort=` | `PagedModel<Product>` with active products only. `size` defaults to 20, maximum 100. `sort` is `name,asc` (default), `price,asc`, `price,desc` or `createdAt,desc` |
| `GET /products/{id}` | `Product`. 404 `product-not-found` (title "Product not found", detail "Product {id} not found"); 400 when the id isn't a UUID |
| `GET /products/search?q=&page=&size=` | `PagedModel<Product>` ranked by typo-tolerant similarity ("hedphones" finds headphones). Blank `q` gives 400 |
| `GET /products/semantic-search?q=&limit=` | `{ query, results: [{ product: Product, score }] }`, best match first, score from 0 to 1. `limit` defaults to 8, maximum 20 |
| `POST /products` | Admin. Body `ProductRequest`. 201 with a `Location` header and the `Product` |
| `PUT /products/{id}` | Admin. 200 with the `Product`. The SKU in the body is ignored: SKUs never change |
| `DELETE /products/{id}` | Admin. 204. Soft delete: the product disappears from lists and returns 404 |

`ProductRequest = { sku, name, description, category, brand?, price, currency, stockQuantity }` is
validated exactly like the backend, with the same messages:

- sku: required ("must not be blank"), at most 64 characters ("size must be between 0 and 64"),
  pattern `^[A-Z0-9-]+$` ("use upper-case letters, digits and dashes").
- name: required, at most 200. description: required, at most 4000. category: required, at most 80.
  brand: optional, at most 80. Size messages follow the sku example.
- price: required ("must not be null"), at least 0.00 ("must be greater than or equal to 0.00"), at most
  10 integer digits and 2 decimals ("numeric value out of bounds (<10 digits>.<2 digits> expected)").
- currency: required, 3 letters ("must be a 3-letter ISO currency code").
- stockQuantity: a whole number of 0 or more ("must be greater than or equal to 0").
- The server lower-cases the category and upper-cases the currency.
- Errors: 400 `validation-error` (title "Validation failed", detail "One or more fields are invalid.",
  plus the `errors` map); 409 `duplicate-sku` (title "Duplicate SKU", detail "A product with SKU {sku}
  already exists"); 409 `concurrent-update` (title "Concurrent update").

Categories are a fixed list, with no categories endpoint: electronics, kitchen, fitness, bags, home,
books. Keep their labels and icons in one config file.

### 5.3 Cart (order-service)

`CartItem = { productId, sku, name, unitPrice, currency, quantity, lineTotal }`

`Cart = { id, customerId, items: CartItem[], itemCount, subtotal, currency, updatedAt }`

| Method and path | Result |
|---|---|
| `GET /carts/current` | The customer's open cart, created empty if there is none |
| `POST /carts/current/items` with `{ productId, quantity }` | Adds the product or increases its quantity. Name and unit price are copied from the catalogue at that moment. Returns the `Cart` |
| `PATCH /carts/current/items/{productId}` with `{ quantity }` | Sets the quantity (0 removes the line). Returns the `Cart` |
| `DELETE /carts/current/items/{productId}` | Removes the line. Returns the `Cart` |
| `DELETE /carts/current` | Empties the cart. 204 |

Errors: 404 `product-not-found`; 409 `insufficient-stock` (detail like "Only 3 left in stock");
400 `validation-error` when a quantity is below 1 on add or above 10 on one line.

### 5.4 Orders (order-service)

```ts
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'
type OrderEvent = {
  type: 'OrderPlaced' | 'StockReserved' | 'StockRejected' | 'PaymentSucceeded' | 'PaymentFailed'
      | 'OrderConfirmed' | 'OrderCancelled'
  at: string
}
type ShippingAddress = { fullName, phone, line1, line2?, city, state, pinCode }
type Order = {
  id, customerId, status: OrderStatus,
  cancellationReason: 'OUT_OF_STOCK' | 'PAYMENT_FAILED' | null,
  lines: CartItem[], itemCount, total, currency, shippingAddress: ShippingAddress,
  createdAt, updatedAt, timeline: OrderEvent[]
}
type OrderSummary = { id, status, itemCount, total, currency, createdAt }
```

| Method and path | Result |
|---|---|
| `POST /orders` with `{ shippingAddress }` | Places an order from the current cart: 201 with a `Location` header and the `Order`, status PENDING, timeline [OrderPlaced]. The cart is emptied. 409 `empty-cart` when the cart has no items |
| `GET /orders?page=&size=` | `PagedModel<OrderSummary>`, newest first |
| `GET /orders/{id}` | The `Order`. 404 `order-not-found`, also for another customer's order |

The status changes asynchronously through the Kafka saga: PENDING → CONFIRMED, or PENDING → CANCELLED
with a reason. Clients poll.

### 5.5 AI assistant (ai-assistant-service)

- `POST /assistant/chat/stream` with `{ conversationId?: string, message: string }` (message 1–1000
  characters) returns `text/event-stream`. Every event is a single `data:` line holding JSON:
  - `{ "type": "meta", "conversationId": "…" }`, always first; a new ID when none was sent.
  - `{ "type": "tool", "name": "searchProducts" | "getOrderStatus", "status": "started" | "finished" }`,
    optional; it drives indicators such as "Searching the catalogue…".
  - `{ "type": "token", "text": "…" }`, many of them, in order.
  - `{ "type": "done" }` last, or `{ "type": "error", "message": "…" }`.
- `POST /assistant/chat` with the same body returns `{ conversationId, reply }`: a non-streaming
  fallback.
- The assistant writes every product it mentions as a Markdown link `[Product name](/products/{id})`.
  The UI turns those into router links and shows a row of cards for the mentioned products.
- The server remembers each conversation by `conversationId`.
- The browser's EventSource can't send a POST. Read the stream with `fetch` and
  `response.body.getReader()`, and parse the SSE yourself: frames split across chunks, multi-line data,
  comments and keep-alive lines.

### 5.6 Auth

- `demo` mode (with mocks): a sign-in page where you pick a demo user, Asha Verma (shopper) or Ravi
  Kumar (admin). Their fixed customer IDs are sent as `X-Customer-Id`. The app starts signed in as Asha,
  so every feature works straight away, and the account menu can switch user or sign out.
- Guests (signed out in demo or oidc mode) get a generated customer ID kept in localStorage, so the cart
  works without signing in. When a guest signs in, the guest cart's lines are added to the user's cart
  and the guest cart is emptied.
- `anonymous` mode (the real backend before login exists): no sign-in. A `crypto.randomUUID()` customer
  ID is kept in localStorage. Admin pages stay reachable, because the backend has no security yet, and
  are labelled "Admin (no login yet)".
- `oidc` mode: Authorization Code with PKCE against Keycloak through oidc-client-ts; redirect URI
  `/auth/callback`; roles from `realm_access.roles`; customer ID from the token's `sub`; silent renew;
  sign-out.
- In demo and oidc modes, /checkout, /orders and /account need a signed-in user, and /admin needs the
  admin role (otherwise show a 403 page).

## 6. Demo mode

### 6.1 How it works

With `VITE_USE_MOCKS=true`, `main.tsx` starts the MSW worker before rendering, with
`onUnhandledRequest: 'bypass'` and the worker URL built from `import.meta.env.BASE_URL`. The handlers
match `${VITE_API_BASE_URL}/api/v1/...` and implement section 5 on top of an in-memory database that is saved to localStorage (key
`auramart.demo.v1`), so carts and orders survive a refresh. Responses get realistic latency (250–600 ms
by default, deterministic jitter). The same handlers run in Vitest through `msw/node`. A small
"Demo data" pill in the header shows that demo mode is on.

### 6.2 Demo data

Generate it deterministically: use a seeded generator, never `Math.random`.

**Products: 40 in total.**

The first 12 are the real seed products in
`services/catalog-service/src/main/resources/db/migration/V2__seed_demo_products.sql`. Copy them
exactly: ids, SKUs, names, descriptions, categories, brands, prices and stock. If the file isn't there,
use this table and write short descriptions yourself. Every id has the form
`0b9a7c1e-00NN-4c3a-9a10-0000000000NN`, where NN is the number in the first column.

| NN | SKU | Name | Category | Brand | Price (₹) | Stock |
|---|---|---|---|---|---|---|
| 01 | AUD-ANC-100 | Aura Pods ANC Earbuds | electronics | AuraSound | 4999.00 | 120 |
| 02 | AUD-OVR-200 | Studio Over-Ear Headphones | electronics | AuraSound | 8999.00 | 45 |
| 03 | KIT-FLK-750 | Steel Vacuum Flask 750ml | kitchen | Thermique | 1299.00 | 300 |
| 04 | KIT-PRS-500 | Pressure Cooker 5L Induction | kitchen | HomeChef | 2499.00 | 80 |
| 05 | FIT-YMT-006 | Anti-Slip Yoga Mat 6mm | fitness | FlexForm | 899.00 | 200 |
| 06 | FIT-DMB-010 | Adjustable Dumbbell Set 10kg | fitness | FlexForm | 3499.00 | 60 |
| 07 | BAG-LPT-015 | Laptop Backpack 15.6" | bags | UrbanTrail | 1799.00 | 150 |
| 08 | BAG-TRL-055 | Cabin Trolley Bag 55cm | bags | UrbanTrail | 4299.00 | 40 |
| 09 | HOM-LMP-LED | Smart LED Desk Lamp | home | Lumina | 1599.00 | 90 |
| 10 | HOM-PUR-HEP | HEPA Air Purifier | home | PureNest | 9999.00 | 25 |
| 11 | BOK-JAV-021 | Modern Java in Action (Paperback) | books | TechPress | 699.00 | 75 |
| 12 | ELE-PWB-20K | Power Bank 20000mAh | electronics | VoltX | 1899.00 | 0 |

Add 28 more (NN = 13 to 40) in the same six categories and the same style: SKUs like `AUD-SPT-300`,
realistic products and prices for the Indian market, and descriptions of 1–2 sentences full of use-case
words, so search by meaning works. Include sport earbuds under ₹3,000 (for "earbuds for the gym"),
budget earbuds under ₹1,500, an insulated travel mug, a steel lunch box, a gym duffel bag, a laptop
sleeve, a running water bottle, a resistance-band set, a ceramic tea set, and two more books (one on
Spring Boot, one on Apache Kafka). Make 3 of the new products out of stock and 4 low in stock (1–5
units). Give every product an internal `createdAt` for the "newest" sort.

**Product art.** The backend has no images. Draw each product as a tile in a reusable `ProductArt`
component: a gradient chosen from a stable hash of the SKU, the category's lucide icon and the brand
name.

**Users.** Asha Verma, shopper, customer ID `c0ffee00-0000-4000-8000-000000000001`. Ravi Kumar, admin,
customer ID `c0ffee00-0000-4000-8000-000000000002`.

**Order history for Asha.** Three orders with complete timelines: 12 days ago CONFIRMED (2 lines), 5
days ago CANCELLED with PAYMENT_FAILED, and 2 days ago CONFIRMED (1 line).

### 6.3 Checkout saga simulation

Model the saga as a pure function of the time since the order was placed, so it survives refreshes:

- t = 0: OrderPlaced. Check stock at placement: if any line asks for more than is available, the order
  will be rejected; otherwise reserve the stock (decrement it) straight away.
- t + 1.5 s: StockReserved, or StockRejected followed at t + 2.0 s by OrderCancelled with reason
  OUT_OF_STOCK.
- t + 3.0 s: PaymentSucceeded or PaymentFailed. Decide the outcome at placement from the demo controls.
- t + 3.5 s: OrderConfirmed, or OrderCancelled with reason PAYMENT_FAILED, which releases the reserved
  stock.

Every handler first calls `advanceSagas(now)`, which applies each transition's side effects exactly
once. Keep the timings in one constant.

### 6.4 Search simulation

- Keyword search: trigram similarity, like pg_trgm, over name, brand and category; threshold about
  0.2; best first. "hedphones" finds Studio Over-Ear Headphones and "dumbell" finds the dumbbell set.
- Semantic search: a small concept map (hot, warm, tea, coffee, insulated, travel, train → flasks and
  mugs; gym, workout, sweat, run → sports products; laptop, office, commute → bags and sleeves; sleep,
  air, dust → the air purifier; and so on) plus word overlap with the descriptions, giving a score from
  0 to 1. These must hold: "something to keep tea hot on a long train trip" puts Steel Vacuum Flask
  750ml in the top 3; "gym earbuds" puts sport earbuds first; "a bag for my laptop" puts a laptop bag
  first.

### 6.5 AI assistant simulation

Stream the reply word by word (25–40 ms per token) through a ReadableStream response in MSW, with the
tool events first. Keep a memory per conversation in the mock database: the last products shown and
the last order mentioned. These "golden questions" must work convincingly:

1. "I need something to keep tea hot on a long train trip": 2–3 products from semantic search, each a
   Markdown link with its price and stock.
2. "Suggest earbuds under ₹5,000 for the gym": respects the budget, and understands "₹5,000", "5000"
   and "5k".
3. "Show me a cheaper one": uses the memory to suggest cheaper products in the same category.
4. "Is the power bank in stock?": says it is out of stock and suggests an in-stock alternative.
5. "Where is my order?": the signed-in customer's latest order, with its status and a one-line summary
   of the timeline. It asks the user to sign in when needed; "order <id>" looks up that order; unknown
   IDs get a polite answer.
6. "Do you sell iPhones?": says it isn't in the catalogue and suggests categories. It never invents
   products.
7. "Write me a poem about cats": politely declines, because it only helps with shopping.
8. "Hi" or "What can you do?": a short introduction and suggested questions.

Keep the assistant deterministic. The demo controls can force an error to show the error state.

### 6.6 Demo controls

A floating "Demo" button, shown in demo mode only, opens a panel to:

- make the next payment succeed or fail, or fail 30% of payments (seeded);
- set the network latency: none, normal, or slow (2 s);
- make catalogue, cart, order or assistant calls fail with a 503 problem+json, to show error states;
- switch the demo user;
- reset all demo data.

The settings are saved in localStorage.

## 7. Pages and features

The global layout has a sticky header (logo, search box with suggestions, category menu, assistant
button, cart button with a count and a mini-cart drawer, account menu, theme toggle), a footer, toasts,
the assistant drawer, the demo controls, and an error boundary around every route. Build mobile-first:
everything works at 360 px wide.

| Route | Page |
|---|---|
| `/` | Home |
| `/products` | Catalogue |
| `/products/:id` | Product details |
| `/search` | Search results |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/orders` | Order history |
| `/orders/:id` | Order details with live tracking |
| `/assistant` | Full-page assistant |
| `/login` and `/auth/callback` | Sign-in |
| `/account` | Account |
| `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit` | Admin |
| `/about` | How AuraMart works |
| `*` | Not found |

Every page that loads data has loading skeletons, an empty state, and an error state with a Retry
button.

1. **Home.** A hero with a search box and an "Ask Aura" call to action with three example questions;
   category tiles with product counts; a "New arrivals" row (sort `createdAt,desc`) and an "Under
   ₹1,500" row; a short "How AuraMart works" strip that links to /about.
2. **Catalogue.** Category filter (chips on mobile, a sidebar on desktop), sort, page size (12, 24 or
   48), numbered pagination, and "Showing 13–24 of 40". Filter, sort, page and size live in the URL,
   with a 1-based `page` in the URL converted to 0-based for the API. Back and forward work, and
   changing a filter goes back to page 1. Product details are prefetched on hover.
3. **Search.** The header search is debounced (300 ms) and shows up to 5 keyword suggestions in a
   keyboard-navigable combobox; "/" focuses it. Enter opens `/search?q=…&mode=keyword` or
   `mode=semantic`, with a "Keyword / By meaning" toggle. Semantic results show a match bar (score as a
   percentage). The empty state offers to ask the assistant the same question.
4. **Product details.** Breadcrumb, product art, name, brand, price, a stock badge (In stock, Only N
   left, Out of stock), a quantity stepper from 1 to min(stock, 10), Add to cart (disabled when out of
   stock), SKU, description, an "Ask Aura about this product" button that opens the assistant with a
   pre-filled question, "Similar products" (semantic search on the name, excluding this product) and
   "Recently viewed" (localStorage). Unknown ids show the not-found page.
5. **Cart.** A mini-cart drawer and a full page: lines with art, name, unit price, stepper, line total
   and remove; the subtotal; "Clear cart" with a confirmation; optimistic updates with rollback and a
   toast on errors such as insufficient stock; "Continue to checkout".
6. **Checkout.** Two steps. Delivery address with React Hook Form and Zod: full name, 10-digit phone
   number, address line 1, optional line 2, city, state (a select of Indian states and union
   territories) and a 6-digit PIN code, remembered for next time. Then review: lines, total, and a note
   that payment is simulated. "Place order" goes to /orders/:id.
7. **Order details.** Polls every 2 s while the order is PENDING (TanStack Query `refetchInterval`) and
   stops at CONFIRMED or CANCELLED. A vertical timeline of the saga events with their times, and a
   clear outcome banner: confirmed ("Order confirmed: a confirmation is on its way"); cancelled for
   OUT_OF_STOCK ("Some items ran out of stock. You weren't charged."); or cancelled for PAYMENT_FAILED
   ("Payment failed. The reserved stock was released."). A cancelled order has "Try again", which puts
   its lines back in the cart. An expandable "Behind the scenes" panel explains each event: which
   service published it and on which Kafka topic (order.events or inventory.events).
8. **Order history.** A table on desktop and cards on mobile, with status badges, pagination, and an
   empty state that links to the catalogue.
9. **Assistant.** A drawer (full screen on mobile), opened from the header or with Ctrl+K (⌘K on a
   Mac), and the /assistant page. Both share one conversation that survives navigation and refresh:
   messages in localStorage, `conversationId` from the meta event. It has streaming tokens with a typing
   caret; a tool indicator ("Searching the catalogue…", "Checking your order…"); a Stop button using an
   AbortController; Retry on errors; suggested-question chips when the chat is empty; Markdown, where
   product links become router links and the mentioned products appear as cards with price, stock and
   Add to cart; auto-scroll that pauses when the user scrolls up, with a "Jump to latest" button;
   Enter to send and Shift+Enter for a new line; a 1000-character limit with a counter; and "New chat".
   Screen readers get the finished reply through an aria-live region, not every token.
10. **Sign-in and account.** The demo user picker, or "Sign in with Keycloak" in oidc mode. The account
    page shows the name, role, customer ID and saved address, and has sign-out, the theme choice and,
    in demo mode, "Reset demo data".
11. **Admin dashboard.** Tiles computed from the products API (active products, out of stock, low
    stock at 5 or fewer, stock value), a CSS bar chart of products per category, and a low-stock table
    with a quick "Edit" link.
12. **Admin products.** A searchable, filterable, paginated table (the search box uses
    /products/search). Create and edit forms with the Zod schema that mirrors section 5.2. Server
    errors are mapped onto the fields: the 400 `errors` map, and a 409 duplicate SKU on the SKU field; a
    409 concurrent update shows a banner with "Reload". The SKU is read-only when editing. Deactivate
    asks for confirmation. Success toasts, and the lists refresh after every change.
13. **About.** An accessible architecture diagram in HTML or SVG (browser → gateway → services →
    PostgreSQL, Redis, Kafka and the LLM), the checkout saga as numbered steps, the tech stack, and
    links to the repo and the API contract. Write it for a recruiter who has two minutes.
14. **Not found, forbidden (403) and a friendly route error page.**

## 8. Design and UX

- Look: a modern, clean, premium store. Neutral slate surfaces; an indigo-to-violet "aura" accent used
  sparingly (primary buttons, focus rings, the assistant); rounded-2xl cards; soft shadows; generous
  spacing; a clear type scale using the system font stack.
- Light and dark themes (class strategy with `@custom-variant dark`), following the system setting by
  default, with a toggle that is remembered.
- Accessibility: WCAG 2.2 AA contrast; everything usable with the keyboard; visible focus; labelled
  controls; focus trapped and restored in dialogs and drawers; `prefers-reduced-motion` respected;
  correct headings and landmarks.
- Feedback: skeletons while loading, toasts for actions, inline field errors, disabled buttons while
  saving, and no layout shift.

## 9. Quality bar

- TypeScript strict, no `any`, and no non-null assertions without a comment explaining why. Small
  components with typed props.
- No `dangerouslySetInnerHTML`. Chat Markdown has no raw HTML, and only internal `/products/{id}`
  links are clickable in assistant messages; every other link renders as plain text.
- Fast: route-level code splitting and a small main bundle. Report the bundle sizes in the README.
- Robust: every query and mutation handles loading, empty and error. Network errors and 5xx responses
  show a retryable error state; 4xx responses show the problem's title and detail.

## 10. Tests

- Unit tests (Vitest): the SSE parser (frames split mid-line and mid-JSON, multi-line data, comments),
  money and date formatting, keyword and semantic search, the saga function at every time step, the
  product and address Zod schemas, and the mapping between the URL and the catalogue filters.
- Component tests (React Testing Library with the MSW node server):
  - catalogue: the URL drives filter, sort and paging;
  - cart: add, change, remove, totals and insufficient stock;
  - checkout and order tracking: polls until CONFIRMED, and shows the right CANCELLED messages;
  - assistant: streams tokens, shows the tool indicator, renders product cards, Stop works, and errors
    offer Retry;
  - admin product form: field errors from a 400 and the duplicate-SKU error from a 409.
- End-to-end tests (Playwright, Chromium, the demo build):
  - A: ask the assistant the flask question, open the product, add it to the cart;
  - B: check out and see CONFIRMED;
  - C: set "next payment fails", check out, see CANCELLED with the right message and the stock restored;
  - D: as admin, create a product, then get the duplicate-SKU error.
- Every test passes locally and in CI.

## 11. Build, CI and Docker

- Add a `frontend` job to `.github/workflows/ci.yml` next to the existing Java `build` job, and leave
  that job exactly as it is. The new job uses the working directory `frontend/auramart-web`, the
  current major versions of actions/checkout and actions/setup-node, and Node 24 with the npm cache
  keyed on `frontend/auramart-web/package-lock.json`. It runs `npm ci`, lint, typecheck, test and build,
  then installs Playwright's Chromium (`npx playwright install --with-deps chromium`) and runs
  `npm run test:e2e`.
- A multi-stage `Dockerfile` (build with node:24-alpine, serve with nginx:alpine), a `.dockerignore`,
  and an nginx config template that serves the app with a fallback to index.html, caches hashed assets
  for a long time, and proxies `/api/` to `${API_UPSTREAM}` (default `http://gateway:8080`) using the
  nginx image's envsubst templates.

## 12. Documentation

- `frontend/auramart-web/README.md`: what the app is; quick start in demo mode; running against the
  real backend (including `VITE_PROXY_TARGET=http://localhost:8081` before the gateway exists); modes
  and environment variables; scripts; project structure; how demo mode works and how to reset it;
  testing; Docker; deploying the demo build as a static site; bundle sizes; Decisions; known limits.
- `frontend/auramart-web/API_CONTRACT.md`, from section 5.
- A short "Frontend" section in the root README that links to both.

## 13. Definition of done

Check every item yourself before you finish:

- [ ] `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and
      `npm run build:demo` all succeed with no errors or warnings.
- [ ] `npm run test:e2e` passes flows A–D.
- [ ] `npm run dev` gives a working store at http://localhost:5173 with demo data and no backend
      running. Every route renders and the browser console has no errors.
- [ ] All 8 golden assistant questions behave as described in 6.5.
- [ ] Checkout ends CONFIRMED by default and CANCELLED when the demo controls say so; refreshing in the
      middle of a checkout keeps tracking it.
- [ ] Admin create, edit and deactivate work, with validation messages identical to the backend's.
- [ ] The app works at 360 px wide and in dark mode, and the main flows work with the keyboard alone.
- [ ] `npm run dev:real` proxies `/api` to `VITE_PROXY_TARGET`. With catalog-service running and
      `VITE_PROXY_TARGET=http://localhost:8081`, the catalogue and product pages show real data, and
      pages whose backend doesn't exist yet show their error states cleanly.
- [ ] README and API_CONTRACT.md are complete, the CI job is added, and the branch has one commit per
      phase.

Finish with a short summary: what you built, how to run it, the test results, the bundle sizes, and any
decisions I should review.
