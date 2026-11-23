/**
 * Branded 1200x630 share card (the homepage's). Spread into public leaf
 * routes' head() meta — never __root — so shared links show Veyro branding
 * instead of hosting's stale fallback screenshot.
 */
export const BRAND_SHARE_IMAGE = "https://veyrohealth.com/og-image-v4.jpg";

export const BRAND_SHARE_IMAGE_META = [
  { property: "og:image", content: BRAND_SHARE_IMAGE },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: "Veyro — Better mental healthcare starts with trust." },
  { name: "twitter:image", content: BRAND_SHARE_IMAGE },
];
