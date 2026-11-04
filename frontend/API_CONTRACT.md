# AuraMart API contract

This is the contract between the AuraMart web app and the backend services. The demo mode
(`VITE_USE_MOCKS=true`) implements exactly this contract with MSW handlers, and the real services are
built to match it. The app uses the shapes below; every response is validated with a Zod schema in
development, and a mismatch logs a console warning instead of crashing.

## 1. Common rules

| Rule              | Detail                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path         | `/api/v1`                                                                                                                                                                                          |
| Format            | JSON, camelCase fields                                                                                                                                                                             |
| Timestamps        | ISO-8601 strings in UTC, for example `2026-10-16T10:20:00Z`                                                                                                                                        |
| Money             | JSON number with two decimals, plus a `currency` field (`"INR"`). Shown as `₹1,299.00` with `Intl.NumberFormat('en-IN')`                                                                           |
| Paging            | Spring `PagedModel`: `{ content: T[], page: { size, number, totalElements, totalPages } }`. `number` is 0-based                                                                                    |
| Errors            | `application/problem+json`: `{ type, title, status, detail?, instance?, errors? }`. `type` is `https://auramart.dev/problems/<slug>`. `errors` maps field names to messages on validation failures |
| Customer identity | `X-Customer-Id: <uuid>` on cart, order and assistant calls. In OIDC mode also `Authorization: Bearer <token>`, and the gateway takes the customer from the token                                   |
| Request tracing   | Every call sends a fresh `X-Request-Id` (UUID)                                                                                                                                                     |

## 2. Products (catalog-service)

```ts
type Product = {
  id: string; // UUID
  sku: string;
  name: string;
  description: string;
  category: 'electronics' | 'kitchen' | 'fitness' | 'bags' | 'home' | 'books' | string;
  brand: string | null;
  price: number; // INR, two decimals
  currency: string; // "INR"
  stockQuantity: number; // whole number, 0 or more
  inStock: boolean;
  updatedAt: string; // ISO-8601
  createdAt?: string; // ISO-8601, used by the "newest" sort
};
```

