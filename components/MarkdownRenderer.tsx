'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
// REMOVED: import svgPanZoom from 'svg-pan-zoom'; 

interface MarkdownRendererProps {
  html: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

let modalEl: HTMLDivElement | null = null;
let modalPanZoom: any = null; // Changed type to any to match dynamic require

function getOrCreateModal(): HTMLDivElement {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.id = 'mermaid-modal-overlay';
  modalEl.innerHTML = `
    <div class="mmo-backdrop"></div>
    <div class="mmo-window">
      <div class="mmo-toolbar">
        <span class="mmo-title">Diagram</span>
        <div class="mmo-controls">
          <button class="mmo-btn" id="mmo-zoom-out" title="Zoom Out">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M4 6h4M10.5 10.5l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button class="mmo-btn" id="mmo-zoom-in" title="Zoom In">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 4v4M4 6h4M10.5 10.5l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button class="mmo-btn" id="mmo-reset" title="Reset View">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7a4.5 4.5 0 1 0 1.35-3.18L2.5 2.5v3h3L4.15 4.18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="mmo-sep"></div>
          <button class="mmo-btn mmo-close" id="mmo-close" title="Close (Esc)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="mmo-canvas" id="mmo-canvas"></div>
      <div class="mmo-hint">Scroll to zoom · Drag to pan · Double-click to reset</div>
    </div>
  `;
  document.body.appendChild(modalEl);

  const close = () => {
    modalEl!.classList.remove('mmo-visible');
    document.body.style.overflow = '';
    if (modalPanZoom) { modalPanZoom.destroy(); modalPanZoom = null; }
    document.getElementById('mmo-canvas')!.innerHTML = '';
  };

  modalEl.querySelector('.mmo-backdrop')!.addEventListener('click', close);
  modalEl.querySelector('#mmo-close')!.addEventListener('click', close);
  return modalEl;
}

function openModal(sourceSvg: SVGSVGElement) {
  // SAFE CLIENT-SIDE LAZY IMPORT
  const svgPanZoom = require('svg-pan-zoom');

  const modal = getOrCreateModal();
  const canvas = document.getElementById('mmo-canvas')!;
  modal.classList.remove('mmo-visible');
  canvas.innerHTML = '';

  if (modalPanZoom) {
    try { modalPanZoom.destroy(); } catch {}
    modalPanZoom = null;
  }

  const cloned = sourceSvg.cloneNode(true) as SVGSVGElement;
  cloned.removeAttribute('width');
  cloned.removeAttribute('height');
  cloned.style.cssText = 'width:100%;height:100%;display:block;';
  canvas.appendChild(cloned);
  modal.classList.add('mmo-visible');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        modalPanZoom = svgPanZoom(cloned, {
          panEnabled: true, zoomEnabled: true, dblClickZoomEnabled: true,
          mouseWheelZoomEnabled: true, zoomScaleSensitivity: 0.25,
          minZoom: 0.05, maxZoom: 20, fit: true, center: true,
        });
      } catch (e) { console.warn('Modal pan-zoom init failed:', e); }
    });
  });
}

