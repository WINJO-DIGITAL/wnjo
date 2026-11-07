"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApprovalsPanel } from "./ApprovalsPanel";
import { sendQueuedEmails } from "@/lib/notify-client";

type Project = { id: string; tenant_id: string; name: string; customer_status: string; target_date: string | null };
type Conversation = { id: string; tenant_id: string; project_id: string; subject: string };
type Message = { id: string; body: string; sender_kind: "staff" | "client" | "system"; created_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * Projects the signed-in client can see, with their conversations. Clients only ever see customer-visible
 * messages: row-level security removes internal notes before they reach the browser.
 */
export function ProjectsPanel({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.from("projects").select("id, tenant_id, name, customer_status, target_date").order("created_at", { ascending: false }),
      client.from("conversations").select("id, tenant_id, project_id, subject").order("created_at", { ascending: true }),
    ]).then(([p, c]) => {
      if (cancelled) return;
      setError(Boolean(p.error || c.error));
      setProjects(p.error ? null : ((p.data as Project[]) ?? []));
      setConversations(c.error ? [] : ((c.data as Conversation[]) ?? []));
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (error) return <p role="alert">We couldn&apos;t load your projects. Please refresh the page.</p>;
  if (projects === null) return <p className="lede">Loading your projects…</p>;
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="acct-quotes" aria-labelledby="acct-projects-title">
      <h2 id="acct-projects-title" className="h2">Your projects</h2>
      {projects.map((project, index) => (
        <article key={project.id} className="acct-order" aria-labelledby={`project-${project.id}`}>
          <p className="eyebrow">{project.customer_status}</p>
          <h3 id={`project-${project.id}`} className="h2">{project.name}</h3>
          {project.target_date && <p className="acct-meta">Target: {day.format(new Date(project.target_date))}</p>}
          <div id={index === 0 ? "approvals" : undefined}>
            <ApprovalsPanel client={client} projectId={project.id} />
          </div>
          {conversations
            .filter((c) => c.project_id === project.id)
            .map((conversation) => (
              <Thread key={conversation.id} client={client} conversation={conversation} userId={userId} />
            ))}
        </article>
      ))}
    </section>
  );
}

function Thread({ client, conversation, userId }: { client: SupabaseClient; conversation: Conversation; userId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    client
      .from("messages")
      .select("id, body, sender_kind, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setMessages(error ? [] : ((data as Message[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client, conversation.id, refresh]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await client.from("messages").insert({
      tenant_id: conversation.tenant_id,
      conversation_id: conversation.id,
      sender_user_id: userId,
      sender_kind: "client",
      is_internal: false,
      body: body.trim(),
    });
    setBusy(false);
    if (error) {
      setStatus({ kind: "error", text: "Your message couldn't be sent. Please try again." });
      return;
    }
    void sendQueuedEmails(client);
    setBody("");
    setStatus({ kind: "ok", text: "Sent. We'll reply here." });
    setRefresh((r) => r + 1);
  };

  return (
    <div className="acct-thread">
      <h4 className="acct-label">{conversation.subject}</h4>
      {messages === null && <p className="acct-meta">Loading messages…</p>}
      {messages?.length === 0 && <p className="acct-meta">No messages yet.</p>}
      <ol className="acct-messages" aria-label={`Messages about ${conversation.subject}`}>
        {messages?.map((m) => (
          <li key={m.id} className={m.sender_kind === "client" ? "acct-msg acct-msg--client" : "acct-msg"}>
            <p className="acct-meta">
              {m.sender_kind === "client" ? "You" : m.sender_kind === "system" ? "WNJO update" : "WNJO"} · {when.format(new Date(m.created_at))}
            </p>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="acct-form" aria-label={`Message about ${conversation.subject}`}>
        <label htmlFor={`msg-${conversation.id}`} className="acct-label">Send a message</label>
        <textarea id={`msg-${conversation.id}`} className="acct-input" rows={3} maxLength={5000} required value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit" className="btn btn--primary" disabled={busy || body.trim().length === 0}>
          {busy ? "Sending…" : "Send"}
        </button>
        {status && <p role={status.kind === "error" ? "alert" : "status"}>{status.text}</p>}
      </form>
    </div>
  );
}
