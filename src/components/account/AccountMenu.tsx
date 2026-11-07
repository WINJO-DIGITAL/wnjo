"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * A signed-in person's own menu in the header: their orders and quotes, the staff admin if they are
 * staff, and sign out. Shown only when there is a session, alongside the normal site menu.
 */
export function AccountMenu() {
  const client = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) {
      return;
    }
    let cancelled = false;
    client
      .from("tenant_members")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!cancelled) setIsStaff(Boolean(data && data.length > 0));
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  // Close on a click outside the menu, or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!client || !session) return null;

  const email = session.user.email ?? "";
  const initial = (email.charAt(0) || "?").toUpperCase();

  return (
    <div className="account-menu" ref={wrapRef}>
      <button
        type="button"
        className="account-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-menu__avatar" aria-hidden="true">{initial}</span>
        <span className="account-menu__label">Your account</span>
      </button>
      {open && (
        <div className="account-menu__panel" role="menu">
          <p className="account-menu__who">{email}</p>
          <Link href="/account" role="menuitem" className="account-menu__item" onClick={() => setOpen(false)}>
            Your orders and quotes
          </Link>
          {isStaff && (
            <Link href="/admin" role="menuitem" className="account-menu__item" onClick={() => setOpen(false)}>
              Staff admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="account-menu__item account-menu__item--button"
            onClick={() => {
              setOpen(false);
              client.auth.signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
