import { describe, it, expect, vi } from "vitest";
import { resolveTherapistApprovalUrl } from "./therapist-approval-url";

interface StubRow {
  id: string;
}

/**
 * Build a stub matching the subset of the supabase-js query builder
 * that resolveTherapistApprovalUrl uses. The stub records every insert
 * so tests can assert on the approval token that was persisted.
 */
function makeSupabaseStub(opts: {
  profileRows: (StubRow | null)[]; // one per lookup attempt (null = not found)
  profileError?: unknown;
  tokenError?: { message: string } | null;
}) {
  const inserts: Array<{ table: string; row: any }> = [];
  let profileCall = 0;

  const from = (table: string) => {
    if (table === "therapist_profiles") {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          const row = opts.profileRows[profileCall] ?? null;
          profileCall += 1;
          return { data: row, error: opts.profileError ?? null };
        },
      };
      return builder;
    }
    if (table === "therapist_approval_tokens") {
      return {
        insert: async (row: any) => {
          inserts.push({ table, row });
          return { error: opts.tokenError ?? null };
        },
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  return { supabase: { from }, inserts, getProfileCallCount: () => profileCall };
}

describe("resolveTherapistApprovalUrl", () => {
  it("returns a valid approval URL bound to the saved therapist profile", async () => {
    const stub = makeSupabaseStub({ profileRows: [{ id: "profile-123" }] });

    const result = await resolveTherapistApprovalUrl({
      userId: "user-1",
      submittedProfileId: "profile-123",
      supabase: stub.supabase,
      generateToken: () => "deterministic-token",
      sleep: vi.fn(async () => {}),
    });

    expect(result.error).toBeUndefined();
    expect(result.therapistProfileId).toBe("profile-123");
    expect(result.token).toBe("deterministic-token");
    expect(result.approveUrl).toBe(
      "https://www.veyrohealth.com/api/public/therapist-approve?token=deterministic-token",
    );
    expect(stub.inserts).toEqual([
      {
        table: "therapist_approval_tokens",
        row: { token: "deterministic-token", therapist_profile_id: "profile-123" },
      },
    ]);
  });

  it("retries the profile lookup while the row is still replicating", async () => {
    const stub = makeSupabaseStub({
      profileRows: [null, null, { id: "profile-late" }],
    });
    const sleep = vi.fn(async () => {});

    const result = await resolveTherapistApprovalUrl({
      userId: "user-2",
      submittedProfileId: "profile-late",
      supabase: stub.supabase,
      generateToken: () => "tok-late",
      sleep,
    });

    expect(result.approveUrl).toBe(
      "https://www.veyrohealth.com/api/public/therapist-approve?token=tok-late",
    );
    expect(result.therapistProfileId).toBe("profile-late");
    expect(stub.getProfileCallCount()).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("never returns an approval URL when the profile cannot be found", async () => {
    const stub = makeSupabaseStub({ profileRows: [null, null, null, null] });

    const result = await resolveTherapistApprovalUrl({
      userId: "user-3",
      submittedProfileId: "missing",
      supabase: stub.supabase,
      generateToken: () => "unused",
      sleep: vi.fn(async () => {}),
    });

    expect(result.approveUrl).toBeNull();
    expect(result.token).toBeNull();
    expect(result.error).toBe("therapist_profile_not_found");
    // Critical: no token should have been minted for a missing profile.
    expect(stub.inserts).toHaveLength(0);
  });

  it("never returns an approval URL when the token insert fails", async () => {
    const stub = makeSupabaseStub({
      profileRows: [{ id: "profile-9" }],
      tokenError: { message: "insert blew up" },
    });

    const result = await resolveTherapistApprovalUrl({
      userId: "user-4",
      submittedProfileId: "profile-9",
      supabase: stub.supabase,
      generateToken: () => "tok-fail",
      sleep: vi.fn(async () => {}),
    });

    expect(result.approveUrl).toBeNull();
    expect(result.token).toBeNull();
    expect(result.error).toBe("insert blew up");
    expect(result.therapistProfileId).toBe("profile-9");
  });

  it("produces a URL that the therapist-approve endpoint accepts (well-formed token param)", async () => {
    const stub = makeSupabaseStub({ profileRows: [{ id: "profile-abc" }] });

    const result = await resolveTherapistApprovalUrl({
      userId: "user-5",
      submittedProfileId: "profile-abc",
      supabase: stub.supabase,
      sleep: vi.fn(async () => {}),
    });

    expect(result.approveUrl).not.toBeNull();
    const url = new URL(result.approveUrl!);
    expect(url.origin).toBe("https://www.veyrohealth.com");
    expect(url.pathname).toBe("/api/public/therapist-approve");
    const token = url.searchParams.get("token");
    expect(token).toBeTruthy();
    // Default token generator: 32 bytes -> 64 hex chars.
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(token).toBe(result.token);
  });
});
