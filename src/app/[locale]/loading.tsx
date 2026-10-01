export default function Loading() {
  return <div className="mx-auto max-w-7xl animate-pulse px-4 py-10"><div className="h-8 w-64 rounded bg-ink/10" /><div className="mt-6 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-ink/5" />)}</div></div>;
}
