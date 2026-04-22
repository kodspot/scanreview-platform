import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kodspot ScanReview",
  description: "Production-grade multi-tenant QR-based review management SaaS platform.",
  manifest: "/manifest.webmanifest",
  applicationName: "Kodspot ScanReview",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/pwa-192.svg", type: "image/svg+xml" },
      { url: "/pwa-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/pwa-192.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "ScanReview",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
