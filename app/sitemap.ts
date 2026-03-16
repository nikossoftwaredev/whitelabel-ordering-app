import type { MetadataRoute } from "next";

import { routing } from "@/lib/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const sitemap = (): MetadataRoute.Sitemap => {
  const routes = ["", "/admin"];

  return routes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    })),
  );
};

export default sitemap;
