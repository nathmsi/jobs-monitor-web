import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { JobFlagsProvider } from "./lib/jobFlags.tsx";

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
      <AuthProvider>
        <JobFlagsProvider>
          <App />
        </JobFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
