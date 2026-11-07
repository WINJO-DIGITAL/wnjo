"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextBriefingAt, type Briefing } from "@/lib/briefing";

/**
 * The AI workforce: agents and their switches, recent tasks, budgets, and the approval queue. Owners and admins
 * can approve or reject high-risk actions; staff can see them but not decide. Switching agents on and changing
 * budgets still have no controls.
 */

type Agent = { agent_key: string; name: string; enabled: boolean; paused: boolean };
type Task = { id: string; agent_key: string; title: string; status: string; spent_pence: number; created_at: string };
type Budget = { scope: string; scope_id: string | null; monthly_limit_pence: number; warn_at_pence: number };
type ReportRow = { report_date: string; body: Briefing; generated_at: string };
type Approval = { id: string; task_id: string; tool: string; reason: string; arguments: Record<string, unknown>; created_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function AiStatus({ client }: { client: SupabaseClient }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [error, setError] = useState(false);
  const [briefing, setBriefing] = useState<ReportRow | null | "loading">("loading");
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [decisionNote, setDecisionNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadApprovals = () =>
    client
      .from("ai_approvals")
      .select("id, task_id, tool, reason, arguments, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => setApprovals(error ? null : ((data as Approval[]) ?? [])));

  useEffect(() => {
    loadApprovals();
    client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await client
        .from("tenant_members")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["owner", "admin"]);
      setCanDecide(Boolean(roles && roles.length > 0));
    });
    // loadApprovals is stable for this client; reload when the client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const decide = async (approval: Approval, decision: "approve" | "reject") => {
    setBusy(approval.id);
    setDecisionNote(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch(`/api/admin/approvals/${approval.id}`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ decision }),
        })
      : null;
    setBusy(null);
    if (res?.ok) {
      setDecisionNote(decision === "approve" ? `Approved ${approval.tool}. The task will run again shortly.` : `Rejected ${approval.tool}. The task has stopped.`);
      loadApprovals();
    } else if (res?.status === 409) {
      setDecisionNote("That request was already decided.");
      loadApprovals();
    } else {
      setDecisionNote("The decision couldn't be saved. Please try again.");
    }
  };

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

      <h3 className="acct-label">Waiting for approval</h3>
      {approvals === null && <p role="alert">The approval queue couldn&apos;t be loaded.</p>}
      {approvals && approvals.length === 0 && <p className="acct-meta">Nothing is waiting for an owner.</p>}
      {decisionNote && <p role="status" className="acct-meta">{decisionNote}</p>}
      {approvals && approvals.length > 0 && (
        <ul className="admin-list" aria-label="Approvals waiting">
          {approvals.map((a) => (
            <li key={a.id} className="admin-row-static">
              <span>
                {a.tool}
                <span className="acct-meta"> · {a.reason}</span>
              </span>
              <span className="acct-meta">{when.format(new Date(a.created_at))}</span>
              {canDecide && (
                <span className="admin-actions">
                  <button type="button" className="btn btn--primary" disabled={busy === a.id} onClick={() => decide(a, "approve")}>Approve</button>
                  <button type="button" className="btn btn--secondary" disabled={busy === a.id} onClick={() => decide(a, "reject")}>Reject</button>
                </span>
              )}
            </li>
          ))}
        </ul>
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
