import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bot, Search } from 'lucide-react';
import { productKeys, searchProducts, useSemanticSearch } from '../../api/products';
import { useDocumentTitle } from '../../app/hooks';
import { useAssistantUi } from '../assistant/assistantUi';
import { ProductCard } from '../../components/ui/ProductCard';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Status';
import { cn } from '../../lib/cn';

const PAGE_SIZE = 12;

type Mode = 'keyword' | 'semantic';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const mode: Mode = params.get('mode') === 'semantic' ? 'semantic' : 'keyword';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  useDocumentTitle(q ? `Search: ${q}` : 'Search');

  const setMode = (next: Mode) => {
    const updated = new URLSearchParams(params);
    updated.set('mode', next);
    updated.delete('page');
    setParams(updated);
  };
  const setPage = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next > 1) updated.set('page', String(next));
    else updated.delete('page');
    setParams(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {q ? `Results for “${q}”` : 'Search'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {mode === 'keyword'
              ? 'Matches names, brands and categories, tolerant of typos.'
              : 'Matches what you mean, not only the words you used.'}
          </p>
        </div>
        <fieldset className="inline-flex w-fit rounded-xl border border-slate-300 p-1 dark:border-slate-700">
          <legend className="sr-only">Search mode</legend>
          <ModeButton active={mode === 'keyword'} onClick={() => setMode('keyword')}>
            Keyword
          </ModeButton>
          <ModeButton active={mode === 'semantic'} onClick={() => setMode('semantic')}>
            By meaning
          </ModeButton>
        </fieldset>
      </header>

      {!q ? (
        <EmptyState
          icon={<Search className="size-10" aria-hidden="true" />}
          title="What are you looking for?"
          description="Type a product in the search box above, or ask Aura for ideas."
        />
      ) : mode === 'keyword' ? (
        <KeywordResults q={q} page={page} onPageChange={setPage} />
      ) : (
        <SemanticResults q={q} />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-lg px-4 py-1.5 text-sm font-medium',
        active
          ? 'bg-aura-600 text-white'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}

function AskAuraFallback({ q }: { q: string }) {
  const { openAssistant } = useAssistantUi();
  return (
    <EmptyState
      title={`Nothing matched “${q}”`}
      description="Try a different word, or ask the assistant the same question in plain language."
      action={
        <Button
          variant="secondary"
          icon={<Bot className="size-4 text-aura-600 dark:text-aura-400" aria-hidden="true" />}
          onClick={() => openAssistant(q)}
        >
          Ask Aura this
        </Button>
      }
    />
  );
}

function KeywordResults({
  q,
  page,
  onPageChange,
}: {
  q: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const query = useQuery({
    queryKey: productKeys.search(q, page - 1, PAGE_SIZE),
    queryFn: ({ signal }) => searchProducts(q, page - 1, PAGE_SIZE, signal),
  });
  if (query.isPending) return <ResultsSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.content.length === 0) return <AskAuraFallback q={q} />;
  return (
    <>
      <ResultsGrid products={query.data.content} />
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        totalElements={query.data.page.totalElements}
        totalPages={query.data.page.totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
}

function SemanticResults({ q }: { q: string }) {
  const query = useSemanticSearch(q, 12);
  if (query.isPending) return <ResultsSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const results = query.data.results;
  if (results.length === 0) return <AskAuraFallback q={q} />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {results.map(({ product, score }) => {
        const percent = Math.round(score * 100);
        return (
          <li key={product.id} className="flex flex-col gap-2">
            <div
              aria-label={`Match: ${percent}%`}
              className="flex items-center gap-3 px-1 text-xs text-slate-600 dark:text-slate-400"
            >
              <span className="w-16 shrink-0">{percent}% match</span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aura-500 to-violet-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <ProductCard product={product} />
          </li>
        );
      })}
      <li className="sm:col-span-2 xl:col-span-3">
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Not what you wanted?{' '}
          <Link
            to={`/search?q=${encodeURIComponent(q)}&mode=keyword`}
            className="font-medium text-aura-700 hover:underline dark:text-aura-400"
          >
            Try keyword search
          </Link>
        </p>
      </li>
    </ul>
  );
}

function ResultsGrid({ products }: { products: Parameters<typeof ProductCard>[0]['product'][] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-72" />
      ))}
    </div>
  );
}
