import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Only internal product links are clickable. Raw HTML is never rendered (react-markdown escapes it). */
const PRODUCT_HREF = /^\/products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const components: Components = {
  a({ href, children }: ComponentPropsWithoutRef<'a'>) {
    if (href && PRODUCT_HREF.test(href)) {
      return (
        <Link
          to={href}
          className="font-medium text-aura-700 underline underline-offset-2 hover:text-aura-800 dark:text-aura-400"
        >
          {children}
        </Link>
      );
    }
    // Every other link is shown as plain text, so the assistant cannot send people elsewhere.
    return <span>{children}</span>;
  },
  img() {
    return null;
  },
  p({ children }) {
    return <p className="my-2 first:mt-0 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>;
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  code({ children }) {
    return (
      <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-800">
        {children}
      </code>
    );
  },
};

export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
