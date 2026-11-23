import { describe, expect, it } from "vitest";
import { parseInline, plainInline } from "./seo-rich-text";

describe("SEO rich text", () => {
  it("parses bold", () => {
    expect(parseInline("a **b** c")[1]).toEqual({
      type: "bold",
      children: [{ type: "text", text: "b" }],
    });
  });
  it("external NHS links open externally", () => {
    expect(parseInline("[NHS](https://www.nhs.uk/x)")[0]).toMatchObject({
      type: "link",
      href: "https://www.nhs.uk/x",
      external: true,
    });
  });
  it("internal slug links stay on site", () => {
    expect(parseInline("[Anxiety](therapy-for-anxiety)")[0]).toMatchObject({
      href: "/therapy-for-anxiety",
      external: false,
    });
  });
  it("HTML anchors and strong are supported", () => {
    const t = parseInline('<a href="/therapy-for-stress">Stress</a> <strong>x</strong>');
    expect(t[0]).toMatchObject({ type: "link", href: "/therapy-for-stress" });
    expect(t[2]).toMatchObject({ type: "bold" });
  });
  it("javascript: links are dropped to plain text", () => {
    expect(parseInline("[x](javascript:alert(1))")[0].type).toBe("text");
  });
});

describe("FAQ links from a CSV upload", () => {
  it("keeps an HTML link intact through the importer and makes it clickable", async () => {
    const { csvToRows } = await import("./seo-pages");
    const ans =
      'See <a href="https://www.nhs.uk/mental-health/">NHS guidance</a>, or [anxiety](/therapy-for-anxiety).';
    const csv = `slug,seo_title,meta_description,h1,faq1_question,faq1_answer\ntherapy-for-x,T,D,H,Q?,"${ans.replace(/"/g, '""')}"\n`;
    const a = csvToRows(csv).rows[0].page!.faqs[0].a;
    expect(a).toBe(ans);
    const links = parseInline(a).filter((t) => t.type === "link");
    expect(links.map((l) => (l as { href: string }).href)).toEqual([
      "https://www.nhs.uk/mental-health/",
      "/therapy-for-anxiety",
    ]);
    expect(plainInline(a)).toBe("See NHS guidance, or anxiety.");
  });
});
