import type { Job } from "../types";

/** The searchable/rankable text of an offer (title + excerpt + description). */
export function jobText(job: Pick<Job, "title" | "excerpt" | "description">): string {
  return `${job.title} ${job.excerpt} ${job.description ?? ""}`;
}
