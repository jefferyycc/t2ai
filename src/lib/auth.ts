import { User } from "@/lib/types";

const DEMO_CREATED_AT = "2026-01-01T00:00:00.000Z";

export type UserContext = User & {
  authSource: "demo" | "supabase";
};

export class AuthRequiredError extends Error {
  status = 401;

  constructor(message = "Sign in before continuing.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function getDemoUser(): UserContext {
  return {
    id: process.env.DEMO_USER_ID ?? "demo-user",
    email: process.env.DEMO_USER_EMAIL ?? "demo@fitloop.app",
    createdAt: DEMO_CREATED_AT,
    authSource: "demo",
  };
}

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/$/, "") ?? null;
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY ?? null;
}

export function isAuthRequired() {
  return process.env.AUTH_REQUIRED === "true";
}

export async function getServerUser(request?: Request): Promise<UserContext> {
  const accessToken = getBearerToken(request);
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (accessToken && supabaseUrl && anonKey) {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const user = (await response.json()) as {
        id: string;
        email?: string;
        created_at?: string;
      };

      return {
        id: user.id,
        email: user.email ?? "supabase-user@t2ai.local",
        createdAt: user.created_at ?? DEMO_CREATED_AT,
        authSource: "supabase",
      };
    }

    if (isAuthRequired()) {
      throw new AuthRequiredError("Your session is invalid. Sign in again.");
    }
  }

  if (isAuthRequired()) {
    throw new AuthRequiredError();
  }

  return getDemoUser();
}

export function isAuthError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}
