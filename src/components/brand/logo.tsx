// i18n-exempt: brand wordmark only
/**
 * Jolify AI identity. The mark is a lowercase "j" drawn as a route: the dot is the starting point,
 * the stem is the road, the dotted curve is the journey, and it ends at a location pin.
 * ("Jol" means road/way in Kyrgyz.) tone="light" for light backgrounds, tone="dark" for dark ones.
 * Static files for other uses: /public/brand/*.svg, favicon: src/app/icon.svg, apple-icon.png.
 */
type Tone = 'light' | 'dark';
const C = { light: { ink: '#0F1B26', dot: '#E2703A', hole: '#F4F1EA' }, dark: { ink: '#F4F1EA', dot: '#F08A50', hole: '#0F1B26' } };

export function LogoMark({ size = 32, tone = 'light', title }: { size?: number; tone?: Tone; title?: string }) {
  const c = C[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <circle cx="20.5" cy="4.6" r="2.7" fill={c.ink} />
      <path d="M20.5 10.5V19" fill="none" stroke={c.ink} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M20.5 19a7.25 7.25 0 0 1-12.4 5.1" fill="none" stroke={c.ink} strokeWidth="3.4" strokeLinecap="round" strokeDasharray="0.1 4.8" />
      <path d="M6.2 15.2c-2.6 0-4.4 1.9-4.4 4.3 0 3 4.4 7.3 4.4 7.3s4.4-4.3 4.4-7.3c0-2.4-1.8-4.3-4.4-4.3z" fill={c.dot} />
      <circle cx="6.2" cy="19.4" r="1.5" fill={c.hole} />
    </svg>
  );
}

export function Logo({ tone = 'light', size = 30, className, sub }: { tone?: Tone; size?: number; className?: string; sub?: string }) {
  const c = C[tone];
  return (
    <span className={'inline-flex items-center gap-2 ' + (className ?? '')}>
      <LogoMark size={size} tone={tone} />
      <span className="flex flex-col leading-none">
        <span style={{ color: c.ink, fontWeight: 700, letterSpacing: '-0.03em', fontSize: size * 0.7 }}>
          Jolify<span style={{ color: c.dot, fontWeight: 700, marginLeft: size * 0.12, fontSize: size * 0.4, letterSpacing: '0.08em', verticalAlign: 'super' }}>AI</span>
        </span>
        {sub && <span style={{ color: c.ink, opacity: 0.6, fontSize: size * 0.32, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>{sub}</span>}
      </span>
    </span>
  );
}
