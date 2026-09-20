import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { JobFlagsProvider } from "./lib/jobFlags.tsx";
import { ProfileProvider } from "./lib/profile.tsx";
import { SavedJobsProvider } from "./lib/savedJobs.tsx";
import { ThemeProvider } from "./lib/theme.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <SavedJobsProvider>
              <JobFlagsProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </JobFlagsProvider>
            </SavedJobsProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
