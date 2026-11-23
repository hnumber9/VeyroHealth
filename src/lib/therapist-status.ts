export const THERAPIST_STATUSES = [
  "Live & bookable",
  "Approved - Cal.com not connected",
  "Pending approval",
  "Cal.com needs reconnect",
  "Connected - no sessions priced",
  "Connected - not live",
  "Rejected",
] as const;
export type TherapistStatus = (typeof THERAPIST_STATUSES)[number];

export function therapistStatus(r: {
  rejected: boolean;
  approved: boolean;
  published: boolean;
  calcom: "connected" | "error" | "none";
  activeSessions: number;
}): TherapistStatus {
  if (r.rejected) return "Rejected";
  if (!r.approved) return "Pending approval";
  if (r.calcom === "error") return "Cal.com needs reconnect";
  if (r.calcom !== "connected") return "Approved - Cal.com not connected";
  if (r.activeSessions === 0) return "Connected - no sessions priced";
  if (!r.published) return "Connected - not live";
  return "Live & bookable";
}
