// lib/gate.ts
// eximIA Gate integration — dual-mode (Gate SSO + standalone Supabase fallback)
// If NEXT_PUBLIC_GATE_URL is set → uses Gate for auth (SSO across ecosystem)
// If NEXT_PUBLIC_GATE_URL is not set → falls back to Supabase auth

import { createBrowserClient } from "@supabase/ssr";

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "";
const APP_SLUG = "maps";

// ─── Mode Detection ───

export function isGateEnabled(): boolean {
  return GATE_URL.length > 0;
}

// ─── Types ───

export interface GateUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  avatar_url: string | null;
  apps: string[];
  created_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: GateUser;
}

// ─── Client-side: Auth actions ───

export async function gateLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!isGateEnabled()) {
    return standaloneLogin(email, password);
  }

  const res = await fetch(`${GATE_URL}/api/v1/gate/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function gateRegister(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!isGateEnabled()) {
    return standaloneRegister(name, email, password);
  }

  const res = await fetch(`${GATE_URL}/api/v1/gate/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function gateRefresh(
  refresh_token: string
): Promise<{ token: string; refresh_token: string }> {
  if (!isGateEnabled()) {
    return standaloneRefresh(refresh_token);
  }

  const res = await fetch(`${GATE_URL}/api/v1/gate/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Refresh failed");
  return data;
}

// ─── Client-side: Token management (localStorage) ───

export function saveAuth(data: AuthResponse): void {
  localStorage.setItem("gate_token", data.token);
  localStorage.setItem("gate_refresh", data.refresh_token);
  localStorage.setItem("gate_user", JSON.stringify(data.user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gate_token");
}

export function getUser(): GateUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gate_user");
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  localStorage.removeItem("gate_token");
  localStorage.removeItem("gate_refresh");
  localStorage.removeItem("gate_user");
}

// ─── Client-side: Auto-refresh on token expiry ───

export async function getValidToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresIn = payload.exp * 1000 - Date.now();

    if (expiresIn < 5 * 60 * 1000) {
      const refresh = localStorage.getItem("gate_refresh");
      if (!refresh) return null;
      try {
        const data = await gateRefresh(refresh);
        localStorage.setItem("gate_token", data.token);
        localStorage.setItem("gate_refresh", data.refresh_token);
        return data.token;
      } catch {
        logout();
        return null;
      }
    }
    return token;
  } catch {
    return token;
  }
}

// ─── Client-side: Authenticated fetch wrapper ───

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

// =============================================================================
// STANDALONE FALLBACK FUNCTIONS (Supabase Auth)
// =============================================================================
// Called when GATE_URL is NOT set.
// Uses Supabase browser client for auth — cookies are set automatically
// by @supabase/ssr, keeping middleware compatibility.
// =============================================================================

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function standaloneLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return {
    token: data.session!.access_token,
    refresh_token: data.session!.refresh_token,
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name:
        data.user!.user_metadata?.name ||
        data.user!.email!.split("@")[0],
      role: "admin",
      avatar_url: data.user!.user_metadata?.avatar_url || null,
      apps: [APP_SLUG],
      created_at: data.user!.created_at,
    },
  };
}

async function standaloneRegister(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  if (!data.session)
    throw new Error("Registro requer confirmação de email");
  return {
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name,
      role: "user",
      avatar_url: null,
      apps: [APP_SLUG],
      created_at: data.user!.created_at,
    },
  };
}

async function standaloneRefresh(
  refresh_token: string
): Promise<{ token: string; refresh_token: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });
  if (error) throw new Error(error.message);
  return {
    token: data.session!.access_token,
    refresh_token: data.session!.refresh_token,
  };
}
