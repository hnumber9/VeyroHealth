import { ALL_TRAITS } from "@/lib/therapist-traits";

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pick<T>(arr: T[], seed: number, n = 1): T[] {
  const out: T[] = [];
  const copy = [...arr];
  let s = seed;
  for (let i = 0; i < n && copy.length; i++) {
    s = (s * 9301 + 49297) % 233280;
    const idx = s % copy.length;
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export const ALL_SPECIALITIES = [
  "Anxiety",
  "Depression",
  "Stress & Burnout",
  "Trauma & PTSD",
  "Relationships",
  "Self-esteem",
  "Men's Mental Health",
  "Grief & Loss",
  "Mindfulness",
  "CBT",
  "Psychodynamic",
  "Life Transitions",
];

export const ALL_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Hindi",
  "Arabic",
  "German",
];

export const TESTIMONIALS = [
  "Helped me feel truly heard for the first time. — Real client",
  "A calm, thoughtful presence — sessions made a real difference. — Real client",
  "Pragmatic, kind, and genuinely insightful. — Real client",
  "I left every session feeling lighter and more clear. — Real client",
  "Warm and incredibly skilled. Highly recommend. — Real client",
];

const MOCK_REVIEW_BODIES = [
  "Helped me navigate a really difficult period with warmth and clarity.",
  "I always felt safe and understood in our sessions.",
  "Thoughtful, challenging when needed, and incredibly supportive.",
  "Gave me practical tools I use every day. Highly recommend.",
  "A genuine, kind presence who really listens.",
  "I made real progress after just a few sessions.",
];

export function getMockMeta(slug: string) {
  const seed = hashString(slug);
  const rating = (4.6 + (seed % 5) * 0.08).toFixed(1);
  const reviews = 28 + (seed % 180);
  const years = 5 + (seed % 15);
  const specialities = pick(ALL_SPECIALITIES, seed, 4);
  const languages = pick(ALL_LANGUAGES, seed + 7, 1 + (seed % 2));
  const testimonials = pick(TESTIMONIALS, seed + 13, 2);
  const price = 65 + (seed % 7) * 5;

  const chosenTraits = pick(ALL_TRAITS, seed + 99, 5 + (seed % 4));
  const traitCounts: Record<string, number> = {};
  for (let i = 0; i < chosenTraits.length; i++) {
    traitCounts[chosenTraits[i]] = 2 + ((seed + i * 17) % 12);
  }

  const mockReviews: {
    id: string;
    rating: number;
    body: string | null;
    traits: string[] | null;
    created_at: string;
  }[] = [];
  const reviewBodies = pick(MOCK_REVIEW_BODIES, seed + 200, 3);
  for (let i = 0; i < reviewBodies.length; i++) {
    const reviewTraits = pick(chosenTraits, seed + 300 + i * 50, 1 + ((seed + i) % 3));
    mockReviews.push({
      id: `mock-review-${slug}-${i}`,
      rating: 4 + ((seed + i) % 2),
      body: reviewBodies[i],
      traits: reviewTraits,
      created_at: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return {
    rating,
    reviews,
    years,
    specialities,
    languages,
    testimonials,
    price,
    traitCounts,
    mockReviews,
  };
}
