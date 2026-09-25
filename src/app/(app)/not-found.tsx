import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 page-enter">
      <div className="p-4 rounded-2xl bg-regal-purple-500/[0.08] border border-regal-purple-400/20 mb-6">
        <FileQuestion className="w-10 h-10 text-regal-purple-300" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Page not found</h1>
      <p className="text-[13px] text-muted max-w-md mb-6">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link href="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
