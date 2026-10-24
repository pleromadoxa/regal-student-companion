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
    purple: { text: "text-primary", bg: "bg-primary/12" },
    pink: { text: "text-regal-pink", bg: "bg-regal-pink/12" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/12" },
    amber: { text: "text-amber-400", bg: "bg-amber-500/12" },
  };
  const a = accents[accent];
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className="glass-panel glass-panel-hover rounded-lg p-4 block"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em]">{label}</p>
          <p className="text-[26px] font-bold text-white mt-1.5 tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={cn("p-2 rounded-md", a.bg)}>
          <Icon className={cn("w-4.5 h-4.5", a.text)} />
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
      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] mb-4">
        <Icon className="w-7 h-7 text-muted" />
      </div>
      <p className="text-white font-medium">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
