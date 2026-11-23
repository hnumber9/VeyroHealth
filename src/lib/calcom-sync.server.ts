import {
  createEventType,
  deleteEventType,
  serviceEventSlug,
  updateEventType,
} from "@/lib/calcom.server";

/**
 * Attach a ready-to-use bearer token (personal API key, or a freshly refreshed
 * OAuth access token) to a connection row.
 */
async function withBearer<T extends { id: string }>(row: T | null) {
  if (!row) return null;
  const { resolveCalcomBearer } = await import("@/lib/calcom-oauth.server");
  const bearer = await resolveCalcomBearer(row);
  if (!bearer) return null;
  return { ...row, bearer };
}

/** Load a therapist's Cal.com credentials (service role — server only). */
export async function getCalcomCredentials(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("calcom_connections")
    .select(
      "id, therapist_id, auth_type, calcom_api_key, calcom_access_token, calcom_refresh_token, calcom_token_expires_at, calcom_username, timezone",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return withBearer(data);
}

export async function getCalcomCredentialsByTherapist(therapistId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("calcom_connections")
    .select(
      "id, user_id, auth_type, calcom_api_key, calcom_access_token, calcom_refresh_token, calcom_token_expires_at, calcom_username, timezone",
    )
    .eq("therapist_id", therapistId)
    .maybeSingle();
  return withBearer(data);
}

/**
 * Create or update the Cal.com event type backing one Veyro service, so the
 * slots API can be queried per duration.
 */
export async function syncServiceEventType(userId: string, serviceId: string) {
  const credentials = await getCalcomCredentials(userId);
  if (!credentials) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: service } = await supabaseAdmin
    .from("therapist_services")
    .select("id, name, description, duration_minutes, calcom_event_type_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return null;

  if (service.calcom_event_type_id) {
    await updateEventType(credentials.bearer, service.calcom_event_type_id, {
      title: service.name,
      lengthInMinutes: service.duration_minutes,
      ...(service.description ? { description: service.description } : {}),
    });
    return service.calcom_event_type_id;
  }

  const slug = serviceEventSlug(service.id, service.duration_minutes);
  const created = await createEventType(credentials.bearer, {
    title: service.name,
    slug,
    lengthInMinutes: service.duration_minutes,
    ...(service.description ? { description: service.description } : {}),
  });

  await supabaseAdmin
    .from("therapist_services")
    .update({ calcom_event_type_id: created.id, calcom_event_type_slug: created.slug ?? slug })
    .eq("id", service.id);

  return created.id;
}

export async function removeServiceEventType(userId: string, eventTypeId: number) {
  const credentials = await getCalcomCredentials(userId);
  if (!credentials) return;
  await deleteEventType(credentials.bearer, eventTypeId);
}

/** Push every one of a therapist's services into Cal.com (used on connect). */
export async function syncAllServiceEventTypes(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: services } = await supabaseAdmin
    .from("therapist_services")
    .select("id")
    .eq("user_id", userId);

  const results: Array<{ serviceId: string; ok: boolean }> = [];
  for (const service of services ?? []) {
    try {
      await syncServiceEventType(userId, service.id);
      results.push({ serviceId: service.id, ok: true });
    } catch (error) {
      console.error("[calcom-sync:all]", service.id, error);
      results.push({ serviceId: service.id, ok: false });
    }
  }
  return results;
}
