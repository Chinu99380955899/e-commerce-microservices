import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse';

function collect(chunks: string[]): string[] {
  const events: string[] = [];
  const parser = createSseParser((data) => events.push(data));
  for (const chunk of chunks) parser.feed(chunk);
  parser.end();
  return events;
}

describe('createSseParser', () => {
  it('parses a complete event', () => {
    expect(collect(['data: {"type":"done"}\n\n'])).toEqual(['{"type":"done"}']);
  });

  it('handles a frame split across chunks, even in the middle of the JSON', () => {
    const events = collect(['data: {"type":"tok', 'en","text":"Hel', 'lo"}\n', '\n']);
    expect(events).toEqual(['{"type":"token","text":"Hello"}']);
  });

  it('handles a line break split across two chunks', () => {
    const events = collect(['data: {"a":1}\r', '\n\r', '\n']);
    expect(events).toEqual(['{"a":1}']);
  });

  it('joins multi-line data fields with newlines', () => {
    expect(collect(['data: first\ndata: second\n\n'])).toEqual(['first\nsecond']);
  });

  it('ignores comment and keep-alive lines', () => {
    expect(collect([': keep-alive\n\n', 'data: x\n\n', ':\n\n'])).toEqual(['x']);
  });

  it('ignores fields other than data', () => {
    expect(collect(['event: message\nid: 7\ndata: y\n\n'])).toEqual(['y']);
  });

  it('dispatches a final event that was not followed by a blank line', () => {
    expect(collect(['data: last'])).toEqual(['last']);
  });

  it('keeps several events in order', () => {
    expect(collect(['data: 1\n\ndata: 2\n\n', 'data: 3\n\n'])).toEqual(['1', '2', '3']);
  });
});
