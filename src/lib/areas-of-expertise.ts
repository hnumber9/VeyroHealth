// Structured "Areas of Expertise" taxonomy powering therapist onboarding
// selections and the client search filter. Grouped into expandable
// categories; keep labels stable — they're persisted on therapist profiles.

export type AreaCategory = {
  label: string;
  areas: string[];
};

export const AREA_CATEGORIES: AreaCategory[] = [
  {
    label: "Anxiety & Mood",
    areas: [
      "Anxiety",
      "Depression",
      "Panic Attacks",
      "Social Anxiety",
      "Health Anxiety",
      "Generalised Anxiety Disorder (GAD)",
      "Phobias",
      "OCD",
      "Low Mood",
      "Self-esteem",
      "Self-confidence",
      "Stress",
      "Burnout",
      "Perfectionism",
      "Anger Management",
      "Emotional Regulation",
    ],
  },
  {
    label: "Trauma & Recovery",
    areas: [
      "Trauma",
      "PTSD",
      "Complex PTSD (C-PTSD)",
      "Childhood Trauma",
      "Abuse",
      "Domestic Abuse",
      "Narcissistic Abuse",
      "Sexual Abuse",
      "Emotional Abuse",
      "Grief & Bereavement",
      "Loss",
      "Critical Incident Support",
    ],
  },
  {
    label: "Relationships & Family",
    areas: [
      "Couples Therapy",
      "Marriage",
      "Divorce & Separation",
      "Infidelity",
      "Intimacy",
      "Family Therapy",
      "Parenting",
      "Co-parenting",
      "Blended Families",
      "Attachment Issues",
      "Communication",
      "Conflict Resolution",
    ],
  },
  {
    label: "Children & Young People",
    areas: [
      "Child Therapy",
      "Teen Therapy",
      "Play Therapy",
      "Parenting Support",
      "School Anxiety",
      "Bullying",
      "Behavioural Difficulties",
      "Exam Stress",
      "Family Conflict",
    ],
  },
  {
    label: "Neurodiversity",
    areas: [
      "ADHD",
      "Autism",
      "AuDHD",
      "Dyslexia",
      "Dyspraxia",
      "Dyscalculia",
      "Neurodivergence",
      "Executive Functioning",
    ],
  },
  {
    label: "Identity & Inclusion",
    areas: [
      "LGBTQ+",
      "Gender Identity",
      "Gender Dysphoria",
      "Sexual Identity",
      "Cultural Identity",
      "Racial Identity",
      "Faith & Spirituality",
    ],
  },
  {
    label: "Addiction & Compulsive Behaviours",
    areas: [
      "Alcohol",
      "Drugs",
      "Gambling",
      "Pornography",
      "Sex Addiction",
      "Gaming",
      "Internet Addiction",
      "Shopping Addiction",
      "Smoking Cessation",
    ],
  },
  {
    label: "Eating & Body Image",
    areas: [
      "Eating Disorders",
      "Anorexia",
      "Bulimia",
      "Binge Eating",
      "ARFID",
      "Body Image",
      "Emotional Eating",
    ],
  },
  {
    label: "Personality & Clinical",
    areas: [
      "Bipolar Disorder",
      "Personality Disorders",
      "Borderline Personality Disorder (EUPD/BPD)",
      "Psychosis",
      "Schizophrenia Support",
    ],
  },
  {
    label: "Life Challenges",
    areas: [
      "Bereavement",
      "Loneliness",
      "Life Transitions",
      "Midlife",
      "Retirement",
      "Career Change",
      "Workplace Issues",
      "Redundancy",
      "Financial Stress",
      "University",
      "Student Support",
      "Confidence",
      "Motivation",
      "Purpose",
      "Decision Making",
    ],
  },
  {
    label: "Women's Health",
    areas: [
      "Fertility",
      "IVF",
      "Pregnancy",
      "Pre-natal",
      "Postnatal",
      "Baby Loss",
      "Menopause",
      "Women's Health",
    ],
  },
  {
    label: "Men's Mental Health",
    areas: ["Men's Mental Health", "Fatherhood", "Men's Relationships", "Men's Wellbeing"],
  },
  {
    label: "Physical Health",
    areas: [
      "Chronic Pain",
      "Chronic Illness",
      "Cancer Support",
      "Long COVID",
      "Disability",
      "Sleep Problems",
      "Insomnia",
    ],
  },
  {
    label: "Workplace",
    areas: [
      "Executive Coaching",
      "Leadership",
      "Workplace Stress",
      "Burnout",
      "Career Development",
      "Workplace Bullying",
    ],
  },
];

export const ALL_AREAS: string[] = Array.from(new Set(AREA_CATEGORIES.flatMap((c) => c.areas)));

export const CLIENT_MAX_AREAS = 15;
export const THERAPIST_MAX_AREAS = 20;
