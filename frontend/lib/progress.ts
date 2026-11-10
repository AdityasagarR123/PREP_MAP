"use client";

/**
 * Student progress, stored only in this browser (localStorage).
 * No login, no server. Every storage access is wrapped in try/catch so the
 * site keeps working (in memory) when storage is blocked.
 */

import { useSyncExternalStore } from "react";

export interface SavedQuestion {
  id: string;
  question: string;
  subject: string;
  difficulty: string;
  at: number;
}

export interface Progress {
  practised: Record<string, SavedQuestion>;
  revise: Record<string, SavedQuestion>;
  target: string | null;
}

const KEY = "prepmap:progress:v1";
const EMPTY: Progress = { practised: {}, revise: {}, target: null };

let state: Progress = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      state = {
        practised: parsed.practised && typeof parsed.practised === "object" ? parsed.practised : {},
        revise: parsed.revise && typeof parsed.revise === "object" ? parsed.revise : {},
        target: typeof parsed.target === "string" ? parsed.target : null,
      };
    }
  } catch {
    state = EMPTY;
  }
  try {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        loaded = false;
        load();
        emit();
      }
    });
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: Progress) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep in memory for this visit */
  }
  emit();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  load();
  return state;
}

const getServerSnapshot = () => EMPTY;

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type QuestionLike = Omit<SavedQuestion, "at">;

function pick(q: QuestionLike): SavedQuestion {
  return { id: q.id, question: q.question, subject: q.subject, difficulty: q.difficulty, at: Date.now() };
}

export const progress = {
  togglePractised(q: QuestionLike) {
    load();
    const practised = { ...state.practised };
    if (practised[q.id]) delete practised[q.id];
    else practised[q.id] = pick(q);
    commit({ ...state, practised });
  },
  setPractised(q: QuestionLike, value: boolean) {
    load();
    const practised = { ...state.practised };
    if (value) practised[q.id] = practised[q.id] || pick(q);
    else delete practised[q.id];
    commit({ ...state, practised });
  },
  toggleRevise(q: QuestionLike) {
    load();
    const revise = { ...state.revise };
    if (revise[q.id]) delete revise[q.id];
    else revise[q.id] = pick(q);
    commit({ ...state, revise });
  },
  setTarget(company: string | null) {
    load();
    commit({ ...state, target: company });
  },
  reset() {
    load();
    commit({ practised: {}, revise: {}, target: state.target });
  },
};
