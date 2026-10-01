/** Incremental Server-Sent Events parser for the browser. Pure, so it is unit-tested under Node. */
export function createSseParser(onData: (data: string) => void): (chunk: string) => void {
  let buf = '';
  return (chunk: string) => {
    buf += chunk.replace(/\r\n/g, '\n');
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).replace(/^ /, '')).join('\n');
      if (data) onData(data);
    }
  };
}
