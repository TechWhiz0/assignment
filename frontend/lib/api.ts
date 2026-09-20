const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type ApiError = { code?: string; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw (data.error || { message: res.statusText }) as ApiError;
  }
  return data as T;
}

export const api = {
  me: () => request<{ id: string; email: string }>("/auth/me"),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  kits: () => request<KitRecord[]>("/kits"),
  kit: (id: string) => request<KitRecord>(`/kits/${id}`),
  createKit: (body: { jd: string; company_url: string; days: number }) =>
    request<KitRecord>("/kits", { method: "POST", body: JSON.stringify(body) }),
  batch: (pairs: { jd: string; company_url: string; days?: number }[]) =>
    request<{ kits: KitRecord[] }>("/kits/batch", { method: "POST", body: JSON.stringify({ pairs }) }),
  patchKit: (id: string, kit: unknown) =>
    request<KitRecord>(`/kits/${id}`, { method: "PATCH", body: JSON.stringify({ kit }) }),
  regen: (id: string, section: string) =>
    request<KitRecord>(`/kits/${id}/regenerate`, { method: "POST", body: JSON.stringify({ section }) }),
  practice: (id: string, flashcard_id: string, confidence: number) =>
    request<KitRecord>(`/kits/${id}/practice`, {
      method: "POST",
      body: JSON.stringify({ flashcard_id, confidence }),
    }),
};

export type Requirement = { id: string; text: string; kind: string; priority: "must" | "nice" };
export type Question = {
  id: string;
  requirement_ids: string[];
  category: string;
  prompt: string;
  answer_outline: string;
  difficulty: number;
  origin?: string;
  edited?: boolean;
};
export type Flashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  origin?: string;
  edited?: boolean;
};
export type Kit = {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: { summary: string; what_they_do: string; sources: string[] };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: { day: number; focus: string; question_ids: string[]; minutes: number }[];
  };
  coverage: { uncovered_requirement_ids: string[]; passes: number };
};

export type KitRecord = {
  id: string;
  status: "queued" | "researching" | "generating" | "ready" | "failed";
  steps: { name: string; status: string; detail?: string }[];
  input: { company_url?: string; days?: number; jd_chars?: number };
  kit: Kit | null;
  error?: { code?: string; message?: string };
  practice: Record<string, { confidence: number; seen: boolean }>;
};
