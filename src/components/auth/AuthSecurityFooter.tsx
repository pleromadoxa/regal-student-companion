"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";

export function AuthSecurityFooter() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="auth-security-footer mt-6 flex flex-col items-center gap-2 text-center"
    >
      <div className="flex items-center gap-2 text-white/40">
        <ShieldCheck className="h-4 w-4" />
        <Lock className="h-4 w-4" />
      </div>
      <p className="max-w-xs text-xs leading-relaxed text-white/40">
        Protected with TLS encryption in transit, Regal Mail identity verification, and row-level
        security on every row of Regal Companion data.
      </p>
    </motion.div>
  );
}
