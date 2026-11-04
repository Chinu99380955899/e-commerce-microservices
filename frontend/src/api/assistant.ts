import { z } from 'zod';
import { ApiError, buildUrl, getRequestIdentity, request } from './client';
import { assistantChatSchema, problemSchema, type AssistantChatResponse } from './schemas';
import { createSseParser } from '../lib/sse';

export const MAX_MESSAGE_LENGTH = 1000;

export const assistantEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meta'), conversationId: z.string() }),
  z.object({
    type: z.literal('tool'),
    name: z.enum(['searchProducts', 'getOrderStatus']),
    status: z.enum(['started', 'finished']),
  }),
  z.object({ type: z.literal('token'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type AssistantEvent = z.infer<typeof assistantEventSchema>;

export interface StreamChatOptions {
  conversationId?: string;
  message: string;
  signal?: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}

/** Headers shared by every call, mirroring api/client.ts. */
function identityHeaders(): Record<string, string> {
  const identity = getRequestIdentity();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'X-Request-Id': crypto.randomUUID(),
  };
  if (identity.customerId) headers['X-Customer-Id'] = identity.customerId;
  if (identity.accessToken) headers.Authorization = `Bearer ${identity.accessToken}`;
  return headers;
}

/**
 * Streams one assistant reply. Uses fetch and reads the body, because EventSource cannot send POST.
 * Resolves when the stream ends with `done`; rejects with ApiError on HTTP errors and on `error` events.
 */
export async function streamChat({
  conversationId,
  message,
  signal,
  onEvent,
}: StreamChatOptions): Promise<void> {
  let response: Response;
  try {
    response = await fetch(buildUrl('/assistant/chat/stream', undefined), {
      method: 'POST',
      headers: identityHeaders(),
      body: JSON.stringify({ conversationId, message }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      message: 'Network error. Check your connection and try again.',
      status: 0,
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    let problem: ApiError['problem'] = null;
    try {
      const parsed = problemSchema.safeParse(await response.json());
      if (parsed.success) problem = parsed.data;
    } catch {
      problem = null;
    }
    throw new ApiError({
      message: problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}`,
      status: response.status,
      problem,
    });
  }
  if (!response.body) {
    throw new ApiError({
      message: 'The assistant returned an empty reply.',
      status: response.status,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // An object, so TypeScript does not narrow these to their initial values across the callback.
  const state: { error: ApiError | null; finished: boolean } = { error: null, finished: false };

  const parser = createSseParser((data) => {
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      if (import.meta.env.DEV) console.warn('[assistant] Ignoring a malformed stream event', data);
      return;
    }
    const parsed = assistantEventSchema.safeParse(json);
    if (!parsed.success) {
      if (import.meta.env.DEV) console.warn('[assistant] Unknown stream event', json);
      return;
    }
    const event = parsed.data;
    if (event.type === 'error') {
      state.error = new ApiError({ message: event.message, status: 500 });
      return;
    }
    if (event.type === 'done') state.finished = true;
    onEvent(event);
  });

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
  parser.feed(decoder.decode());
  parser.end();

  if (state.error) throw state.error;
  if (!state.finished && !signal?.aborted) {
    throw new ApiError({
      message: 'The reply was cut short. Try again.',
      status: 0,
      isNetworkError: true,
    });
  }
}

/** Non-streaming fallback (POST /assistant/chat). */
export function chatOnce(
  conversationId: string | undefined,
  message: string,
  signal?: AbortSignal,
): Promise<AssistantChatResponse> {
  return request('/assistant/chat', {
    method: 'POST',
    body: { conversationId, message },
    schema: assistantChatSchema,
    signal,
  });
}
