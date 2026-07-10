"use client";
import { useEffect } from "react";

/** Registers the service worker once on load; silent no-op where unsupported. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline shell is a bonus, never a blocker */
      });
    }
  }, []);
  return null;
}
