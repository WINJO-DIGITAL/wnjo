"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextBriefingAt, type Briefing } from "@/lib/briefing";

/**
 * Read-only view of the AI workforce: agents and their switches, recent tasks, and budgets. There are no
 * controls here yet; switching agents on and changing budgets comes with the approval screens.
 */

type Agent = { agent_key: string; name: string; enabled: boolean; paused: boolean };
type Task = { id: string; agent_key: string; title: string; status: string; spent_pence: number; created_at: string };
type Budget = { scope: string; scope_id: string | null; monthly_limit_pence: number; warn_at_pence: number };
type ReportRow = { report_date: string; body: Briefing; generated_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function AiStatus({ client }: { client: SupabaseClient }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [error, setError] = useState(false);
  const [briefing, setBriefing] = useState<ReportRow | null | "loading">("loading");

  useEffect(() => {
    client
      .from("ai_reports")
      .select("report_date, body, generated_at")
      .eq("kind", "morning_briefing")
      .order("report_date", { ascending: false })
      .limit(1)
      .then(({ data }) => setBriefing(((data as ReportRow[]) ?? [])[0] ?? null));
  }, [client]);

  useEffect(() => {
    Promise.all([
      client.from("ai_agents").select("agent_key, name, enabled, paused").order("agent_key"),
      client.from("ai_tasks").select("id, agent_key, title, status, spent_pence, created_at").order("created_at", { ascending: false }).limit(20),
      client.from("ai_budget_settings").select("scope, scope_id, monthly_limit_pence, warn_at_pence"),
    ]).then(([a, t, b]) => {
      setError(Boolean(a.error || t.error || b.error));
      setAgents(a.error ? null : ((a.data as Agent[]) ?? []));
      setTasks(t.error ? null : ((t.data as Task[]) ?? []));
      setBudgets(b.error ? null : ((b.data as Budget[]) ?? []));
    });
  }, [client]);

  if (error) return <p role="alert">The AI status couldn&apos;t be loaded.</p>;
  if (!agents || !tasks || !budgets) return <p className="lede">Loading…</p>;

  const global = budgets.find((b) => b.scope === "global");
  return (
    <div className="admin-stack">
      <p className="acct-meta">Read-only. Agents are switched off, and the global budget is {global ? pounds(global.monthly_limit_pence) : "not set"} a month.</p>

      <h3 className="acct-label">Morning briefing</h3>
      {briefing === "loading" && <p className="acct-meta">Loading the briefing…</p>}
      {briefing === null && (
        <p className="acct-meta">No briefing yet. The next one is due at 07:30 London time, {when.format(nextBriefingAt(new Date()))}.</p>
      )}
      {briefing && briefing !== "loading" && (
        <div className="admin-stack">
          <p className="acct-meta">For {briefing.report_date}. Facts first, then suggestions.</p>
          <ul className="admin-list" aria-label="Facts">
            {briefing.body.facts.map((f, i) => <li key={`f${i}`} className="admin-row-static">{f.text}</li>)}
          </ul>
          <h4 className="acct-label">Suggested priorities</h4>
          <ul className="admin-list" aria-label="Recommendations">
            {briefing.body.recommendations.length === 0 && <li className="acct-meta">Nothing needs action today.</li>}
            {briefing.body.recommendations.map((r, i) => <li key={`r${i}`} className="admin-row-static">{r.text}</li>)}
          </ul>
        </div>
      )}

      <h3 className="acct-label">Agents</h3>
      <ul className="admin-list">
        {agents.map((a) => (
          <li key={a.agent_key} className="admin-row-static">
            <span>{a.name}</span>
            <span className="acct-meta">{!a.enabled ? "Off" : a.paused ? "Paused" : "On"}</span>
          </li>
        ))}
      </ul>

      <h3 className="acct-label">Recent tasks</h3>
      {tasks.length === 0 && <p className="acct-meta">No tasks yet.</p>}
      <ul className="admin-list">
        {tasks.map((t) => (
          <li key={t.id} className="admin-row-static">
            <span>{t.title}</span>
            <span className="acct-meta">{t.agent_key} · {t.status} · {pounds(t.spent_pence)} · {when.format(new Date(t.created_at))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
