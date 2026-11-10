/**
 * PrepMap API client.
 *
 * Every call to the FastAPI backend goes through this module. Types mirror
 * backend/schemas.py. The backend runs on Render's free tier and sleeps when
 * idle, so the first request waits for /health (with retries + backoff) before
 * anything else is sent.
 */

/** The real backend (set via NEXT_PUBLIC_API_URL). Used by the proxy in next.config.ts. */
export const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

/**
 * What the browser calls: a same-origin path that next.config.ts rewrites to
 * BACKEND_URL. Same-origin means no CORS setup is needed on the backend.
 */
export const API_URL = "/backend";

export const DISCLAIMER =
  "Recommended based on each company's public hiring process, not a record of questions the company asked.";

/* ------------------------------------------------------------------ types */

export type Difficulty = "easy" | "medium" | "hard";
export type Relevance = "core" | "frequent" | "occasional";
export type DataConfidence = "high" | "medium" | "low";

export interface HealthResponse {
  status: string;
  models_loaded: boolean;
  questions: number;
  companies: number;
  subjects: number;
}

export interface CompanyProfile {
  company: string;
  category: string;
  fresher_roles: string;
  hiring_rounds: string;
  core_subjects: string[];
  frequent_subjects: string[];
  occasional_subjects: string[];
  difficulty_focus: string[];
  data_confidence: DataConfidence | string;
  notes: string;
  sources: string;
}

export interface CompanyDetail extends CompanyProfile {
  total_questions: number;
  relevance_counts: Record<string, number>;
  subject_counts: Record<string, number>;
  counts_by_relevance?: Record<string, number> | null;
  counts_by_subject?: Record<string, number> | null;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  subject: string;
  difficulty: Difficulty | string;
  relevance: Relevance | string;
}

export interface PracticeResponse {
  company: string;
  total_available: number;
  returned: number;
  disclaimer: string;
  questions: PracticeQuestion[];
}

export interface CompanyRelevance {
  company: string;
  relevance: Relevance | string;
}

export interface QuestionDetail {
  id: string;
  question: string;
  subject: string;
  difficulty: Difficulty | string;
  companies: CompanyRelevance[];
}

export interface SubjectCandidate {
  subject: string;
  probability: number;
}

export interface AnalyseResponse {
  question: string;
  subject: string;
  subject_confidence: number;
  subject_candidates: SubjectCandidate[];
  difficulty: Difficulty | string;
  recommended_for: CompanyRelevance[];
  disclaimer: string;
}

export interface PracticeParams {
  company: string;
  subject?: string;
  relevance?: string;
  difficulty?: string;
  n?: number;
  seed?: number;
}

/* ----------------------------------------------------------------- errors */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Turn any thrown value into a sentence that is safe to show to a student. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "We couldn't find that. It may have been renamed or removed.";
    if (err.status === 422 || err.status === 400) return err.message || "That request wasn't valid. Please check your input.";
    if (err.status === 503) return "The server is still loading its models. Please try again in a few seconds.";
    if (err.status >= 500) return "The server had a problem handling this request. Please try again.";
    if (err.status === 0) return "We couldn't reach the PrepMap server. Check your connection and try again.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------ low level */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rawFetch<T>(path: string, init?: RequestInit, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError("Network error", 0);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg) message = String(body.detail[0].msg);
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

/* --------------------------------------------------- server wake-up state */

export type ServerState = "idle" | "checking" | "waking" | "ready" | "error";

let serverState: ServerState = "idle";
let healthCache: HealthResponse | null = null;
let wakePromise: Promise<HealthResponse> | null = null;
const listeners = new Set<() => void>();

function setServerState(s: ServerState) {
  serverState = s;
  listeners.forEach((l) => l());
}

export function subscribeServerState(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export const getServerState = () => serverState;
export const getCachedHealth = () => healthCache;

const WAKE_DELAYS_MS = [2000, 4000, 8000, 12000, 16000];

/**
 * Wait until the backend answers /health. Shared by every caller, so only one
 * wake-up sequence runs at a time. Shows "waking" after ~2.5s of waiting.
 */
export function ensureAwake(): Promise<HealthResponse> {
  if (healthCache && serverState === "ready") return Promise.resolve(healthCache);
  if (wakePromise) return wakePromise;

  setServerState("checking");
  const slowTimer = setTimeout(() => {
    if (serverState === "checking") setServerState("waking");
  }, 2500);

  wakePromise = (async () => {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= WAKE_DELAYS_MS.length; attempt++) {
      try {
        const h = await rawFetch<HealthResponse>("/health", undefined, 45000);
        healthCache = h;
        clearTimeout(slowTimer);
        setServerState("ready");
        return h;
      } catch (err) {
        lastErr = err;
        // 4xx other than 404/429 means the server is up but unhappy — don't spin.
        if (err instanceof ApiError && err.status >= 400 && err.status < 500 && ![404, 408, 429].includes(err.status)) break;
        if (attempt < WAKE_DELAYS_MS.length) {
          if (serverState === "checking") setServerState("waking");
          await sleep(WAKE_DELAYS_MS[attempt]);
        }
      }
    }
    clearTimeout(slowTimer);
    setServerState("error");
    throw lastErr instanceof ApiError ? lastErr : new ApiError("Server unavailable", 0);
  })();

  wakePromise.catch(() => {
    wakePromise = null;
  });
  return wakePromise;
}

/** Forget a failed wake-up so the next call starts a fresh attempt. */
export function resetWake() {
  wakePromise = null;
  if (serverState === "error") setServerState("idle");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  await ensureAwake();
  try {
    return await rawFetch<T>(path, init);
  } catch (err) {
    // Models may still be initialising right after a cold start: retry 503 once.
    if (err instanceof ApiError && err.status === 503) {
      await sleep(3000);
      return rawFetch<T>(path, init);
    }
    throw err;
  }
}

/* ---------------------------------------------------- session-level cache */

function sessionGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function sessionSet(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full — memory cache still works */
  }
}

const memo = new Map<string, Promise<unknown>>();

function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = memo.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const stored = typeof window !== "undefined" ? sessionGet<T>(`prepmap:${key}`) : null;
  const p = stored
    ? Promise.resolve(stored)
    : loader().then((v) => {
        sessionSet(`prepmap:${key}`, v);
        return v;
      });
  memo.set(key, p);
  p.catch(() => memo.delete(key));
  return p;
}

/* ------------------------------------------------------------- endpoints */

const enc = encodeURIComponent;

export const api = {
  health: () => ensureAwake(),

  subjects: () => cached<string[]>("subjects", () => request<string[]>("/subjects")),

  companies: () => cached<CompanyProfile[]>("companies", () => request<CompanyProfile[]>("/companies")),

  company: (name: string) => cached<CompanyDetail>(`company:${name.toLowerCase()}`, () => request<CompanyDetail>(`/companies/${enc(name)}`)),

  practice: (p: PracticeParams) => {
    const qs = new URLSearchParams({
      company: p.company,
      subject: p.subject || "All",
      relevance: p.relevance || "All",
      difficulty: p.difficulty || "All",
      n: String(p.n ?? 20),
    });
    if (p.seed !== undefined) qs.set("seed", String(p.seed));
    return request<PracticeResponse>(`/practice?${qs.toString()}`);
  },

  question: (id: string) => request<QuestionDetail>(`/questions/${enc(id)}`),

  analyse: (question: string) =>
    request<AnalyseResponse>("/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
};
