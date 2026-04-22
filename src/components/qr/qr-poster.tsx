import Image from "next/image";

interface QrPosterProps {
  qrDataUrl: string;
  organizationName: string;
  serviceName: string;
  targetUrl: string;
  primaryColor: string;
  accentColor: string;
}

export function QrPoster({
  qrDataUrl,
  organizationName,
  serviceName,
  targetUrl,
  primaryColor,
  accentColor,
}: QrPosterProps) {
  return (
    <div
      className="mx-auto flex w-[105mm] min-h-[148mm] flex-col justify-between overflow-hidden rounded-[22px] bg-white p-[10mm] text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.18)] print:shadow-none"
      style={{
        borderTop: `8mm solid ${primaryColor}`,
        borderBottom: `4mm solid ${accentColor}`,
      }}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Kodspot ScanReview</p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight">Rate your {serviceName}</h1>
        <p className="mt-4 max-w-[70mm] text-[15px] leading-6 text-slate-600">
          Scan the QR and share feedback in under 10 seconds. Your insight helps {organizationName} improve faster.
        </p>
      </div>

      <div className="mt-8 rounded-[20px] bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] p-5">
        <Image
          alt="QR code"
          className="mx-auto h-[58mm] w-[58mm] rounded-[18px] bg-white p-3"
          height={900}
          src={qrDataUrl}
          unoptimized
          width={900}
        />
        <div className="mt-4 text-center">
          <p className="text-[15px] font-semibold">{organizationName}</p>
          <p className="mt-1 text-[12px] text-slate-500">{targetUrl}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-[12px] text-slate-500">
        <span>Format: A6 print-ready</span>
        <span>300 DPI export friendly</span>
      </div>
    </div>
  );
}
