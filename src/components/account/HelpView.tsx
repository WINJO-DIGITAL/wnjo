"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { planInfo } from "@/lib/portal/plan-info";
import { contactPhoneHref } from "@/lib/site";
import { Confirmation } from "./Confirmation";

type PlanRow = { reference: string; status: string; package_code: string | null; package_name: string; business_name: string | null };
type Website = { reference: string; business_name: string | null };

/** The three things a customer comes for. The label opens the message, so we know what it is about before reading. */
const ASKS = [
  { id: "change", label: "Change something", prompt: "What would you like changed, and where on the website?", opens: "Change to my website" },
  { id: "fault", label: "Something isn't working", prompt: "What's going wrong, and on which page? We look at faults first.", opens: "Something isn't working on my website" },
  { id: "billing", label: "Billing or my plan", prompt: "What would you like to know or change? A payment, an invoice, a new payment link, another plan.", opens: "A question about my plan or billing" },
] as const;
type AskId = (typeof ASKS)[number]["id"];

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 4000;

/**
 * Help for a signed-in customer. They say what it's about, write a message and send it without leaving their account:
 * it reaches us with their name, email and reference already attached. It shows how quickly we reply on their plan.
 */
export function HelpView() {
  const client = supabase();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sites, setSites] = useState<Website[]>([]);
  const [name, setName] = useState("");
  const [ask, setAsk] = useState<AskId>("change");
  const [about, setAbout] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  // When the form was first shown, for the same too-fast-to-be-a-person check the public contact form has.
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    if (!client) return;
    let cancelled = false;
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.session?.user.email ?? null);
      if (!data.session) return;
      // What the message can be about: their websites and their plans. Either may be empty.
      void Promise.all([
        client.rpc("my_plans"),
        client.from("website_briefs").select("reference, name, business_name").order("created_at", { ascending: false }),
      ]).then(([p, b]) => {
        if (cancelled) return;
        const planRows = ((p.data as PlanRow[] | null) ?? []).filter((r) => r.status === "active" || r.status === "past_due");
        const briefRows = (b.data as (Website & { name: string | null })[] | null) ?? [];
        setPlans(planRows);
        setSites(briefRows);
        setName((n) => n || briefRows.find((r) => r.name?.trim())?.name?.trim() || "");
        const wanted = new URLSearchParams(window.location.search).get("about");
        const known = [...briefRows.map((r) => r.reference), ...planRows.map((r) => r.reference)];
        setAbout(wanted && known.includes(wanted) ? wanted : known[0] ?? "");
      });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const plan = plans[0] ?? null;
  const info = plan ? planInfo(plan.package_code, plan.package_name) : null;
  // Everything the message could be about, each reference once.
  const subjects = [
    ...sites.map((s) => ({ reference: s.reference, label: `${s.business_name || "Your website"} (${s.reference})` })),
    ...plans.filter((p) => !sites.some((s) => s.reference === p.reference)).map((p) => ({ reference: p.reference, label: `${planInfo(p.package_code, p.package_name).name} plan (${p.reference})` })),
  ];
  const current = ASKS.find((a) => a.id === ask)!;

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (name.trim().length < 2) return setProblem("Please tell us your name.");
    if (text.length < MESSAGE_MIN) return setProblem("Please tell us a little more, so we can help first time.");
    setProblem(null);
    setState("sending");
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email,
        topic: "other",
        message: `${current.opens}${about ? ` [${about}]` : ""}\n\n${text}`,
        website: "",
        startedAt: startedAt.current,
      }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { ok?: boolean; reference?: string } | null;
    if (res?.ok && json?.ok) {
      setState("idle");
      setMessage("");
      setSent(json.reference ?? "");
      return;
    }
    setState("error");
  };

  const reply = info?.replyWorkingDays ? (info.replyWorkingDays === 1 ? "within 1 working day" : `within ${info.replyWorkingDays} working days`) : "as soon as we can";

  return (
    <div className="acct help">
      <div className="dash-page__head">
        <h1 className="dash-title">How can we help?</h1>
        <p className="dash-lede">{info?.replyWorkingDays ? `On ${info.name}, we reply ${reply}.` : "Send us a message and we'll reply by email."}</p>
      </div>

      {email === undefined ? (
        <p className="lede">Loading…</p>
      ) : email === null ? (
        <p className="lede">
          Please <Link href="/account">sign in</Link> to message us from your account, or use the <Link href="/contact">contact page</Link>.
        </p>
      ) : sent !== null ? (
        <div className="help-sent">
          <Confirmation
            title="Your message is with us."
            detail={sent ? `Your reference is ${sent}.` : undefined}
            nextStep={`We'll reply to ${email} ${reply}.`}
          />
          <button type="button" className="btn btn--secondary" onClick={() => setSent(null)}>
            Send another message
          </button>
        </div>
      ) : (
        <form className="help-form" onSubmit={send} noValidate>
          <fieldset className="help-form__group">
            <legend className="help-form__label">What is it about?</legend>
            <div className="seg">
              {ASKS.map((a) => (
                <button key={a.id} type="button" className="seg__item" aria-pressed={ask === a.id} onClick={() => setAsk(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          {subjects.length > 1 && (
            <div className="help-form__group">
              <label className="help-form__label" htmlFor="help-about">Which one?</label>
              <select id="help-about" className="acct-input" value={about} onChange={(e) => setAbout(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.reference} value={s.reference}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="help-form__group">
            <label className="help-form__label" htmlFor="help-message">Your message</label>
            <p id="help-message-hint" className="help-form__hint">{current.prompt}</p>
            <textarea
              id="help-message"
              className="acct-input help-form__text"
              rows={6}
              maxLength={MESSAGE_MAX}
              aria-describedby="help-message-hint"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setProblem(null);
              }}
            />
          </div>

          <div className="help-form__group">
            <label className="help-form__label" htmlFor="help-name">Your name</label>
            <input id="help-name" className="acct-input" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {problem && <p role="alert" className="acct-error">{problem}</p>}
          {state === "error" && (
            <p role="alert" className="acct-error">
              That didn&apos;t send. Please try again{contactPhoneHref ? <>, or <a href={contactPhoneHref}>call us</a></> : ""}.
            </p>
          )}
          <div className="help-form__send">
            <button type="submit" className="btn btn--primary" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send message"}
            </button>
            <p className="help-form__hint">We reply to {email}.</p>
          </div>
        </form>
      )}

      <div className="help-more">
        {info?.changes && (
          <p><strong>Changes on your plan.</strong> {info.changes}. Unused time doesn&apos;t carry over.</p>
        )}
        <p>
          <strong>Prefer to talk?</strong>{" "}
          {contactPhoneHref ? <a href={contactPhoneHref}>Call us</a> : <Link href="/contact">Use the contact page</Link>}, or find quick answers on the <Link href="/faq">questions page</Link>.
        </p>
      </div>
    </div>
  );
}
