import type { Job, SourceInfo } from "../../src/types.js";
import { parseAiSummary } from "../../src/utils/aiSummary.js";
import { isIndexableJob, offerText } from "../../src/utils/indexable.js";
import { paragraphs } from "./html.js";

/**
 * schema.org JobPosting for Google for Jobs, or null when it must not be
 * published: expired offers, and offers without a real description (Google
 * rejects those). Fields we do not know (end date, contract type, the real
 * employer behind an agency) are left out rather than guessed.
 */
export function jobPostingJsonLd(
  job: Job,
  source: SourceInfo | undefined,
  pageUrl: string,
): object | null {
  if (!isIndexableJob(job)) return null;

  const ai = parseAiSummary(job.ai_summary);
  const first = job.location.split(",")[0]?.trim();
  // "Israel" alone is the country, not a city.
  const locality = first && first.toLowerCase() !== "israel" ? first : undefined;
  const remote = ai?.remote === "Remote";

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: paragraphs(offerText(job)),
    identifier: { "@type": "PropertyValue", name: source?.label ?? job.source, value: job.external_id },
    url: pageUrl,
    directApply: false,
    hiringOrganization: {
      "@type": "Organization",
      name: source?.label ?? job.source,
      ...(source?.site_url ? { sameAs: source.site_url } : {}),
      ...(source?.logo ? { logo: source.logo } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(locality ? { addressLocality: locality } : {}),
        addressCountry: "IL",
      },
    },
  };

  if (job.added_at) posting.datePosted = job.added_at;
  if (remote) {
    posting.jobLocationType = "TELECOMMUTE";
    posting.applicantLocationRequirements = { "@type": "Country", name: "IL" };
  }
  return posting;
}
