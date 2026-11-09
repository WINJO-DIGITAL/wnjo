"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/lib/build-journey";
import { REVISION_LIMITS, REVISION_ROUNDS_INCLUDED, REVISION_STATUSES, isUnfinished, type RevisionRow } from "@/lib/build-revisions";
import { Confirmation } from "./Confirmation";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * The customer's feedback on their website: ask for changes, approve the preview, and see every change asked for
 * with where it has got to. Approving the preview sends it on for our own checks; it never makes anything public.
 */
export function FeedbackCard({
  client,
  briefId,
  stage,
  revisions,
  onChanged,
}: {
  client: SupabaseClient;
  briefId: string;
  stage: Stage;
  revisions: RevisionRow[];
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [approved, setApproved] = useState(false);

  const canAsk = stage === "preview" || stage === "changes";
  const unfinished = revisions.filter((r) => isUnfinished(r.status)).length;
  const roundsLeft = Math.max(0, REVISION_ROUNDS_INCLUDED - revisions.length);
  if (!canAsk && revisions.length === 0 && !approved) return null;

  const send = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ briefId, ...payload }),
        }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { error?: string; number?: number } | null;
    setBusy(false);
    if (!res?.ok) {
      setError(json?.error && json.error !== "not_found" ? json.error : "That didn't go through. Please try again.");
      return null;
    }
    return json ?? {};
  };

  const requestChanges = async () => {
    const json = await send({ action: "request_changes", text });
    if (!json) return;
    setText("");
    setSent(json.number ?? null);
    onChanged();
  };

  const approve = async () => {
    const json = await send({ action: "approve_preview" });
    setConfirming(false);
    if (!json) return;
    setApproved(true);
    onChanged();
  };

  return (
    <div className="build-offer build-feedback">
      <p className="build-card__meta">Your feedback</p>

      {approved && <Confirmation title="Preview approved. We'll run our final checks and be in touch." />}

      {canAsk && !approved && (
        <>
          <p>
            {stage === "preview"
              ? "Look through your preview. Ask for changes, or approve it to send it for our final checks."
              : "We're making the changes you asked for. You can add more below."}
          </p>
          <p className="build-card__meta">
            {roundsLeft > 0
              ? `${roundsLeft} of ${REVISION_ROUNDS_INCLUDED} ${roundsLeft === 1 ? "round" : "rounds"} of changes left`
              : "You've used your included changes. Contact us if you'd like more."}
          </p>
          <label htmlFor={`feedback-${briefId}`} className="acct-label">
            What would you like changed?
          </label>
          <textarea
            id={`feedback-${briefId}`}
            className="acct-input"
            rows={3}
            maxLength={REVISION_LIMITS.text}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSent(null);
            }}
          />
          {sent !== null && (
            <p role="status" className="acct-meta">
              Change {sent} sent. We&apos;ll update you here.
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={busy || text.trim().length < REVISION_LIMITS.minText} onClick={() => void requestChanges()}>
              {busy && !confirming ? "Sending…" : "Send changes"}
            </button>
            {stage === "preview" && unfinished === 0 && !confirming && (
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setConfirming(true)}>
                Approve this preview
              </button>
            )}
          </div>
          {confirming && (
            <div className="build-feedback__confirm">
              <p className="fine">Approving sends your website for our final checks. Nothing goes public until we&apos;ve approved it too.</p>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void approve()}>
                  {busy ? "Sending…" : "Yes, approve"}
                </button>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {revisions.length > 0 && (
        <ol className="build-revisions" role="list" aria-label="Changes you've asked for">
          {[...revisions].sort((a, b) => b.number - a.number).map((r) => (
            <li key={r.id}>
              <p className="build-revision__head">
                <strong>Change {r.number}</strong>
                <span className={`build-revision__status is-${r.status}`}>{REVISION_STATUSES[r.status]}</span>
                <span className="acct-meta">{day.format(new Date(r.created_at))}</span>
              </p>
              <p className="build-revision__text">{r.request}</p>
              {r.response && (
                <p className="build-revision__reply">
                  <span className="acct-label">Our reply</span> {r.response}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
