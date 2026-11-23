function words(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function showExpertiseSuggestions(query: string): boolean {
  return (query.match(/\p{L}/gu)?.length ?? 0) >= 3;
}

/** Match a name or one expertise area, without searching unrelated profile copy. */
export function matchesTherapistSearch(
  therapist: { display_name: string; specialties?: string[] | null },
  query: string,
): boolean {
  const queryWords = words(query);
  if (queryWords.length === 0) return true;
  return [therapist.display_name, ...(therapist.specialties ?? [])].some((value) => {
    const candidateWords = words(value);
    return queryWords.every((word) => candidateWords.some((part) => part.startsWith(word)));
  });
}
