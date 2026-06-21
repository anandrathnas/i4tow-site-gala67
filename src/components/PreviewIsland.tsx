import { useEffect, useState } from 'react';
import { BlockRenderer } from './blocks';
import type { Block } from '@/lib/blocks';

// Origins allowed to drive the preview (the i4tow editor). Mirrors the backend
// CORS allowlist. The harness ignores messages from any other origin.
const ALLOWED_ORIGINS = [
  'https://i4tow.date',
  'http://localhost:5190',
  'http://localhost:3000',
];

interface PreviewMessage { type: 'i4tow:preview'; blocks: Block[] }

/**
 * Live-preview harness. Renders the SAME block components the published site
 * uses, fed draft `blocks` from the editor over postMessage — so preview is
 * high-fidelity (real components + real compiled Tailwind), with no Astro
 * compiler needed in the browser.
 */
export function PreviewIsland() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!ALLOWED_ORIGINS.includes(e.origin)) return;
      const data = e.data as Partial<PreviewMessage> | null;
      if (data?.type === 'i4tow:preview' && Array.isArray(data.blocks)) {
        setBlocks(data.blocks);
      }
    }
    window.addEventListener('message', onMessage);
    // Announce readiness so the editor can send the current draft.
    if (window.parent !== window) window.parent.postMessage({ type: 'i4tow:preview-ready' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (blocks.length === 0) {
    return <p className="mx-auto max-w-6xl px-6 py-24 text-center text-ink-soft">Live preview — start editing to see your page here.</p>;
  }
  return <BlockRenderer blocks={blocks} />;
}
