import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { getTherapistBySlug } from "@/lib/therapist-profiles.functions";
import { getTherapistReviews } from "@/lib/reviews.functions";
import { getMockMeta } from "@/lib/therapist-meta";
import { Video, ShieldCheck, Globe, Clock, HeartHandshake, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";

export const Route = createFileRoute("/therapist/$slug")({
  loader: async ({ params }) => {
    const { profile } = await getTherapistBySlug({ data: { slug: params.slug } });
    if (!profile) throw notFound();
    const reviews = await getTherapistReviews({ data: { slug: params.slug } }).catch(() => ({
      reviews: [],
      traitCounts: {},
      avg: 0,
      count: 0,
    }));
    return { profile, reviews };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Therapist profile — Veyro Health" },
          { name: "robots", content: "noindex" },
        ],
      };
    const p = loaderData.profile as {
      display_name: string;
      title?: string | null;
      bio?: string | null;
    };
    const url = `https://veyrohealth.com/therapist/${params.slug}`;
    const title = `${p.display_name}${p.title ? ` — ${p.title}` : ""} | Veyro Health`;
    const bio = (p.bio ?? "").replace(/\s+/g, " ").trim();
    const desc = bio
      ? bio.length > 155
        ? `${bio.slice(0, 152).trimEnd()}…`
        : bio
      : `View ${p.display_name}'s profile and book online therapy with Veyro Health.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...BRAND_SHARE_IMAGE_META,
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: ({ error }) => {
    console.error("[therapist.$slug] render error", error);
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-[800px] px-6 py-20 text-center">
          <h1 className="font-serif text-2xl text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-foreground/70">
            We couldn't load this profile right now. Please try again in a moment.
          </p>
        </main>
        <Footer />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[800px] px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-foreground">Therapist not found</h1>
        <p className="mt-2 text-sm text-foreground/70">
          This profile is either unpublished or doesn't exist.
        </p>
      </main>
      <Footer />
    </div>
  ),
  component: TherapistProfile,
});

function TherapistProfile() {
  const { profile, reviews } = Route.useLoaderData() as {
    profile: any;
    reviews: {
      reviews: Array<{
        id: string;
        rating: number;
        body: string | null;
        traits: string[] | null;
        created_at: string;
      }>;
      traitCounts: Record<string, number>;
      avg: number;
      count: number;
    };
  };
  const params = useParams({ from: "/therapist/$slug" });
  const [session, setSession] = useState<{ email: string | null; name: string | null } | null>(
    null,
  );
  const [sessionLoading, setSessionLoading] = useState(true);
  const mock = getMockMeta(profile.slug);
  const specialities = (
    profile.specialties && profile.specialties.length ? profile.specialties : mock.specialities
  ) as string[];
  const languages = (
    profile.languages && profile.languages.length ? profile.languages : mock.languages
  ) as string[];
  const years = profile.years_in_practice ?? mock.years;
  const initials = profile.display_name
    .split(/\s+/)
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const insurers = (profile.insurance_providers ?? []) as string[];

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        const u = data.session.user;
        setSession({
          email: u.email ?? null,
          name:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.first_name as string) ||
            u.email?.split("@")[0] ||
            null,
        });
      } else {
        setSession(null);
      }
      setSessionLoading(false);
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (cancelled) return;
        if (s) {
          setSession({
            email: s.user.email ?? null,
            name:
              (s.user.user_metadata?.full_name as string) ||
              (s.user.user_metadata?.first_name as string) ||
              s.user.email?.split("@")[0] ||
              null,
          });
        } else {
          setSession(null);
        }
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1100px] px-6 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <div>
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.display_name}
                  className="mb-5 h-32 w-32 rounded-full border border-border/60 object-cover"
                />
              ) : (
                <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-2xl font-semibold text-primary">
                  {initials}
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Therapist
              </p>
              <h1 className="mt-2 font-serif text-3xl text-foreground md:text-4xl">
                {profile.display_name}
              </h1>
              {profile.title && <p className="mt-1 text-sm text-foreground/70">{profile.title}</p>}

              {profile.bio && (
                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {profile.bio}
                </p>
              )}

              <ul className="mt-6 space-y-2 text-sm text-foreground/75">
                <li className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" /> Online sessions with a video link sent
                  on booking
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Verified by Veyro's clinical team
                </li>
                {profile.offers_intro_call && (
                  <li className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" /> Offers a free 15-minute introductory
                    consultation
                  </li>
                )}
              </ul>
            </div>

            {profile.intro_video_url && (
              <section className="max-w-xs">
                <div className="mb-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                    Meet {profile.display_name.split(" ")[0]}
                  </h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-[var(--shadow-soft)]">
                  <video
                    src={profile.intro_video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Areas of Expertise
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {specialities.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>

            {insurers.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                  Accepted insurance providers
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {insurers.map((i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-primary/30 bg-primary/5 text-foreground/80"
                    >
                      {i}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Experience"
                value={`${years}+ years`}
              />
              <InfoRow
                icon={<Globe className="h-4 w-4" />}
                label="Languages"
                value={languages.join(", ")}
              />
              <InfoRow
                icon={<Video className="h-4 w-4" />}
                label="Sessions"
                value="Online video session"
              />
            </div>

            {reviews.count === 0 && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-primary">
                New on Veyro — no client reviews yet
              </p>
            )}

            {reviews.count > 0 && (
              <section aria-labelledby="reviews-heading">
                <div className="flex items-baseline justify-between">
                  <h3 id="reviews-heading" className="font-serif text-xl text-foreground">
                    Client reviews
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold">{reviews.avg.toFixed(1)}</span>
                    <span className="text-foreground/60">
                      · {reviews.count} review{reviews.count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {Object.keys(reviews.traitCounts).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(reviews.traitCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([t, n]) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-foreground/80"
                        >
                          {t} · {n}
                        </Badge>
                      ))}
                  </div>
                )}
                <ul className="mt-4 space-y-4">
                  {reviews.reviews.slice(0, 6).map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                      <div
                        className="flex items-center gap-1 text-primary"
                        aria-label={`${r.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary" : "text-foreground/20"}`}
                          />
                        ))}
                        <span className="ml-2 text-[11px] text-foreground/50">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {r.body && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                          {r.body}
                        </p>
                      )}
                      {r.traits && r.traits.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.traits.map((t: string) => (
                            <span
                              key={t}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl text-foreground">Book a session</h2>
            <BookingWidget
              therapistId={profile.id}
              therapistName={profile.display_name}
              clientName={session?.name ?? null}
              clientEmail={session?.email ?? null}
              signedIn={!sessionLoading && !!session}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
      <span className="mt-0.5 text-primary" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
          {label}
        </p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
