"use client";

import { useEffect, useRef, useCallback } from "react";
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
  const entryTime = useRef(0);
  const currentEventId = useRef("");

  const sendDuration = useCallback(() => {
    if (!currentEventId.current || !entryTime.current) return;
    const duration = Math.round((Date.now() - entryTime.current) / 1000);
    if (duration < 1) return;

    const body = JSON.stringify({
      path: lastPath.current,
      eventId: currentEventId.current,
      duration,
      sessionId: getSessionId(),
    });

    // Use sendBeacon for reliability on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/collect", blob);
    } else {
      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }

    currentEventId.current = "";
    entryTime.current = 0;
  }, []);

  useEffect(() => {
    const send = async () => {
      if (!hasConsent()) return;
      if (pathname === lastPath.current) return;
      if (pathname.startsWith("/admin") || pathname.startsWith("/privacidade"))
        return;

      // Send duration for previous page
      sendDuration();

      lastPath.current = pathname;
      entryTime.current = Date.now();

      try {
        const res = await fetch("/api/analytics/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer,
            sessionId: getSessionId(),
          }),
        });
        const data = await res.json();
        if (data.eventId) {
          currentEventId.current = data.eventId;
        }
      } catch {
        // ignore
      }
    };

    send();

    const onConsent = () => send();
    window.addEventListener("cookie-consent-changed", onConsent);
    return () => window.removeEventListener("cookie-consent-changed", onConsent);
  }, [pathname, sendDuration]);

  // Send duration on page unload
  useEffect(() => {
    const onUnload = () => sendDuration();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendDuration();
      }
    };

    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [sendDuration]);

  return null;
}
