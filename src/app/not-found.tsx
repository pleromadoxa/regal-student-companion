import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#08040f] text-white">
      <div className="max-w-md w-full text-center glass-panel rounded-2xl p-10">
        <p className="text-6xl font-black text-regal-purple-500/30 mb-2">404</p>
        <h1 className="text-xl font-bold mb-2">Page not found</h1>
        <p className="text-sm text-muted mb-6">
          This page doesn&apos;t exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">Back to home</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
