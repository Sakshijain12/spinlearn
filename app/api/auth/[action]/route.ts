import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { loginSchema, registrationSchema } from "@/lib/auth/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { getAuthStore, newSession, SESSION_SECONDS, tokenHash } from "@/lib/auth/store";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { DeploymentConfigurationError, trustedAuthOrigin } from "@/lib/auth/config";

export const runtime = "nodejs";
const noCache = { "Cache-Control": "no-store", Vary: "Cookie" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: noCache });
}

function sessionResponse(account: { id: string; loginId: string; displayName: string }, token: string, status = 200) {
  const response = NextResponse.json({ account }, { status, headers: noCache });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_SECONDS,
  });
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!["login", "register", "logout"].includes(action)) return errorResponse(404, "NOT_FOUND", "Unknown account action.");
  try {
    if (!trustedAuthOrigin(request.headers.get("origin"), request.nextUrl.origin)) {
      return errorResponse(403, "INVALID_ORIGIN", "Open the login page on this site and try again.");
    }
    const store = getAuthStore();
    const previousToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (action === "logout") {
      if (previousToken) await store.revoke(previousToken);
      const response = NextResponse.json({ signedOut: true }, { headers: noCache });
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
        path: "/", maxAge: 0,
      });
      return response;
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return errorResponse(415, "INVALID_FORMAT", "Send the form as JSON.");
    }
    if (Number(request.headers.get("content-length")) > 8192) {
      return errorResponse(413, "REQUEST_TOO_LARGE", "The login request is too large.");
    }
    const text = await request.text();
    if (Buffer.byteLength(text) > 8192) return errorResponse(413, "REQUEST_TOO_LARGE", "The login request is too large.");
    const body: unknown = JSON.parse(text);
    const input = action === "register" ? registrationSchema.parse(body) : loginSchema.parse(body);
    const limitKey = `${action}:${tokenHash(input.loginId)}`;
    if (!await store.takeAttempt("auth-total", 100, 15 * 60 * 1000) || !await store.takeAttempt(limitKey, 10, 15 * 60 * 1000)) {
      const response = errorResponse(429, "RATE_LIMITED", "Too many attempts. Wait 15 minutes before trying again.");
      response.headers.set("Retry-After", "900");
      return response;
    }

    if (action === "register") {
      const registration = registrationSchema.parse(body);
      const passwordHash = await hashPassword(registration.password);
      const session = newSession();
      const account = await store.register(registration.loginId, registration.displayName, passwordHash, session, previousToken);
      if (!account) return errorResponse(409, "LOGIN_ID_UNAVAILABLE", "That login ID is unavailable. Choose another or log in.");
      return sessionResponse(account, session.token, 201);
    }

    const credentials = await store.credentials(input.loginId);
    const valid = await verifyPassword(input.password, credentials?.passwordHash ?? null);
    if (!valid || !credentials) return errorResponse(401, "INVALID_CREDENTIALS", "The login ID or password is incorrect.");
    const session = newSession();
    await store.createSession(credentials.account.id, session, previousToken);
    await store.clearAttempts(limitKey);
    return sessionResponse(credentials.account, session.token);
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(400, "INVALID_INPUT", error.issues[0].message);
    if (error instanceof SyntaxError) return errorResponse(400, "INVALID_JSON", "The login request could not be read.");
    if (error instanceof DeploymentConfigurationError) {
      console.error("Spinlearn account configuration is incomplete:", error.message);
      return errorResponse(503, "AUTH_NOT_CONFIGURED", "Account services are not configured. Ask the site owner to finish database setup.");
    }
    console.error("Spinlearn account action failed.", error);
    return errorResponse(500, "AUTH_UNAVAILABLE", "Account services are unavailable. Try again shortly.");
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "session") return errorResponse(404, "NOT_FOUND", "Unknown account action.");
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const account = token ? await getAuthStore().accountForSession(token) : null;
    return account
      ? NextResponse.json({ account }, { headers: noCache })
      : errorResponse(401, "UNAUTHENTICATED", "Log in to continue.");
  } catch (error) {
    console.error("Spinlearn could not check the account session.", error);
    return errorResponse(500, "AUTH_UNAVAILABLE", "Account services are unavailable. Try again shortly.");
  }
}
