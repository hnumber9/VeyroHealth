# Veyro: SEO landing pages and next features

The SEO page code that was started has been removed. The empty storage space set up for pages stays and will be reused. The change-request tracker is out of scope.

---

## A. SEO landing pages (self-managed, £1,250)

### What visitors see (one shared page design)
Each page lives at its own web address, e.g. veyrohealth.com/therapy-for-anxiety, and shows, top to bottom:
1. **Breadcrumb:** Home › Therapy for anxiety.
2. **Heading and intro:** a short paragraph and a "Find a therapist" button that opens the directory with this page's areas already filtered.
3. **Main content:** subheadings, paragraphs and bullet lists written by Sam's SEO person.
4. **"Therapists who can help":** up to 6 live, bookable therapists matching the page's areas. Each card shows a photo, name, title, matching areas, "from £" price and a link to their profile.
5. **Fallback:** if fewer than 3 therapists match, the page shows recently joined live therapists and a "Browse all therapists" link. It never shows an empty list.
6. **FAQs:** expandable questions and answers.
7. **Related topics:** links to other live pages that share areas, plus any pages Sam picks by hand.
8. **Closing call to action:** "Ready to talk to someone?" with a link to the therapists.
- Works on mobile, tablet and desktop, and matches the current site style.
- Up to 2 rounds of design changes.

### What Google sees (automatic on every page)
- Its own Google title and description, with a fallback to the intro if the description is blank.
- The page's main web address (so Google doesn't index duplicates) and link-preview tags for WhatsApp, LinkedIn and Facebook.
- Breadcrumb and FAQ tags so Google understands the page structure.
- Live pages are added to the sitemap automatically with their last-changed date. Hidden pages are removed.
- Hidden or deleted pages show "Page not found" and are not indexed.
- Pages are fully built before reaching Google, not loaded in afterwards.
- The page's main heading, title and description are checked so none are missing.

### Admin → SEO pages (Sam manages everything)
- A list of all pages with search, Live/Hidden status, number of matching therapists, last edited date and a "View page" link.
- Each page shows a warning when it's missing a description, has no FAQs, or has fewer than 3 matching therapists.
- **Page editor:** web address, Google title (character counter, aim for about 60), Google description (counter, aim for about 155), heading, intro, main content (simple formatting: subheadings, bullets), areas of expertise (chosen from the existing list), up to 10 FAQs, hand-picked related pages, and Live/Hidden.
- **Preview:** check a page before putting it live.
- **Spreadsheet upload:** download a template, fill it in, upload it. Matching web addresses are updated and new ones are created.
  - Before anything is saved, a review screen lists each row as New, Updated or Error, with plain-English reasons (e.g. "Row 12: web address already used by the site").
  - Nothing is saved until Sam confirms. Rows with errors are skipped.
- **Spreadsheet download** of all pages, for backup or bulk editing.
- Protected web addresses: pages can't use existing site addresses such as /about or /therapists.
- If a page's web address changes, the old address automatically redirects to the new one, so Google links aren't lost.
- Only admins can manage pages. Visitors can only see live pages.

### Launch
- Load and check the first 20–30 pages with Sam, then he rolls out the rest himself.
- Check in the browser: editor, upload with good and bad files, live page, hidden page, sitemap and redirect.

---

## B. Therapist search: sort (part of the £300 bundle)
- A "Sort by" menu: Recommended (default), Price low to high, Price high to low, Most experienced, Highest rated, Newest on Veyro.
- Kept in the web address and works with all filters. On mobile it sits next to Filters.

## C. Social icons (part of the £300 bundle)
- Instagram, Facebook, LinkedIn and Trustpilot in the footer, opening in new tabs.
- **Needed from Sam:** the four links.

## D. Other homepage changes (part of the £300 bundle)
- New buttons, layout and tracking, working on every device.
- **Needed from Sam:** the exact list.

## E. Timed enquiry pop-up (£300)
- Appears once after a set delay (default 20 seconds). Not shown on admin, booking or account pages. Once closed, it stays hidden for 14 days.
- Form: what they're looking for, therapist preferences (gender, language, intro call), email, and a privacy consent checkbox.
- Each enquiry is saved securely first, then emailed to the enquiries address. Admin → Enquiries list with spreadsheet download.
- Not included: tracking whether enquiries turn into bookings.
- **Needed from Sam:** pop-up wording, privacy wording, delay preference, and an enquiries mailbox (e.g. enquiries@veyrohealth.com).

---

## Order
1. SEO landing pages.
2. Sort and social icons.
3. Homepage changes, once the list arrives.
4. Pop-up, once the wording arrives.

## Technical details
- SEO: reuse the existing empty `seo_pages` table, adding `related_slugs text[]` and a `seo_redirects (from_slug, to_slug)` table. Writes use the service role after an admin role check. Public reads go through a server function returning only live pages.
- Public route `src/routes/$slug.tsx` with SSR loader, `notFound()`, and `head()` for title, description, canonical, og tags and BreadcrumbList/FAQPage JSON-LD. Static routes take priority.
- Therapist matching reuses the published-and-bookable logic from `listPublishedTherapists`: overlap of specialties with page areas, ranked by match count.
- Admin route `src/routes/admin.seo.tsx` (`ssr: false`). Shared CSV parser and validation in a browser-safe module, with a test for slug and reserved-word rules.
- Sitemap: add live pages with `updated_at` as lastmod.
- Sort: a `sort` search param in `src/routes/therapists.tsx`. Footer links in `Footer.tsx`. Pop-up: an `enquiries` table and a rate-limited public server route, saved before email.
