export function numberByPool(
  rows: { id: string; serviceProviderId: string; countryId?: string | null }[]
): Map<string, number> {
  const places = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.serviceProviderId}:${row.countryId ?? ""}`;
    const place = (counts.get(key) ?? 0) + 1;
    counts.set(key, place);
    places.set(row.id, place);
  }
  return places;
}
