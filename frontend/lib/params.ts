/** Safely decode a dynamic route segment such as "ZS%20Associates". */
export function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export interface PracticeFilters {
  subject: string;
  relevance: string;
  difficulty: string;
  n: number;
  seed: number | null;
}

export const N_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

export function readFilters(sp: URLSearchParams | null): PracticeFilters {
  const get = (k: string) => sp?.get(k) || "";
  const nRaw = parseInt(get("n"), 10);
  const seedRaw = parseInt(get("seed"), 10);
  const rel = get("relevance").toLowerCase();
  const diff = get("difficulty").toLowerCase();
  return {
    subject: get("subject") || "All",
    relevance: ["core", "frequent", "occasional"].includes(rel) ? rel : "All",
    difficulty: ["easy", "medium", "hard"].includes(diff) ? diff : "All",
    n: Number.isFinite(nRaw) ? Math.min(100, Math.max(5, nRaw)) : 20,
    seed: Number.isFinite(seedRaw) ? seedRaw : null,
  };
}

export function filtersToQuery(f: PracticeFilters): string {
  const qs = new URLSearchParams();
  if (f.subject !== "All") qs.set("subject", f.subject);
  if (f.relevance !== "All") qs.set("relevance", f.relevance);
  if (f.difficulty !== "All") qs.set("difficulty", f.difficulty);
  qs.set("n", String(f.n));
  if (f.seed !== null) qs.set("seed", String(f.seed));
  return qs.toString();
}
