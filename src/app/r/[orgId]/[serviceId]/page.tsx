import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/reviews/review-form";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ orgId: string; serviceId: string }>;
}) {
  const { orgId, serviceId } = await params;
  const experience = await getPublicReviewExperience(orgId, serviceId);

  if (!experience) {
    notFound();
  }

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{
        background: `radial-gradient(circle_at_top_left, ${experience.organization.theme.primary}20, transparent 36%), radial-gradient(circle_at_bottom_right, ${experience.organization.theme.accent}20, transparent 30%), linear-gradient(180deg, ${experience.organization.theme.surface} 0%, #ffffff 100%)`,
      }}
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-4 rounded-[28px] border border-black/10 bg-white/80 px-5 py-4 text-sm text-slate-600 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-950">{experience.organization.name}</p>
              <p>{experience.service.name}</p>
            </div>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Secure review
            </span>
          </div>
        </div>
        <ReviewForm
          orgId={orgId}
          organizationName={experience.organization.name}
          reviewConfig={experience.service.reviewConfig}
          serviceId={serviceId}
          serviceName={experience.service.name}
          theme={experience.organization.theme}
        />
      </div>
    </div>
  );
}
