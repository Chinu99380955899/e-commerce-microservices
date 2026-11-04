import { useSyncExternalStore } from 'react';
import { ApiError } from '../../api/client';
import { streamChat, MAX_MESSAGE_LENGTH, type AssistantEvent } from '../../api/assistant';
import { readJson, writeJson } from '../../lib/storage';

export const CONVERSATION_KEY = 'auramart.assistant.v1';
const MAX_STORED_MESSAGES = 60;

export type ChatRole = 'user' | 'assistant';
export type ReplyStatus = 'streaming' | 'done' | 'stopped' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ReplyStatus;
  /** Human message for an error reply, shown with a Retry button. */
  error?: string;
}

export interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  /** Which tool is running right now, for the "Searching the catalogue…" indicator. */
  activeTool: 'searchProducts' | 'getOrderStatus' | null;
  sending: boolean;
  /** Message to retry after an error. */
  lastUserMessage: string | null;
}

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string' &&
    (candidate.status === 'streaming' ||
      candidate.status === 'done' ||
      candidate.status === 'stopped' ||
      candidate.status === 'error')
  );
}

function isStored(
  value: unknown,
): value is { conversationId: string | null; messages: ChatMessage[] } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.conversationId === null || typeof candidate.conversationId === 'string') &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isMessage)
  );
}

function loadInitial(): ConversationState {
  const stored = readJson(
    CONVERSATION_KEY,
    null,
    (value): value is { conversationId: string | null; messages: ChatMessage[] } | null =>
      value === null || isStored(value),
  );
  // A reply that was still streaming when the page closed is marked as stopped.
  const messages = (stored?.messages ?? []).map((message) =>
    message.status === 'streaming' ? { ...message, status: 'stopped' as const } : message,
  );
  return {
    conversationId: stored?.conversationId ?? null,
    messages,
    activeTool: null,
    sending: false,
    lastUserMessage:
      [...messages].reverse().find((message) => message.role === 'user')?.content ?? null,
  };
}

let state: ConversationState = loadInitial();
const listeners = new Set<() => void>();
let controller: AbortController | null = null;
let activeReplyId: string | null = null;
let counter = 0;

function nextId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

function setState(next: Partial<ConversationState>, persist = false): void {
  state = { ...state, ...next };
  if (persist) {
    writeJson(CONVERSATION_KEY, {
      conversationId: state.conversationId,
      messages: state.messages.slice(-MAX_STORED_MESSAGES),
    });
  }
  for (const listener of listeners) listener();
}

function updateReply(
  id: string,
  update: (message: ChatMessage) => ChatMessage,
  persist = false,
): void {
  setState(
    {
      messages: state.messages.map((message) => (message.id === id ? update(message) : message)),
    },
    persist,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): ConversationState {
  return state;
}

export function useConversation(): ConversationState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function validateMessage(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'Type a question first.';
  if (trimmed.length > MAX_MESSAGE_LENGTH) return `Keep it under ${MAX_MESSAGE_LENGTH} characters.`;
  return null;
}

/** Sends a question and streams the reply into the conversation. Only one reply runs at a time. */
export async function sendMessage(text: string): Promise<void> {
  const trimmed = text.trim();
  if (state.sending || validateMessage(trimmed)) return;

  const userMessage: ChatMessage = { id: nextId(), role: 'user', content: trimmed, status: 'done' };
  const reply: ChatMessage = { id: nextId(), role: 'assistant', content: '', status: 'streaming' };
  setState(
    {
      messages: [...state.messages, userMessage, reply],
      sending: true,
      lastUserMessage: trimmed,
      activeTool: null,
    },
    true,
  );
  await streamInto(reply.id, trimmed);
}

/** Retries the last question after an error, replacing the failed reply. */
export async function retryLast(): Promise<void> {
  const lastUser = state.lastUserMessage;
  if (!lastUser || state.sending) return;
  const reply: ChatMessage = { id: nextId(), role: 'assistant', content: '', status: 'streaming' };
  const withoutFailed = state.messages.filter((message, index, all) => {
    const isLastErrorReply =
      message.role === 'assistant' && message.status === 'error' && index === all.length - 1;
    return !isLastErrorReply;
  });
  setState({ messages: [...withoutFailed, reply], sending: true, activeTool: null }, true);
  await streamInto(reply.id, lastUser);
}

/** Updates a reply only while it is still streaming: late events after a Stop are ignored. */
function updateStreaming(
  replyId: string,
  update: (message: ChatMessage) => ChatMessage,
  persist = false,
): void {
  updateReply(
    replyId,
    (message) => (message.status === 'streaming' ? update(message) : message),
    persist,
  );
}

async function streamInto(replyId: string, question: string): Promise<void> {
  controller = new AbortController();
  activeReplyId = replyId;
  const { signal } = controller;
  try {
    await streamChat({
      conversationId: state.conversationId ?? undefined,
      message: question,
      signal,
      onEvent: (event: AssistantEvent) => handleEvent(replyId, event),
    });
    updateStreaming(replyId, (message) => ({ ...message, status: 'done' }), true);
  } catch (error) {
    // Aborting a read can surface as an AbortError or as a network error, so the signal decides.
    if (signal.aborted) {
      updateStreaming(replyId, (message) => ({ ...message, status: 'stopped' }), true);
    } else {
      const description =
        error instanceof ApiError ? error.message : 'The assistant could not reply. Try again.';
      updateReply(
        replyId,
        (message) => ({ ...message, status: 'error', error: description }),
        true,
      );
    }
  } finally {
    controller = null;
    activeReplyId = null;
    setState({ sending: false, activeTool: null }, true);
  }
}

function handleEvent(replyId: string, event: AssistantEvent): void {
  switch (event.type) {
    case 'meta':
      setState({ conversationId: event.conversationId }, true);
      return;
    case 'tool':
      setState({ activeTool: event.status === 'started' ? event.name : null });
      return;
    case 'token':
      updateStreaming(replyId, (message) => ({
        ...message,
        content: message.content + event.text,
      }));
      return;
    case 'done':
      updateStreaming(replyId, (message) => ({ ...message, status: 'done' }), true);
      return;
    case 'error':
      updateStreaming(
        replyId,
        (message) => ({ ...message, status: 'error', error: event.message }),
        true,
      );
      return;
  }
}

/**
 * Stops the reply in progress. The text received so far is kept and marked as stopped straight away,
 * so the Stop button responds at once even if the network stream takes a moment to close.
 */
export function stopReply(): void {
  if (!controller || !activeReplyId) return;
  controller.abort();
  updateStreaming(activeReplyId, (message) => ({ ...message, status: 'stopped' }), true);
  setState({ sending: false, activeTool: null }, true);
}

/** Clears the conversation: a new chat starts with no conversation ID. */
export function newChat(): void {
  if (state.sending) controller?.abort();
  setState(
    { conversationId: null, messages: [], activeTool: null, sending: false, lastUserMessage: null },
    true,
  );
}

/** Product IDs linked from an assistant reply, in order of first mention, at most three. */
export function productIdsInReply(content: string): string[] {
  const ids: string[] = [];
  const pattern = /\]\(\/products\/([0-9a-f-]{36})\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const id = match[1];
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === 3) break;
  }
  return ids;
}
