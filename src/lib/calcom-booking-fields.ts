// Browser-safe helpers for reading Cal.com booking rejections.

const PHONE_FIELD = /phone|location/i;

/** Required booking questions Cal.com said were missing, e.g. "responses - {title}error_required_field". */
export function missingRequiredBookingFields(message: string): string[] {
  const fields = new Set<string>();
  for (const match of message.matchAll(/\{([\w-]+)\}error_required_field/g)) {
    if (match[1]) fields.add(match[1]);
  }
  return Array.from(fields);
}

/**
 * Answers Veyro can safely give for missing required questions. Phone and
 * location questions are never invented — the therapist must change those in Cal.com.
 */
export function autoBookingFieldResponses(
  fields: string[],
  sessionTitle: string,
): Record<string, string> {
  const responses: Record<string, string> = {};
  for (const field of fields) {
    if (PHONE_FIELD.test(field)) continue;
    responses[field] = field === "title" ? sessionTitle : "Booked via Veyro";
  }
  return responses;
}

/** Plain-English reason an admin can act on. */
export function describeCalcomBookingFailure(message: string): string {
  if (/phone/i.test(message)) {
    return "This session type in Cal.com is set to meet by phone and needs the patient's phone number, which Veyro doesn't collect. Change the session's location in Cal.com (for example to video).";
  }
  const fields = missingRequiredBookingFields(message);
  if (fields.length) {
    return `This session type in Cal.com has required booking questions Veyro can't answer (${fields.join(", ")}). Make them optional in Cal.com.`;
  }
  if (
    /minimum booking notice|scheduling window|can't be booked at the "start" time/i.test(message)
  ) {
    return "Cal.com refused the time because of the session's minimum notice or booking window settings.";
  }
  if (/already has booking|not available/i.test(message)) {
    return "Cal.com says the therapist is no longer free at that time.";
  }
  return "Cal.com refused the booking.";
}
