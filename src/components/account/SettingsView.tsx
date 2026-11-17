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

  if (!client) return <p className="lede">Customer accounts aren&apos;t switched on yet. Please check back soon.</p>;
  if (session === undefined) return <p className="lede">Loading…</p>;
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
        <h1 className="dash-title">Settings</h1>
      </div>
      <section className="settings-block" aria-labelledby="settings-signin">
        <h2 id="settings-signin" className="settings-block__title">Signing in</h2>
        <dl className="settings-rows">
          <div><dt>Email</dt><dd>{session.user.email}</dd></div>
          <div><dt>How you sign in</dt><dd>A link we email you each time. There is no password to remember or lose.</dd></div>
        </dl>
        <p className="settings-block__note">
          To use a different email address, <Link href="/account/help">message us</Link> and we&apos;ll move your account across.
        </p>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </section>
      <NotificationPreferences client={client} userId={session.user.id} />
    </div>
  );
}