| Method and path                             | Request                                                                                                                           | Response                                                                                        | Errors                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /products?category=&page=&size=&sort=` | `page` 0-based (default 0), `size` default 20, max 100. `sort`: `name,asc` (default), `price,asc`, `price,desc`, `createdAt,desc` | `PagedModel<Product>`, active products only                                                     | 400 `validation-error` (bad `sort`, `size` or `page`)                    |
| `GET /products/{id}`                        |                                                                                                                                   | `Product`                                                                                       | 400 `validation-error` (not a UUID); 404 `product-not-found`             |
| `GET /products/search?q=&page=&size=`       | `q` required, typo-tolerant                                                                                                       | `PagedModel<Product>` ranked by similarity                                                      | 400 `validation-error` (blank `q`)                                       |
| `GET /products/semantic-search?q=&limit=`   | `limit` default 8, max 20                                                                                                         | `{ query: string, results: { product: Product, score: number }[] }`, best first, `score` 0 to 1 | 400 `validation-error` (blank `q`)                                       |
| `POST /products`                            | Admin. `ProductRequest`                                                                                                           | 201, `Location` header, `Product`                                                               | 400 `validation-error`; 409 `duplicate-sku`                              |
| `PUT /products/{id}`                        | Admin. `ProductRequest` plus optional `expectedUpdatedAt`                                                                         | 200, `Product`                                                                                  | 400 `validation-error`; 404 `product-not-found`; 409 `concurrent-update` |
| `DELETE /products/{id}`                     | Admin                                                                                                                             | 204. Soft delete: the product disappears from lists and returns 404                             | 404 `product-not-found`                                                  |

Admin calls need the admin role (403 `forbidden` otherwise, in demo mode and once the gateway checks roles).

### 2.1 ProductRequest and validation

```ts
type ProductRequest = {
  sku: string; // "^[A-Z0-9-]+$", 1 to 64 characters
  name: string; // 1 to 200
  description: string; // 1 to 4000
  category: string; // 1 to 80, lower-cased by the server
  brand?: string | null; // up to 80
  price: number; // >= 0, at most 10 integer digits and 2 decimals
  currency: string; // three letters, upper-cased by the server
  stockQuantity: number; // whole number >= 0
  expectedUpdatedAt?: string; // PUT only: optimistic lock, see 2.3
};
```

Messages (identical in the app and the backend):

| Field           | Messages                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `sku`           | "must not be blank"; "size must be between 0 and 64"; "use upper-case letters, digits and dashes"                            |
| `name`          | "must not be blank"; "size must be between 0 and 200"                                                                        |
| `description`   | "must not be blank"; "size must be between 0 and 4000"                                                                       |
| `category`      | "must not be blank"; "size must be between 0 and 80"                                                                         |
| `brand`         | "size must be between 0 and 80"                                                                                              |
| `price`         | "must not be null"; "must be greater than or equal to 0.00"; "numeric value out of bounds (<10 digits>.<2 digits> expected)" |
| `currency`      | "must be a 3-letter ISO currency code"                                                                                       |
| `stockQuantity` | "must not be null"; "must be a whole number"; "must be greater than or equal to 0"                                           |

The SKU never changes: on `PUT` the stored SKU replaces whatever the body says.

### 2.2 Example

```http
GET /api/v1/products/search?q=hedphones&page=0&size=20
```

```json
{
  "content": [
    {
      "id": "0b9a7c1e-0002-4c3a-9a10-000000000002",
      "sku": "AUD-OVR-200",
      "name": "Studio Over-Ear Headphones",
      "description": "Over-ear wireless headphones with deep bass, soft memory-foam cushions and 40-hour battery life.",
      "category": "electronics",
      "brand": "AuraSound",
      "price": 8999,
      "currency": "INR",
      "stockQuantity": 45,
      "inStock": true,
      "updatedAt": "2026-06-01T09:00:00Z"
    }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

### 2.3 Concurrent updates (`expectedUpdatedAt`)

The admin form sends the product's `updatedAt` as `expectedUpdatedAt` on `PUT`. If the stored product has
changed since, the server returns 409 `concurrent-update` and the app shows a banner with a Reload button.
This field is an extension to the create/update body; it is optional, so clients that omit it skip the check.

## 3. Cart (order-service)

```ts
type CartItem = {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number; // copied from the catalogue when the item was added
  currency: string;
  quantity: number; // 1 to 10 per line
  lineTotal: number; // unitPrice * quantity
};

type Cart = {
  id: string;
  customerId: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  currency: string;
  updatedAt: string;
};
```

| Method and path                           | Request                             | Response                                           | Errors                                                                                                                         |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /carts/current`                      |                                     | `Cart`. Created empty if the customer has none     |                                                                                                                                |
| `POST /carts/current/items`               | `{ productId, quantity }`           | `Cart`. Adds the product or increases its quantity | 400 `validation-error` (quantity outside 1–10, or more than 10 in one line); 404 `product-not-found`; 409 `insufficient-stock` |
| `PATCH /carts/current/items/{productId}`  | `{ quantity }` (0 removes the line) | `Cart`                                             | 400 `validation-error`; 409 `insufficient-stock`                                                                               |
| `DELETE /carts/current/items/{productId}` |                                     | `Cart`                                             |                                                                                                                                |
| `DELETE /carts/current`                   |                                     | 204                                                |                                                                                                                                |

`insufficient-stock` carries a detail such as `Only 3 left in stock`.

## 4. Orders (order-service)

```ts
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

type OrderEvent = {
  type:
    | 'OrderPlaced'
    | 'StockReserved'
    | 'StockRejected'
    | 'PaymentSucceeded'
    | 'PaymentFailed'
    | 'OrderConfirmed'
    | 'OrderCancelled';
  at: string; // ISO-8601
};

type ShippingAddress = {
  fullName: string;
  phone: string; // 10 digits
  line1: string;
  line2?: string;
  city: string;
  state: string; // Indian state or union territory
  pinCode: string; // 6 digits
};

type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  cancellationReason: 'OUT_OF_STOCK' | 'PAYMENT_FAILED' | null;
  lines: CartItem[];
  itemCount: number;
  total: number;
  currency: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  timeline: OrderEvent[];
};

type OrderSummary = {
  id: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  currency: string;
  createdAt: string;
};
```

| Method and path           | Request                      | Response                                                                                              | Errors                                                    |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `POST /orders`            | `{ shippingAddress }`        | 201, `Location` header, `Order` with status PENDING and timeline `[OrderPlaced]`. The cart is emptied | 400 `validation-error`; 409 `empty-cart`                  |
| `GET /orders?page=&size=` | 0-based paging, newest first | `PagedModel<OrderSummary>`                                                                            |                                                           |
| `GET /orders/{id}`        |                              | `Order`                                                                                               | 404 `order-not-found` (also for another customer's order) |

### 4.1 The checkout saga

Checkout is a Kafka saga. The status changes asynchronously, and clients poll `GET /orders/{id}` while the
order is PENDING (every 2 seconds in the app).

```
t = 0      OrderPlaced                       order.events       (order-service)
t + 1.5 s  StockReserved   | StockRejected  inventory.events   (inventory-service)
t + 2.0 s  OrderCancelled (OUT_OF_STOCK)    only when rejected
t + 3.0 s  PaymentSucceeded | PaymentFailed order.events       (payment, simulated)
t + 3.5 s  OrderConfirmed | OrderCancelled (PAYMENT_FAILED)   order.events       (order-service)
```

A payment failure releases the reserved stock. The demo mode runs the same timings in `src/mocks/saga.ts`.

## 5. AI assistant (ai-assistant-service)

### 5.1 Streaming chat

`POST /assistant/chat/stream` with body `{ conversationId?: string, message: string }`. `message` is 1 to
1000 characters. The response is `text/event-stream`. Every event is one `data:` line with JSON:

```
data: {"type":"meta","conversationId":"0b9a…"}           always first; a new ID when none was sent
data: {"type":"tool","name":"searchProducts","status":"started"}   optional
data: {"type":"tool","name":"searchProducts","status":"finished"}
data: {"type":"token","text":"Here "}                    many of these, in order
data: {"type":"done"}                                    last, or:
data: {"type":"error","message":"…"}
```

Tool names: `searchProducts`, `getOrderStatus`.

The app reads the stream with `fetch` and `response.body.getReader()`, because `EventSource` cannot send
POST. The SSE parser handles frames split across chunks, multi-line `data:`, comment and keep-alive lines.

### 5.2 Non-streaming fallback

`POST /assistant/chat` with the same body returns `{ "conversationId": "…", "reply": "…" }`.

### 5.3 Reply format

Replies link every mentioned product as a Markdown link, `[Product name](/products/{id})`. The app turns
those into router links and shows a card for each product. Every other link is rendered as plain text, and
raw HTML is never rendered.

### 5.4 Conversation memory

The server remembers each conversation by `conversationId`, including the products last shown (used for
"show me a cheaper one") and the last order mentioned.

## 6. Authentication

| Mode                                   | How the customer is known                                                                                                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo (`VITE_AUTH_MODE=demo`)           | A demo user is picked on the sign-in page. Their fixed IDs are sent as `X-Customer-Id`                                                                                                                   |
| Anonymous (`VITE_AUTH_MODE=anonymous`) | No login. A `crypto.randomUUID()` is kept in localStorage and sent as `X-Customer-Id`. Admin pages say "Admin (no login yet)"                                                                            |
| OIDC (`VITE_AUTH_MODE=oidc`)           | Keycloak, realm `auramart`, client `auramart-web`, Authorization Code with PKCE. Redirect URI `/auth/callback`. Roles from `realm_access.roles` (`shopper`, `admin`). Customer ID from the token's `sub` |

Demo users: Asha Verma (shopper, `c0ffee00-0000-4000-8000-000000000001`) and Ravi Kumar (admin,
`c0ffee00-0000-4000-8000-000000000002`).

## 7. Error codes used by the app

| Slug                  | Title               | Used for                              |
| --------------------- | ------------------- | ------------------------------------- |
| `validation-error`    | Validation failed   | Field errors (`errors` map)           |
| `product-not-found`   | Product not found   | Unknown or deactivated product        |
| `duplicate-sku`       | Duplicate SKU       | Creating an existing SKU              |
| `concurrent-update`   | Concurrent update   | `expectedUpdatedAt` no longer matches |
| `insufficient-stock`  | Not enough stock    | Cart quantity above stock             |
| `empty-cart`          | Cart is empty       | Checkout with no items                |
| `order-not-found`     | Order not found     | Unknown order, or another customer's  |
| `forbidden`           | Forbidden           | Admin role needed                     |
| `unauthenticated`     | Unauthenticated     | Missing or invalid customer identity  |
| `service-unavailable` | Service unavailable | Demo outage switches (503)            |
