import { useState, type CSSProperties, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import type {
  Block, HeroBlock, RichTextBlock, GalleryBlock, MediaStoryBlock, FeatureGridBlock, CtaBlock, ScrollytellingBlock, ParagraphAlign, SiteWidth, SiteThemeId, SiteFontId,
} from '@/lib/blocks';
import { Reveal } from './motion';

marked.setOptions({ gfm: true, breaks: true });
// Authored by the site owner, but rendered on a public page — sanitize to a safe
// subset so a compromised/mistaken author can't inject script into visitors' pages.
const BODY_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'hr', 'img'];
const INLINE_TAGS = ['strong', 'em', 'b', 'i', 'u', 's', 'a', 'br', 'code'];
const ALLOWED_ATTR = ['href', 'title', 'src', 'alt'];

/** Source markdown for a text block: the flat field, falling back to the legacy paragraphs[]. */
function bodyMarkdown(flat?: string, paragraphs?: string[]): string {
  const f = (flat ?? '').trim();
  if (f) return f;
  return (paragraphs ?? []).map((p) => p.trim()).filter(Boolean).join('\n\n');
}

function renderBodyHtml(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string, { ALLOWED_TAGS: BODY_TAGS, ALLOWED_ATTR });
}

/** Inline-only markdown (bold/italic/underline/links) for headings — no block elements. */
function inlineHtml(text: string): string {
  return DOMPurify.sanitize(marked.parseInline(text ?? '', { async: false }) as string, { ALLOWED_TAGS: INLINE_TAGS, ALLOWED_ATTR });
}

/** Renders a block's markdown body as sanitized, prose-styled HTML with a per-block alignment. */
function RichBody({ markdown, align, className = '' }: { markdown: string; align?: ParagraphAlign; className?: string }) {
  return <div className={`rich-body ${alignClass(align)} ${className}`} dangerouslySetInnerHTML={{ __html: renderBodyHtml(markdown) }} />;
}

const ALIGN_CLASS: Record<ParagraphAlign, string> = {
  left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify',
};

const SITE_FONT_IDS = new Set<SiteFontId>([
  'dmSans', 'roboto', 'openSans', 'lato', 'montserrat',
  'poppins', 'inter', 'oswald', 'raleway', 'notoSans',
  'sourceSans3', 'ubuntu', 'nunitoSans', 'merriweather',
  'playfairDisplay', 'robotoSlab', 'rubik', 'ptSans',
  'workSans', 'mulish', 'robotoCondensed', 'notoSerif',
  'libreBaskerville', 'cormorantGaramond', 'quicksand',
]);

// Returns the text-align class for an explicit alignment, or '' when none is
// set — so blocks without per-paragraph alignment keep their natural alignment
// (e.g. a centered hero/CTA) instead of being forced left.
function alignClass(align?: string): string {
  return ALIGN_CLASS[(align ?? '') as ParagraphAlign] ?? '';
}

