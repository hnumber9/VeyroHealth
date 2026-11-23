export const TRAIT_GROUPS: { label: string; emoji: string; traits: string[] }[] = [
  {
    label: "Therapeutic Relationship",
    emoji: "❤️",
    traits: [
      "Compassionate",
      "Warm",
      "Empathetic",
      "Kind",
      "Caring",
      "Non-judgemental",
      "Genuine",
      "Trustworthy",
    ],
  },
  {
    label: "Safety & Comfort",
    emoji: "🛡️",
    traits: [
      "Made me feel safe",
      "Calm presence",
      "Patient",
      "Understanding",
      "Easy to open up to",
      "Respectful",
      "Supportive",
    ],
  },
  {
    label: "Communication",
    emoji: "💬",
    traits: [
      "Great listener",
      "Easy to talk to",
      "Explains things clearly",
      "Thought-provoking",
      "Insightful",
      "Excellent communicator",
    ],
  },
  {
    label: "Therapy Experience",
    emoji: "🌱",
    traits: [
      "Helped me make progress",
      "Challenged me appropriately",
      "Encouraging",
      "Empowering",
      "Helped me gain confidence",
      "Practical approach",
      "Goal-focused",
    ],
  },
  {
    label: "Professional Expertise",
    emoji: "🧠",
    traits: [
      "Highly knowledgeable",
      "Professional",
      "Experienced",
      "Well prepared",
      "Specialist knowledge",
      "Adaptable",
      "Evidence-based approach",
    ],
  },
  {
    label: "Reliability",
    emoji: "📅",
    traits: ["Responsive", "Flexible", "Punctual", "Reliable", "Well organised"],
  },
];

export const ALL_TRAITS: string[] = TRAIT_GROUPS.flatMap((g) => g.traits);
export const TRAIT_SET = new Set(ALL_TRAITS);
