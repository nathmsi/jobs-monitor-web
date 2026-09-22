import { Route, Routes } from "react-router-dom";

import { CoachPage } from "./pages/CoachPage";
import { JobsPage } from "./pages/JobsPage";
import { ProfilePage } from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<JobsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/coach" element={<CoachPage />} />
    </Routes>
  );
}

export default App;
