"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Whether someone is signed in, for the menus. `known` is false until the browser has checked, so nothing is shown in
 * the meantime rather than the wrong label. Signing in or out elsewhere updates it straight away.
 */
export function useCustomerSession(): { known: boolean; email: string | null; signOut: () => void } {
  const client = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

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
    signOut: () => {
      void client?.auth.signOut();
    },
  };
}
