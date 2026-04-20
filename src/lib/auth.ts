import { User } from "@/lib/types";

const DEMO_CREATED_AT = "2026-01-01T00:00:00.000Z";
export const DEMO_SESSION_COOKIE = "t2ai_demo_user_id";

type DemoUserContext = User & {
  authSource: "demo";
};

type SupabaseUserContext = User & {
  authSource: "supabase";
  accessToken: string;
};

export type UserContext = DemoUserContext | SupabaseUserContext;

export class AuthRequiredError extends Error {
  status = 401;

  constructor(message = "Sign in before continuing.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function parseCookie(header: string | null, name: string) {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function getDemoUser(demoSessionId?: string | null): UserContext {
  const fallbackId = process.env.DEMO_USER_ID ?? "demo-user";
  const userId = demoSessionId ? `demo-${demoSessionId}` : fallbackId;

  return {
    id: userId,
    email: process.env.DEMO_USER_EMAIL ?? "demo@fitloop.app",
    createdAt: DEMO_CREATED_AT,
    authSource: "demo",
  };
}

function getBearerToken(authorization: string | null | undefined) {
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

export async function getServerUserFromHeaders(
  headers?: Pick<Headers, "get">,
): Promise<UserContext> {
  const accessToken = getBearerToken(headers?.get("authorization"));
  const demoSessionId = parseCookie(
    headers?.get("cookie") ?? null,
    DEMO_SESSION_COOKIE,
  );
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (accessToken) {
    if (!supabaseUrl || !anonKey) {
      throw new AuthRequiredError("Supabase auth is not configured.");
    }

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
        accessToken,
      };
    }

    throw new AuthRequiredError("Your session is invalid. Sign in again.");
  }

  if (isAuthRequired()) {
    throw new AuthRequiredError();
  }

  return getDemoUser(demoSessionId);
}

export async function getServerUser(request?: Request): Promise<UserContext> {
  return getServerUserFromHeaders(request?.headers);
}

export function isAuthError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}

export function isSupabaseUser(user: UserContext): user is SupabaseUserContext {
  return user.authSource === "supabase";
}
