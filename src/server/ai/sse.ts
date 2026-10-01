/** Minimal Server-Sent-Events line parser shared by both providers. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
        if (line.startsWith('data:')) yield line.slice(5).trimStart();
      }
    }
    if (buf.startsWith('data:')) yield buf.slice(5).trimStart();
  } finally { reader.releaseLock(); }
}
