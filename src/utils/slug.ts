/** "Tel Aviv / Center" → "tel-aviv-center": lowercase ASCII words joined by dashes. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The offer's own page: `/jobs/<source>/<id>/<readable-title>` (the title part is only for humans and search engines). */
export function jobPath(job: { source: string; external_id: string; title: string }): string {
  const slug = slugify(job.title);
  const base = `/jobs/${encodeURIComponent(job.source)}/${encodeURIComponent(job.external_id)}`;
  return slug ? `${base}/${slug}` : base;
}

/** A company or agency page. */
export function companyPath(key: string): string {
  return `/companies/${encodeURIComponent(key)}`;
}

/** Offers for one technology or role, optionally in one region. */
export function topicPath(techSlug: string, region?: string): string {
  return region && region !== "all" ? `/tech/${techSlug}/${region}` : `/tech/${techSlug}`;
}
