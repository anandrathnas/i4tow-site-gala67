import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/**
 * Reveal-on-scroll wrapper. Server-renders its children (so content is in the
 * static HTML for SEO); after hydration it fades them up when they enter the
 * viewport. Honors prefers-reduced-motion (handled in global.css).
 */
export function Reveal({ children, delay = 0, as: Tag = 'div' }: { children: ReactNode; delay?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { el.classList.add('is-in'); io.unobserve(el); }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} data-reveal style={delay ? { animationDelay: `${delay}ms` } : undefined}>{children}</Tag>;
}

/**
 * Choreographed brand splash. Overlays the page (content renders behind it, so
 * LCP isn't blocked) and fades out shortly after mount. Skipped entirely for
 * reduced-motion users and on view-transition navigations (only first load).
 */
export function LoadingScreen({ brand = "Roopali's Kala" }: { brand?: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setGone(true); return; }
    if (sessionStorage.getItem('i4tow:splash-shown')) { setGone(true); return; }
    sessionStorage.setItem('i4tow:splash-shown', '1');
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 grid place-items-center bg-canvas transition-opacity duration-500"
      style={{ animation: 'vt-fade-in 0.4s ease both' }}
      ref={(el) => { if (el) requestAnimationFrame(() => { el.style.opacity = '1'; }); }}
    >
      <span className="font-display text-clay display-lg" style={{ animation: 'reveal-up 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
        {brand}
      </span>
    </div>
  );
}
