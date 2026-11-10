/** Small display helpers shared across pages. */

export const companyHref = (name: string) => `/company/${encodeURIComponent(name)}`;
export const questionHref = (id: string) => `/question/${encodeURIComponent(id)}`;

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const pct = (p: number) => (p > 0 && p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

export const RELEVANCE_ORDER = ["core", "frequent", "occasional"] as const;
export const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;

export const RELEVANCE_HINT: Record<string, string> = {
  core: "Core — a main focus of this company's process",
  frequent: "Frequent — commonly part of the process",
  occasional: "Occasional — comes up now and then",
};

/** Broad category groups used for the filter on the companies page. */
export const CATEGORY_GROUPS: { key: string; label: string; match: (c: string) => boolean }[] = [
  { key: "it", label: "IT services / mass recruiters", match: (c) => /mass recruiter|it services/i.test(c) },
  { key: "consulting", label: "Consulting", match: (c) => /consult/i.test(c) },
  { key: "fintech", label: "Fintech", match: (c) => /fintech|trading/i.test(c) },
  { key: "enterprise", label: "Enterprise", match: (c) => /enterprise/i.test(c) },
  { key: "product", label: "Product", match: (c) => /product/i.test(c) },
  { key: "bigtech", label: "Big Tech", match: (c) => /big tech|faang|maang/i.test(c) },
];

export function categoryGroup(category: string): string {
  return CATEGORY_GROUPS.find((g) => g.match(category))?.key ?? "other";
}

/** Deterministic hue per company so each gets its own accent colour. */
export function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export const newSeed = () => Math.floor(Math.random() * 1_000_000);
