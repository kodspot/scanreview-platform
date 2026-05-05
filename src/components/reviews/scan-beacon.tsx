"use client";

import { useEffect } from "react";

interface ScanBeaconProps {
  orgId: string;
  serviceId: string;
}

export function ScanBeacon({ orgId, serviceId }: ScanBeaconProps) {
  useEffect(() => {
    const key = `sr-scan:${orgId}:${serviceId}`;
    try {
      // De-dupe within 5 minutes per browser to avoid double counting
      // when users tap-back or refresh while filling the form.
      const last = window.sessionStorage.getItem(key);
      const now = Date.now();
      if (last && now - Number(last) < 5 * 60 * 1000) return;
      window.sessionStorage.setItem(key, String(now));
    } catch {
      // sessionStorage may be unavailable in private mode; proceed anyway.
    }

    const payload = JSON.stringify({
      orgId,
      serviceId,
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    });

    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        const sent = navigator.sendBeacon("/api/public/scan", blob);
        if (sent) return;
      }
    } catch {
      // fall through to fetch
    }

    fetch("/api/public/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Ignore; analytics is best-effort.
    });
  }, [orgId, serviceId]);

  return null;
}
