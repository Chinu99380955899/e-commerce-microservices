# AuraMart web

The shopper and admin web app for AuraMart: catalogue, search, cart, checkout with live order tracking,
an AI shopping assistant, Keycloak sign-in, and an admin console. It runs with `npm run dev` and no backend at
all (demo mode), and switches to the real backend with one setting.

Related: [API contract](API_CONTRACT.md) · [Decisions](#decisions) · [Known limits](#known-limits)

## Quick start (demo mode, no backend)

Requirements: Node 24 LTS and npm. Works on Windows 11 (PowerShell), macOS and Linux.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. The app starts signed in as **Asha Verma** (shopper). Use the account menu to
switch to **Ravi Kumar** (admin). The **Demo** button at the bottom left controls payments, latency, outages
and the data.

## Running against the real backend

```bash
npm run dev:real
```

`dev:real` runs Vite in `real` mode: no mocks, and `/api` is proxied to `VITE_PROXY_TARGET`.

Before the gateway exists, point the proxy at catalog-service directly:

```bash
# PowerShell
$env:VITE_PROXY_TARGET = 'http://localhost:8081'; npm run dev:real
# macOS / Linux
VITE_PROXY_TARGET=http://localhost:8081 npm run dev:real
```

Or put `VITE_PROXY_TARGET=http://localhost:8081` in `.env.local`, which is never committed.
With catalog-service running, the catalogue and product pages show real data. Pages whose backend does
not exist yet (cart, orders, assistant) show their error states.

## Modes and configuration

Settings come from `src/config.ts`. The defaults are in the `.env.*` files, which are committed. Use
`.env.local` for personal overrides.

| Variable              | Meaning                                                              | Default                                            |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `VITE_API_BASE_URL`   | Origin of the API. Empty means same origin                           | empty                                              |
| `VITE_PROXY_TARGET`   | Dev server only: where `/api` is proxied                             | `http://localhost:8080` (the gateway)              |
| `VITE_USE_MOCKS`      | `true` runs the in-browser mock API                                  | `true` in development and demo, `false` otherwise  |
| `VITE_AUTH_MODE`      | `demo` (pick a demo user), `anonymous` (no login), `oidc` (Keycloak) | `demo` with mocks, `anonymous` otherwise           |
| `VITE_OIDC_AUTHORITY` | Keycloak realm URL                                                   | `http://localhost:8180/realms/auramart`            |
| `VITE_OIDC_CLIENT_ID` | Keycloak client ID                                                   | `auramart-web`                                     |
| `VITE_REPO_URL`       | Link on the About page                                               | `https://github.com/your-github-username/auramart` |

| npm mode      | Used by              | Mocks | Auth                                               |
| ------------- | -------------------- | ----- | -------------------------------------------------- |
| `development` | `npm run dev`        | on    | demo                                               |
| `real`        | `npm run dev:real`   | off   | anonymous (set `VITE_AUTH_MODE=oidc` for Keycloak) |
| `production`  | `npm run build`      | off   | anonymous                                          |
| `demo`        | `npm run build:demo` | on    | demo                                               |

To use Keycloak in oidc mode, set `VITE_AUTH_MODE=oidc` in `.env.local`, then run `npm run dev:real`.
The redirect URI is `http://localhost:5173/auth/callback`.

## Scripts

| Script       | What it does                                                            |
| ------------ | ----------------------------------------------------------------------- |
| `dev`        | Vite dev server on port 5173 in demo mode                               |
| `dev:real`   | Vite in `real` mode: no mocks, `/api` proxied to the backend            |
| `build`      | Type-check, then the production build (mocks off)                       |
| `build:demo` | Static build with the mock API inside, deployable as a live demo        |
| `preview`    | Serves the last build on port 4173                                      |
| `typecheck`  | `tsc -b`                                                                |
| `lint`       | ESLint (typescript-eslint strict, react-hooks, react-refresh, jsx-a11y) |
| `format`     | Prettier                                                                |
| `test`       | Vitest once                                                             |
| `test:watch` | Vitest in watch mode                                                    |
| `test:e2e`   | Playwright against `build:demo`, served by `preview`                    |

The scripts use no shell-specific syntax, so they run the same on Windows, macOS and Linux.

## Project structure

```
src/
  main.tsx            starts the MSW worker first (mock mode), then renders the app
  config.ts           typed configuration
  app/                router, providers, layouts, theme, error boundary, route guards
  api/                HTTP client, problem+json errors, Zod schemas, one module per resource
                      (products, cart, orders, assistant): query keys and TanStack Query hooks
  features/           catalog, search, product, cart, checkout, orders, assistant, auth,
                      account, admin, about, home, demo, system (404, 403, route error)
  components/ui/      design system: Button, Field, Dialog (drawer), Toast, Pagination,
                      ProductArt, ProductCard, QuantityStepper, Status (badges, states)
  lib/                money and date formatting, SSE parser, storage helpers, hooks
  mocks/              MSW handlers, in-memory database, seed data, saga, search and assistant simulators
  test/               test setup and helpers
e2e/                  Playwright specs (flows A to D)
nginx/                nginx template for the Docker image
```

## How demo mode works

- `main.tsx` starts the MSW service worker before the first render. Requests to `/api/v1` are answered
  by the handlers in `src/mocks/handlers.ts`.
- The handlers implement [API_CONTRACT.md](API_CONTRACT.md) on top of an in-memory database. The
  database is saved to localStorage under `auramart.demo.v1`, so carts and orders survive a refresh.
- Each response waits 250 to 600 ms with deterministic jitter. The Demo panel can change this.
- Checkout runs the saga as a pure function of the time since the order was placed
  (`src/mocks/saga.ts`), so tracking survives a refresh in the middle of a checkout.
- The assistant replies come from a deterministic planner (`src/mocks/assistant.ts`). It streams the reply
  word by word, and keeps a memory per conversation.

### Resetting demo data

- **Demo panel → Reset all demo data**, or
- **Account → Reset demo data** (demo mode).

Both restore the seeded catalogue, carts, orders and conversations. The demo controls settings are kept.
To clear everything, including the signed-in user and the cart identity, clear this site's storage in the
browser's developer tools.

## Testing

```bash
npm test              # unit and component tests (79 tests)
npm run test:e2e      # end-to-end flows A to D
```

- **Unit tests** cover the SSE parser (frames split across chunks, multi-line data, comments), money and date
  formatting, keyword and semantic search, the saga at every time step, the request and address schemas,
  the catalogue URL mapping, and the assistant's eight golden questions.
- **Component tests** use React Testing Library with the MSW node server. They cover the catalogue URL,
  the cart (add, change, remove, totals, insufficient stock), checkout, order tracking polling to
  CONFIRMED and the CANCELLED messages, the assistant (streaming, tool indicator, product cards, Stop,
  error and Retry), and the admin form (field errors from a 400 and the duplicate SKU from a 409).
- **End-to-end tests** run in Chromium against the demo build: A, the assistant finds the flask and it is
  added to the cart; B, checkout ends CONFIRMED; C, with payments set to fail, the order is CANCELLED and
  the stock is restored; D, as admin, the duplicate-SKU error appears.

The first run of `npm run test:e2e` needs Playwright's browser:

```bash
npx playwright install chromium
```

To use a Chrome that is already installed, set `PW_CHANNEL=chrome` in the environment for that run.

## Docker

```bash
docker build -t auramart-web .
docker run -p 8088:80 -e API_UPSTREAM=http://host.docker.internal:8080 auramart-web
```

The image builds the production bundle with `node:24-alpine` and serves it with `nginx:alpine`. nginx falls
back to `index.html` for client-side routes, caches hashed assets for a year, and proxies `/api/` to
`${API_UPSTREAM}` (default `http://gateway:8080`).

## Deploying the demo as a static site

`npm run build:demo` writes `dist/`. It is a complete static site with the mock API inside, so it can be
hosted on any static host (GitHub Pages, Netlify, S3). It needs one thing: the MSW worker file
`mockServiceWorker.js` at the site root, which `public/` already provides.

## Bundle sizes

Measured with `npm run build:demo` (minified, gzip in brackets):

| Chunk                                                      | Size                                            |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `index` (app shell, router, session, UI kit, query client) | 589 kB (184 kB)                                 |
| `ChatPanel` (assistant chat, Markdown)                     | 170 kB (52 kB), loaded when the assistant opens |
| `browser` (MSW worker and handlers, demo only)             | 416 kB (160 kB), loaded in mock mode only       |
| `OidcSession` (Keycloak), oidc mode only                   | 72 kB (19 kB)                                   |
| `schemas` (Zod schemas and product validation)             | 92 kB (26 kB)                                   |
| Admin, About and the other routes                          | 1 to 9 kB each, loaded on navigation            |
| CSS                                                        | 53 kB (10 kB)                                   |

The main chunk is above the goal of a small bundle. The largest parts are React, React Router, TanStack Query
and the Zod schemas. Splitting the schemas and the mock data further is the first step if it matters.

## Decisions

These are the choices made where the spec was open or where the repository did not match it.

1. **Location and Git.** This folder is not the AuraMart monorepo (there is no `services/` folder and no Git
   repository), so the app is created in `frontend/auramart-web` in the current folder. The CI job, the root
   README section, the feature branch and the per-phase commits are therefore not done here. They are small
   follow-ups for the monorepo.
2. **Seed catalogue.** The Java seed file `V2__seed_demo_products.sql` is not present, so products 01 to 12 use
   the spec's table, and the descriptions are written here. Products 13 to 40 are demo additions.
3. **Library versions.** The latest stable versions are used, which are newer than the majors in the spec:
   Vite 8 (Rolldown), TypeScript 6, React Router 8, Vitest 5, Tailwind CSS 4, ESLint 9, and MSW 3. MSW 3
   renamed `onUnhandledRequest` to `onUnhandledFrame`, and the code uses the new name.
4. **Keyword search** is trigram similarity over words, with a threshold of 0.2, applied to the name, brand
   and category. **Semantic search** is a concept map plus word overlap, scaled to 0 to 0.98.
5. **Assistant** is a deterministic rule-based planner, so the golden questions are reproducible. It answers
   only from the catalogue and the customer's orders. It never invents products.
6. **Demo payment controls** are persistent modes ("payments succeed", "payments fail", "fail 30%") rather than
   a one-shot "next payment". This is simpler to reason about while a checkout is in progress.
7. **Dashboard low stock** is 1 to 5 units. Sold-out products are counted only under "out of stock".
8. **Admin search** uses `/products/search`. The category filter applies to the current page of results.
9. **Concurrent updates.** The admin form sends `expectedUpdatedAt` on PUT, and the server answers 409
   `concurrent-update` if the product changed. This is an extension to the request body, documented in the
   API contract; clients that omit it skip the check.
10. **Cart changes.** Quantity changes are optimistic with rollback and a toast on error. Adding a product is
    not optimistic, because the cart line needs the product's name and price, which the add call returns.
11. **Admin access in demo mode** is enforced by the mock server (the `X-Customer-Id` must be Ravi's). In
    anonymous mode the admin pages are open and labelled "Admin (no login yet)", as the spec asks.
12. **Guest carts.** When a guest signs in, the guest cart lines are added to the user's cart and the guest cart is
    emptied. Lines that no longer fit in stock are skipped, and the user is told how many.
13. **Sign-out** in oidc mode clears the local session only. It does not log out of Keycloak, to keep the
    demo of the realm simple.
14. **Redis** appears in the About page diagram as part of the target architecture. The app does not call it.
15. **Failed worker start.** If the MSW worker cannot start (for example in a browser without service
    workers), the app still renders and its requests fail, so the screens show their error states instead of
    a blank page.
16. **Order "Try again"** adds the cancelled order's lines back to the cart, one call per line.

## Known limits

- **Not verified in Docker.** The Dockerfile and nginx template are written, but no image was built or run
  here.
- **Dev demo needs service workers.** Demo mode relies on the MSW worker. The in-app browser pane used during
  development could not register it, so the demo flows were verified with Playwright in Chrome against the
  built demo, not in that pane.
- **Main bundle size** is above the goal (see Bundle sizes).
- **Keycloak flow** was written against oidc-client-ts and react-oidc-context, but no Keycloak realm was
  available, so the oidc sign-in is not exercised by any test.
- **Assistant** is a simulator. Its answers follow the golden questions and simple intents, not open-ended
  language.
- **Payments** are simulated. Nothing is charged, and the saga timings are fixed.
- **No accessibility audit tool** was run beyond the lint rules (jsx-a11y) and the keyboard and label checks in
  the tests. A manual screen-reader pass is still recommended.
