import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

// A3 page: 297mm × 420mm — 2 columns × 4 rows = 8 A6 tiles
// Each tile: (297 - 3×5mm) / 2 = 141mm wide, (420 - 5×5mm) / 4 = 98.75mm tall
// Posters scale proportionally to fill cells

export default async function QrA3Page({
  params,
}: {
  params: Promise<{ orgId: string; serviceId: string }>;
}) {
  const { orgId, serviceId } = await params;
  const experience = await getPublicReviewExperience(orgId, serviceId);

  if (!experience) {
    notFound();
  }

  const targetUrl = `${process.env.APP_URL || "http://localhost:3000"}/r/${orgId}/${serviceId}`;
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    margin: 1,
    width: 800,
    color: {
      dark: experience.organization.theme.primary,
      light: "#ffffff",
    },
  });

  const { primary, accent } = experience.organization.theme;
  const { name: orgName } = experience.organization;
  const { name: serviceName } = experience.service;

  const tiles = Array.from({ length: 8 });

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{orgName} — QR Print Sheet (A3)</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A3 portrait; margin: 0; }
          body { width: 297mm; height: 420mm; background: #fff; }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 141mm);
            grid-template-rows: repeat(4, 98.75mm);
            gap: 5mm;
            padding: 5mm;
            width: 297mm;
            height: 420mm;
          }
          .tile {
            width: 141mm;
            height: 98.75mm;
            border-top: 5mm solid ${primary};
            border-bottom: 2px solid ${accent};
            background: #fff;
            border-radius: 10px;
            padding: 5mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 5mm;
            overflow: hidden;
          }
          .info {
            flex: 1;
            min-width: 0;
          }
          .org-name {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 16px;
            font-weight: 700;
            color: ${primary};
            line-height: 1.2;
          }
          .service-name {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10px;
            font-weight: 600;
            color: #334155;
            margin-top: 3px;
          }
          .prompt {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 9px;
            color: #64748b;
            margin-top: 5px;
            line-height: 1.5;
          }
          .footer {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 7.5px;
            color: #94a3b8;
            margin-top: 8px;
          }
          .url {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 7.5px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 3px;
          }
          .qr-wrap {
            background: linear-gradient(135deg, ${primary}18 0%, #ffffff 100%);
            border-radius: 10px;
            padding: 6px;
            text-align: center;
            flex-shrink: 0;
          }
          .qr-img {
            width: 42mm;
            height: 42mm;
            border-radius: 6px;
            background: #fff;
            padding: 3px;
          }
        `}</style>
      </head>
      <body>
        <div className="grid">
          {tiles.map((_, i) => (
            <div key={i} className="tile">
              <div className="info">
                <div className="org-name">{orgName}</div>
                <div className="service-name">{serviceName}</div>
                <div className="prompt">Scan & share feedback in under 10 seconds.</div>
                <div className="url">{targetUrl}</div>
                <div className="footer">Kodspot ScanReview · 300 DPI</div>
              </div>
              <div className="qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="QR code" className="qr-img" src={qrDataUrl} />
              </div>
            </div>
          ))}
        </div>
      </body>
    </html>
  );
}
