import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

// A4 page: 210mm × 297mm — 2 columns × 2 rows = 4 A6 tiles
// Each tile: (210 - 3×5mm) / 2 = 97.5mm wide, (297 - 3×5mm) / 2 = 141mm tall

export default async function QrA4Page({
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

  const tiles = Array.from({ length: 4 });

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{orgName} — QR Print Sheet (A4)</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 0; }
          body { width: 210mm; height: 297mm; background: #fff; }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 97.5mm);
            grid-template-rows: repeat(2, 141mm);
            gap: 5mm;
            padding: 5mm;
            width: 210mm;
            height: 297mm;
          }
          .tile {
            width: 97.5mm;
            height: 141mm;
            border-top: 6mm solid ${primary};
            border-bottom: 2px solid ${accent};
            background: #fff;
            border-radius: 12px;
            padding: 6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            box-shadow: inset 0 0 0 0.3mm rgba(15, 23, 42, 0.08);
          }
          .meta-row {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .badge {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border-radius: 999px;
            border: 1px solid ${accent};
            color: ${accent};
            padding: 1px 6px;
            white-space: nowrap;
          }
          .org-name {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: ${primary};
            line-height: 1.2;
          }
          .service-name {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #334155;
            margin-top: 3px;
          }
          .prompt {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10px;
            color: #64748b;
            margin-top: 6px;
            line-height: 1.5;
          }
          .qr-wrap {
            background: linear-gradient(180deg, ${primary}18 0%, #ffffff 100%);
            border-radius: 10px;
            padding: 8px;
            text-align: center;
          }
          .qr-img {
            width: 52mm;
            height: 52mm;
            border-radius: 8px;
            background: #fff;
            padding: 4px;
          }
          .url {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 8px;
            color: #94a3b8;
            margin-top: 4px;
            word-break: break-all;
          }
          .footer {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 8px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            padding-top: 6px;
            border-top: 1px solid #f1f5f9;
          }
        `}</style>
      </head>
      <body>
        <div className="grid">
          {tiles.map((_, i) => (
            <div key={i} className="tile">
              <div>
                <div className="meta-row">
                  <span className="badge">Scan & Review</span>
                </div>
                <div className="org-name">{orgName}</div>
                <div className="service-name">{serviceName}</div>
                <div className="prompt">Scan & share feedback in under 10 seconds.</div>
              </div>
              <div className="qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="QR code" className="qr-img" src={qrDataUrl} />
                <div className="url">{targetUrl}</div>
              </div>
              <div className="footer">
                <span>Kodspot ScanReview</span>
                <span>300 DPI · A4 sheet</span>
              </div>
            </div>
          ))}
        </div>
      </body>
    </html>
  );
}
