"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Utensils,
  BookOpen,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  GraduationCap,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { format, addMonths, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "./shared";
import { useUserId } from "./shared/useUserId";
import { cn } from "@/lib/utils";

type BudgetEntry = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  created_at: string;
};

type CategoryDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  barColor: string;
  iconColor: string;
  isIncome?: boolean;
};

const CATEGORIES: CategoryDef[] = [
  { id: "food", label: "Food", icon: Utensils, barColor: "bg-orange-400", iconColor: "text-orange-300 bg-orange-500/15" },
  { id: "books", label: "Books", icon: BookOpen, barColor: "bg-blue-400", iconColor: "text-blue-300 bg-blue-500/15" },
  { id: "transport", label: "Transport", icon: Car, barColor: "bg-cyan-400", iconColor: "text-cyan-300 bg-cyan-500/15" },
  { id: "housing", label: "Housing", icon: Home, barColor: "bg-violet-400", iconColor: "text-violet-300 bg-violet-500/15" },
  { id: "entertainment", label: "Fun", icon: Gamepad2, barColor: "bg-pink-400", iconColor: "text-pink-300 bg-pink-500/15" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, barColor: "bg-amber-400", iconColor: "text-amber-300 bg-amber-500/15" },
  { id: "education", label: "Education", icon: GraduationCap, barColor: "bg-indigo-400", iconColor: "text-indigo-300 bg-indigo-500/15" },
  { id: "income", label: "Income", icon: CircleDollarSign, barColor: "bg-emerald-400", iconColor: "text-emerald-300 bg-emerald-500/15", isIncome: true },
  { id: "other", label: "Other", icon: Wallet, barColor: "bg-slate-400", iconColor: "text-slate-300 bg-slate-500/15" },
];

const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => !c.isIncome);
const BUDGET_TARGET_KEY = "regal-budget-targets";

type BudgetTargets = Record<string, number>;

function loadTargets(): BudgetTargets {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BUDGET_TARGET_KEY) ?? "{}") as BudgetTargets;
  } catch {
    return {};
  }
}

function saveTarget(monthKey: string, target: number) {
  const targets = loadTargets();
  targets[monthKey] = target;
  try {
    localStorage.setItem(BUDGET_TARGET_KEY, JSON.stringify(targets));
  } catch {
    /* quota */
  }
}

function getCategory(id: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : n > 0 ? "+" : "";
  return `${sign}$${abs.toFixed(2)}`;
}

function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function entryInMonth(entry: BudgetEntry, date: Date) {
  const created = parseISO(entry.created_at);
  return created >= startOfMonth(date) && created <= endOfMonth(date);
}