function normalizeColor(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mixColors(a: string, b: string, amount: number): string {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  return rgbToHex({
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  });
}

function readableInk(backgroundColor: string): string {
  const { r, g, b } = hexToRgb(backgroundColor);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#1f1712' : '#fffaf3';
}

function customColorStyle(settings: Block | undefined): CSSProperties | undefined {
  if (!settings || settings.kind !== 'siteSettings') return undefined;
  const primaryColor = normalizeColor(settings.primaryColor);
  const secondaryColor = normalizeColor(settings.secondaryColor);
  const backgroundColor = normalizeColor(settings.backgroundColor);
  if (!primaryColor || !secondaryColor || !backgroundColor) return undefined;
  const ink = readableInk(backgroundColor);
  return {
    '--color-canvas': backgroundColor,
    '--color-surface': mixColors(backgroundColor, ink === '#1f1712' ? '#ffffff' : '#000000', 0.08),
    '--color-ink': ink,
    '--color-ink-soft': secondaryColor,
    '--color-clay': primaryColor,
    '--color-clay-deep': mixColors(primaryColor, ink, 0.24),
    '--color-line': mixColors(backgroundColor, primaryColor, 0.22),
  } as CSSProperties;
}

function Button({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'ghost' }) {
  const base = 'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 will-change-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay';
  const styles = variant === 'primary'
    ? 'bg-clay text-canvas hover:bg-clay-deep shadow-soft'
    : 'border border-line text-ink hover:border-clay hover:text-clay';
  return <a href={href} className={`${base} ${styles}`}>{children}</a>;
}

function Section({ children, className = '', width = 'contained' }: { children: ReactNode; className?: string; width?: SiteWidth }) {
  const widthClass = width === 'full' ? 'max-w-[1600px]' : 'max-w-6xl';
  return <section className={`mx-auto w-full ${widthClass} px-6 py-20 md:py-28 ${className}`}>{children}</section>;
}

function buttonsFrom(...groups: Array<{ label: string; href: string }[] | { label: string; href: string } | undefined>): { label: string; href: string }[] {
  return groups.flatMap((group) => Array.isArray(group) ? group : group ? [group] : []).filter((button) => button.label && button.href).slice(0, 3);
}

function Hero({ b, width }: { b: HeroBlock; width: SiteWidth }) {
  const body = bodyMarkdown(b.subheading, b.paragraphs);
  const buttons = buttonsFrom(b.buttons, b.cta);
  return (
    <header className="relative overflow-hidden">
      {b.image && (
        <div className="absolute inset-0 -z-10">
          <img src={b.image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-canvas/70 via-canvas/60 to-canvas" />
        </div>
      )}
      <Section width={width} className="text-center md:py-36">
        {b.eyebrow && <Reveal as="p"><span className="text-sm font-medium uppercase tracking-[0.2em] text-clay">{b.eyebrow}</span></Reveal>}
        <Reveal as="h1"><span className="display-xl block max-w-4xl mx-auto mt-4 text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} /></Reveal>
        {body && <Reveal delay={80}><RichBody markdown={body} align={b.align} className="mx-auto mt-6 max-w-2xl text-lg text-ink-soft" /></Reveal>}
        {buttons.length > 0 && <Reveal delay={160}><div className="mt-9 flex flex-wrap justify-center gap-3">{buttons.map((button) => <Button key={`${button.href}:${button.label}`} href={button.href}>{button.label}</Button>)}</div></Reveal>}
      </Section>
    </header>
  );
}

function RichText({ b, width }: { b: RichTextBlock; width: SiteWidth }) {
  const body = bodyMarkdown(b.markdown, b.paragraphs);
  return (
    <Section width={width} className="text-center">
      {b.heading && <Reveal as="h2"><span className="display-lg mx-auto mb-8 block text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} /></Reveal>}
      {body && <Reveal><RichBody markdown={body} align={b.align} className="mx-auto max-w-3xl text-lg leading-relaxed text-ink-soft" /></Reveal>}
    </Section>
  );
}

function Gallery({ b, width }: { b: GalleryBlock; width: SiteWidth }) {
  const items = b.items ?? [];
  return (
    <Section width={width}>
      {b.heading && <Reveal as="h2"><span className="display-lg block mb-10 text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} /></Reveal>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {items.map((it, i) => (
          <Reveal key={i} delay={(i % 3) * 60}>
            <figure className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
              <img
                src={it.src}
                alt={it.alt ?? ''}
                width={it.width}
                height={it.height}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </figure>
          </Reveal>
        ))}
        {items.length === 0 && <p className="col-span-full text-ink-soft">Add images to this gallery in your i4tow studio.</p>}
      </div>
    </Section>
  );
}

function FeatureGrid({ b, width }: { b: FeatureGridBlock; width: SiteWidth }) {
  return (
    <Section width={width}>
      {b.heading && <Reveal as="h2"><span className="display-lg block mb-10 text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} /></Reveal>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {b.features.map((f, i) => (
          <Reveal key={i} delay={(i % 3) * 60}>
            <article className="h-full rounded-[var(--radius-card)] border border-line bg-surface/60 p-7">
              <h3 className="font-display text-xl text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(f.title) }} />
              <p className="mt-3 text-ink-soft" dangerouslySetInnerHTML={{ __html: inlineHtml(f.body) }} />
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Cta({ b, width }: { b: CtaBlock; width: SiteWidth }) {
  const body = bodyMarkdown(b.body, b.paragraphs);
  const buttons = buttonsFrom(b.buttons, b.primary, b.secondary);
  return (
    <Section width={width}>
      <Reveal>
        <div className="rounded-[var(--radius-card)] bg-clay px-8 py-14 text-center text-canvas md:py-20">
          <h2 className="display-lg mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} />
          {body && <RichBody markdown={body} align={b.align} className="mx-auto mt-4 max-w-xl text-canvas/85" />}
          {buttons.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {buttons.map((button, i) => (
                <a key={`${button.href}:${button.label}`} href={button.href} className={i === 0 ? 'rounded-full bg-canvas px-6 py-3 text-sm font-medium text-clay-deep transition-transform hover:-translate-y-0.5' : 'rounded-full border border-canvas/40 px-6 py-3 text-sm font-medium text-canvas transition-transform hover:-translate-y-0.5'}>{button.label}</a>
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </Section>
  );
}

/** Bespoke art-directed scrollytelling: sticky media, step text reveals beside it. */
function Scrollytelling({ b, width }: { b: ScrollytellingBlock; width: SiteWidth }) {
  const widthClass = width === 'full' ? 'max-w-[1600px]' : 'max-w-6xl';
  return (
    <section className={`mx-auto w-full ${widthClass} px-6 py-20`}>
      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-[60vh] md:space-y-[70vh]">
          {b.steps.map((s, i) => (
            <Reveal key={i}>
              <div>
                <span className="font-display text-clay text-sm">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="display-lg mt-2 text-ink">{s.heading}</h3>
                {s.body && <p className="mt-4 max-w-md text-lg text-ink-soft">{s.body}</p>}
              </div>
            </Reveal>
          ))}
        </div>
        <div className="hidden md:block">
          <div className="sticky top-24 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
            {b.steps[0]?.image && <img src={b.steps[0].image} alt="" className="aspect-[3/4] w-full object-cover" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function MediaStory({ b, width }: { b: MediaStoryBlock; width: SiteWidth }) {
  const [i, setI] = useState(0);
  const imgs = b.images ?? [];
  const n = imgs.length;
  const body = bodyMarkdown(b.story, b.paragraphs);
  const go = (d: number) => setI((p) => (n ? (p + d + n) % n : 0));
  const media = (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
      {n > 0 ? (
        <img src={imgs[i]!.src} alt={imgs[i]!.alt ?? ''} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="grid aspect-[4/3] place-items-center text-ink-soft">Add images in your studio</div>
      )}
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-canvas/85 text-ink shadow-soft hover:bg-canvas">‹</button>
          <button onClick={() => go(1)} aria-label="Next image" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-canvas/85 text-ink shadow-soft hover:bg-canvas">›</button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {imgs.map((_, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${j === i ? 'bg-clay' : 'bg-canvas/70'}`} />)}
          </div>
        </>
      )}
    </div>
  );
  const story = (
    <div className="flex flex-col justify-center">
      <h2 className="display-lg text-ink" dangerouslySetInnerHTML={{ __html: inlineHtml(b.heading) }} />
      {body && <RichBody markdown={body} align={b.align} className="mt-4 text-lg leading-relaxed text-ink-soft" />}
    </div>
  );
  return (
    <Section width={width}>
      <Reveal>
        <div className="grid items-stretch gap-8 md:grid-cols-2">
          {(b.imageSide ?? 'left') === 'left' ? <>{media}{story}</> : <>{story}{media}</>}
        </div>
      </Reveal>
    </Section>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  const settings = blocks.find((b) => b.kind === 'siteSettings');
  const width: SiteWidth = settings?.kind === 'siteSettings' && settings.pageWidth === 'full' ? 'full' : 'contained';
  const themeId: SiteThemeId = settings?.kind === 'siteSettings' && (settings.themeId === 'minimalGallery' || settings.themeId === 'boldEditorial') ? settings.themeId : 'warmArtStudio';
  const fontId: SiteFontId = settings?.kind === 'siteSettings' && SITE_FONT_IDS.has(settings.fontId as SiteFontId) ? settings.fontId as SiteFontId : 'dmSans';
  const visibleBlocks = blocks.filter((b) => b.kind !== 'siteSettings');
  return (
    <div data-site-theme={themeId} data-site-font={fontId} style={customColorStyle(settings)}>
      {visibleBlocks.map((b, i) => {
        switch (b.kind) {
          case 'hero': return <Hero key={i} b={b} width={width} />;
          case 'richText': return <RichText key={i} b={b} width={width} />;
          case 'gallery': return <Gallery key={i} b={b} width={width} />;
          case 'mediaStory': return <MediaStory key={i} b={b} width={width} />;
          case 'featureGrid': return <FeatureGrid key={i} b={b} width={width} />;
          case 'cta': return <Cta key={i} b={b} width={width} />;
          case 'scrollytelling': return <Scrollytelling key={i} b={b} width={width} />;
          default: return null;
        }
      })}
    </div>
  );
}
