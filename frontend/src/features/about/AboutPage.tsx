import { useDocumentTitle } from '../../app/hooks';
import { config } from '../../config';
import { Card } from '../../components/ui/Status';

const SAGA_STEPS = [
  {
    title: 'OrderPlaced',
    text: 'The cart becomes an order in PENDING state. order-service publishes the event on order.events.',
  },
  {
    title: 'StockReserved or StockRejected',
    text: 'inventory-service checks and reserves every line on inventory.events. A rejection cancels the order with OUT_OF_STOCK.',
  },
  {
    title: 'PaymentSucceeded or PaymentFailed',
    text: 'A simulated payment step decides the outcome. A failure releases the reserved stock.',
  },
  {
    title: 'OrderConfirmed or OrderCancelled',
    text: 'The final decision. The customer gets a confirmation or a cancellation message from notification-service.',
  },
];

const STACK = [
  'Java 21 and Spring Boot 4 microservices',
  'Spring Cloud Gateway in front of every service',
  'PostgreSQL with pg_trgm (keyword search) and pgvector (semantic search)',
  'Apache Kafka for the checkout saga and events',
  'Redis for shared caching and rate limits',
  'Spring AI with tool calling, streamed over server-sent events',
  'Keycloak for login and roles (shopper, admin)',
  'React 19, TypeScript, Vite, TanStack Query and Tailwind CSS',
];

