import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { ArrowDown, Bot, Loader2, RotateCcw, Send, Square, SquarePen, User } from 'lucide-react';
import { productQuery } from '../../api/products';
import { useAddToCart } from '../../api/cart';
import { MAX_MESSAGE_LENGTH } from '../../api/assistant';
import { formatMoney } from '../../lib/format';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { ProductArt } from '../../components/ui/ProductArt';
import { StockBadge } from '../../components/ui/Status';
import { AssistantMarkdown } from './AssistantMarkdown';
import {
  newChat,
  productIdsInReply,
  retryLast,
  sendMessage,
  stopReply,
  useConversation,
  validateMessage,
  type ChatMessage,
} from './conversationStore';
import type { Product } from '../../api/schemas';

const SUGGESTIONS = [
  'I need something to keep tea hot on a long train trip',
  'Suggest earbuds under ₹5,000 for the gym',
  'Is the power bank in stock?',
  'Where is my order?',
];

const TOOL_LABELS = {
  searchProducts: 'Searching the catalogue…',
  getOrderStatus: 'Checking your order…',
} as const;

/** The chat used by both the drawer and the /assistant page: one shared conversation. */
export function ChatPanel({
  prefill,
  compact = false,
}: {
  prefill?: string | null;
  compact?: boolean;
}) {
  const conversation = useConversation();
  const [draft, setDraft] = useState(prefill ?? '');
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const counterId = useId();
  const lastAnnounced = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // The parent remounts this panel when the prefill changes, so the draft starts from it.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const messages = conversation.messages;
  const lastMessage = messages.at(-1);
  const streamingText =
    lastMessage?.role === 'assistant' && lastMessage.status === 'streaming'
      ? lastMessage.content
      : '';

  // Keep the newest text in view while the user is at the bottom; otherwise leave their place alone.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && atBottom) list.scrollTop = list.scrollHeight;
  }, [messages, streamingText, atBottom]);

  // Screen readers hear the finished reply once, not every token.
  useEffect(() => {
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.status === 'done' &&
      lastMessage.id !== lastAnnounced.current
    ) {
      lastAnnounced.current = lastMessage.id;
      setAnnouncement(lastMessage.content.replace(/\]\(\/products\/[^)]*\)/g, ']'));
    }
  }, [lastMessage]);

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    setAtBottom(list.scrollHeight - list.scrollTop - list.clientHeight < 80);
  };

  const jumpToLatest = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    setAtBottom(true);
  };

  const submit = () => {
    const problem = validateMessage(draft);
    if (problem) {
      toast.error('Message not sent', problem);
      return;
    }
    const text = draft;
    setDraft('');
    setAtBottom(true);
    void sendMessage(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!conversation.sending) submit();
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - draft.length;
  const toolLabel = conversation.activeTool ? TOOL_LABELS[conversation.activeTool] : null;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', compact ? 'gap-3' : 'gap-4')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aura answers from the AuraMart catalogue and your orders only.
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={conversation.sending}
          onClick={() => newChat()}
          icon={<SquarePen className="size-4" aria-hidden="true" />}
        >
          New chat
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex h-full min-h-64 flex-col gap-4 overflow-y-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"
          role="log"
          aria-label="Conversation with Aura"
          aria-live="off"
        >
          {messages.length === 0 ? (
            <Welcome />
          ) : (
            messages.map((message) => (
              <Bubble key={message.id} message={message} onRetry={() => void retryLast()} />
            ))
          )}
          {toolLabel ? (
            <div
              role="status"
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {toolLabel}
            </div>
          ) : null}
        </div>
        {!atBottom ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            Jump to latest
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => {
                setDraft(question);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!conversation.sending) submit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Ask Aura a question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Ask about products, stock or your order…"
            aria-describedby={counterId}
            aria-invalid={remaining < 0 || undefined}
            className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {conversation.sending ? (
            <Button
              variant="secondary"
              onClick={() => stopReply()}
              aria-label="Stop the reply"
              icon={<Square className="size-4 fill-current" aria-hidden="true" />}
            >
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={draft.trim().length === 0 || remaining < 0}
              aria-label="Send"
              icon={<Send className="size-4" aria-hidden="true" />}
            >
              Send
            </Button>
          )}
        </div>
        <p
          id={counterId}
          className={cn(
            'text-right text-xs',
            remaining < 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {draft.length}/{MAX_MESSAGE_LENGTH} · Enter to send, Shift+Enter for a new line
        </p>
      </form>
    </div>
  );
}

function Welcome() {
  return (
    <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        Hi, I am Aura. What can I help you find?
      </p>
      <p>
        I can search by meaning, check stock, compare prices and track your latest order. Pick a
        question below to start.
      </p>
    </div>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          isUser
            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            : 'bg-gradient-to-br from-aura-600 to-violet-600 text-white',
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-2', isUser && 'items-end')}>
        <div
          aria-hidden={streaming || undefined}
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            isUser
              ? 'whitespace-pre-wrap bg-aura-600 text-white'
              : 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100',
            message.status === 'error' && 'border border-red-200 dark:border-red-900',
          )}
        >
          {isUser ? (
            message.content
          ) : message.content ? (
            <AssistantMarkdown content={message.content} />
          ) : streaming ? (
            <span className="text-slate-500">…</span>
          ) : null}
          {streaming && message.content ? (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-aura-600 align-middle"
              aria-hidden="true"
            />
          ) : null}
          {message.status === 'stopped' ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Stopped.</p>
          ) : null}
        </div>
        {message.status === 'error' ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 text-sm text-red-800 dark:text-red-300"
          >
            <span>{message.error ?? 'The reply failed.'}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {!isUser && message.status === 'done' ? <ReplyProducts content={message.content} /> : null}
      </div>
    </div>
  );
}

/** Product cards for the products an assistant reply links to, with price, stock and Add to cart. */
function ReplyProducts({ content }: { content: string }) {
  const ids = productIdsInReply(content);
  const results = useQueries({ queries: ids.map((id) => productQuery(id)) });
  const products = results.flatMap((result) => (result.data ? [result.data] : []));
  if (products.length === 0) return null;
  return (
    <ul className="grid w-full gap-2 sm:grid-cols-2" aria-label="Products mentioned">
      {products.map((product) => (
        <li key={product.id}>
          <MiniProduct product={product} />
        </li>
      ))}
    </ul>
  );
}

function MiniProduct({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const outOfStock = product.stockQuantity === 0;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <ProductArt sku={product.sku} category={product.category} brand={null} size="sm" />
      <div className="min-w-0 flex-1">
        <Link
          to={`/products/${product.id}`}
          className="block truncate text-sm font-medium hover:text-aura-700 dark:hover:text-aura-400"
        >
          {product.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">{formatMoney(product.price, product.currency)}</span>
          <StockBadge quantity={product.stockQuantity} />
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={outOfStock}
        loading={addToCart.isPending}
        onClick={() =>
          addToCart.mutate(
            { productId: product.id, quantity: 1 },
            { onSuccess: () => toast.success('Added to your cart', product.name) },
          )
        }
      >
        Add to cart
      </Button>
    </div>
  );
}
