"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Pref = { kind: string; in_app: boolean; email: string | boolean };

/** The kinds a customer can choose for. Each one has its own on-site and email switch. */
const KINDS: Array<{ id: string; label: string }> = [
  { id: "progress", label: "Progress on your website" },
  { id: "message", label: "Messages from the team" },
  { id: "approval", label: "Approvals to review" },
  { id: "quote", label: "Quotes" },
];

/** Choices for what to be told about. The server queues a notice only when the on-site switch is on, and emails only when the email switch is on. */
export function NotificationPreferences({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.from("notification_preferences").select("kind, in_app, email").eq("user_id", userId),
      client.from("organizations").select("tenant_id").limit(1),
    ]).then(([p, o]) => {
      if (cancelled) return;
      setError(p.error ? "Your choices couldn't be loaded." : null);
      setPrefs(p.error ? [] : ((p.data as Pref[]) ?? []));
      setTenantId(((o.data as Array<{ tenant_id: string }>) ?? [])[0]?.tenant_id ?? null);
      setLoaded(true);
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

  return (
    <section className="settings-card" aria-labelledby="notif-prefs-title">
      <h2 id="notif-prefs-title" className="settings-card__title">What to tell me about</h2>
      {error && <p role="alert">{error}</p>}
      {loaded && !tenantId && <p className="build-card__meta">Choices appear once your account is linked to a website.</p>}
      {tenantId && (
        <ul className="settings-list">
          {KINDS.map((k) => {
            const p = pref(k.id);
            return (
              <li key={k.id}>
                <span>{k.label}</span>
                <span className="settings-list__switches">
                  <label>
                    <input type="checkbox" checked={p.in_app} onChange={(e) => setPref(k.id, "in_app", e.target.checked)} /> On the site
                  </label>
                  <label>
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
