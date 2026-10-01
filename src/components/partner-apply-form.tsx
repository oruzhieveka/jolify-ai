'use client';
import Link from 'next/link';
import { useState } from 'react';
import { errorText, fmt } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Card, Input, Label, Select, Spinner, Textarea } from './ui';


export function PartnerApplyForm({ categories, policyVersion }: { categories: string[]; policyVersion: string }) {
  const { t, lang: locale } = useI18n();
  const [f, setF] = useState({ business_name: '', category: categories[0], city: '', contact_name: '', phone: '', email: '', website: '', description: '' });
  const [cons, setCons] = useState({ partner_terms: false, data_processing: false, listing_accuracy: false, marketing: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setIssues({});
    const r = await api('/api/partner/apply', { ...f, consents: cons, policy_version: policyVersion });
    setBusy(false);
    if (r.ok) { setDone(true); return; }
    setErr(errorText(t, r.data));
    const d = r.data.details as { path: (string | number)[]; message: string }[] | undefined;
    if (Array.isArray(d)) setIssues(Object.fromEntries(d.map((x) => [x.path.join('.'), t.errors.check_form])));
  }
  if (done) return <Alert tone="ok" className="mt-4" data-testid="apply-done">{t.partner.received} {fmt(t.partnerPage.recorded, { v: policyVersion })}</Alert>;

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><Label htmlFor={'pa-' + k}>{label}</Label><Input id={'pa-' + k} value={f[k]} onChange={set(k)} aria-invalid={!!issues[k]} {...props} />{issues[k] && <p className="mt-1 text-xs text-red-700">{issues[k]}</p>}</div>
  );
  const box = (k: keyof typeof cons, label: React.ReactNode, required: boolean) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={cons[k]} onChange={(e) => setCons({ ...cons, [k]: e.target.checked })} required={required} data-testid={'consent-' + k} />
      <span>{label}{required && <span className="text-red-600"> *</span>}</span>
    </label>
  );
  const requiredOk = cons.partner_terms && cons.data_processing && cons.listing_accuracy;
  return (
    <form onSubmit={submit} className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        {field('business_name', t.partner.businessName, { required: true })}
        <div><Label htmlFor="pa-category">{t.partner.category}</Label><Select id="pa-category" value={f.category} onChange={set('category')}>{categories.map((c) => <option key={c} value={c}>{t.partnerCategories[c as keyof typeof t.partnerCategories] ?? c}</option>)}</Select></div>
        {field('city', t.partnerPage.cityVillage, { required: true })}
        {field('contact_name', t.partner.contactName, { required: true })}
        {field('phone', t.partner.phone, { required: true, type: 'tel', placeholder: '+996' })}
        {field('email', t.partner.email, { required: true, type: 'email' })}
        <div className="sm:col-span-2">{field('website', t.partnerPage.webOrInsta, { type: 'url' })}</div>
        <div className="sm:col-span-2"><Label htmlFor="pa-description">{t.partner.offer}</Label><Textarea id="pa-description" rows={4} value={f.description} onChange={set('description')} minLength={20} />{issues.description && <p className="mt-1 text-xs text-red-700">{issues.description}</p>}</div>
      </Card>
      <Card className="space-y-3 self-start p-5">
        <h3 className="font-semibold">{t.partner.consentTitle}</h3>
        {box('partner_terms', <>{t.partner.consentTerms} (<Link className="underline" target="_blank" href={'/' + locale + '/legal/partner-terms'}>{t.partnerPage.read}</Link>)</>, true)}
        {box('data_processing', <>{t.partner.consentData} (<Link className="underline" target="_blank" href={'/' + locale + '/legal/privacy'}>{t.partnerPage.privacyLink}</Link>)</>, true)}
        {box('listing_accuracy', t.partner.consentAccuracy, true)}
        {box('marketing', t.partner.consentMarketing, false)}
        <p className="text-xs text-ink/50">{t.partner.policyVersion}: {policyVersion}. {t.partner.consentStored}</p>
        {err && <Alert tone="error">{err}</Alert>}
        <Button className="w-full" disabled={busy || !requiredOk} data-testid="apply-submit">{busy && <Spinner />}{t.partner.submit}</Button>
      </Card>
    </form>
  );
}
