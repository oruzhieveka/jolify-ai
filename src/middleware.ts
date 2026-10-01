import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/middleware';

const LOCALES = ['en', 'ru', 'ky'];
const SID = 'jolify_sid';

function preferredLocale(req: NextRequest): string {
  const saved = req.cookies.get('jolify_lang')?.value;
  if (saved && LOCALES.includes(saved)) return saved;
  const al = (req.headers.get('accept-language') ?? '').toLowerCase();
  if (al.startsWith('ky')) return 'ky';
  if (al.startsWith('ru')) return 'ru';
  return 'en';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');
  const first = pathname.split('/')[1] ?? '';

  if (!isApi && !LOCALES.includes(first)) {
    const url = req.nextUrl.clone();
    url.pathname = '/' + preferredLocale(req) + (pathname === '/' ? '' : pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (!req.cookies.get(SID)) {
    // Anonymous analytics session id (no personal data); used to count sessions.
    res.cookies.set(SID, crypto.randomUUID(), { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  if (!isApi) res.cookies.set('jolify_lang', first, { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return refreshSession(req, res);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|css|js|map)$).*)'],
};
