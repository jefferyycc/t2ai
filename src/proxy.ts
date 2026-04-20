import { NextRequest, NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has(DEMO_SESSION_COOKIE)) {
    response.cookies.set(DEMO_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
