// 繁體中文介面 (zh-TW): swaps Rembrandt's English on-screen text for Traditional Chinese while the
// app runs. Added by the nadinelipeiyu-jpg/rembrandt fork; the app's own code is left in English.
// Strings come from translations/zh-TW.json (rebuilt with scripts/build-zh.py).
(() => {
  'use strict';
  const EXACT = new Map(Object.entries(__EXACT__));
  const PATTERNS = __PATTERNS__.map(([en, zh]) => {
    const parts = en.split(/\{(\d+)\}/);
    let re = '^';
    const order = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2) { re += '([\\s\\S]*?)'; order.push(Number(parts[i])); }
      else re += parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const lits = parts.filter((_, i) => i % 2 === 0).map((s) => s.trim()).filter(Boolean);
    const key = lits.sort((a, b) => b.length - a.length)[0] || '';
    // With little fixed text ("Color {0}") a pattern could swallow a longer English phrase, so its
    // values may only be numbers, names with digits, or strings this table can translate.
    const loose = (parts.filter((_, i) => i % 2 === 0).join('').match(/[A-Za-z]/g) || []).length >= 12;
    return { re: new RegExp(re + '$'), order, zh, key, loose };
  });

  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const LETTERS = /[A-Za-z]{2}/;
  const cache = new Map();

  const sub = (v) => (EXACT.has(v) ? EXACT.get(v) : v);
  function lookup(t) {
    if (EXACT.has(t)) return EXACT.get(t);
    for (const p of PATTERNS) {
      if (p.key && !t.includes(p.key)) continue;
      const m = p.re.exec(t);
      if (!m) continue;
      if (!p.loose && m.slice(1).some((v) => /[A-Za-z]{2}/.test(v) && /(^|\s)[a-z]/.test(v) && !EXACT.has(v.trim()))) continue;
      const vals = {};
      p.order.forEach((n, i) => { vals[n] = sub(m[i + 1].trim()); });
      return p.zh.replace(/\{(\d+)\}/g, (_, n) => vals[n] ?? '');
    }
    return null;
  }
  // The English text t (already normalised) in Chinese, or null when there is nothing to change.
  function translate(t) {
    // Already Chinese (our own output) or no English words: leave it.
    if (!t || !LETTERS.test(t) || /[\u3000-\u9fff\uff00-\uffef]/.test(t)) return null;
    if (cache.has(t)) return cache.get(t);
    let out = lookup(t);
    if (out == null && t.includes(' · ')) {
      const segs = t.split(' · ');
      const tr = segs.map((s) => lookup(s.trim()));
      if (tr.some((x) => x != null)) out = segs.map((s, i) => tr[i] ?? s).join(' · ');
    }
    if (out == null && /[.:…]$/.test(t)) {
      const base = lookup(t.slice(0, -1));
      if (base != null) out = base + ({ '.': '。', ':': '：', '…': '…' })[t.slice(-1)];
    }
    if (cache.size > 20000) cache.clear();
    cache.set(t, out);
    return out;
  }
  const swap = (raw) => {
    const t = norm(raw);
    const zh = translate(t);
    if (zh == null || zh === t) return null;
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    return lead + zh + trail;
  };

  const ORIG = new WeakMap();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'TEMPLATE']);
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'label', 'data-tooltip'];
  const skipEl = (e) => !e || SKIP.has(e.nodeName) || e.isContentEditable || e.closest?.('[translate="no"],[contenteditable="true"]');

  function doText(n) {
    if (skipEl(n.parentElement)) return;
    const zh = swap(n.data);
    if (zh != null) { ORIG.set(n, n.data); n.data = zh; }
  }
  function doAttrs(e) {
    if (e.nodeType !== 1 || SKIP.has(e.nodeName) && e.nodeName !== 'INPUT' && e.nodeName !== 'TEXTAREA') return;
    for (const a of ATTRS) {
      const v = e.getAttribute(a);
      if (v) { const zh = swap(v); if (zh != null) e.setAttribute(a, zh); }
    }
  }
  function doTree(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { doAttrs(root); if (SKIP.has(root.nodeName)) return; }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) doText(n); else doAttrs(n);
    }
  }

  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(doTree);
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') {
        const v = m.target.getAttribute(m.attributeName);
        if (v) { const zh = swap(v); if (zh != null) m.target.setAttribute(m.attributeName, zh); }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  document.documentElement.lang = 'zh-Hant-TW';
  const start = () => {
    doTree(document.body);
    const css = document.createElement('style');
    css.textContent = `.info::after { content: "${EXACT.get('Histogram ▾') || 'Histogram ▾'}"; } .panel.histo-collapsed .info::after { content: "${EXACT.get('Histogram ▸') || 'Histogram ▸'}"; }`;
    document.head.append(css);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });

  // Dialogs and text drawn on canvases.
  for (const k of ['alert', 'confirm', 'prompt']) {
    const f = window[k];
    if (typeof f === 'function') window[k] = function (msg, ...rest) { return f.call(this, typeof msg === 'string' ? (swap(msg) ?? msg) : msg, ...rest); };
  }
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    for (const k of ['fillText', 'strokeText', 'measureText']) {
      const f = CanvasRenderingContext2D.prototype[k];
      CanvasRenderingContext2D.prototype[k] = function (text, ...rest) { return f.call(this, typeof text === 'string' ? (swap(text) ?? text) : text, ...rest); };
    }
  }

  // For code that finds things by their English names (the command palette): the English text of an
  // element, and a string in Chinese.
  window.__en = (e) => {
    if (!e) return undefined;
    if (e.nodeType === 3) return ORIG.get(e) ?? e.data;
    let s = '';
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) s += ORIG.get(n) ?? n.data;
    return s;
  };
  window.__zh = (s) => (typeof s === 'string' ? (swap(s) ?? s) : s);
})();
