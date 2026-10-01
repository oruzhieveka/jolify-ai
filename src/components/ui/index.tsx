// Hand-written shadcn/ui-style primitives (same API shape, no generator needed).
import * as React from 'react';
import { cn } from '@/lib/utils';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
const btn: Record<BtnVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90 shadow-sm',
  secondary: 'bg-glacier-100 text-ink hover:bg-glacier-200',
  outline: 'border border-ink/15 bg-white text-ink hover:bg-ink/5',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
export function buttonClass(variant: BtnVariant = 'primary', size: 'sm' | 'md' | 'lg' = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm',
    btn[variant],
  );
}
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant, size, ...p }, ref) => <button ref={ref} className={cn(buttonClass(variant, size), className)} {...p} />,
);
Button.displayName = 'Button';

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-ink/10 bg-white shadow-[0_1px_2px_rgba(11,18,32,.04),0_8px_24px_-12px_rgba(11,18,32,.12)]', className)} {...p} />;
}
export function Badge({ className, tone = 'neutral', ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'warn' | 'ok' | 'bad' | 'info' }) {
  const t = { neutral: 'bg-ink/5 text-ink/70', warn: 'bg-amber-100 text-amber-900', ok: 'bg-emerald-100 text-emerald-900', bad: 'bg-red-100 text-red-900', info: 'bg-glacier-100 text-glacier-900' }[tone];
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', t, className)} {...p} />;
}
const field = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-glacier-500 focus:outline-none focus:ring-2 focus:ring-glacier-500/20 disabled:opacity-60';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-10', className)} {...p} />);
Input.displayName = 'Input';
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, className)} {...p} />);
Textarea.displayName = 'Textarea';
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => <select ref={ref} className={cn(field, 'h-10', className)} {...p} />);
Select.displayName = 'Select';
export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-sm font-medium text-ink/80', className)} {...p} />;
}
export function Alert({ tone = 'info', className, ...p }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'error' | 'ok' | 'warn' }) {
  const t = { info: 'border-glacier-200 bg-glacier-50 text-glacier-900', error: 'border-red-200 bg-red-50 text-red-900', ok: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-900' }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', t, className)} {...p} />;
}
export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/50">{children}</p>;
}
export function Stat({ label, value, hint }: { label: string; value: number | string | null; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value ?? 0}</div>
      {hint && <div className="mt-1 text-xs text-ink/50">{hint}</div>}
    </Card>
  );
}
