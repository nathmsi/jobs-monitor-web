import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App";
import { AuthProvider } from "./providers/auth/AuthProvider";
import { JobFlagsProvider } from "./providers/jobFlags/JobFlagsProvider";
import { PreferencesProvider } from "./providers/preferences/PreferencesProvider";
import { ProfileProvider } from "./providers/profile/ProfileProvider";
import { SavedJobsProvider } from "./providers/savedJobs/SavedJobsProvider";
import { ThemeProvider } from "./providers/theme/ThemeProvider";
import { ToastProvider } from "./providers/toast/ToastProvider";

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
            <PreferencesProvider>
              <SavedJobsProvider>
                <JobFlagsProvider>
                  <ToastProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </ToastProvider>
                </JobFlagsProvider>
              </SavedJobsProvider>
            </PreferencesProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
