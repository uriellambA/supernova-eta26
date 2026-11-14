"use client";
import { useEffect } from "react";
import { setLang, translate, useLang, type Lang } from "@/lib/i18n";

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE"]);

/**
 * Translates the rendered page in place (text nodes + a few attributes) and keeps it translated as React updates it.
 * Original English is remembered per node, so switching back to English restores it exactly.
 */
export function Translator() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang === "es" ? "es-AR" : "en";
    const origText = new WeakMap<Text, string>();
    const shown = new WeakMap<Text, string>();
    const origAttr = new WeakMap<Element, Record<string, string>>();
    const skip = (el: Element | null) => !el || !!el.closest("[data-no-translate]") || SKIP.has(el.tagName);

    const doText = (t: Text) => {
      if (skip(t.parentElement)) return;
      const v = t.nodeValue ?? "";
      if (shown.get(t) === v) return; // our own translation
      origText.set(t, v);
      const out = lang === "es" ? translate(v) : null;
      if (out !== null && out !== v) {
        shown.set(t, out);
        t.nodeValue = out;
      } else shown.set(t, v);
    };
    const doAttrs = (el: Element) => {
      if (el.closest("[data-no-translate]")) return;
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const o = origAttr.get(el) ?? {};
        if (o[`_${a}`] === v) continue; // already translated value
        o[a] = v;
        const out = lang === "es" ? translate(v) : null;
        if (out && out !== v) {
          o[`_${a}`] = out;
          el.setAttribute(a, out);
        }
        origAttr.set(el, o);
      }
    };
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      doAttrs(root as Element);
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
        else doAttrs(n as Element);
      }
    };

    const mo = lang === "es" ? new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
    }) : null;
    const title = document.title;
    // Start after React has hydrated the page (changing server HTML earlier causes hydration mismatches)
    const start = () => {
      if (lang !== "es") return;
      walk(document.body);
      mo?.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
      document.title = translate(title) ?? title;
    };
    const idle = "requestIdleCallback" in window;
    const timer = idle ? window.requestIdleCallback(start, { timeout: 400 }) : window.setTimeout(start, 150);

    return () => {
      if (idle) window.cancelIdleCallback(timer);
      else clearTimeout(timer);
      mo?.disconnect();
      // restore English
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n as Text, o = origText.get(t);
          if (o !== undefined && shown.get(t) === t.nodeValue && o !== t.nodeValue) t.nodeValue = o;
        } else {
          const el = n as Element, o = origAttr.get(el);
          if (o) for (const a of ATTRS) if (o[a] && o[`_${a}`] === el.getAttribute(a)) el.setAttribute(a, o[a]);
        }
      }
      document.title = title;
    };
  }, [lang]);
  return null;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const opt = (l: Lang, label: string) => (
    <button onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-md px-2 py-1 text-xs font-medium transition ${lang === l ? "bg-ink text-canvas" : "text-muted hover:text-ink"}`}>{label}</button>
  );
  return (
    <div data-no-translate className={`inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 ${className}`} role="group" aria-label="Language">
      {opt("en", "EN")}
      {opt("es", "ES")}
    </div>
  );
}
