import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import "../i18n";
import { AuthProvider } from "../providers/auth/AuthProvider";
import { JobFlagsProvider } from "../providers/jobFlags/JobFlagsProvider";
import { PreferencesProvider } from "../providers/preferences/PreferencesProvider";
import { ProfileProvider } from "../providers/profile/ProfileProvider";
import { SavedJobsProvider } from "../providers/savedJobs/SavedJobsProvider";
import { ThemeProvider } from "../providers/theme/ThemeProvider";
import { ToastProvider } from "../providers/toast/ToastProvider";
import { LocationProbe } from "./LocationProbe";

interface Options extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL (default "/"). */
  route?: string;
  queryClient?: QueryClient;
}

/**
 * Renders `ui` inside the same provider stack as `main.tsx` (real providers,
 * real i18n). Supabase is disabled in tests (see vite.config.ts), so the app
 * runs signed out; tests that need a user mock `useAuth` and `services/supabase`
 * themselves. The network client is mocked via `mockBackend`.
 */
export function renderWithProviders(ui: ReactElement, { route = "/", queryClient, ...options }: Options = {}) {
  const qc =
    queryClient ??
    new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider>
            <ProfileProvider>
              <PreferencesProvider>
                <SavedJobsProvider>
                  <JobFlagsProvider>
                    <ToastProvider>
                      <MemoryRouter initialEntries={[route]}>
                        {children}
                        <LocationProbe />
                      </MemoryRouter>
                    </ToastProvider>
                  </JobFlagsProvider>
                </SavedJobsProvider>
              </PreferencesProvider>
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return { user: userEvent.setup(), queryClient: qc, ...render(ui, { wrapper: Wrapper, ...options }) };
}
