"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ScanReview] global error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "linear-gradient(180deg, #f8fafc 0%, #f3efe4 100%)",
          }}
        >
          <div
            style={{
              maxWidth: 460,
              borderRadius: 28,
              background: "#fff",
              padding: 32,
              boxShadow: "0 18px 60px rgba(15,23,42,0.12)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
              Critical error
            </p>
            <h1 style={{ marginTop: 12, fontSize: 24, color: "#0f172a" }}>
              ScanReview encountered a fatal error
            </h1>
            <p style={{ marginTop: 12, color: "#475569", fontSize: 14 }}>
              The application has stopped. Please reload, or contact support if the issue persists.
            </p>
            {error?.digest ? (
              <p style={{ marginTop: 12, fontSize: 11, color: "#64748b", wordBreak: "break-all" }}>
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              onClick={() => reset()}
              type="button"
              style={{
                marginTop: 24,
                background: "#0f172a",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
