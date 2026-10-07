import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { PageFallback } from "./components/PageFallback/PageFallback";
import { JobsPage } from "./pages/JobsPage";

const CoachPage = lazy(() =>
  import("./pages/CoachPage").then((m) => ({ default: m.CoachPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/coach" element={<CoachPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