export function AboutPage() {
  useDocumentTitle('How AuraMart works');
  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-aura-700 dark:text-aura-400">
          About the project
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How AuraMart works</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">
          AuraMart is a small store built to show how an event-driven backend, an AI shopping
          assistant and a modern web front end fit together. In demo mode the backend is simulated
          in your browser with seeded data, so you can try every flow without running any services.
        </p>
      </header>

      <section aria-labelledby="architecture-heading" className="flex flex-col gap-4">
        <h2 id="architecture-heading" className="text-2xl font-bold">
          Architecture
        </h2>
        <Card className="overflow-x-auto p-4 sm:p-6">
          <ArchitectureDiagram />
        </Card>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The browser talks to one gateway. The gateway routes to four services, each with its own
          data. Services talk to each other through Kafka events, not direct calls, so a slow
          service does not block checkout.
        </p>
      </section>

      <section aria-labelledby="saga-heading" className="flex flex-col gap-4">
        <h2 id="saga-heading" className="text-2xl font-bold">
          The checkout saga
        </h2>
        <p className="text-slate-700 dark:text-slate-300">
          Checkout is a saga: a sequence of steps that each publish an event. If stock or payment
          fails, the saga ends in a cancelled order and undoes what it reserved.
        </p>
        <ol className="flex flex-col gap-3">
          {SAGA_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full bg-aura-600 text-sm font-bold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <h2 id="stack-heading" className="text-2xl font-bold">
          Tech stack
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {STACK.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="links-heading" className="flex flex-col gap-3">
        <h2 id="links-heading" className="text-2xl font-bold">
          Read the code
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          <li>
            <a
              className="font-medium text-aura-700 hover:underline dark:text-aura-400"
              href={config.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              Source repository
            </a>
          </li>
          <li>
            <a
              className="font-medium text-aura-700 hover:underline dark:text-aura-400"
              href={`${config.repoUrl}/blob/main/frontend/auramart-web/API_CONTRACT.md`}
              target="_blank"
              rel="noreferrer"
            >
              API contract
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

function ArchitectureDiagram() {
  const box = 'fill-white stroke-slate-400 dark:fill-slate-900 dark:stroke-slate-600';
  const label = 'fill-slate-900 text-[13px] font-semibold dark:fill-slate-100';
  const small = 'fill-slate-500 text-[11px] dark:fill-slate-400';
  return (
    <svg
      viewBox="0 0 760 360"
      className="mx-auto h-auto w-full min-w-[640px]"
      role="img"
      aria-labelledby="diagram-title diagram-desc"
    >
      <title id="diagram-title">AuraMart architecture</title>
      <desc id="diagram-desc">
        The browser calls the gateway on port 8080. The gateway routes to catalog-service,
        order-service, ai-assistant-service and notification-service. These use PostgreSQL, Redis,
        Kafka and the language model. Keycloak issues the login tokens.
      </desc>
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-500 dark:fill-slate-400" />
        </marker>
      </defs>
      <g
        stroke="currentColor"
        className="stroke-slate-500 dark:stroke-slate-400"
        strokeWidth="1.5"
        fill="none"
        markerEnd="url(#arrow)"
      >
        <path d="M 110 180 L 170 180" />
        <path d="M 290 180 L 330 80" />
        <path d="M 290 180 L 330 150" />
        <path d="M 290 180 L 330 220" />
        <path d="M 290 180 L 330 290" />
        <path d="M 470 80 L 540 60" />
        <path d="M 470 150 L 540 130" />
        <path d="M 470 220 L 540 200" />
        <path d="M 470 290 L 540 270" />
      </g>
      <rect x="20" y="150" width="90" height="60" rx="12" className={box} />
      <text x="65" y="185" textAnchor="middle" className={label}>
        Browser
      </text>

      <rect x="170" y="150" width="120" height="60" rx="12" className={box} />
      <text x="230" y="176" textAnchor="middle" className={label}>
        Gateway
      </text>
      <text x="230" y="194" textAnchor="middle" className={small}>
        :8080
      </text>

      <rect x="330" y="50" width="140" height="60" rx="12" className={box} />
      <text x="400" y="75" textAnchor="middle" className={label}>
        catalog-service
      </text>
      <text x="400" y="93" textAnchor="middle" className={small}>
        :8081
      </text>

      <rect x="330" y="120" width="140" height="60" rx="12" className={box} />
      <text x="400" y="145" textAnchor="middle" className={label}>
        order-service
      </text>
      <text x="400" y="163" textAnchor="middle" className={small}>
        :8082
      </text>

      <rect x="330" y="190" width="140" height="60" rx="12" className={box} />
      <text x="400" y="215" textAnchor="middle" className={label}>
        ai-assistant
      </text>
      <text x="400" y="233" textAnchor="middle" className={small}>
        :8083
      </text>

      <rect x="330" y="260" width="140" height="60" rx="12" className={box} />
      <text x="400" y="285" textAnchor="middle" className={label}>
        notification
      </text>
      <text x="400" y="303" textAnchor="middle" className={small}>
        :8084
      </text>

      <rect x="540" y="30" width="200" height="60" rx="12" className={box} />
      <text x="640" y="55" textAnchor="middle" className={label}>
        PostgreSQL
      </text>
      <text x="640" y="73" textAnchor="middle" className={small}>
        catalogue · pg_trgm · pgvector
      </text>

      <rect x="540" y="100" width="200" height="60" rx="12" className={box} />
      <text x="640" y="125" textAnchor="middle" className={label}>
        Kafka
      </text>
      <text x="640" y="143" textAnchor="middle" className={small}>
        order.events · inventory.events
      </text>

      <rect x="540" y="170" width="200" height="60" rx="12" className={box} />
      <text x="640" y="195" textAnchor="middle" className={label}>
        Redis
      </text>
      <text x="640" y="213" textAnchor="middle" className={small}>
        cache · rate limits
      </text>

      <rect x="540" y="240" width="200" height="60" rx="12" className={box} />
      <text x="640" y="265" textAnchor="middle" className={label}>
        LLM
      </text>
      <text x="640" y="283" textAnchor="middle" className={small}>
        Spring AI · tool calling
      </text>

      <rect x="20" y="20" width="110" height="46" rx="12" className={box} />
      <text x="75" y="48" textAnchor="middle" className={label}>
        Keycloak
      </text>
    </svg>
  );
}
