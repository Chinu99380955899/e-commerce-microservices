import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { formatInteger } from '../../lib/format';
import { buildPageList } from '../../lib/pagination';

export interface PaginationProps {
  /** 1-based page, as shown to people and stored in the URL. */
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Numbered pagination with "Showing 13–24 of 40". Pages are 1-based here. */
export function Pagination({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalElements === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalElements);
  const pages = buildPageList(page, totalPages);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
        Showing {formatInteger(first)}–{formatInteger(last)} of {formatInteger(totalElements)}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft className="size-4" aria-hidden="true" />}
        >
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Button>
        {pages.map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? 'primary' : 'ghost'}
              size="sm"
              aria-current={entry === page ? 'page' : undefined}
              aria-label={`Page ${entry}`}
              className="min-w-9 px-2"
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          icon={<ChevronRight className="size-4" aria-hidden="true" />}
        >
          <span className="sr-only sm:not-sr-only">Next</span>
        </Button>
      </div>
    </nav>
  );
}
