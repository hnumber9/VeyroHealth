export const REVIEW_REMINDER_DELAY_HOURS = 24;

export function reviewReminderAt(endsAt: string): string {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) throw new Error("Invalid appointment end time");
  return new Date(end + REVIEW_REMINDER_DELAY_HOURS * 3_600_000).toISOString();
}

export function canSendReviewReminder(
  status: string,
  endsAt: string,
  now: number,
  hasReview: boolean,
): boolean {
  return (
    ["confirmed", "completed"].includes(status) &&
    !hasReview &&
    new Date(reviewReminderAt(endsAt)).getTime() <= now
  );
}
