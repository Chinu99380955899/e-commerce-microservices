import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Bot, Search, Sparkles } from 'lucide-react';
import { useAllProducts, useProducts } from '../../api/products';
import { useDocumentTitle } from '../../app/hooks';
import { useAssistantUi } from '../assistant/assistantUi';
import { CATEGORIES } from '../../lib/categories';
import { formatInteger } from '../../lib/format';
import { ProductCard } from '../../components/ui/ProductCard';
import { Button } from '../../components/ui/Button';
import { ErrorState, Skeleton } from '../../components/ui/Status';

const EXAMPLE_QUESTIONS = [
  'Something to keep tea hot on a long train trip',
  'Suggest earbuds under ₹5,000 for the gym',
  'A bag for my laptop',
];

export function HomePage() {
  useDocumentTitle();
  return (
    <div className="flex flex-col gap-14">
      <Hero />
      <Categories />
      <NewArrivals />
      <UnderBudget />
      <HowItWorks />
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  const { openAssistant } = useAssistantUi();
  const [q, setQ] = useState('');
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const term = q.trim();
    if (!term) return;
    void navigate(`/search?q=${encodeURIComponent(term)}&mode=keyword`);
  };
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-aura-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-white sm:px-12 sm:py-16"
    >
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="flex flex-col gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <Sparkles className="size-4" aria-hidden="true" />
            Shopping, with an assistant that knows the catalogue
          </p>
          <h1 id="hero-heading" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find the right thing, faster.
          </h1>
          <p className="max-w-xl text-base text-white/90 sm:text-lg">
            Search by name or by meaning. Ask Aura for ideas, check stock and follow your order, all
            in one place.
          </p>
          <form
            onSubmit={submit}
            role="search"
            className="flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search the catalogue
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="hero-search"
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Try “hedphones” or “flask”"
                className="h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-500"
              />
            </div>
            <Button size="lg" type="submit">
              Search
            </Button>
          </form>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Ask Aura</h2>
            <Bot className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-1 text-sm text-white/85">Try one of these:</p>
          <ul className="mt-4 flex flex-col gap-2">
            {EXAMPLE_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => openAssistant(question)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/15 px-4 py-3 text-left text-sm font-medium hover:bg-white/25"
                >
                  <span>“{question}”</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => openAssistant()}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-aura-700 shadow-sm hover:bg-white/90"
          >
            Ask Aura anything
          </button>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const all = useAllProducts();
  const counts = new Map<string, number>();
  for (const product of all.data ?? [])
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  return (
    <section aria-labelledby="categories-heading">
      <div className="flex items-end justify-between gap-4">
        <h2 id="categories-heading" className="text-2xl font-bold tracking-tight">
          Shop by category
        </h2>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {CATEGORIES.map((category) => (
          <li key={category.key}>
            <Link
              to={`/products?category=${category.key}`}
              className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-aura-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-aura-700"
            >
              <category.icon
                className="size-7 text-aura-600 dark:text-aura-400"
                aria-hidden="true"
              />
              <span className="font-semibold">{category.label}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {all.isPending ? '…' : `${formatInteger(counts.get(category.key) ?? 0)} products`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductRow({
  title,
  id,
  children,
  moreTo,
}: {
  title: string;
  id: string;
  children: ReactNode;
  moreTo: string;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <Link
          to={moreTo}
          className="text-sm font-medium text-aura-700 hover:underline dark:text-aura-400"
        >
          See all
        </Link>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NewArrivals() {
  const query = useProducts({ page: 0, size: 4, sort: 'createdAt,desc' });
  return (
    <ProductRow title="New arrivals" id="new-heading" moreTo="/products?sort=createdAt%2Cdesc">
      {query.isPending ? (
        <RowSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {query.data.content.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </ProductRow>
  );
}

function UnderBudget() {
  const all = useAllProducts();
  const items = (all.data ?? [])
    .filter((product) => product.price < 1500 && product.stockQuantity > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
  return (
    <ProductRow title="Under ₹1,500" id="budget-heading" moreTo="/products?sort=price%2Casc">
      {all.isPending ? (
        <RowSkeleton />
      ) : all.isError ? (
        <ErrorState error={all.error} onRetry={() => void all.refetch()} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </ProductRow>
  );
}

function RowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-72" />
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="how-heading" className="text-xl font-bold">
            How AuraMart works
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Checkout runs as an event-driven saga: stock is reserved, payment is taken and the order
            is confirmed, step by step.
          </p>
        </div>
        <Link
          to="/about"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          See the architecture
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
