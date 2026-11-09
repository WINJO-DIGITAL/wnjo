"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Item = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** A bell in the header. The count shows what's unread; the list opens beneath it. Settings live on their own page. */
export function NotificationsBell() {
  const client = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const load = useCallback(() => {
    if (!client) return;
    client
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error) setItems((data as Item[]) ?? []);
      });
  }, [client]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

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
  const unread = items.filter((i) => !i.read_at).length;

  const markRead = async (id: string) => {
    await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
    load();
  };
  const markAll = async () => {
    await client.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    load();
  };

  return (
    <div className="bell" ref={wrapRef}>
      <button
        type="button"
        className="bell__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unread > 0 && <span className="bell__count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell__panel">
          <div className="bell__head">
            <p>Notifications</p>
            {unread > 0 && (
              <button type="button" className="linkbtn" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="bell__empty">You&apos;re all caught up.</p>
          ) : (
            <ul className="bell__list">
              {items.map((n) => (
                <li key={n.id} className={n.read_at ? undefined : "is-unread"}>
                  {n.link ? (
                    <a href={n.link} onClick={() => markRead(n.id)}>{n.title}</a>
                  ) : (
                    <button type="button" className="bell__item" onClick={() => markRead(n.id)}>{n.title}</button>
                  )}
                  <span>{n.body}</span>
                  <time>{when.format(new Date(n.created_at))}</time>
                </li>
              ))}
            </ul>
          )}
          <Link href="/account/settings" className="bell__foot" onClick={() => setOpen(false)}>
            Notification settings
          </Link>
        </div>
      )}
    </div>
  );
}
