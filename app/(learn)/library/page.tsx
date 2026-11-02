import LibraryView from "@/components/LibraryView";
import { publicMetadata } from "@/lib/site";

export const metadata = publicMetadata("AI learning library", "Explore 42 free AI lessons covering machine learning, transformers, generative AI, training, deployment, and alignment.", "/library");

export default function LibraryPage() {
  return <LibraryView />;
}
