import { cn } from "@/lib/utils";

export function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-150 focus:border-regal-purple-400/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-regal-purple-400/30",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-150 focus:border-regal-purple-400/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-regal-purple-400/30 resize-y min-h-[100px]",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-medium text-muted-strong mb-1.5", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-all duration-150 focus:border-regal-purple-400/50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
