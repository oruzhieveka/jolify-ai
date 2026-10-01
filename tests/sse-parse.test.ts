import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../src/core/sse-parse.ts';
test('SSE parser handles split chunks and multiple events', () => {
  const out: string[] = []; const p = createSseParser((d) => out.push(d));
  p('data: {"a"'); p(':1}\n\ndata: {"b":2}\r\n\r\nda'); p('ta: x\n\n');
  assert.deepEqual(out, ['{"a":1}', '{"b":2}', 'x']);
});
