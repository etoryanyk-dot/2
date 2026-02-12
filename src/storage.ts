import type { AppData, Job } from "./types";

const STORAGE_KEY = "restorationops:data:v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { jobs: [] };
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.jobs) return { jobs: [] };
    return parsed;
  } catch {
    return { jobs: [] };
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function nowIso() {
  return new Date().toISOString();
}

export function ymd(d = new Date()) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function makeJobNumber(existingJobs: Job[], dateStr: string) {
  // format: YYYY-MM-DD-XXX (per day sequence)
  const prefix = `${dateStr}-`;
  const todays = existingJobs
    .map((j) => j.id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const parts = id.split("-");
      const seq = parts[3]; // XXX
      return Number(seq);
    })
    .filter((n) => Number.isFinite(n));

  const next = (todays.length ? Math.max(...todays) : 0) + 1;
  const seq = String(next).padStart(3, "0");
  return `${dateStr}-${seq}`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}