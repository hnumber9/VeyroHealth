import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

function ensureScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  document.head.appendChild(s);
}

export function CalendlyEmbed({
  url,
  prefill,
  height = 720,
}: {
  url: string;
  prefill?: { name?: string; email?: string };
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureScript();
  }, []);

  const fullUrl = (() => {
    try {
      const u = new URL(url);
      if (prefill?.name) u.searchParams.set("name", prefill.name);
      if (prefill?.email) u.searchParams.set("email", prefill.email);
      u.searchParams.set("hide_gdpr_banner", "1");
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <div
      ref={ref}
      className="calendly-inline-widget rounded-2xl overflow-hidden border border-border/60 bg-card"
      data-url={fullUrl}
      style={{ minWidth: "320px", height: `${height}px` }}
    />
  );
}
