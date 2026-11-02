import TodayView from "@/components/TodayView";
import { publicMetadata, SITE_DESCRIPTION } from "@/lib/site";

export const metadata = publicMetadata("Learn AI one concept at a time", SITE_DESCRIPTION, "/");

export default function TodayPage() {
  return <TodayView />;
}
