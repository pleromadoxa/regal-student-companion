import Link from "next/link";
import { COPYRIGHT_LINE, COMPANY_NAME } from "@/lib/company";
import { REGAL_MAIL_URL, REGAL_MAIL_LABEL } from "@/lib/branding";

type AppFooterProps = {
  variant?: "landing" | "minimal";
};

export function AppFooter({ variant = "landing" }: AppFooterProps) {
  if (variant === "minimal") {
    return (
      <footer className="py-6 px-4 border-t border-white/10 text-center text-xs text-muted">
        <p>{COPYRIGHT_LINE}</p>
        <p className="mt-1">{COMPANY_NAME} · Regal Student Companion</p>
      </footer>
    );
  }

  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs text-muted mb-8">
          <div>
            <p className="font-semibold text-white mb-3">Product</p>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Regal ecosystem</p>
            <ul className="space-y-2">
              <li>
                <a href={REGAL_MAIL_URL} className="hover:text-white" target="_blank" rel="noopener noreferrer">
                  {REGAL_MAIL_LABEL}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/legal/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/legal/cookies" className="hover:text-white">Cookie Policy</Link></li>
              <li><Link href="/legal/acceptable-use" className="hover:text-white">Acceptable Use</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">&nbsp;</p>
            <ul className="space-y-2">
              <li><Link href="/legal/disclaimer" className="hover:text-white">Disclaimer</Link></li>
              <li><Link href="/legal/refunds" className="hover:text-white">Refunds & Billing</Link></li>
              <li><Link href="/legal/dmca" className="hover:text-white">Copyright / DMCA</Link></li>
              <li><Link href="/legal" className="hover:text-white">All legal documents</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-muted">{COPYRIGHT_LINE}</p>
        <p className="text-center text-[11px] text-muted/80 mt-1">
          {COMPANY_NAME} · Part of the Regal ecosystem
        </p>
      </div>
    </footer>
  );
}
