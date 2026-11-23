import type { SeoFaq } from "./seo-pages";
import { plainInline } from "./seo-rich-text";
import { BRAND_SHARE_IMAGE_META } from "./share-image";

const BASE = "https://veyrohealth.com";

/** Metadata shared by all published condition pages, including CSV imports. */
export function seoPageHead(page: {
  slug: string;
  seo_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  faqs: SeoFaq[];
  updated_at?: string;
}) {
  const url = `${BASE}/${page.slug}`;
  const desc = page.meta_description || plainInline(page.intro).slice(0, 155);
  const scripts = [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${BASE}/#organization`,
            name: "Veyro Health",
            url: BASE,
          },
          {
            "@type": "WebPage",
            "@id": `${url}#webpage`,
            url,
            name: page.seo_title,
            description: desc,
            inLanguage: "en-GB",
            publisher: { "@id": `${BASE}/#organization` },
            breadcrumb: { "@id": `${url}#breadcrumb` },
            ...(page.updated_at ? { dateModified: page.updated_at } : {}),
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE },
              { "@type": "ListItem", position: 2, name: "Therapists", item: `${BASE}/therapists` },
              { "@type": "ListItem", position: 3, name: page.h1, item: url },
            ],
          },
        ],
      }),
    },
  ];
  // Keep valid existing FAQ schema when the page displays FAQs.
  if (page.faqs.length)
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: plainInline(f.q),
          acceptedAnswer: { "@type": "Answer", text: plainInline(f.a) },
        })),
      }),
    });
  return {
    meta: [
      { title: page.seo_title },
      { name: "description", content: desc },
      { property: "og:title", content: page.seo_title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: page.seo_title },
      { name: "twitter:description", content: desc },
      ...BRAND_SHARE_IMAGE_META,
    ],
    links: [{ rel: "canonical", href: url }],
    scripts,
  };
}
