// Finds user-visible string literals in .tsx that bypass the translation system.
// Used by tests/i18n.test.ts and runnable directly: node --experimental-strip-types scripts/i18n-scan.ts
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface Finding { file: string; line: number; text: string; kind: 'jsx-text' | 'attr' | 'meta' | 'expr' }
const VISIBLE_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label']);
// Brand names, units and symbols that are intentionally identical in every language.
export const ALLOW = new Set(['JOLIFY', 'JOLIFY AI', 'Jolify AI', 'Jolify', 'AI', 'USD', '$', 'km', 'm', 'Google Maps', '2GIS', 'EN', 'RU', 'KY', 'KG', 'OK', 'ID', 'JSON', '×', '·', '→', '←', '/', '—', '|', '+', '-', '#', '%', 'Claude', 'Mapbox', 'OpenStreetMap', 'Supabase', 'Anthropic', 'Kyrgyzstan AI', 'https://']);
const hasWords = (s: string) => /[A-Za-z]{2,}/.test(s) && !ALLOW.has(s.trim());

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

export function scan(root: string): Finding[] {
  const found: Finding[] = [];
  for (const file of walk(join(root, 'src'))) {
    const src = readFileSync(file, 'utf8');
    if (/^\s*\/\/ i18n-exempt/m.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const rel = relative(root, file);
    const add = (n: ts.Node, text: string, kind: Finding['kind']) => {
      const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      const lineText = src.split('\n')[line - 1] ?? '';
      if (/i18n-ignore/.test(lineText)) return;
      found.push({ file: rel, line, text: text.trim().slice(0, 80), kind });
    };
    const visit = (n: ts.Node) => {
      if (ts.isJsxText(n) && hasWords(n.text.trim()) && n.text.trim()) add(n, n.text, 'jsx-text');
      if (ts.isJsxAttribute(n) && VISIBLE_ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer) && hasWords(n.initializer.text)) add(n, n.initializer.text, 'attr');
      if (ts.isJsxExpression(n) && n.expression && ts.isStringLiteral(n.expression) && hasWords(n.expression.text) && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) add(n, n.expression.text, 'jsx-text');
      // {cond ? 'Text' : x} and {x || 'Text'} inside JSX children or visible attributes
      if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent) || (ts.isJsxAttribute(n.parent) && VISIBLE_ATTRS.has(n.parent.name.getText())))) {
        const branches = (e: ts.Expression): ts.Expression[] => ts.isParenthesizedExpression(e) ? branches(e.expression)
          : ts.isConditionalExpression(e) ? [...branches(e.whenTrue), ...branches(e.whenFalse)]
          : ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind) ? [e.right] : [e];
        for (const b of branches(n.expression)) if (b !== n.expression && (ts.isStringLiteral(b) || ts.isNoSubstitutionTemplateLiteral(b)) && hasWords(b.text)) add(b, b.text, 'expr');
      }
      // export const metadata = { title: 'English' } bypasses the dictionary: use generateMetadata + getDict
      if (ts.isPropertyAssignment(n) && ['title', 'description'].includes(n.name.getText()) && ts.isStringLiteral(n.initializer) && hasWords(n.initializer.text)) {
        let p: ts.Node | undefined = n.parent;
        while (p && !ts.isVariableDeclaration(p)) p = p.parent;
        if (p && ts.isVariableDeclaration(p) && p.name.getText() === 'metadata') add(n, n.initializer.text, 'meta');
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return found;
}

if (process.argv[1]?.endsWith('i18n-scan.ts')) {
  const f = scan(process.cwd());
  for (const x of f) console.log(`${x.file}:${x.line} [${x.kind}] ${x.text}`);
  console.log(f.length + ' finding(s)');
}
