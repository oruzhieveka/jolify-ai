import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../scripts/i18n-scan.ts';
test('no hardcoded user-visible strings in .tsx (JSX text, visible attributes, ternaries, static metadata)', () => {
  const f = scan(process.cwd());
  assert.deepEqual(f.map((x) => x.file + ':' + x.line + ' ' + x.text), []);
});
