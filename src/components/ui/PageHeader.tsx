import { cn } from "@/lib/utils";
import { RegalAIBadge } from "./RegalAIBadge";

export function PageHeader({
  title,
  description,
  regalAI,
  action,
  className,
}: {
  title: string;
  description?: string;
  regalAI?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8", className)}>
      <div className="page-enter">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {regalAI && <RegalAIBadge />}
        </div>
        {description && (
          <p className="text-muted text-sm sm:text-[15px] max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "purple",
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "purple" | "pink" | "emerald" | "amber";
  href?: string;
}) {
  const accents = {
    purple: { text: "text-regal-purple-300", bg: "from-regal-purple-500/15" },
    pink: { text: "text-regal-pink", bg: "from-regal-pink/15" },
    emerald: { text: "text-emerald-400", bg: "from-emerald-500/15" },
    amber: { text: "text-amber-400", bg: "from-amber-500/15" },
  };
  const a = accents[accent];
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className="glass-panel glass-panel-hover rounded-2xl p-5 block"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em]">{label}</p>
          <p className="text-[28px] font-bold text-white mt-2 tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br to-transparent", a.bg)}>
          <Icon className={cn("w-5 h-5", a.text)} />
        </div>
      </div>
    </Wrapper>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
        <Icon className="w-8 h-8 text-muted" />
      </div>
      <p className="text-white font-medium">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
