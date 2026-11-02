import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentAccount } from "@/lib/auth/session";

export default async function RegisterPage() {
  if (await currentAccount()) redirect("/");
  return <AuthForm mode="register" />;
}
