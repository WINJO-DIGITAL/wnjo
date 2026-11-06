"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Approval = {
  id: string;
  title: string;
  description: string;
  kind: "milestone" | "deliverable" | "design";
  status: "open" | "approved" | "changes_requested" | "withdrawn";
  decided_at: string | null;
};

const KIND: Record<Approval["kind"], string> = { milestone: "Milestone", deliverable: "Deliverable", design: "Design" };
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Approvals waiting on the client for one project, with approve and request-changes controls. */
export function ApprovalsPanel({ client, projectId }: { client: SupabaseClient; projectId: string }) {
  const [items, setItems] = useState<Approval[] | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    client
      .from("approval_requests")
      .select("id, title, description, kind, status, decided_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setItems(error ? [] : ((data as Approval[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client, projectId, refresh]);

  if (!items || items.length === 0) return null;
  return (
    <section className="acct-approvals" aria-label="Approvals">
      {items.map((item) => (
        <ApprovalCard key={item.id} client={client} item={item} onDecided={() => setRefresh((r) => r + 1)} />
      ))}
    </section>
  );
}

function ApprovalCard({ client, item, onDecided }: { client: SupabaseClient; item: Approval; onDecided: () => void }) {
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState<"idle" | "changes">("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const open = item.status === "open";

  const decide = async (decision: "approve" | "request_changes", event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await client.rpc("decide_approval", {
      p_request_id: item.id,
      p_decision: decision,
      p_comment: decision === "request_changes" ? comment : "",
    });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: error.message || "We couldn't record your decision. Please try again." });
      return;
    }
    setMessage({ kind: "ok", text: decision === "approve" ? "Approved. Thank you." : "Thanks. We'll make the changes and let you know." });
    onDecided();
  };

  const statusText = {
    open: "Waiting for your approval",
    approved: `Approved${item.decided_at ? ` on ${when.format(new Date(item.decided_at))}` : ""}`,
    changes_requested: "Changes requested",
    withdrawn: "Withdrawn",
  }[item.status];

  return (
    <article className="acct-approval" aria-labelledby={`approval-${item.id}`}>
      <p className="eyebrow">{KIND[item.kind]} · {statusText}</p>
      <h4 id={`approval-${item.id}`} className="acct-label">{item.title}</h4>
      {item.description && <p>{item.description}</p>}
      {open && mode === "idle" && (
        <div className="acct-bar">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => decide("approve")}>
            Approve
          </button>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setMode("changes")}>
            Request changes
          </button>
        </div>
      )}
      {open && mode === "changes" && (
        <form onSubmit={(e) => decide("request_changes", e)} className="acct-form" aria-label={`Request changes to ${item.title}`}>
          <label htmlFor={`changes-${item.id}`} className="acct-label">What would you like changed?</label>
          <textarea id={`changes-${item.id}`} className="acct-input" rows={3} maxLength={5000} required minLength={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="acct-bar">
            <button type="submit" className="btn btn--primary" disabled={busy || comment.trim().length < 3}>
              {busy ? "Sending…" : "Send request"}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setMode("idle")} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "acct-error" : undefined}>{message.text}</p>}
    </article>
  );
}
