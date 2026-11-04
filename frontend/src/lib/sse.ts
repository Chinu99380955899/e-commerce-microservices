/**
 * Incremental parser for text/event-stream. Feed it decoded text chunks in any split; it calls
 * `onData` once per complete event. Handles lines split across chunks, multi-line `data:` fields,
 * comment lines (":" keep-alives) and CRLF line endings.
 */
export interface SseParser {
  feed(chunk: string): void;
  /** Flushes a final event that was not terminated by a blank line. */
  end(): void;
}

export function createSseParser(onData: (data: string) => void): SseParser {
  let buffer = '';
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0) {
      onData(dataLines.join('\n'));
    }
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') dataLines.push(value);
  };

  return {
    feed(chunk: string) {
      buffer += chunk;
      let newline = buffer.indexOf('\n');
      while (newline !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        processLine(line);
        newline = buffer.indexOf('\n');
      }
    },
    end() {
      if (buffer.length > 0) {
        processLine(buffer);
        buffer = '';
      }
      dispatch();
    },
  };
}
