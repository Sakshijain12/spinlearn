import SettingsView from "@/components/SettingsView";
import { requireAccount } from "@/lib/auth/session";
import { PRIVATE_ROBOTS } from "@/lib/site";

export const metadata = { title: "Account settings", robots: PRIVATE_ROBOTS };

export default async function SettingsPage() {
  const account = await requireAccount("/settings");
  return <SettingsView account={account} />;
}
