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
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{
        background: `linear-gradient(180deg, ${experience.organization.theme.surface} 0%, #ffffff 100%)`,
      }}
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-4 rounded-[28px] px-5 py-4 text-sm text-slate-600">
          <p className="font-medium text-slate-950">{experience.organization.name}</p>
          <p>{experience.service.name}</p>
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
