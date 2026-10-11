import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { PageFallback } from "./components/PageFallback/PageFallback";
import { HomePage } from "./pages/HomePage";
import { loadCoachPage, loadJobsPage, loadProfilePage } from "./pages/lazyPages";

const JobsPage = lazy(loadJobsPage);
const CoachPage = lazy(loadCoachPage);
const ProfilePage = lazy(loadProfilePage);

/** Query parameters the offers browser used to read on `/` (old shared links). */
const LEGACY_JOBS_PARAMS = ["q", "role", "region", "category", "tab", "sort"];

/** `/` is the home page; links from before it existed (`/?tab=…`) go to `/jobs`. */
function HomeRoute() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (LEGACY_JOBS_PARAMS.some((key) => params.has(key))) {
    return <Navigate to={{ pathname: "/jobs", search }} replace />;
  }
  return <HomePage />;
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/coach" element={<CoachPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
