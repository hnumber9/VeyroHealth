const SITE_URL = "https://www.veyrohealth.com";

export interface ApprovalUrlDeps {
  userId: string;
  submittedProfileId?: string | null;
  // Minimal shape of the supabase client we depend on. Kept structural so
  // tests can pass a stub without pulling in the full supabase-js types.
  supabase: {
    from: (table: string) => any;
  };
  // Overridable so tests don't have to wait real backoff durations.
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  generateToken?: () => string;
  siteUrl?: string;
  /** When false, resolve the profile id only and skip minting an approval token. */
  mintToken?: boolean;
}

export interface ApprovalUrlResult {
  approveUrl: string | null;
  token: string | null;
  therapistProfileId: string | null;
  error?: string;
}

function defaultToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Resolve the therapist_profiles row that onboarding just wrote, mint an
 * approval token, and return the one-click approval URL. Extracted so the
 * onboarding email flow has a single, unit-testable guarantee that every
 * admin notification includes a valid approveUrl.
 */
export async function resolveTherapistApprovalUrl(
  deps: ApprovalUrlDeps,
): Promise<ApprovalUrlResult> {
  const {
    userId,
    submittedProfileId,
    supabase,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    maxAttempts = 4,
    generateToken = defaultToken,
    siteUrl = SITE_URL,
    mintToken = true,
  } = deps;

  const trimmedId = submittedProfileId?.trim() || null;
  let profileId: string | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let query = supabase.from("therapist_profiles").select("id").eq("user_id", userId);
    if (trimmedId) query = query.eq("id", trimmedId);
    const { data, error } = await query.maybeSingle();
    if (error) {
      // keep retrying — the profile row may still be replicating
    }
    if (data?.id) {
      profileId = data.id;
      break;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(200 * (attempt + 1));
    }
  }

  if (!profileId) {
    return {
      approveUrl: null,
      token: null,
      therapistProfileId: null,
      error: "therapist_profile_not_found",
    };
  }

  if (!mintToken) {
    return { approveUrl: null, token: null, therapistProfileId: profileId };
  }

  const token = generateToken();
  const { error: tokenError } = await supabase
    .from("therapist_approval_tokens")
    .insert({ token, therapist_profile_id: profileId });

  if (tokenError) {
    return {
      approveUrl: null,
      token: null,
      therapistProfileId: profileId,
      error: tokenError.message ?? "token_insert_failed",
    };
  }

  return {
    approveUrl: `${siteUrl}/api/public/therapist-approve?token=${token}`,
    token,
    therapistProfileId: profileId,
  };
}
