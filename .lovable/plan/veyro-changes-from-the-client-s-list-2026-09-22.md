# Veyro — changes from the client's list

Nine items, grouped by where they land.

## 1. Crisis safety notice (every patient-facing page)

Add a band directly above the footer, so it appears on every page that uses the shared footer:

> **Need urgent help?** Veyro is not an emergency or crisis service. If you or someone else is in immediate danger or at risk of serious harm, call **999** or go to A&E. Please do not wait for a Veyro therapist appointment if you need immediate help.

Styled as a quiet, clearly-marked notice (not alarming red), with 999 and A&E emphasised.

## 2. Promote the new home page, with a fresh "Find a Therapist" image

The `/home-to-be` design becomes the live home page at `/`, replacing the current one. `/home-to-be` keeps working and redirects to `/` so no shared link breaks.

The "Find a Therapist" tile currently reuses the Mental Health photo — generate a fresh image for it so the six tiles are all distinct.


## 3. Areas of expertise: match ALL selected

Change the directory filter so picking two areas shows only therapists who cover **both**. The count line becomes "matching all N areas", and the empty state explains that removing an area widens results.

## 4. Ratings on unreviewed profiles

Replace the empty 0-star display with a neutral **"New on Veyro"** badge. Real stars appear as soon as a therapist has a genuine review. No invented ratings.

## 5. New filters down the left of the directory

- **Price** — dual-handle slider over the real session prices (from each therapist's priced sessions), with a live £min–£max readout.
- **Gender** — Male / Female / No preference. New optional field on the therapist profile, added to their dashboard profile form. Existing profiles that haven't set it are simply not returned when a specific gender is chosen.
- **Languages** — checkbox list built from the languages therapists have actually entered.
- **Free initial consultation** — single toggle using the existing intro-call flag.

All filters combine with the areas filter, plus a "Clear all" control.

## 6. "Help your therapist get to know you" box

After a booking is confirmed, show a box on the confirmation screen:

> **Help your therapist get to know you**
> Is there anything you'd like your therapist to know before your first session?
> Share as much or as little as you feel comfortable with. Your response will only be shared with your chosen therapist.

Free-text, optional, skippable. Saved against that appointment and visible to that therapist only on their dashboard. Patients can still add or edit it later from the appointment page until the session starts.

No email is sent for the note — the therapist reads it on their dashboard against that session.



## 7. Close therapist applications

Two places show the closed message:

- The therapist join page, replacing the signup form.
- The new home page, replacing the "Join the Founding Therapist Network" application form near the bottom.

> **Founding Therapist Applications Are Now Closed** — full copy as supplied, including "there is no need to apply again".

Underneath, a short **register your interest** form (name, email, optional note) that records the interest and emails join@veyrohealth.com, so the waiting list builds itself. Therapists already part-way through onboarding, and sign-in, are unaffected. The "Join as a therapist" buttons keep working and land on this page.

## 8. "What are you looking for support with?" tiles open the right part of the filters

Each tile opens the directory with its category already expanded, so the patient immediately sees the relevant areas and ticks the one or two that apply to them. Nothing is pre-ticked, which keeps the "must cover all selected areas" rule from item 3 working properly — pre-ticking ten areas would return nobody.

- **Mental Health** → Anxiety & Mood, Personality & Clinical, Eating & Body Image, Addiction, Trauma & Recovery
- **Relationships & Family** → Relationships & Family, Children & Young People
- **Neurodiversity & Identity** → Neurodiversity, Identity & Inclusion
- **Life Challenges** → Life Challenges, Physical Health, Women's Health, Men's Mental Health
- **Specialist Therapies** → the therapy-type section, expanded
- **Find a Therapist** → the full directory, nothing expanded

A line at the top says which section was opened. Choices stay in the web address, so a patient can bookmark or share a filtered view.


---

## Technical notes

- Crisis band added inside `src/components/site/Footer.tsx` so it inherits every page already using it; admin/therapist-only screens keep whatever they have.
- Home page: `src/routes/home-to-be.tsx` content moves into `src/routes/index.tsx` (keeping its own head metadata and canonical URL); `/home-to-be` becomes a permanent redirect to `/`. Existing home-only sections not present in the new design are dropped deliberately.
- Directory work sits in `src/routes/therapists.tsx` (filter sidebar, AND matching, badges) with the fetcher in `src/lib/therapist-profiles.functions.ts` widened to return languages, gender, intro-call flag and min/max active session price per therapist.
- Tile deep-links use `validateSearch` (zod + `fallback`) on `/therapists` so expanded categories, areas, price, gender, languages and intro-call all live in URL search params; tiles are `<Link to="/therapists" search={{ open: [...] }}>`. Category names come from `AREA_CATEGORIES` in `src/lib/areas-of-expertise.ts`, not hardcoded area lists.
- Migration: `gender text` (nullable, constrained to male/female/other) on `therapist_profiles`; therapists set it themselves through the existing profile update path — admin-only columns untouched.
- Migration: `client_note text` on `appointments` plus a `therapist_interest` table (name, email, note, created_at) with grants and RLS — insert allowed for anonymous submissions, reads admin-only.
- Pre-session note saved via a new authenticated server function scoped to the appointment's client; therapist read path goes through the existing dashboard fetcher. No email templates touched.
- New-on-Veyro badge driven by the existing review count — no default rating stored anywhere.

