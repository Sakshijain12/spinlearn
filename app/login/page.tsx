import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentAccount } from "@/lib/auth/session";
import { PRIVATE_ROBOTS, safeReturnPath } from "@/lib/site";

export const metadata = { title: "Log in", robots: PRIVATE_ROBOTS };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const returnTo = safeReturnPath((await searchParams).next);
  if (await currentAccount()) redirect(returnTo);
  return <AuthForm mode="login" returnTo={returnTo} />;
}
