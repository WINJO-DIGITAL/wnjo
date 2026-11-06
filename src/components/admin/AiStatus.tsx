"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only view of the AI workforce: agents and their switches, recent tasks, and budgets. There are no
 * controls here yet; switching agents on and changing budgets comes with the approval screens.
 */

type Agent = { agent_key: string; name: string; enabled: boolean; paused: boolean };
type Task = { id: string; agent_key: string; title: string; status: string; spent_pence: number; created_at: string };
type Budget = { scope: string; scope_id: string | null; monthly_limit_pence: number; warn_at_pence: number };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function AiStatus({ client }: { client: SupabaseClient }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [error, setError] = useState(false);

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
