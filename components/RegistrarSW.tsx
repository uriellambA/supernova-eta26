"use client";
import { useEffect } from "react";

/**
 * Registers the service worker (offline mode) only in production.
 * In development it removes any worker and cache left by an earlier `npm start`,
 * otherwise the browser keeps running old JavaScript.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then(async (regs) => {
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
        if (regs.length) window.location.reload(); // load the fresh code once
      }).catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
