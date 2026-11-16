/**
 * One customer, put together from everything we hold under their email: enquiries, website builds and subscriptions.
 * There is no customers table: the email is what ties a person's records together everywhere else in the system, so
 * the directory is built from it. Pure, so it is tested without a database.
 */
export type SubRow = {
  id: string;
  reference: string;
  kind: "subscription" | "one_off";
  status: string;
  name: string;
  business_name: string | null;
  email: string;
  package_code?: string | null;
  package_name: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  payments_count: number;
  cancel_at_period_end: boolean;
  livemode: boolean | null;
  current_period_end?: string | null;
  first_payment_at?: string | null;
  last_payment_at?: string | null;
  launched_at?: string | null;
  created_at: string;
};
export type BriefRow = { id: string; reference: string; email: string; name: string | null; business_name: string | null; stage: string; route?: string | null; created_at: string; updated_at?: string | null };
export type EnquiryRow = { id: string; reference: string; kind: string; name: string; email: string; company?: string | null; topic: string | null; created_at: string };

export type CustomerState = "overdue" | "active" | "ending" | "awaiting_payment" | "lead" | "ended";
export const STATE_LABEL: Record<CustomerState, string> = {
  overdue: "Payment overdue",
  active: "Active",
  ending: "Ending",
  awaiting_payment: "Waiting for payment",
  lead: "Enquiry",
  ended: "Ended",
};

export type Customer = {
  email: string;
  name: string;
  business: string;
  state: CustomerState;
  /** What they pay each month across running plans, in pence. */
  monthlyPence: number;
  /** The earliest date we heard from them. */
  since: string;
  /** The latest thing that happened on any of their records. */
  lastActivity: string;
  subscriptions: SubRow[];
  briefs: BriefRow[];
  enquiries: EnquiryRow[];
};

const running = (s: SubRow) => s.kind === "subscription" && (s.status === "active" || s.status === "past_due");
/** Test-mode payments are never real customers' money, so they never count towards a figure. */
const real = (s: SubRow) => s.livemode !== false;

function stateOf(subs: SubRow[]): CustomerState {
  const live = subs.filter(real);
  if (live.some((s) => s.status === "past_due")) return "overdue";
  const run = live.filter(running);
  if (run.length > 0) return run.every((s) => s.cancel_at_period_end) ? "ending" : "active";
  if (live.some((s) => s.status === "paid")) return "active";
  if (live.some((s) => s.status === "offered")) return "awaiting_payment";
  if (live.some((s) => s.status === "cancelled")) return "ended";
  return "lead";
}

const key = (email: string) => email.trim().toLowerCase();
const latest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? "";
const earliest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort()[0] ?? "";

