import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/Skeleton";

const ToolsHub = dynamic(
  () => import("@/components/tools/ToolsHub").then((m) => m.ToolsHub),
  { loading: () => <PageSkeleton /> }
);

export default function ToolsPage() {
  return <ToolsHub />;
}
