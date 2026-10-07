import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { JobFlagsProvider } from "./lib/jobFlags.tsx";
import { PreferencesProvider } from "./lib/preferences.tsx";
import { ProfileProvider } from "./lib/profile.tsx";
import { SavedJobsProvider } from "./lib/savedJobs.tsx";
import { ThemeProvider } from "./lib/theme.tsx";
import { ToastProvider } from "./lib/toast.tsx";

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
