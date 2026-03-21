export function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return null;
  return Number(
    (filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(1),
  );
}

export function toIsoDay(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function parseContributorJson(input: string) {
  try {
    return JSON.parse(input) as Record<string, number | null>;
  } catch {
    return {};
  }
}
