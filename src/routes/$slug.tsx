import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SeoPageView } from "@/components/seo/SeoPageView";
import { getSeoPage } from "@/lib/seo-pages.functions";

import { seoPageHead } from "@/lib/seo-page-head";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const res = await getSeoPage({ data: { slug: params.slug } });
    if (!res) throw notFound();
    if (res.kind === "redirect")
      throw redirect({ to: "/$slug", params: { slug: res.to }, statusCode: 301 });
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.kind !== "page") {
      return {
        meta: [{ title: "Page not found — Veyro" }, { name: "robots", content: "noindex" }],
      };
    }
    return seoPageHead(loaderData.page);
  },
  notFoundComponent: NotFound,
  component: SeoPage,
});

function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="mx-auto max-w-[700px] px-6 py-24 text-center">
        <h1 className="font-serif text-4xl text-primary">Page not found</h1>
        <p className="mt-3 text-foreground/70">This page doesn't exist or has been taken down.</p>
        <Link
          to="/therapists"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Find a therapist
        </Link>
      </div>
      <Footer />
    </main>
  );
}

function SeoPage() {
  const data = Route.useLoaderData();
  if (data.kind !== "page") return null;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <SeoPageView data={data} />
      <Footer />
    </main>
  );
}
