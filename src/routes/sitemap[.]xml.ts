import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedTherapistSlugs } from "@/lib/therapist-profiles.functions";
import { listSeoSlugs } from "@/lib/seo-pages.functions";

const BASE_URL = "https://veyrohealth.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/therapists", changefreq: "weekly", priority: "0.9" },
  { path: "/how-veyro-works", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/therapy-fund", changefreq: "monthly", priority: "0.6" },
  { path: "/partners", changefreq: "monthly", priority: "0.7" },
  { path: "/client/signup", changefreq: "monthly", priority: "0.6" },
  { path: "/faqs", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_ENTRIES];

        try {
          const { slugs } = await listPublishedTherapistSlugs();
          for (const t of slugs) {
            entries.push({
              path: `/therapist/${t.slug}`,
              lastmod: t.updated_at ? new Date(t.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.7",
            });
          }
        } catch (err) {
          console.error("sitemap: failed to load therapist slugs", err);
        }

        try {
          const { slugs } = await listSeoSlugs();
          for (const p of slugs) {
            entries.push({
              path: `/${p.slug}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.8",
            });
          }
        } catch (err) {
          console.error("sitemap: failed to load SEO pages", err);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
