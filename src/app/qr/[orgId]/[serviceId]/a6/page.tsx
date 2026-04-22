import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { QrPoster } from "@/components/qr/qr-poster";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

export default async function QrPosterPage({
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
    width: 900,
    color: {
      dark: experience.organization.theme.primary,
      light: "#ffffff",
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-8 print:bg-white">
      <QrPoster
        accentColor={experience.organization.theme.accent}
        organizationName={experience.organization.name}
        primaryColor={experience.organization.theme.primary}
        qrDataUrl={qrDataUrl}
        serviceName={experience.service.name}
        targetUrl={targetUrl}
      />
    </div>
  );
}
