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
      className="mx-auto flex w-[105mm] min-h-[148mm] flex-col justify-between overflow-hidden rounded-[22px] bg-white p-[8mm] text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.18)] print:shadow-none print:rounded-none"
      style={{ borderTop: `7mm solid ${primaryColor}` }}
    >
      {/* Header — org name is the big headline */}
      <div>
        <h1
          className="text-[26px] font-bold leading-tight"
          style={{ color: primaryColor }}
        >
          {organizationName}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-slate-700">{serviceName}</p>
        <p className="mt-3 text-[13px] leading-[1.55] text-slate-500">
          Scan the QR and share feedback in under 10 seconds.
        </p>
      </div>

      {/* QR code */}
      <div
        className="mt-6 rounded-[18px] p-4"
        style={{ background: `linear-gradient(180deg, ${primaryColor}14 0%, #ffffff 100%)` }}
      >
        <Image
          alt="QR code"
          className="mx-auto h-[56mm] w-[56mm] rounded-[14px] bg-white p-2"
          height={900}
          src={qrDataUrl}
          unoptimized
          width={900}
        />
        <p className="mt-3 text-center text-[11px] break-all text-slate-400">{targetUrl}</p>
      </div>

      {/* Footer — company branding small */}
      <div
        className="mt-5 flex items-center justify-between pt-4 text-[10px] text-slate-400"
        style={{ borderTop: `2px solid ${accentColor}` }}
      >
        <span>Kodspot ScanReview</span>
        <span>300 DPI · A6</span>
      </div>
    </div>
  );
}