export function buildCustomers(subs: SubRow[], briefs: BriefRow[], enquiries: EnquiryRow[]): Customer[] {
  const map = new Map<string, { subs: SubRow[]; briefs: BriefRow[]; enquiries: EnquiryRow[] }>();
  const slot = (email: string) => {
    const k = key(email);
    if (!map.has(k)) map.set(k, { subs: [], briefs: [], enquiries: [] });
    return map.get(k)!;
  };
  for (const s of subs) if (s.email?.trim()) slot(s.email).subs.push(s);
  for (const b of briefs) if (b.email?.trim()) slot(b.email).briefs.push(b);
  for (const e of enquiries) if (e.email?.trim()) slot(e.email).enquiries.push(e);

  const out: Customer[] = [];
  for (const [email, r] of map) {
    const newestSub = [...r.subs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const newestBrief = [...r.briefs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const newestEnquiry = [...r.enquiries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const name = newestSub?.name || newestBrief?.name || newestEnquiry?.name || "";
    const business = newestSub?.business_name || newestBrief?.business_name || newestEnquiry?.company || "";
    out.push({
      email,
      name: name.trim(),
      business: business.trim(),
      state: stateOf(r.subs),
      monthlyPence: r.subs.filter(real).filter(running).reduce((sum, s) => sum + s.monthly_pence, 0),
      since: earliest([...r.subs.map((s) => s.created_at), ...r.briefs.map((b) => b.created_at), ...r.enquiries.map((e) => e.created_at)]),
      lastActivity: latest([
        ...r.subs.flatMap((s) => [s.created_at, s.last_payment_at]),
        ...r.briefs.flatMap((b) => [b.created_at, b.updated_at]),
        ...r.enquiries.map((e) => e.created_at),
      ]),
      subscriptions: r.subs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      briefs: r.briefs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      enquiries: r.enquiries.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    });
  }
  return out;
}

export type CustomerFilter = "all" | CustomerState;
export type CustomerSort = "recent" | "name" | "monthly";

/** The directory as shown: filtered by state, matched against a search, and sorted. */
export function viewCustomers(all: Customer[], opts: { filter: CustomerFilter; search: string; sort: CustomerSort }): Customer[] {
  const q = opts.search.trim().toLowerCase();
  const hit = (c: Customer) =>
    !q ||
    c.email.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.business.toLowerCase().includes(q) ||
    c.subscriptions.some((s) => s.reference.toLowerCase().includes(q)) ||
    c.briefs.some((b) => b.reference.toLowerCase().includes(q)) ||
    c.enquiries.some((e) => e.reference.toLowerCase().includes(q));
  const rows = all.filter((c) => (opts.filter === "all" || c.state === opts.filter) && hit(c));
  const label = (c: Customer) => (c.business || c.name || c.email).toLowerCase();
  return rows.sort((a, b) =>
    opts.sort === "name" ? label(a).localeCompare(label(b)) : opts.sort === "monthly" ? b.monthlyPence - a.monthlyPence || label(a).localeCompare(label(b)) : b.lastActivity.localeCompare(a.lastActivity),
  );
}

export type TimelineItem = { at: string; title: string; detail: string };

/** Everything that has happened with a customer, newest first, from the records we already keep. */
export function customerTimeline(
  c: Customer,
  extra: { payments?: { subscription_id: string; amount_pence: number; paid_at: string }[]; events?: { subscription_id: string; kind: string; reason: string; created_at: string }[]; eventLabel?: (kind: string) => string } = {},
): TimelineItem[] {
  const pounds = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
  const refOf = (id: string) => c.subscriptions.find((s) => s.id === id)?.reference ?? "";
  const items: TimelineItem[] = [
    ...c.enquiries.map((e) => ({ at: e.created_at, title: e.kind === "contact" ? "Sent a message" : "Asked for a website", detail: [e.reference, e.topic].filter(Boolean).join(" · ") })),
    ...c.briefs.map((b) => ({ at: b.created_at, title: "Website started", detail: [b.business_name, b.reference].filter(Boolean).join(" · ") })),
    ...c.subscriptions.map((s) => ({ at: s.created_at, title: "Payment link created", detail: `${s.package_name} · ${s.reference}` })),
    ...c.subscriptions.filter((s) => s.first_payment_at).map((s) => ({ at: s.first_payment_at as string, title: "Plan started", detail: `${s.package_name} · ${s.reference}` })),
    ...c.subscriptions.filter((s) => s.launched_at).map((s) => ({ at: s.launched_at as string, title: "Website launched", detail: s.reference })),
    ...(extra.payments ?? []).map((p) => ({ at: p.paid_at, title: `Paid ${pounds(p.amount_pence)}`, detail: refOf(p.subscription_id) })),
    ...(extra.events ?? []).map((e) => ({ at: e.created_at, title: extra.eventLabel ? extra.eventLabel(e.kind) : e.kind, detail: [refOf(e.subscription_id), e.reason].filter(Boolean).join(" · ") })),
  ];
  return items.filter((i) => i.at).sort((a, b) => b.at.localeCompare(a.at));
}
