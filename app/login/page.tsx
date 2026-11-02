import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentAccount } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await currentAccount()) redirect("/");
  return <AuthForm mode="login" />;
}
