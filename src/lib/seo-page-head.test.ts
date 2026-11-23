import { describe, expect, it } from "vitest";
import { csvToRows, emptyPage, pagesToCsv } from "./seo-pages";
import { seoPageHead } from "./seo-page-head";

describe("condition page identity", () => {
  it("automatically uses each imported page's own URL and structured identity", () => {
    const inputs = ["stress", "ocd"].map((condition) => ({
      ...emptyPage(),
      slug: `therapy-for-${condition}`,
      seo_title: `Online ${condition} therapy | Veyro`,
      meta_description: `Support for ${condition}.`,
      h1: `Therapy for ${condition}`,
    }));
    const imported = csvToRows(pagesToCsv(inputs));
    for (const row of imported.rows) {
      expect(row.error).toBeNull();
      if (!row.page) throw new Error("Expected imported page");
      const head = seoPageHead(row.page);
      const url = `https://veyrohealth.com/${row.page.slug}`;
      expect(head.links).toEqual([{ rel: "canonical", href: url }]);
      const graph = JSON.parse(head.scripts[0].children)["@graph"];
      expect(graph.find((node: Record<string, unknown>) => node["@type"] === "WebPage").url).toBe(
        url,
      );
      expect(
        graph.find((node: Record<string, unknown>) => node["@type"] === "BreadcrumbList")
          .itemListElement[2].item,
      ).toBe(url);
      expect(
        graph.find((node: Record<string, unknown>) => node["@type"] === "Organization").url,
      ).toBe("https://veyrohealth.com");
    }
  });
});
describe("condition page share image", () => {
  it("gives every condition page the Veyro share picture for link previews", () => {
    const head = seoPageHead({
      ...emptyPage(),
      slug: "therapy-for-stress",
      seo_title: "Stress",
      meta_description: "d",
      h1: "Stress",
    });
    const meta: Array<Record<string, string | undefined>> = head.meta;
    expect(meta.find((m) => m.property === "og:image")?.content).toBe(
      "https://veyrohealth.com/og-image-v4.jpg",
    );
    expect(meta.find((m) => m.name === "twitter:image")?.content).toBe(
      "https://veyrohealth.com/og-image-v4.jpg",
    );
  });
});
