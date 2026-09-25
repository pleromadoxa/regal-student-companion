import Link from "next/link";
import { COPYRIGHT_LINE, COMPANY_NAME } from "@/lib/company";
import { REGAL_MAIL_URL, REGAL_MAIL_LABEL } from "@/lib/branding";

type AppFooterProps = {
  variant?: "landing" | "minimal";
};

export function AppFooter({ variant = "landing" }: AppFooterProps) {
  if (variant === "minimal") {
    return (
      <footer className="py-6 px-4 border-t border-white/[0.06] text-center text-xs text-muted">
        <p>{COPYRIGHT_LINE}</p>
        <p className="mt-1">{COMPANY_NAME} · Regal Student Companion</p>
      </footer>
    );
  }

  return (
    <footer className="py-12 px-4 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-[12px] text-muted mb-8">
          <div>
            <p className="font-semibold text-white mb-3 text-[13px]">Product</p>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white transition-colors duration-150">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors duration-150">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-[13px]">Regal ecosystem</p>
            <ul className="space-y-2">
              <li>
                <a href={REGAL_MAIL_URL} className="hover:text-white transition-colors duration-150" target="_blank" rel="noopener noreferrer">
                  {REGAL_MAIL_LABEL}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-[13px]">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/legal/terms" className="hover:text-white transition-colors duration-150">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors duration-150">Privacy Policy</Link></li>
              <li><Link href="/legal/cookies" className="hover:text-white transition-colors duration-150">Cookie Policy</Link></li>
              <li><Link href="/legal/acceptable-use" className="hover:text-white transition-colors duration-150">Acceptable Use</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-[13px]">&nbsp;</p>
            <ul className="space-y-2">
              <li><Link href="/legal/disclaimer" className="hover:text-white transition-colors duration-150">Disclaimer</Link></li>
              <li><Link href="/legal/refunds" className="hover:text-white transition-colors duration-150">Refunds & Billing</Link></li>
              <li><Link href="/legal/dmca" className="hover:text-white transition-colors duration-150">Copyright / DMCA</Link></li>
              <li><Link href="/legal" className="hover:text-white transition-colors duration-150">All legal documents</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-muted">{COPYRIGHT_LINE}</p>
        <p className="text-center text-[11px] text-muted/60 mt-1">
          {COMPANY_NAME} · Part of the Regal ecosystem
        </p>
      </div>
    </footer>
  );
}
