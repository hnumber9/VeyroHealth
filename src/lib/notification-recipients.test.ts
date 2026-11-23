import { afterEach, describe, expect, it } from "vitest";
import {
  getNotificationExcludedEmails,
  isNotificationRecipientExcluded,
} from "./notification-recipients";

const original = process.env["NOTIFICATION_EXCLUDED_EMAILS"];
afterEach(() => {
  if (original === undefined) delete process.env["NOTIFICATION_EXCLUDED_EMAILS"];
  else process.env["NOTIFICATION_EXCLUDED_EMAILS"] = original;
});

describe("notification recipient preferences", () => {
  it("excludes every address in the server setting, ignoring case and spaces", () => {
    process.env["NOTIFICATION_EXCLUDED_EMAILS"] = " Blocked@Example.com , other@example.org ";
    expect(getNotificationExcludedEmails()).toEqual(["blocked@example.com", "other@example.org"]);
    expect(isNotificationRecipientExcluded(" BLOCKED@EXAMPLE.COM ")).toBe(true);
    expect(isNotificationRecipientExcluded("other@example.org")).toBe(true);
    expect(isNotificationRecipientExcluded("support@veyrohealth.com")).toBe(false);
  });

  it("excludes nobody when the setting is empty", () => {
    delete process.env["NOTIFICATION_EXCLUDED_EMAILS"];
    expect(isNotificationRecipientExcluded("blocked@example.com")).toBe(false);
  });
});
