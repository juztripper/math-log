"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  let id = sessionStorage.getItem("analytics-session");
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("analytics-session", id);
  }
  return id;
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem("cookie-consent") === "accepted";
  } catch {
    return false;
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    const send = () => {
      if (!hasConsent()) return;
      if (pathname === lastPath.current) return;
      if (pathname.startsWith("/admin") || pathname.startsWith("/privacidade"))
        return;

      lastPath.current = pathname;

      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer,
          sessionId: getSessionId(),
        }),
      }).catch(() => {});
    };

    send();

    const onConsent = () => send();
    window.addEventListener("cookie-consent-changed", onConsent);
    return () => window.removeEventListener("cookie-consent-changed", onConsent);
  }, [pathname]);

  return null;
}
