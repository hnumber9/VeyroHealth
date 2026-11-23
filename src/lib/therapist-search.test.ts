import { describe, expect, it } from "vitest";
import { matchesTherapistSearch, showExpertiseSuggestions } from "./therapist-search";

const therapist = {
  display_name: "Lisa Marini",
  specialties: ["Anxiety", "ADHD", "Couples Therapy", "Self-esteem"],
};

describe("therapist name or expertise search", () => {
  it("shows expertise suggestions only after three letters", () => {
    for (const query of ["", "A", "An", "  An  ", "12"]) {
      expect(showExpertiseSuggestions(query)).toBe(false);
    }
    expect(showExpertiseSuggestions("Anx")).toBe(true);
    expect(showExpertiseSuggestions("Anxiety")).toBe(true);
  });
  it("keeps full, partial and reversed name searches", () => {
    for (const query of ["Lisa Marini", "lis", "MARINI LISA"]) {
      expect(matchesTherapistSearch(therapist, query)).toBe(true);
    }
    expect(matchesTherapistSearch(therapist, "Sophie")).toBe(false);
  });
  it("matches anxiety, ADHD and couples therapy case-insensitively", () => {
    for (const query of ["anxiety", "adhd", "Couples Therapy", "couples ther"]) {
      expect(matchesTherapistSearch(therapist, query)).toBe(true);
    }
    expect(matchesTherapistSearch(therapist, "Depression")).toBe(false);
  });
  it("handles punctuation and excess whitespace", () => {
    expect(matchesTherapistSearch(therapist, "  self esteem  ")).toBe(true);
  });
  it("does not combine unrelated expertise areas into a match", () => {
    expect(matchesTherapistSearch(therapist, "anxiety couples")).toBe(false);
  });
  it("allows an empty search and names without specialties", () => {
    expect(matchesTherapistSearch(therapist, " ")).toBe(true);
    expect(matchesTherapistSearch({ display_name: "Lisa Marini", specialties: null }, "Lisa")).toBe(
      true,
    );
    expect(matchesTherapistSearch({ display_name: "Lisa Marini" }, "ADHD")).toBe(false);
  });
});
