import { useSearchParams } from 'react-router';
import { useDocumentTitle } from '../../app/hooks';
import { ChatPanel } from './ChatPanel';

/** Full-page assistant. Shares its conversation with the drawer. ?q= pre-fills a question. */
export function AssistantPage() {
  useDocumentTitle('Ask Aura');
  const [params] = useSearchParams();
  const prefill = params.get('q');
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ask Aura</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your AuraMart shopping assistant. The same conversation opens in the header drawer.
        </p>
      </header>
      <div className="flex h-[calc(100dvh-14rem)] min-h-[480px] flex-col">
        <ChatPanel prefill={prefill} />
      </div>
    </div>
  );
}
