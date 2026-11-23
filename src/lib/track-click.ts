/** Pushes a homepage CTA click into Google Tag Manager's dataLayer (event: "cta_click"). */
export function trackClick(button: string) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: "cta_click", cta_name: button, cta_location: "homepage_hero" });
}
