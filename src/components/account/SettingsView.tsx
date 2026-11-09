"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { NotificationPreferences } from "./NotificationPreferences";

/** Account settings: who you're signed in as, what you're told about, and sign out. */
export function SettingsView() {
  const client = supabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  if (!client || session === undefined) return <p className="lede">Loading…</p>;
  if (!session) {
    return (
      <p className="lede">
        Please <Link href="/account">sign in</Link> to see your settings.
      </p>
    );
  }
  return (
    <div className="acct">
      <div className="dash-page__head">
        <Link href="/account" className="linkbtn">← Back to your websites</Link>
        <h1 className="dash-title">Settings</h1>
        <p className="dash-lede">Signed in as {session.user.email}</p>
      </div>
      <NotificationPreferences client={client} userId={session.user.id} />
      <div>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
