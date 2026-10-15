import type { ChatApiCv, ChatApiProfile } from "../api/chat";
import type { Cv } from "../hooks/useCvs";
import type { CvProfile } from "./cvAnalysis";
import { isReadableCv } from "./cvText";

/** What the API accepts (see the backend's ChatProfileDto / ChatCvDto): it refuses more, so we cut here. */
export const MAX_SHARED_CVS = 3;
export const MAX_SHARED_CV_CHARS = 12_000;

const words = (values: readonly string[], max: number, length: number): string[] =>
  [...new Set(values.map((v) => v.trim().slice(0, length)).filter(Boolean))].slice(0, max);

/** The CV profile as the chat sends it, or null when it holds nothing the assistant could search with. */
export function toChatProfile(profile: CvProfile | null): ChatApiProfile | null {
  if (!profile) return null;
  const out: ChatApiProfile = {
    skills: words(profile.skills, 40, 60),
    roles: words(profile.roles, 12, 30),
    languages: words(profile.languages, 10, 30),
    locations: words(profile.locations, 10, 60),
    titles: words(profile.titles, 10, 80),
    seniority: profile.seniority ? profile.seniority.slice(0, 30) : null,
    years: profile.years === null || !Number.isFinite(profile.years) ? null : Math.min(Math.max(Math.round(profile.years), 0), 60),
  };
  return out.skills.length || out.roles.length || out.titles.length ? out : null;
}

/** The CVs to share: readable ones only, a few, each cut to what the API accepts. */
export function toChatCvs(cvs: readonly Pick<Cv, "id" | "name" | "text">[]): ChatApiCv[] {
  return cvs
    .filter((cv) => isReadableCv(cv.text))
    .slice(0, MAX_SHARED_CVS)
    .map((cv) => ({ id: cv.id, name: cv.name.slice(0, 120), text: cv.text.trim().slice(0, MAX_SHARED_CV_CHARS) }));
}
