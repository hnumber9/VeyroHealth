import { Fragment, type ReactNode } from "react";

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "link"; href: string; external: boolean; children: InlineToken[] };

/** Allows site-relative paths, bare slugs and http(s)/mailto URLs only. */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const url = raw.trim();
  if (/^https?:\/\//i.test(url))
    return { href: url, external: !/^https?:\/\/(www\.)?veyrohealth\.com(\/|$)/i.test(url) };
  if (/^mailto:/i.test(url)) return { href: url, external: true };
  if (/^\/(?!\/)[\w\-/#?=&.%]*$/.test(url)) return { href: url, external: false };
  if (/^[\w-]+$/.test(url)) return { href: `/${url}`, external: false };
  return null;
}

/** Converts the small set of supported HTML tags to Markdown equivalents. */
function htmlToMarkdown(s: string) {
  return s
    .replace(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<br\s*\/?>/gi, "\n");
}

/** Parses **bold** and [text](url) into tokens; anything else stays plain text. */
export function parseInline(input: string): InlineToken[] {
  const s = htmlToMarkdown(input);
  const out: InlineToken[] = [];
  const re = /\*\*([^*]+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m; (m = re.exec(s)); ) {
    if (m.index > last) out.push({ type: "text", text: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "bold", children: parseInline(m[1]) });
    else {
      const link = safeHref(m[3]);
      out.push(
        link
          ? { type: "link", ...link, children: parseInline(m[2]) }
          : { type: "text", text: m[2] },
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: "text", text: s.slice(last) });
  return out;
}

/** The visible words only, without link/bold markup — for structured data and meta text. */
export function plainInline(input: string): string {
  const walk = (ts: InlineToken[]): string =>
    ts.map((t) => (t.type === "text" ? t.text : walk(t.children))).join("");
  return walk(parseInline(input))
    .replace(/<[^>]+>/g, "")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function render(tokens: InlineToken[]): ReactNode {
  return tokens.map((t, i) => {
    if (t.type === "text") return <Fragment key={i}>{t.text}</Fragment>;
    if (t.type === "bold")
      return (
        <strong key={i} className="font-semibold text-foreground">
          {render(t.children)}
        </strong>
      );
    return (
      <a
        key={i}
        href={t.href}
        className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {render(t.children)}
      </a>
    );
  });
}

export function RichInline({ text }: { text: string }) {
  return <>{render(parseInline(text))}</>;
}
