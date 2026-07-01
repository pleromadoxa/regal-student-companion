import { Sparkles } from "lucide-react";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { cn } from "@/lib/utils";

export function RegalAIBadge({ className }: { className?: string }) {
  return (
    <span className={cn("regal-ai-badge", className)}>
      <Sparkles className="w-3 h-3" />
      {REGAL_AI_NAME}
    </span>
  );
}
