import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAuthStore } from "./store";
import { safeReturnPath } from "../site";

export const SESSION_COOKIE = "spinlearn_session";

export async function currentAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getAuthStore().accountForSession(token) : null;
}

export async function requireAccount(returnTo = "/") {
  const account = await currentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return account;
}

export async function apiAuthError() {
  if (await currentAccount()) return null;
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Log in to continue." } },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}
