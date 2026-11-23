import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import appCss from "../styles.css?url";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-lg text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="mt-3 font-serif text-4xl text-foreground">This page isn't here</h1>
          <p className="mt-3 text-sm text-foreground/70">
            The link may be out of date or the page has moved. Try one of these instead:
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Go home
            </Link>
            <Link
              to="/therapists"
              className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:border-primary/40"
            >
              Find a therapist
            </Link>
            <Link
              to="/how-veyro-works"
              className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:border-primary/40"
            >
              How Veyro works
            </Link>
            <Link
              to="/faqs"
              className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:border-primary/40"
            >
              FAQs
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Veyro Health — Better mental healthcare starts with trust." },
      {
        name: "description",
        content:
          "Veyro Health connects people with vetted therapists across Europe. Browse profiles, read real reviews, and book with confidence.",
      },
      { name: "author", content: "Veyro Health" },
      {
        property: "og:title",
        content: "Veyro Health — Better mental healthcare starts with trust.",
      },
      {
        property: "og:description",
        content:
          "Veyro Health connects people with vetted therapists across Europe. Browse profiles, read real reviews, and book with confidence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Veyro" },
      { property: "og:url", content: "https://veyrohealth.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Veyro Health — Better mental healthcare starts with trust.",
      },
      {
        name: "twitter:description",
        content:
          "Veyro Health connects people with vetted therapists across Europe. Browse profiles, read real reviews, and book with confidence.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        children:
          "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MTV386CM');",
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-PRX3V6E0Y9",
        async: true,
      },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-PRX3V6E0Y9');",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MTV386CM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function BackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/" || pathname === "/home-to-be") return null;
  return (
    <div className="px-6 pt-6 md:px-0 md:pt-0">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="rounded-full border border-border/40 bg-background/80 p-2.5 shadow-sm backdrop-blur transition hover:bg-background md:fixed md:left-10 md:top-32 md:z-50"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-foreground/70" />
      </button>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <BackButton />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
