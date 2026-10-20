/** Bounded fetch feasibility probe; client policy and errors belong to S5. */
export async function boundedFetch(url: string, options: {limit?: number; timeoutMs?: number; signal?: AbortSignal} = {}): Promise<string> {
  const {limit = 1024, timeoutMs = 1000, signal} = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(abort, timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, {signal: controller.signal, redirect: 'error', credentials: 'omit'});
    if (response.status !== 200 || !response.body) throw new Error('Unexpected response');
    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', {fatal: true});
    let size = 0;
    let result = '';
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) throw new Error('Response exceeds limit');
      result += decoder.decode(next.value, {stream: true});
    }
    return result + decoder.decode();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
