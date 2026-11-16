"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { planInfo } from "@/lib/portal/plan-info";
import { contactPhoneHref } from "@/lib/site";

type PlanRow = { reference: string; status: string; package_code: string | null; package_name: string };

/** Each thing a customer comes for, with the message it starts. The reference goes with it, so we know who is asking. */
const ASKS: { title: string; body: string; start: string; action: string }[] = [
  { title: "Change something on your website", body: "New wording, a photo, opening hours, a new page. Tell us what and where.", start: "Please change this on my website", action: "Ask for a change" },
  { title: "Something isn't working", body: "A broken page, a form that won't send, anything that looks wrong. We look at faults first.", start: "Something isn't working on my website", action: "Report a problem" },
  { title: "Billing or your plan", body: "A payment, an invoice, a new payment link, or moving to another plan.", start: "A question about my plan or billing", action: "Ask about billing" },
];

/**
 * Help for a signed-in customer: the three things people ask for, how quickly we reply on their plan, and how to
 * reach a person. It works signed out too, without the plan's own reply time.
 */
export function HelpView() {
  const client = supabase();
  const [plan, setPlan] = useState<PlanRow | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client.auth.getSession().then(({ data }) => {
      if (!data.session || cancelled) return;
      client.rpc("my_plans").then(({ data: rows }) => {
        if (cancelled) return;
        const all = (rows as PlanRow[] | null) ?? [];
        setPlan(all.find((r) => r.status === "active" || r.status === "past_due") ?? null);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const info = plan ? planInfo(plan.package_code, plan.package_name) : null;
  const href = (start: string) => `/contact?brief=${encodeURIComponent(`${start}${plan ? ` (${plan.reference})` : ""}: `)}`;

  return (
    <div className="acct help">
      <div className="dash-page__head">
        <h1 className="dash-title">How can we help?</h1>
        {info?.replyWorkingDays && (
          <p className="dash-lede">
            On {info.name}, we reply within {info.replyWorkingDays === 1 ? "1 working day" : `${info.replyWorkingDays} working days`}.
          </p>
        )}
      </div>

      <ul className="help-asks">
        {ASKS.map((ask) => (
          <li key={ask.title}>
            <div>
              <h2 className="help-asks__title">{ask.title}</h2>
              <p className="help-asks__body">{ask.body}</p>
            </div>
            <Link href={href(ask.start)} className="btn btn--secondary">{ask.action}</Link>
          </li>
        ))}
      </ul>

      <div className="help-more">
        {info?.changes && (
          <p><strong>Changes on your plan.</strong> {info.changes}. Unused time doesn&apos;t carry over.</p>
        )}
        <p>
          <strong>Prefer to talk?</strong>{" "}
          {contactPhoneHref ? <a href={contactPhoneHref}>Call us</a> : <Link href="/contact">Message us</Link>}, or find quick answers in the <Link href="/faq">questions page</Link>.
        </p>
      </div>
    </div>
  );
}
