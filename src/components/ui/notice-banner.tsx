type Tone = "success" | "error" | "info";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-slate-50 border-slate-200 text-slate-700",
};

const TONE_LABELS: Record<Tone, string> = {
  success: "Success",
  error: "Error",
  info: "Notice",
};

export function NoticeBanner({ tone, message }: { tone: Tone; message: string }) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`mb-5 flex items-start gap-3 rounded-[16px] border px-4 py-3 text-sm ${TONE_STYLES[tone]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.16em]">{TONE_LABELS[tone]}</span>
      <span className="flex-1">{message}</span>
    </div>
  );
}
