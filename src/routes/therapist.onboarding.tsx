import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  X,
  Search,
  CheckCircle2,
  Upload,
  Trash2,
  Video,
  ChevronDown,
} from "lucide-react";
import { TherapistPortalHeader } from "@/components/therapist/TherapistPortalHeader";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyTherapistProfile,
  upsertMyTherapistProfile,
} from "@/lib/therapist-profiles.functions";
import { sendTherapistOnboardingCompleteEmail } from "@/lib/therapist-onboarding-email.functions";
import { AREA_CATEGORIES, THERAPIST_MAX_AREAS } from "@/lib/areas-of-expertise";

export const Route = createFileRoute("/therapist/onboarding")({
  component: Onboarding,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your profile — Veyro Health" },
      {
        name: "description",
        content: "Complete your Veyro therapist profile, therapy approach and areas of expertise.",
      },
      { property: "og:title", content: "Set up your profile — Veyro Health" },
      {
        property: "og:description",
        content: "Complete your Veyro therapist profile, therapy approach and areas of expertise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const LANGUAGES = ["English", "Polish", "French", "Spanish", "German", "Arabic"];

const MAX_AREAS = THERAPIST_MAX_AREAS;

const COMMON_INSURERS = [
  "AXA Health",
  "Bupa",
  "Aviva",
  "Vitality",
  "Cigna",
  "WPA",
  "Allianz",
  "Simplyhealth",
  "Freedom Health Insurance",
];

function slugify(s: string) {
  // (validation helpers live below)
  const base = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  if (base.length >= 2) return base;
  // Fall back to something always valid (e.g. single-character or symbol-only names)
  return `therapist-${Math.random().toString(36).slice(2, 8)}`;
}

/** Which wizard step each field lives on, so we can jump to the first error. */
const FIELD_STEP: Record<string, number> = {
  displayName: 1,
  title: 1,
  headline: 1,
  bio: 1,
  years: 1,
  qualifications: 1,
  spec: 2,
  fee: 3,
};

function Onboarding() {
  const nav = useNavigate();
  const fetchProfile = useServerFn(getMyTherapistProfile);
  const saveProfile = useServerFn(upsertMyTherapistProfile);
  const notifyOnboardingComplete = useServerFn(sendTherapistOnboardingCompleteEmail);
  const [step, setStep] = useState(1);
  const [spec, setSpec] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [intro, setIntro] = useState(true);
  const [specQuery, setSpecQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [otherLang, setOtherLang] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [gender, setGender] = useState("");

  const [qualifications, setQualifications] = useState("");
  const [fee, setFee] = useState("");
  const [insurers, setInsurers] = useState<string[]>([]);
  const [otherInsurer, setOtherInsurer] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");

  // Restore any in-progress draft from localStorage before the server profile loads,
  // so a mid-onboarding refresh keeps everything the therapist has typed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const uid = data.session?.user.id ?? "anon";
      const key = `veyro:therapist-onboarding-draft:${uid}`;
      setDraftKey(key);
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const d = JSON.parse(raw) as Record<string, unknown>;
          if (typeof d.displayName === "string") setDisplayName(d.displayName);
          if (typeof d.title === "string") setTitle(d.title);
          if (typeof d.headline === "string") setHeadline(d.headline);
          if (typeof d.bio === "string") setBio(d.bio);
          if (typeof d.photoUrl === "string") setPhotoUrl(d.photoUrl);
          if (typeof d.videoUrl === "string") setVideoUrl(d.videoUrl);
          if (typeof d.years === "string") setYears(d.years);
          if (typeof d.gender === "string") setGender(d.gender);

          if (typeof d.qualifications === "string") setQualifications(d.qualifications);
          if (typeof d.fee === "string") setFee(d.fee);
          if (typeof d.intro === "boolean") setIntro(d.intro);
          if (Array.isArray(d.spec))
            setSpec(d.spec.filter((x): x is string => typeof x === "string"));
          if (Array.isArray(d.langs))
            setLangs(d.langs.filter((x): x is string => typeof x === "string"));
          if (Array.isArray(d.insurers))
            setInsurers(d.insurers.filter((x): x is string => typeof x === "string"));
          if (typeof d.step === "number" && d.step >= 1 && d.step <= 4) setStep(d.step);
        }
      } catch {
        /* ignore malformed draft */
      }
      setDraftLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the current form state as a draft so refreshes don't wipe progress.
  useEffect(() => {
    if (!draftKey || !draftLoaded || submitted) return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          displayName,
          title,
          headline,
          bio,
          photoUrl,
          videoUrl,
          years,
          gender,
          qualifications,
          fee,
          intro,
          spec,
          langs,
          insurers,
          step,
        }),
      );
    } catch {
      /* quota / private mode — ignore */
    }
  }, [
    draftKey,
    draftLoaded,
    submitted,
    displayName,
    title,
    headline,
    bio,
    photoUrl,
    videoUrl,
    years,
    gender,
    qualifications,
    fee,
    intro,
    spec,
    langs,
    insurers,
    step,
  ]);

  async function handlePhotoUpload(file: File) {
    setPhotoMsg(null);
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPhotoMsg("Please choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg("Please keep the photo under 5 MB.");
      return;
    }
    setPhotoBusy(true);
    setPhotoProgress(15);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Please sign in to upload a photo.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/photo-${Date.now()}.${ext}`;
      setPhotoProgress(50);
      const { error: upErr } = await supabase.storage
        .from("therapist-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setPhotoProgress(80);
      const { data: signed, error: signErr } = await supabase.storage
        .from("therapist-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl)
        throw signErr ?? new Error("Could not generate photo URL.");
      setPhotoUrl(signed.signedUrl);
      setPhotoProgress(100);
      setPhotoMsg("Photo ready — it will be saved when you finish onboarding.");
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setPhotoBusy(false);
      setTimeout(() => setPhotoProgress(null), 800);
    }
  }

  async function handleVideoUpload(file: File) {
    setVideoMsg(null);
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.type)) {
      setVideoMsg("Please choose an MP4, MOV or WebM video.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideoMsg("Please keep the video under 100 MB.");
      return;
    }
    setVideoBusy(true);
    setVideoProgress(15);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Please sign in to upload a video.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${uid}/intro-${Date.now()}.${ext}`;
      setVideoProgress(50);
      const { error: upErr } = await supabase.storage
        .from("therapist-videos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setVideoProgress(80);
      const { data: signed, error: signErr } = await supabase.storage
        .from("therapist-videos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl)
        throw signErr ?? new Error("Could not generate video URL.");
      setVideoUrl(signed.signedUrl);
      setVideoProgress(100);
      setVideoMsg("Video ready — it will be saved when you finish onboarding.");
    } catch (err) {
      setVideoMsg(err instanceof Error ? err.message : "Failed to upload video.");
    } finally {
      setVideoBusy(false);
      setTimeout(() => setVideoProgress(null), 800);
    }
  }

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        nav({ to: "/therapist/signup" });
        return;
      }
      const u = data.session.user;
      setAccountEmail(u.email ?? "");
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        [meta.first_name, meta.last_name]
          .filter((p) => typeof p === "string" && p)
          .join(" ")
          .trim();
      if (metaName) setDisplayName((v) => v || metaName);
      fetchProfile({})
        .then(({ profile }) => {
          if (cancelled || !profile) return;
          // Only fill fields the user hasn't already typed (draft takes precedence
          // so a mid-onboarding refresh keeps in-progress edits).
          setDisplayName((v) => v || (profile.display_name ?? ""));
          setTitle((v) => v || (profile.title ?? ""));
          const fullBio = profile.bio ?? "";
          const splitIdx = fullBio.indexOf("\n\n");
          if (splitIdx > 0 && splitIdx < 240) {
            setHeadline((v) => v || fullBio.slice(0, splitIdx));
            setBio((v) => v || fullBio.slice(splitIdx + 2));
          } else {
            setBio((v) => v || fullBio);
          }
          setPhotoUrl((v) => v || (profile.photo_url ?? ""));
          setVideoUrl((v) => v || (profile.intro_video_url ?? ""));
          setYears(
            (v) =>
              v || (profile.years_in_practice != null ? String(profile.years_in_practice) : ""),
          );
          setGender((v) => v || ((profile as { gender?: string | null }).gender ?? ""));

          setQualifications((v) => v || (profile.qualifications ?? ""));
          setFee(
            (v) => v || (profile.session_fee_50 != null ? String(profile.session_fee_50) : ""),
          );
          if (profile.specialties && profile.specialties.length)
            setSpec((v) => (v.length ? v : profile.specialties!));
          if (profile.languages && profile.languages.length)
            setLangs((v) => (v.length ? v : profile.languages!));
          if (profile.insurance_providers && profile.insurance_providers.length)
            setInsurers((v) => (v.length ? v : profile.insurance_providers!));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filteredCategories = useMemo(() => {
    const q = specQuery.trim().toLowerCase();
    if (!q) return AREA_CATEGORIES;
    return AREA_CATEGORIES.map((c) => ({
      ...c,
      areas: c.areas.filter((a) => a.toLowerCase().includes(q)),
    })).filter((c) => c.areas.length > 0);
  }, [specQuery]);
  const searching = specQuery.trim().length > 0;
  const toggleCat = (label: string) => setOpenCats((prev) => ({ ...prev, [label]: !prev[label] }));

  const addOtherLang = () => {
    const v = otherLang.trim();
    if (!v) return;
    if (!langs.includes(v)) setLangs([...langs, v]);
    setOtherLang("");
  };

  const addOtherInsurer = () => {
    const v = otherInsurer.trim();
    if (!v) return;
    if (!insurers.includes(v)) setInsurers([...insurers, v]);
    setOtherInsurer("");
  };

  /** Field-level validation mirroring the server rules, keyed by field name. */
  function validateAll(): Record<string, string> {
    const e: Record<string, string> = {};
    const name = displayName.trim();
    if (!name) e.displayName = "Please enter your full name.";
    else if (name.length > 120) e.displayName = "Please keep your name under 120 characters.";
    else if (!/[a-z0-9]/i.test(name)) e.displayName = "Please use letters or numbers in your name.";
    if (title.trim().length > 120)
      e.title = "Please keep your therapy approach under 120 characters.";
    if (headline.trim().length > 500)
      e.headline = "Please keep your headline under 500 characters.";
    if (headline.trim().length + bio.trim().length > 3990)
      e.bio =
        "Your headline and about me are too long — please shorten to around 4,000 characters in total.";
    if (years.trim()) {
      const n = Number(years.trim());
      if (!Number.isInteger(n) || n < 0 || n > 80)
        e.years = "Enter a whole number of years between 0 and 80.";
    }
    if (qualifications.trim().length > 1000)
      e.qualifications = "Please keep qualifications under 1,000 characters.";
    if (fee.trim()) {
      const n = Number(fee.trim());
      if (!Number.isInteger(n) || n < 0 || n > 10000)
        e.fee = "Enter a whole fee amount in GBP between 0 and 10,000.";
    }
    return e;
  }

  /** Validate only the fields on the current step before advancing. */
  function handleContinue() {
    const all = validateAll();
    const stepErrs = Object.fromEntries(
      Object.entries(all).filter(([k]) => (FIELD_STEP[k] ?? 1) === step),
    );
    setFieldErrors(stepErrs);
    if (Object.keys(stepErrs).length) return;
    setErrorMsg(null);
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setErrorMsg(null);
    const errs = validateAll();
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      const firstBadStep = Math.min(...Object.keys(errs).map((k) => FIELD_STEP[k] ?? 1));
      setStep(firstBadStep);
      return;
    }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setErrorMsg("Please sign in to save your profile.");
        setSaving(false);
        return;
      }
      const slug = slugify(displayName);
      const combinedBio = headline.trim() ? `${headline.trim()}\n\n${bio.trim()}` : bio.trim();
      const yearsNum = years.trim() ? parseInt(years, 10) : null;
      const feeNum = fee.trim() ? parseInt(fee, 10) : null;
      const saved = await saveProfile({
        data: {
          slug,
          display_name: displayName.trim(),
          title: title.trim() || null,
          bio: combinedBio || null,
          photo_url: photoUrl.trim() || "",
          intro_video_url: videoUrl.trim() || "",
          years_in_practice: Number.isFinite(yearsNum as number) ? (yearsNum as number) : null,
          gender: gender || null,

          session_fee_50: Number.isFinite(feeNum as number) ? (feeNum as number) : null,
          offers_intro_call: intro,
          specialties: spec,
          languages: langs,
          qualifications: qualifications.trim() || null,
          insurance_providers: insurers,
        },
      });
      const savedProfile = saved?.profile as { id?: string; slug?: string | null } | undefined;
      const savedSlug = savedProfile?.slug || slug;
      // Fire-and-forget internal notification; onboarding completes regardless of email outcome.
      notifyOnboardingComplete({
        data: {
          therapistProfileId: savedProfile?.id ?? null,
          fullName: displayName.trim(),
          slug: savedSlug,
          title: title.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          photoUrl: photoUrl.trim() || null,
          yearsInPractice: years.trim() || null,
          qualifications: qualifications.trim() || null,
          specialties: spec,
          languages: langs,
          insuranceProviders: insurers,
          sessionFee: fee.trim() || null,
          offersIntroCall: intro,
        },
      })
        .then((res) => {
          if (!res?.success) {
            console.error("[onboarding] notification email failed", res?.error);
          }
        })
        .catch((err) => {
          console.error("[onboarding] notification email threw", err);
        });
      setSubmitted(true);
      if (draftKey && typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <TherapistPortalHeader />
        <main className="mx-auto max-w-[720px] px-6 py-20 md:py-28">
          <div className="rounded-3xl border border-border/60 bg-card p-12 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h1 className="mt-6 font-serif text-3xl text-foreground md:text-4xl">
              Thanks for signing up
            </h1>
            <p className="mt-4 text-base text-foreground/70">
              We're launching in a few weeks. Your profile is now with our clinical team for review
              and we'll be in touch as soon as it's approved.
            </p>
            <p className="mt-3 text-sm text-foreground/60">
              Once you're approved, you will receive an email with a link to your dashboard, where
              you can set up your appointment scheduling.
            </p>
            <button
              type="button"
              onClick={() => nav({ to: "/" })}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90"
            >
              Back to Veyro <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TherapistPortalHeader />
      <main className="mx-auto max-w-[900px] px-6 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Practitioner onboarding
        </p>
        <h1 className="mt-2 font-serif text-3xl text-foreground md:text-4xl">
          Set up your profile
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Complete the steps below. Your profile will be hidden from clients until our clinical team
          reviews it.
        </p>
        <p className="mt-2 text-sm font-medium text-primary">
          Complete your profile before launch to receive Founding Therapist status.
        </p>

        <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-wider">
          {["About you", "Areas of expertise & languages", "Pricing & insurance"].map((s, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li key={s} className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-foreground/40"}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                <span className={active ? "text-foreground" : "text-foreground/50"}>{s}</span>
                {n < 3 && <span className="ml-1 hidden h-px w-6 bg-border sm:block" />}
              </li>
            );
          })}
        </ol>

        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <div
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border/60 bg-secondary"
                  style={
                    photoUrl
                      ? {
                          backgroundImage: `url(${photoUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div className="flex-1">
                  <p className="font-serif text-lg text-foreground">Profile photo</p>
                  <p className="text-xs text-foreground/60">
                    Upload a clear headshot. PNG, JPG or WebP, up to 5 MB. Square works best.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-accent/40">
                      <Upload className="h-4 w-4" />
                      {photoBusy ? "Uploading…" : photoUrl ? "Replace photo" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={photoBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoUpload(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {photoUrl && (
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={() => {
                          setPhotoUrl("");
                          setPhotoMsg("Photo removed.");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                  {photoProgress !== null && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${photoProgress}%` }}
                      />
                    </div>
                  )}
                  {photoMsg && <p className="mt-2 text-xs text-foreground/70">{photoMsg}</p>}
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary text-foreground/40">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-serif text-lg text-foreground">Intro video</p>
                  <p className="text-xs text-foreground/60">
                    Optional short introduction. MP4, MOV or WebM, up to 100 MB.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-accent/40">
                      <Upload className="h-4 w-4" />
                      {videoBusy ? "Uploading…" : videoUrl ? "Replace video" : "Upload video"}
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        className="hidden"
                        disabled={videoBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleVideoUpload(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {videoUrl && (
                      <button
                        type="button"
                        disabled={videoBusy}
                        onClick={() => {
                          setVideoUrl("");
                          setVideoMsg("Video removed.");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                  {videoProgress !== null && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  )}
                  {videoMsg && <p className="mt-2 text-xs text-foreground/70">{videoMsg}</p>}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <SInput
                  label="Full name"
                  placeholder="Dr. Eva Kowalski"
                  value={displayName}
                  onChange={setDisplayName}
                  error={fieldErrors.displayName}
                  readOnly
                  hint="From your account details"
                />
                <SInput
                  label="Email"
                  value={accountEmail}
                  readOnly
                  hint="From your account details"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <SInput
                  label="Therapy approach"
                  placeholder="Integrative therapy, CBT or person-centred therapy"
                  value={title}
                  onChange={setTitle}
                  error={fieldErrors.title}
                />
              </div>
              <STextarea
                label="Professional headline"
                placeholder="Compassionate, trauma-informed therapy for adults navigating change."
                rows={2}
                value={headline}
                onChange={setHeadline}
                error={fieldErrors.headline}
              />
              <STextarea
                label="About me"
                placeholder="Tell clients about your approach, experience, and the people you help best."
                rows={6}
                value={bio}
                onChange={setBio}
                error={fieldErrors.bio}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <SInput
                  label="Years in practice"
                  placeholder="17"
                  value={years}
                  onChange={setYears}
                  error={fieldErrors.years}
                />
                <SInput
                  label="Qualifications & certifications"
                  placeholder="UKCP, MBACP"
                  value={qualifications}
                  onChange={setQualifications}
                  error={fieldErrors.qualifications}
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-foreground">Gender</span>
                <span className="mt-1 block text-xs text-foreground/60">
                  Some clients prefer to choose a therapist by gender. Optional.
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "other", label: "Other / prefer not to say" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender((v) => (v === g.value ? "" : g.value))}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${gender === g.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-card text-foreground/80 hover:bg-accent/40"}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-foreground/60">
                These details help us present your profile to suitable clients.
              </p>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <input
                  type="checkbox"
                  checked={intro}
                  onChange={(e) => setIntro(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    I offer a free 15-minute introductory consultation
                  </span>
                  <span className="mt-1 block text-xs text-foreground/60">
                    We&apos;ll show this on your profile so clients know they can start with a short
                    intro call. You&apos;ll need to create a 15-minute meeting type in Cal.com later
                    (in Meeting settings) before clients can book it.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <p className="font-serif text-lg text-foreground">Areas of expertise</p>
                <p className="text-xs text-foreground/60">
                  Select the areas you're qualified and experienced to support (up to {MAX_AREAS}).
                </p>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                  <input
                    value={specQuery}
                    onChange={(e) => setSpecQuery(e.target.value)}
                    placeholder="Search areas of expertise…"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                  />
                </div>
                {spec.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                      {spec.length}/{MAX_AREAS} selected
                    </span>
                    {spec.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => toggle(spec, setSpec, s)}
                          aria-label={`Remove ${s}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {filteredCategories.map((cat) => {
                    const isOpen = searching || openCats[cat.label];
                    const selectedInCat = cat.areas.filter((a) => spec.includes(a)).length;
                    return (
                      <div
                        key={cat.label}
                        className="overflow-hidden rounded-xl border border-border bg-background"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCat(cat.label)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-accent/40"
                          aria-expanded={isOpen}
                        >
                          <span className="flex items-center gap-2">
                            {cat.label}
                            {selectedInCat > 0 && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {selectedInCat}
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-foreground/50 transition ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="border-t border-border/60 px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {cat.areas.map((a) => {
                                const on = spec.includes(a);
                                const disabled = !on && spec.length >= MAX_AREAS;
                                return (
                                  <button
                                    key={a}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggle(spec, setSpec, a)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/70 hover:border-primary/40"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                  >
                                    {on && <Check className="h-3 w-3" />} {a}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredCategories.length === 0 && (
                    <p className="text-xs text-foreground/60">
                      No matches. Try a different search.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="font-serif text-lg text-foreground">Languages spoken</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => {
                    const on = langs.includes(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggle(langs, setLangs, l)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/70 hover:border-primary/40"}`}
                      >
                        {l}
                      </button>
                    );
                  })}
                  {langs
                    .filter((l) => !LANGUAGES.includes(l))
                    .map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => toggle(langs, setLangs, l)}
                          aria-label={`Remove ${l}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={otherLang}
                    onChange={(e) => setOtherLang(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOtherLang();
                      }
                    }}
                    placeholder="Add another language…"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={addOtherLang}
                    className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
                  >
                    Add
                  </button>
                </div>
              </div>
              <p className="text-xs text-foreground/60">
                These details help us present your profile to suitable clients.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <p className="font-serif text-lg text-foreground">Insurance providers</p>
                <p className="text-xs text-foreground/60">
                  Select the insurance companies you are covered by. Clients will see this on your
                  public profile so they can quickly check whether their plan is accepted.
                </p>
                {insurers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {insurers.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setInsurers(insurers.filter((x) => x !== s))}
                          aria-label={`Remove ${s}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {COMMON_INSURERS.map((n) => {
                    const on = insurers.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setInsurers(on ? insurers.filter((x) => x !== n) : [...insurers, n])
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/70 hover:border-primary/40"}`}
                      >
                        {on && <Check className="h-3 w-3" />} {n}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={otherInsurer}
                    onChange={(e) => setOtherInsurer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOtherInsurer();
                      }
                    }}
                    placeholder="Add another insurer…"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={addOtherInsurer}
                    className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  Leave empty if you do not accept insurance.
                </p>
              </div>

              <p className="text-xs text-foreground/60">
                These details help us present your profile to suitable clients.
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-accent/40 disabled:opacity-40"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Submit for review"} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  readOnly,
  hint,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        placeholder={placeholder}
        value={value ?? ""}
        onChange={!readOnly && onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${readOnly ? "cursor-not-allowed border-border/60 bg-secondary/50 text-foreground/60" : "bg-background"} ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/60"}`}
      />
      {hint && !error && <span className="mt-1.5 block text-xs text-foreground/50">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}

function STextarea({
  label,
  placeholder,
  rows = 4,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary/60"}`}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
