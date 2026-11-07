"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Item = { id: string; kind: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };
type Pref = { kind: string; in_app: boolean; email: string | boolean };

/** The kinds a customer can choose for. Each one has its own in-app and email switch. */
const KINDS: Array<{ id: string; label: string }> = [
  { id: "progress", label: "Progress on your website" },
  { id: "message", label: "Messages from the team" },
  { id: "approval", label: "Approvals to review" },
  { id: "quote", label: "Quotes" },
];

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The customer's notices, newest first, with read state, and their choices for each kind. The server queues a notice
 * only when the customer has the in-app switch on, and emails only when the email switch is on.
 */
export function NotificationsPanel({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(20),
      client.from("notification_preferences").select("kind, in_app, email").eq("user_id", userId),
      client.from("organizations").select("tenant_id").limit(1),
    ]).then(([n, p, o]) => {
      if (cancelled) return;
      setError(n.error || p.error ? "Your notifications couldn't be loaded." : null);
      setItems(n.error ? null : ((n.data as Item[]) ?? []));
      setPrefs(p.error ? [] : ((p.data as Pref[]) ?? []));
      setTenantId(((o.data as Array<{ tenant_id: string }>) ?? [])[0]?.tenant_id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [client, userId, refresh]);

  const pref = (kind: string) => prefs.find((p) => p.kind === kind) ?? { kind, in_app: true, email: true };
  const isOn = (value: string | boolean) => value === true || value === "t";

  const setPref = async (kind: string, field: "in_app" | "email", value: boolean) => {
    if (!tenantId) return;
    const current = pref(kind);
    const next = { user_id: userId, tenant_id: tenantId, kind, in_app: current.in_app, email: isOn(current.email), [field]: value };
    const { error: err } = await client.from("notification_preferences").upsert(next, { onConflict: "user_id,tenant_id,kind" });
    if (err) setError("That choice couldn't be saved. Please try again.");
    else setRefresh((r) => r + 1);
  };

  const markRead = async (id: string) => {
    await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
    setRefresh((r) => r + 1);
  };

  const markAllRead = async () => {
    await client.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    setRefresh((r) => r + 1);
  };

  const unread = items?.filter((i) => !i.read_at).length ?? 0;

  return (
    <section id="notifications" className="acct-quotes" aria-labelledby="acct-notifications-title">
      <h2 id="acct-notifications-title" className="h2">Notifications</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p className="lede">Loading…</p>}
      {items && (
        <>
          <p className="acct-meta">
            {unread === 0 ? "Nothing new." : `${unread} new`}
            {unread > 0 && (
              <>
                {" · "}
                <button type="button" className="btn btn--secondary" onClick={markAllRead}>Mark all as read</button>
              </>
            )}
          </p>
          {items.length === 0 && <p className="acct-meta">No notifications yet.</p>}
          <ul className="admin-list">
            {items.map((n) => (
              <li key={n.id} className="admin-row-static">
                <span>
                  {!n.read_at && <strong>New · </strong>}
                  {n.link ? <a href={n.link} onClick={() => markRead(n.id)}>{n.title}</a> : n.title}
                  <span className="acct-meta"> · {n.body}</span>
                </span>
                <span className="acct-meta">{when.format(new Date(n.created_at))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="acct-label">What to tell me about</h3>
      {!tenantId && <p className="acct-meta">Choices appear once your account is linked to an order or project.</p>}
      {tenantId && (
        <ul className="admin-list">
          {KINDS.map((k) => {
            const p = pref(k.id);
            return (
              <li key={k.id} className="admin-row-static">
                <span>{k.label}</span>
                <span className="admin-actions">
                  <label className="acct-meta">
                    <input type="checkbox" checked={p.in_app} onChange={(e) => setPref(k.id, "in_app", e.target.checked)} /> On the site
                  </label>
                  <label className="acct-meta">
                    <input type="checkbox" checked={isOn(p.email)} onChange={(e) => setPref(k.id, "email", e.target.checked)} /> By email
                  </label>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