export function BudgetTool() {
  const { uid } = useUserId();
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [target, setTarget] = useState(0);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const currentMonthKey = monthKey(month);

  useEffect(() => {
    const targets = loadTargets();
    const t = targets[currentMonthKey] ?? 0;
    setTarget(t);
    setTargetInput(String(t || ""));
  }, [currentMonthKey]);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    supabase
      .from("companion_budget_entries")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries((data as BudgetEntry[]) ?? []);
        setLoading(false);
      });
  }, [uid]);

  const monthEntries = useMemo(
    () => entries.filter((e) => entryInMonth(e, month)),
    [entries, month]
  );

  const filteredEntries = useMemo(
    () =>
      filterCategory
        ? monthEntries.filter((e) => e.category === filterCategory)
        : monthEntries,
    [monthEntries, filterCategory]
  );

  const totalIncome = useMemo(
    () => monthEntries.filter((e) => Number(e.amount) > 0).reduce((s, e) => s + Number(e.amount), 0),
    [monthEntries]
  );

  const totalExpenses = useMemo(
    () =>
      monthEntries
        .filter((e) => Number(e.amount) < 0)
        .reduce((s, e) => s + Math.abs(Number(e.amount)), 0),
    [monthEntries]
  );

  const remaining = target + totalIncome - totalExpenses;

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of CATEGORIES) totals[cat.id] = 0;
    for (const e of monthEntries) {
      const amt = Number(e.amount);
      if (amt < 0) totals[e.category] = (totals[e.category] ?? 0) + Math.abs(amt);
      else if (e.category === "income" || amt > 0) totals.income += amt;
    }
    return totals;
  }, [monthEntries]);

  const maxExpenseCategory = useMemo(
    () => Math.max(...EXPENSE_CATEGORIES.map((c) => categoryTotals[c.id] ?? 0), 1),
    [categoryTotals]
  );

  const saveMonthlyTarget = () => {
    const val = Math.max(0, parseFloat(targetInput) || 0);
    setTarget(val);
    saveTarget(currentMonthKey, val);
    setEditingTarget(false);
  };

  const addEntry = async () => {
    if (!uid || !amount) return;
    const raw = parseFloat(amount);
    if (!raw || raw <= 0) return;
    const signedAmount = entryType === "income" ? raw : -raw;
    const cat = entryType === "income" ? "income" : category;
    const { data } = await supabase
      .from("companion_budget_entries")
      .insert({
        user_id: uid,
        amount: signedAmount,
        category: cat,
        description: description.trim() || null,
      })
      .select()
      .single();
    if (data) {
      setEntries((e) => [data as BudgetEntry, ...e]);
      setAmount("");
      setDescription("");
    }
  };

  const removeEntry = async (id: string) => {
    await supabase.from("companion_budget_entries").delete().eq("id", id);
    setEntries((e) => e.filter((x) => x.id !== id));
  };

  const sidebar = (
    <Card className="border-regal-purple-400/15">
      <h3 className="text-sm font-bold text-white mb-3">Categories</h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setFilterCategory(null)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors",
            filterCategory === null
              ? "bg-regal-purple-500/15 border border-regal-purple-400/40 text-white"
              : "text-muted hover:text-white hover:bg-white/5"
          )}
        >
          <span>All entries</span>
          <span className="text-xs tabular-nums">{monthEntries.length}</span>
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const total = categoryTotals[cat.id] ?? 0;
          if (cat.isIncome && total === 0) return null;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-colors",
                filterCategory === cat.id
                  ? "bg-regal-purple-500/15 border border-regal-purple-400/40"
                  : "hover:bg-white/5"
              )}
            >
              <div className={cn("p-1.5 rounded-lg shrink-0", cat.iconColor)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 text-white truncate">{cat.label}</span>
              <span
                className={cn(
                  "text-xs tabular-nums shrink-0",
                  cat.isIncome ? "text-emerald-300" : "text-regal-pink"
                )}
              >
                {cat.isIncome ? `+$${total.toFixed(0)}` : `$${total.toFixed(0)}`}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Monthly target" value={`$${target.toFixed(0)}`} icon={PiggyBank} accent="purple" />
          <ToolStat label="Spent" value={`$${totalExpenses.toFixed(2)}`} icon={TrendingDown} accent="pink" />
          <ToolStat label="Income" value={`$${totalIncome.toFixed(2)}`} icon={TrendingUp} accent="emerald" />
          <ToolStat
            label="Remaining"
            value={`$${remaining.toFixed(2)}`}
            icon={Wallet}
            accent={remaining >= 0 ? "emerald" : "amber"}
          />
        </>
      }
      sidebar={sidebar}
    >
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-white min-w-[140px] text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {editingTarget ? (
            <>
              <Input
                type="number"
                min={0}
                step={10}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-28"
                placeholder="Target $"
              />
              <Button size="sm" onClick={saveMonthlyTarget}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTarget(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditingTarget(true)}>
              Set budget target
            </Button>
          )}
        </div>
      </Card>

      <ToolSection title="Add entry" description="Track expenses and income for this month.">
        <Card className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntryType("expense")}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                entryType === "expense"
                  ? "bg-regal-pink/15 border-regal-pink/40 text-white"
                  : "border-white/10 text-muted hover:text-white"
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setEntryType("income")}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                entryType === "income"
                  ? "bg-emerald-500/15 border-emerald-400/40 text-white"
                  : "border-white/10 text-muted hover:text-white"
              )}
            >
              Income
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {entryType === "expense" && (
              <div>
                <Label>Category</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className={entryType === "income" ? "sm:col-span-2" : ""}>
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Campus lunch, textbook rental…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addEntry} disabled={!uid || !amount}>
            <Plus className="w-4 h-4" /> Add {entryType}
          </Button>
        </Card>
      </ToolSection>

      {totalExpenses > 0 && (
        <ToolSection title="Spending breakdown" description="Where your money went this month.">
          <Card className="space-y-3">
            {EXPENSE_CATEGORIES.filter((c) => (categoryTotals[c.id] ?? 0) > 0)
              .sort((a, b) => (categoryTotals[b.id] ?? 0) - (categoryTotals[a.id] ?? 0))
              .map((cat) => {
                const total = categoryTotals[cat.id] ?? 0;
                const pct = (total / maxExpenseCategory) * 100;
                const share = totalExpenses ? (total / totalExpenses) * 100 : 0;
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("p-1 rounded-lg shrink-0", cat.iconColor)}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-white truncate">{cat.label}</span>
                      </div>
                      <span className="text-muted tabular-nums shrink-0">
                        ${total.toFixed(2)}{" "}
                        <span className="text-[10px]">({share.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cat.barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </Card>
        </ToolSection>
      )}

      <ToolSection
        title="Transactions"
        description={
          filterCategory
            ? `Showing ${getCategory(filterCategory).label} only`
            : `${filteredEntries.length} entries this month`
        }
        action={
          filterCategory ? (
            <Button size="sm" variant="ghost" onClick={() => setFilterCategory(null)}>
              Clear filter
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <Card className="py-10 text-center text-muted text-sm">Loading entries…</Card>
        ) : filteredEntries.length === 0 ? (
          <ToolEmpty
            icon={Wallet}
            title="No entries yet"
            description="Add your first expense or income to start tracking your student budget."
          />
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((e) => {
              const cat = getCategory(e.category);
              const Icon = cat.icon;
              const amt = Number(e.amount);
              const isIncome = amt > 0;
              return (
                <Card
                  key={e.id}
                  className="flex items-center gap-3 py-3 px-4"
                >
                  <div className={cn("p-2 rounded-xl shrink-0", cat.iconColor)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white capitalize">
                      {e.description || cat.label}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {cat.label} · {format(parseISO(e.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      isIncome ? "text-emerald-300" : "text-regal-pink"
                    )}
                  >
                    {formatMoney(amt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted hover:text-red-400"
                    onClick={() => removeEntry(e.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </ToolSection>
    </ToolShell>
  );
}
