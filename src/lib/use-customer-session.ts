"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Whether someone is signed in, for the menus. `known` is false until the browser has checked, so nothing is shown in
 * the meantime rather than the wrong label. Signing in or out elsewhere updates it straight away.
 */
export function useCustomerSession(): { known: boolean; email: string | null; staff: boolean; signOut: () => void } {
  const client = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  // The person this check was made for, so a change of sign-in never shows the last person's answer.
  const [staffOf, setStaffOf] = useState<string | null>(null);

  // Staff are told apart once per session, from their agency membership, so the header can send them to the admin.
  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    const who = session.user.id;
    client
      .from("tenant_members")
      .select("role")
      .eq("user_id", who)
      .then(({ data }) => {
        if (!cancelled) setStaffOf(data && data.length > 0 ? who : null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  return {
    // With no client (not configured), there is no one to check: treat it as signed out.
    known: checked || !client,
    email: session?.user.email ?? null,
    staff: Boolean(session && staffOf === session.user.id),
    signOut: () => {
      void client?.auth.signOut();
    },
  };
}
