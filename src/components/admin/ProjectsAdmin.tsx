"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Confirmation } from "@/components/account/Confirmation";
import { ProjectFiles } from "@/components/files/ProjectFiles";
import { sendQueuedEmails } from "@/lib/notify-client";

/**
 * Staff project management. Every action is a plain database call that row-level security checks for the
 * signed-in agency member, so this screen can't do anything the database wouldn't allow.
 * Internal project status and priority are not shown here: they aren't readable through the API yet.
 */

type Project = { id: string; name: string; customer_status: string; target_date: string | null; organization_id: string | null };
type Conversation = { id: string; project_id: string; tenant_id: string; subject: string };
type Message = { id: string; body: string; sender_kind: string; is_internal: boolean; created_at: string };
type Approval = { id: string; title: string; kind: string; status: string; created_at: string };
type Revision = { id: string; body: string; status: "open" | "in_progress" | "done"; created_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ProjectsAdmin({ client, tenantId, userId }: { client: SupabaseClient; tenantId: string; userId: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    client
      .from("projects")
      .select("id, name, customer_status, target_date, organization_id")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setProjects(err ? null : ((data as Project[]) ?? []));
      });
  }, [client]);

  if (error) return <p role="alert">Projects couldn&apos;t be loaded.</p>;
  if (projects === null) return <p className="lede">Loading projects…</p>;
  if (projects.length === 0) return <p className="lede">No projects yet. Projects are created once a quote is accepted and paid.</p>;

  const project = projects.find((p) => p.id === openId);
  if (project) {
    return (
      <div className="admin-project">
        <button type="button" className="btn btn--secondary" onClick={() => setOpenId(null)}>Back to projects</button>
        <ProjectDetail client={client} tenantId={tenantId} userId={userId} project={project} onSaved={(next) => setProjects((list) => list?.map((p) => (p.id === next.id ? next : p)) ?? null)} />
      </div>
    );
  }
  return (
    <ul className="admin-list" aria-label="Projects">
      {projects.map((p) => (
        <li key={p.id}>
          <button type="button" className="admin-row" onClick={() => setOpenId(p.id)}>
            <span>{p.name}</span>
            <span className="acct-meta">{p.customer_status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProjectDetail({ client, tenantId, userId, project, onSaved }: { client: SupabaseClient; tenantId: string; userId: string; project: Project; onSaved: (p: Project) => void }) {
  const [status, setStatus] = useState(project.customer_status);
  const [target, setTarget] = useState(project.target_date ?? "");
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const update = { customer_status: status.trim(), target_date: target || null, updated_at: new Date().toISOString() };
    const { data, error } = await client.from("projects").update(update).eq("id", project.id).select("id, name, customer_status, target_date, organization_id").single();
    if (error || !data) {
      setMessage({ kind: "error", text: error?.message || "Couldn't save. Please try again." });
      return;
    }
    onSaved(data as Project);
    setMessage({ kind: "ok", text: "Saved. Clients see the updated status." });
  };

  return (
    <div className="admin-stack">
      <h2 className="h2">{project.name}</h2>
      <form onSubmit={save} className="acct-form" aria-label="Client-visible progress">
        <label htmlFor="proj-status" className="acct-label">Status shown to the client</label>
        <input id="proj-status" className="acct-input" value={status} maxLength={80} required onChange={(e) => setStatus(e.target.value)} />
        <label htmlFor="proj-target" className="acct-label">Target date</label>
        <input id="proj-target" type="date" className="acct-input" value={target} onChange={(e) => setTarget(e.target.value)} />
        <button type="submit" className="btn btn--primary">Save progress</button>
        {message && message.kind === "ok" && <Confirmation title={message.text} />}
        {message && message.kind === "error" && <p role="alert" className="acct-error">{message.text}</p>}
      </form>

      <Conversations client={client} tenantId={tenantId} userId={userId} projectId={project.id} />
      <Approvals client={client} tenantId={tenantId} projectId={project.id} />
      <Revisions client={client} projectId={project.id} />
      <ProjectFiles client={client} projectId={project.id} staff />
    </div>
  );
}

function Conversations({ client, tenantId, userId, projectId }: { client: SupabaseClient; tenantId: string; userId: string; projectId: string }) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [subject, setSubject] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.from("conversations").select("id, project_id, tenant_id, subject").eq("project_id", projectId).order("created_at").then(({ data, error: err }) => {
      setConversations(err ? null : ((data as Conversation[]) ?? []));
      if (err) setError("Conversations couldn't be loaded.");
    });
  }, [client, projectId, refresh]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const { error: err } = await client.from("conversations").insert({ tenant_id: tenantId, project_id: projectId, subject: subject.trim() });
    if (err) setError(err.message);
    else {
      setSubject("");
      setRefresh((r) => r + 1);
    }
  };

  return (
    <section className="admin-stack" aria-label="Conversations">
      <h3 className="acct-label">Conversations</h3>
      {conversations === null && !error && <p className="acct-meta">Loading conversations…</p>}
      {conversations?.map((c) => <Thread key={c.id} client={client} tenantId={tenantId} userId={userId} conversation={c} />)}
      <form onSubmit={create} className="acct-form" aria-label="New conversation">
        <label htmlFor="new-conv" className="acct-label">New conversation subject</label>
        <input id="new-conv" className="acct-input" value={subject} maxLength={160} required onChange={(e) => setSubject(e.target.value)} />
        <button type="submit" className="btn btn--secondary" disabled={subject.trim().length === 0}>Start conversation</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}

function Thread({ client, tenantId, userId, conversation }: { client: SupabaseClient; tenantId: string; userId: string; conversation: Conversation }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.from("messages").select("id, body, sender_kind, is_internal, created_at").eq("conversation_id", conversation.id).order("created_at").then(({ data, error: err }) => {
      if (err) setError("Messages couldn't be loaded.");
      else setMessages((data as Message[]) ?? []);
    });
  }, [client, conversation.id, refresh]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const { error: err } = await client.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      sender_user_id: userId,
      sender_kind: "staff",
      is_internal: internal,
      body: body.trim(),
    });
    if (err) setError(err.message);
    else {
      setBody("");
      setRefresh((r) => r + 1);
      if (!internal) void sendQueuedEmails(client);
    }
  };

  return (
    <div className="admin-thread">
      <h4 className="acct-label">{conversation.subject}</h4>
      <ol className="acct-messages" aria-label={`Messages: ${conversation.subject}`}>
        {messages.map((m) => (
          <li key={m.id} className={m.is_internal ? "acct-msg acct-msg--internal" : "acct-msg"}>
            <p className="acct-meta">{m.is_internal ? "Internal note" : m.sender_kind === "client" ? "Client" : "WNJO"} · {when.format(new Date(m.created_at))}</p>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="acct-form" aria-label={`Reply in ${conversation.subject}`}>
        <label htmlFor={`reply-${conversation.id}`} className="acct-label">Reply</label>
        <textarea id={`reply-${conversation.id}`} className="acct-input" rows={3} maxLength={5000} required value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="acct-meta"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (clients can&apos;t see this)</label>
        <button type="submit" className="btn btn--primary" disabled={body.trim().length === 0}>{internal ? "Save internal note" : "Send to client"}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  );
}

function Approvals({ client, tenantId, projectId }: { client: SupabaseClient; tenantId: string; projectId: string }) {
  const [items, setItems] = useState<Approval[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"milestone" | "deliverable" | "design">("design");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.from("approval_requests").select("id, title, kind, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).then(({ data, error: err }) => {
      if (err) setError("Approvals couldn't be loaded.");
      else setItems((data as Approval[]) ?? []);
    });
  }, [client, projectId, refresh]);

  const request = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const { error: err } = await client.from("approval_requests").insert({ tenant_id: tenantId, project_id: projectId, title: title.trim(), kind, status: "open" });
    if (err) setError(err.message);
    else {
      setTitle("");
      setRefresh((r) => r + 1);
      void sendQueuedEmails(client);
    }
  };

  return (
    <section className="admin-stack" aria-label="Approvals">
      <h3 className="acct-label">Approvals</h3>
      <ul className="admin-list">
        {items.map((a) => <li key={a.id} className="admin-row-static"><span>{a.title}</span><span className="acct-meta">{a.kind} · {a.status}</span></li>)}
      </ul>
      <form onSubmit={request} className="acct-form" aria-label="Request an approval">
        <label htmlFor="appr-title" className="acct-label">What needs approval?</label>
        <input id="appr-title" className="acct-input" value={title} maxLength={160} required onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="appr-kind" className="acct-label">Type</label>
        <select id="appr-kind" className="acct-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="design">Design</option>
          <option value="milestone">Milestone</option>
          <option value="deliverable">Deliverable</option>
        </select>
        <button type="submit" className="btn btn--primary" disabled={title.trim().length === 0}>Request approval</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}

function Revisions({ client, projectId }: { client: SupabaseClient; projectId: string }) {
  const [items, setItems] = useState<Revision[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.from("revision_requests").select("id, body, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).then(({ data, error: err }) => {
      if (err) setError("Revision requests couldn't be loaded.");
      else setItems((data as Revision[]) ?? []);
    });
  }, [client, projectId, refresh]);

  const setStatus = async (id: string, status: Revision["status"]) => {
    setError(null);
    const { error: err } = await client.from("revision_requests").update({ status }).eq("id", id);
    if (err) setError(err.message);
    else setRefresh((r) => r + 1);
  };

  return (
    <section className="admin-stack" aria-label="Revision requests">
      <h3 className="acct-label">Revision requests</h3>
      {items.length === 0 && <p className="acct-meta">No revision requests.</p>}
      {items.map((r) => (
        <div key={r.id} className="admin-row-static">
          <p>{r.body}</p>
          <label className="acct-meta">
            Status{" "}
            <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as Revision["status"])}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

