/**
 * Route chunks. The loaders are exported so a link can start downloading a page
 * on hover/focus (the same promise is reused when the route renders).
 */
export const loadJobsPage = () => import("./JobsPage").then((m) => ({ default: m.JobsPage }));
export const loadCoachPage = () => import("./CoachPage").then((m) => ({ default: m.CoachPage }));
export const loadProfilePage = () => import("./ProfilePage").then((m) => ({ default: m.ProfilePage }));
