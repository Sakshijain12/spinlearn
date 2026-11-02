import ProgressView from "@/components/ProgressView";
import { requireAccount } from "@/lib/auth/session";
import { PRIVATE_ROBOTS } from "@/lib/site";

export const metadata = { title: "Your progress", robots: PRIVATE_ROBOTS };

export default async function ProgressPage() {
  await requireAccount("/progress");
  return <ProgressView />;
}