export function MarkdownRenderer({ html }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const tabBars = ref.current.querySelectorAll<HTMLElement>('.code-tab-bar');
    const handlers: Array<{ el: HTMLElement; fn: EventListener }> = [];

    tabBars.forEach((bar) => {
      const handler: EventListener = (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.code-tab');
        if (!btn) return;
        const groupId = btn.dataset.group!;
        const idx = btn.dataset.index!;
        ref.current!.querySelectorAll<HTMLButtonElement>(`.code-tab[data-group="${groupId}"]`).forEach((t) => {
          t.classList.toggle('tab-active', t.dataset.index === idx);
        });
        ref.current!.querySelectorAll<HTMLElement>(`.code-panel[data-group="${groupId}"]`).forEach((p) => {
          p.style.display = p.dataset.index === idx ? '' : 'none';
        });
      };
      bar.addEventListener('click', handler);
      handlers.push({ el: bar, fn: handler });
    });

    const mermaidEls = ref.current.querySelectorAll<HTMLElement>('.mermaid');
    const renderMermaid = async () => {
      if (!mermaidEls.length) return;
      mermaidEls.forEach((el, idx) => {
        if (!el.id) el.id = `mermaid-render-${idx}-${Math.random().toString(36).substring(2, 8)}`;
      });
      try {
        await mermaid.run({ nodes: Array.from(mermaidEls) });
      } catch (err) { console.warn('Mermaid render error:', err); }
      fitMermaidContainers();
      wireEnlargeButtons();
    };

    const fitMermaidContainers = () => {
      if (!ref.current) return;
      ref.current.querySelectorAll<HTMLElement>('.mermaid-container').forEach((container) => {
        const svg = container.querySelector('svg');
        if (!svg) return;
        let natW = 0, natH = 0;
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const p = vb.trim().split(/[\s,]+/).map(Number);
          if (p.length === 4) { natW = p[2]; natH = p[3]; }
        }
        if (!natW || !natH) return;
        const pad = 24;
        const availableW = (container.clientWidth || 700) - pad * 2;
        const scale = Math.min(1, availableW / natW);
        svg.removeAttribute('style');
        svg.setAttribute('width', String(Math.round(natW * scale)));
        svg.setAttribute('height', String(Math.round(natH * scale)));
        container.style.height = `${Math.round(natH * scale) + pad * 2}px`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
      });
    };

    const wireEnlargeButtons = () => {
      if (!ref.current) return;
      ref.current.querySelectorAll<HTMLButtonElement>('.mermaid-enlarge-btn').forEach((btn) => {
        const targetId = btn.dataset.enlarge!;
        btn.addEventListener('click', () => {
          const svg = document.getElementById(targetId)?.querySelector('svg');
          if (svg) openModal(svg as SVGSVGElement);
        });
      });
    };

    setTimeout(renderMermaid, 50);

    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
      if (modalPanZoom) { try { modalPanZoom.destroy(); } catch {} modalPanZoom = null; }
      if (modalEl && modalEl.parentNode) { modalEl.parentNode.removeChild(modalEl); modalEl = null; }
    };
  }, [html]);

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════════════════
           CODE TAB GROUP
        ═══════════════════════════════════════════════════════════ */
        .code-tab-group {
          margin: 1.5rem 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06);
          background: #1c1c1e;
        }
        .code-tab-bar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 12px;
          background: #2c2c2e;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-x: auto;
          scrollbar-width: none;
          min-height: 40px;
        }
        .code-tab-bar::-webkit-scrollbar { display: none; }
        .code-tab {
          position: relative;
          padding: 0 14px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          font-size: 11.5px;
          font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.4);
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s, background 0.15s;
          outline: none;
          -webkit-font-smoothing: antialiased;
        }
        .code-tab:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.07); }
        .code-tab.tab-active { color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.11); }
        .code-tab.tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 50%;
          transform: translateX(-50%);
          width: 60%; height: 2px;
          border-radius: 2px 2px 0 0;
          background: rgba(255,255,255,0.5);
        }
        .code-tab-panels { background: #1c1c1e; }
        .code-tab-panels .hljs-pre {
          margin: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          background: transparent !important;
        }
        .code-tab-panels pre.hljs-pre code { border-radius: 0 !important; }

        /* ═══════════════════════════════════════════════════════════
           MERMAID INLINE WRAPPER
        ═══════════════════════════════════════════════════════════ */
        .mermaid-wrapper {
          margin: 1.5rem 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.09);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.08);
          background: #ffffff;
        }
        .mermaid-titlebar {
          display: flex;
          align-items: center;
          height: 38px;
          padding: 0 12px;
          background: linear-gradient(180deg, #f5f5f7 0%, #ebebed 100%);
          border-bottom: 1px solid rgba(0,0,0,0.1);
          user-select: none;
        }
        .mermaid-dots {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          display: block;
          transition: filter 0.15s;
        }
        .dot-red    { background: #ff5f57; border: 0.5px solid rgba(0,0,0,0.12); }
        .dot-yellow { background: #ffbd2e; border: 0.5px solid rgba(0,0,0,0.12); }
        .dot-green  { background: #28c840; border: 0.5px solid rgba(0,0,0,0.12); }
        .mermaid-titlebar:hover .dot { filter: brightness(0.88); }
        .mermaid-label {
          flex: 1;
          text-align: center;
          font-size: 12px;
          font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
          font-weight: 500;
          color: rgba(0,0,0,0.45);
          pointer-events: none;
          -webkit-font-smoothing: antialiased;
        }
        .mermaid-enlarge-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px; height: 24px;
          border: 1px solid rgba(0,0,0,0.13);
          border-radius: 6px;
          background: rgba(255,255,255,0.7);
          color: rgba(0,0,0,0.5);
          cursor: pointer;
          transition: background 0.12s, color 0.12s, transform 0.1s;
          backdrop-filter: blur(4px);
          outline: none;
          flex-shrink: 0;
        }
        .mermaid-enlarge-btn:hover {
          background: rgba(255,255,255,0.95);
          color: rgba(0,0,0,0.8);
          border-color: rgba(0,0,0,0.2);
        }
        .mermaid-enlarge-btn:active { transform: scale(0.92); }

        /* Diagram canvas — sized entirely by JS */
        .mermaid-container {
          position: relative;
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
          border-radius: 0 0 12px 12px;
        }
        .mermaid-container .mermaid {
          display: contents;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0;
        }

        /* ═══════════════════════════════════════════════════════════
           MODAL OVERLAY
        ═══════════════════════════════════════════════════════════ */
        #mermaid-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.22s ease;
        }
        #mermaid-modal-overlay.mmo-visible {
          opacity: 1;
          pointer-events: all;
        }
        .mmo-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.62);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .mmo-window {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          width: min(92vw, 1100px);
          height: min(88vh, 780px);
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.08),
            0 8px 32px rgba(0,0,0,0.18),
            0 32px 80px rgba(0,0,0,0.22);
          transform: scale(0.96);
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        #mermaid-modal-overlay.mmo-visible .mmo-window {
          transform: scale(1);
        }

        /* Modal toolbar */
        .mmo-toolbar {
          display: flex;
          align-items: center;
          height: 48px;
          padding: 0 16px;
          background: linear-gradient(180deg, #f5f5f7 0%, #ebebed 100%);
          border-bottom: 1px solid rgba(0,0,0,0.1);
          flex-shrink: 0;
          user-select: none;
          gap: 8px;
        }
        .mmo-title {
          flex: 1;
          text-align: center;
          font-size: 13px;
          font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
          font-weight: 500;
          color: rgba(0,0,0,0.5);
          letter-spacing: 0.01em;
          -webkit-font-smoothing: antialiased;
        }
        .mmo-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mmo-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px; height: 26px;
          border: 1px solid rgba(0,0,0,0.13);
          border-radius: 6px;
          background: rgba(255,255,255,0.7);
          color: rgba(0,0,0,0.55);
          cursor: pointer;
          transition: background 0.12s, color 0.12s, transform 0.1s;
          backdrop-filter: blur(4px);
          outline: none;
        }
        .mmo-btn:hover { background: rgba(255,255,255,0.95); color: rgba(0,0,0,0.8); border-color: rgba(0,0,0,0.2); }
        .mmo-btn:active { transform: scale(0.91); }
        .mmo-close { color: rgba(180,0,0,0.6); }
        .mmo-close:hover { background: #fff0f0; color: #c00; }
        .mmo-sep {
          width: 1px; height: 18px;
          background: rgba(0,0,0,0.12);
          margin: 0 2px;
        }

        /* Modal canvas */
        .mmo-canvas {
          flex: 1;
          overflow: hidden;
          background: #fafafa;
          background-image: radial-gradient(circle, rgba(0,0,0,0.065) 1px, transparent 1px);
          background-size: 24px 24px;
          cursor: grab;
          position: relative;
        }
        .mmo-canvas:active { cursor: grabbing; }
        .mmo-canvas svg {
          position: absolute;
          inset: 0;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }

        /* Hint bar */
        .mmo-hint {
          flex-shrink: 0;
          text-align: center;
          font-size: 11px;
          font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
          color: rgba(0,0,0,0.3);
          padding: 7px 0 8px;
          background: linear-gradient(180deg, #f0f0f2 0%, #ebebed 100%);
          border-top: 1px solid rgba(0,0,0,0.07);
          letter-spacing: 0.01em;
          -webkit-font-smoothing: antialiased;
        }

        /* Responsive — on very small screens modal goes full-screen */
        @media (max-width: 600px) {
          .mmo-window {
            width: 100vw;
            height: 100dvh;
            border-radius: 0;
          }
        }

        /* ═══════════════════════════════════════════════════════════
          TABLE
        ═══════════════════════════════════════════════════════════ */

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 1.5rem 0;
          border-radius: 16px;
        }

        .table-wrapper table {
          width: max-content;
          min-width: 100%;
          max-width: none;
        }

        .table-wrapper::-webkit-scrollbar {
          height: 8px;
        }

        .table-wrapper::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 999px;
        }

        .table-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }

      `}</style>

      <div 
        ref={ref}
        className="
          prose prose-slate prose-lg max-w-none
          prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-3xl prose-h1:text-slate-900
          prose-h2:text-2xl prose-h2:text-slate-800 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-3 prose-h2:mt-10
          prose-h3:text-xl prose-h3:text-slate-700
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline
          prose-code:text-violet-700 prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
          prose-blockquote:border-l-violet-400 prose-blockquote:bg-violet-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1

          prose-table:min-w-full
          prose-table:border-separate
          prose-table:border-spacing-0
          prose-table:rounded-2xl
          prose-table:border
          prose-table:border-slate-200
          prose-table:overflow-hidden

          /* HEADER */
          prose-th:bg-violet-400
          prose-th:text-white
          prose-th:px-5
          prose-th:py-4
          prose-th:text-left
          prose-th:text-sm
          prose-th:font-semibold
          prose-th:border-b
          prose-th:border-violet-500
          prose-th:whitespace-nowrap

          /* BODY */
          prose-td:px-5
          prose-td:py-4
          prose-td:text-sm
          prose-td:text-slate-600
          prose-td:border-b
          prose-td:border-slate-100
          prose-td:whitespace-nowrap

          prose-strong:text-slate-900 prose-strong:font-semibold
          prose-ul:text-slate-600 prose-ol:text-slate-600
          prose-li:marker:text-violet-400
        "
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}