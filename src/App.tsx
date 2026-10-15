import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ChatWidget } from "./components/Chat/ChatWidget";
import { BottomNav } from "./components/BottomNav/BottomNav";
import { ScrollManager } from "./components/ScrollManager/ScrollManager";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { PageFallback } from "./components/PageFallback/PageFallback";
import { HomePage } from "./pages/HomePage";
import {
  loadCoachPage,
  loadCompanyPage,
  loadJobPage,
  loadJobsPage,
  loadProfilePage,
  loadTopicPage,
} from "./pages/lazyPages";

const JobsPage = lazy(loadJobsPage);
const CoachPage = lazy(loadCoachPage);
const ProfilePage = lazy(loadProfilePage);
const JobPage = lazy(loadJobPage);
const CompanyPage = lazy(loadCompanyPage);
const TopicPage = lazy(loadTopicPage);

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
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/jobs/:source/:externalId/:slug?" element={<JobPage />} />
          <Route path="/companies/:key" element={<CompanyPage />} />
          <Route path="/tech/:tech/:region?" element={<TopicPage />} />
        </Routes>
      </Suspense>
      <BottomNav />
      <ChatWidget />
    </ErrorBoundary>
  );
}

export default App;
