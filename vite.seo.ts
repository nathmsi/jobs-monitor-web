import { readFile } from "node:fs/promises";
import { loadEnv, type Plugin } from "vite";

import { matchRoute } from "./api/_lib/routes.ts";

/**
 * Serves the same server-rendered pages as the Vercel function (`api/seo.ts`)
 * from the dev server, so they can be tried and tested locally.
 */
export function seoPages(): Plugin {
  return {
    name: "seo-pages",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "/";
        if (!matchRoute(new URL(url, "http://local").pathname)) return next();
        try {
          const { createHandler } = (await server.ssrLoadModule("/api/_lib/handler.ts")) as typeof import("./api/_lib/handler.ts");
          const origin = `http://${req.headers.host ?? "localhost"}`;
          const handler = createHandler({
            apiBase: env.API_URL || env.VITE_API_URL || "http://localhost:8080",
            siteUrl: env.SITE_URL || env.VITE_SITE_URL || origin,
            getShell: async () => server.transformIndexHtml(url, await readFile("index.html", "utf8")),
          });
          await handler({ url, query: {} }, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
