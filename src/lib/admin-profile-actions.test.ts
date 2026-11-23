import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  updates: [] as Record<string, unknown>[],
  filters: [] as unknown[][],
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));

import { rejectTherapistProfile, setTherapistProfileVisibility } from "./admin.functions";

const id = "11111111-1111-4111-8111-111111111111";
const roleQuery = {
  select: () => roleQuery,
  eq: () => roleQuery,
  maybeSingle: async () => ({ data: { role: "admin" }, error: null }),
};
const context = { userId: id, supabase: { from: () => roleQuery } };
const invoke = (fn: unknown, data: unknown, ctx: unknown = context) =>
  (fn as (input: unknown) => Promise<unknown>)({ data, context: ctx });

beforeEach(() => {
  mocks.updates.length = 0;
  mocks.filters.length = 0;
  mocks.from.mockImplementation(() => {
    const query = {
      update: (values: Record<string, unknown>) => {
        mocks.updates.push(values);
        return query;
      },
      eq: (...args: unknown[]) => {
        mocks.filters.push(["eq", ...args]);
        return query;
      },
      not: (...args: unknown[]) => {
        mocks.filters.push(["not", ...args]);
        return query;
      },
      is: (...args: unknown[]) => {
        mocks.filters.push(["is", ...args]);
        return query;
      },
      select: () => query,
      single: async () => ({ data: { id }, error: null }),
      insert: async () => ({ error: null }),
    };
    return query;
  });
});

describe("Admin profile actions", () => {
  it("rejects a previously approved therapist by clearing approval and hiding the profile", async () => {
    await invoke(rejectTherapistProfile, { id, reason: "Test rejection" });
    expect(mocks.updates[0]).toEqual({
      published: false,
      approved_at: null,
      rejected_at: expect.any(String),
      rejection_reason: "Test rejection",
    });
  });
  it("hides an approved test profile without changing its approval", async () => {
    await invoke(setTherapistProfileVisibility, { id, published: false });
    expect(mocks.updates[0]).toEqual({ published: false });
  });
  it("shows a hidden approved profile without rejecting or re-approving it", async () => {
    await invoke(setTherapistProfileVisibility, { id, published: true });
    expect(mocks.updates[0]).toEqual({ published: true });
    expect(mocks.filters).toContainEqual(["not", "approved_at", "is", null]);
    expect(mocks.filters).toContainEqual(["is", "rejected_at", null]);
  });
  it("does not permit non-admins to change visibility", async () => {
    const denied = {
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    };
    await expect(
      invoke(
        setTherapistProfileVisibility,
        { id, published: true },
        { userId: id, supabase: { from: () => denied } },
      ),
    ).rejects.toThrow("Forbidden");
    expect(mocks.updates).toHaveLength(0);
  });
});
