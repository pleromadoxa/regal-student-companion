"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield,
  Users,
  CreditCard,
  Ticket,
  LifeBuoy,
  Activity,
  HeartPulse,
  Search,
  Loader2,
  RefreshCw,
  Plus,
  Check,
  X,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Tab = "overview" | "users" | "subscriptions" | "coupons" | "support" | "health";

type StatsPayload = {
  stats: {
    totalMembers: number;
    activeToday: number;
    activeWeek: number;
    openTickets: number;
    paidPlans: number;
    graduatePlans: number;
    campusPlans: number;
  };
  recentActivity: {
    id: string;
    action: string;
    label: string;
    category: string;
    points_delta: number;
    created_at: string;
  }[];
  activityByDay: { date: string; count: number }[];
};

type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  engagement_points: number;
  focus_minutes: number;
  study_streak: number;
  isCompanionUser: boolean;
  subscription: { plan_id: string; status: string; ai_requests_today: number } | null;
  appMember: { activity_count: number; last_seen_at: string } | null;
};

const TABS: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Plans", icon: CreditCard },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "health", label: "Health", icon: HeartPulse },
];

export function AdminClient({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [tickets, setTickets] = useState<Record<string, unknown>[]>([]);
  const [health, setHealth] = useState<{ overall: string; checks: { name: string; status: string; detail: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({ code: "", description: "", planId: "graduate", discountPercent: 20, maxUses: 100 });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [planPatch, setPlanPatch] = useState({ planId: "graduate", status: "active" });

  const parseApiError = async (res: Response, fallback: string) => {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `${fallback} (${res.status})`);
  };

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) await parseApiError(res, "Failed to load stats");
    setStats(await res.json());
  }, []);

  const loadUsers = useCallback(async (q = "") => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (!res.ok) await parseApiError(res, "Failed to load users");
    const data = (await res.json()) as { users?: AdminUser[] };
    setUsers(data.users ?? []);
  }, []);

  const loadSubscriptions = useCallback(async () => {
    const res = await fetch("/api/admin/subscriptions");
    if (!res.ok) await parseApiError(res, "Failed to load subscriptions");
    const data = (await res.json()) as { subscriptions?: Record<string, unknown>[] };
    setSubscriptions(data.subscriptions ?? []);
  }, []);

  const loadCoupons = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
    if (!res.ok) await parseApiError(res, "Failed to load coupons");
    const data = (await res.json()) as { coupons?: Record<string, unknown>[] };
    setCoupons(data.coupons ?? []);
  }, []);

  const loadSupport = useCallback(async () => {
    const res = await fetch("/api/admin/support");
    if (!res.ok) await parseApiError(res, "Failed to load support");
    const data = (await res.json()) as { tickets?: Record<string, unknown>[] };
    setTickets(data.tickets ?? []);
  }, []);

  const loadHealth = useCallback(async () => {
    const res = await fetch("/api/admin/health");
    if (!res.ok) await parseApiError(res, "Failed to load health");
    setHealth(await res.json());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "overview") await loadStats();
      if (tab === "users") await loadUsers(search);
      if (tab === "subscriptions") await loadSubscriptions();
      if (tab === "coupons") await loadCoupons();
      if (tab === "support") await loadSupport();
      if (tab === "health") await loadHealth();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [tab, search, loadStats, loadUsers, loadSubscriptions, loadCoupons, loadSupport, loadHealth]);

  useEffect(() => {
    void refresh();
  }, [tab, refresh]);

  const applyPlan = async (userId: string) => {
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, planId: planPatch.planId, status: planPatch.status, resetAi: true }),
    });
    if (!res.ok) {
      setError("Plan update failed");
      return;
    }
    setSelectedUser(null);
    await loadUsers(search);
  };

  const createCoupon = async () => {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponForm.code,
        description: couponForm.description,
        planId: couponForm.planId,
        discountPercent: couponForm.discountPercent,
        maxUses: couponForm.maxUses,
      }),
    });
    if (!res.ok) {
      setError("Coupon create failed");
      return;
    }
    setCouponForm({ code: "", description: "", planId: "graduate", discountPercent: 20, maxUses: 100 });
    await loadCoupons();
  };

  const updateTicket = async (id: string, status: string) => {
    await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await loadSupport();
  };

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Admin Console"
        description={`Quantum Regal · Regal Student Companion · signed in as ${adminEmail}`}
        action={
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
              tab === t.id
                ? "bg-regal-purple-500/25 border-regal-purple-400/40 text-white"
                : "border-white/10 text-muted hover:text-white"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-300 p-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</p>
      )}

      {tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Companion users" value={stats.stats.totalMembers} icon={Users} accent="purple" />
            <StatCard label="Active today" value={stats.stats.activeToday} icon={Activity} accent="emerald" />
            <StatCard label="Active (7d)" value={stats.stats.activeWeek} icon={Activity} accent="pink" />
            <StatCard label="Paid plans" value={stats.stats.paidPlans} icon={CreditCard} accent="amber" />
          </div>
          <Card className="p-4">
            <p className="text-sm font-semibold text-white mb-3">Activity (7 days)</p>
            <div className="flex items-end gap-1 h-24">
              {stats.activityByDay.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-regal-purple-500/40 rounded-t"
                    style={{ height: `${Math.max(8, Math.min(100, d.count * 4))}%` }}
                  />
                  <span className="text-[9px] text-muted">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold text-white mb-3">Live activity feed</p>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/90">{a.label}</span>
                  <span className="text-xs text-muted shrink-0 ml-2">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => void loadUsers(search)}>Search</Button>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{u.display_name ?? "Student"}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                      <span className={cn("px-2 py-0.5 rounded-full border", u.isCompanionUser ? "border-emerald-500/30 text-emerald-300" : "border-white/10 text-muted")}>
                        {u.isCompanionUser ? "Companion active" : "Regal Mail only"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-white/10 text-muted">
                        {u.subscription?.plan_id ?? "scholar"} · {u.subscription?.status ?? "—"}
                      </span>
                      <span className="text-muted">{u.engagement_points} pts · {u.appMember?.activity_count ?? 0} actions</span>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedUser(u); setPlanPatch({ planId: u.subscription?.plan_id ?? "graduate", status: u.subscription?.status ?? "active" }); }}>
                    Manage plan
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="space-y-2">
          {subscriptions.map((s) => (
            <Card key={String(s.user_id)} className="p-4 flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p className="text-white font-medium">{String(s.user_id).slice(0, 8)}…</p>
                <p className="text-muted text-xs">Plan: {String(s.plan_id)} · {String(s.status)}</p>
              </div>
              <p className="text-muted text-xs">AI today: {String(s.ai_requests_today)}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "coupons" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="space-y-3">
            <p className="font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Create coupon</p>
            <Input placeholder="CODE" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
            <Input placeholder="Description" value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} />
            <Select value={couponForm.planId} onChange={(e) => setCouponForm({ ...couponForm, planId: e.target.value })}>
              <option value="graduate">Graduate</option>
              <option value="campus">Campus</option>
            </Select>
            <Button onClick={() => void createCoupon()} disabled={!couponForm.code.trim()}>Create</Button>
          </Card>
          <div className="space-y-2">
            {coupons.map((c) => (
              <Card key={String(c.id)} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-mono text-white">{String(c.code)}</p>
                  <p className="text-xs text-muted">{String(c.description ?? "")}</p>
                </div>
                <span className={cn("text-xs", c.active ? "text-emerald-300" : "text-red-300")}>
                  {c.active ? "Active" : "Inactive"} · {String(c.used_count)}/{c.max_uses ? String(c.max_uses) : "∞"}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "support" && (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={String(t.id)} className="p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <p className="font-medium text-white">{String(t.subject)}</p>
                <span className="text-xs text-muted capitalize">{String(t.status)} · {String(t.priority)}</span>
              </div>
              <p className="text-sm text-muted mb-3">{String(t.message)}</p>
              <div className="flex gap-2">
                {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                  <Button key={s} size="sm" variant="ghost" onClick={() => void updateTicket(String(t.id), s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
          {tickets.length === 0 && <p className="text-muted text-sm text-center py-8">No support tickets</p>}
        </div>
      )}

      {tab === "health" && health && (
        <div className="space-y-3">
          <Card className={cn("p-4 border", health.overall === "ok" ? "border-emerald-500/30" : "border-amber-500/30")}>
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4" /> System status: {health.overall.toUpperCase()}
            </p>
          </Card>
          {health.checks.map((c) => (
            <Card key={c.name} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white">{c.name}</p>
                <p className="text-xs text-muted">{c.detail}</p>
              </div>
              <span className={cn("text-xs font-bold uppercase", c.status === "ok" ? "text-emerald-300" : c.status === "warn" ? "text-amber-300" : "text-red-300")}>
                {c.status}
              </span>
            </Card>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-semibold text-white">Manual plan assignment</p>
                <p className="text-xs text-muted">{selectedUser.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Plan</Label>
                <Select value={planPatch.planId} onChange={(e) => setPlanPatch({ ...planPatch, planId: e.target.value })}>
                  <option value="scholar">Scholar (free)</option>
                  <option value="graduate">Graduate</option>
                  <option value="campus">Campus</option>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={planPatch.status} onChange={(e) => setPlanPatch({ ...planPatch, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="past_due">Past due</option>
                  <option value="trialing">Trialing</option>
                </Select>
              </div>
              <Button className="w-full gap-2" onClick={() => void applyPlan(selectedUser.id)}>
                <Check className="w-4 h-4" /> Apply plan & reset AI quota
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
