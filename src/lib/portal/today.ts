/**
 * What the staff home shows first: the websites waiting for a person to make or change, and the messages waiting for
 * an answer. Pure, so the order and the wording are tested without a database.
 */

export type TodayBrief = {
  id: string;
  reference: string;
  name: string;
  business_name: string | null;
  route: "package" | "proposal";
  stage: string;
  expected_by: string | null;
  created_at: string;
  brief: { goals?: unknown[] } | null;
};

export type WebsiteJob = {
  id: string;
  who: string;
  reference: string;
  /** Monthly plan, or a bespoke project. */
  kind: "Monthly" | "Bespoke";
  /** What the person has to do. */
  status: "Changes to make" | "Ready to build" | "Being built" | "Brief to review" | "Waiting for their details";
  /** The date the customer was promised it by, when staff have set one. */
  due: string | null;
  href: string;
};

const RANK: Record<WebsiteJob["status"], number> = {
  "Changes to make": 0,
  "Ready to build": 1,
  "Being built": 2,
  "Brief to review": 3,
  "Waiting for their details": 4,
};

function statusOf(b: TodayBrief): WebsiteJob["status"] | null {
  if (b.stage === "changes") return "Changes to make";
  if (b.stage === "building") return "Being built";
  if (b.stage === "brief_received" || b.stage === "reviewing") return "Brief to review";
  if (b.stage === "specification") return (b.brief?.goals?.length ?? 0) > 0 ? "Ready to build" : "Waiting for their details";
  return null;
}

/** The websites a person has to act on, most urgent first: changes, then ready to build, then by promised date. */
export function websitesToMake(briefs: TodayBrief[]): WebsiteJob[] {
  return briefs
    .flatMap((b) => {
      const status = statusOf(b);
      if (!status) return [];
      const job: WebsiteJob = {
        id: b.id,
        who: b.business_name?.trim() || b.name?.trim() || b.reference,
        reference: b.reference,
        kind: b.route === "proposal" ? "Bespoke" : "Monthly",
        status,
        due: b.expected_by,
        href: `#builds/${b.id}`,
      };
      return [{ job, created: b.created_at }];
    })
    .sort(
      (a, b) =>
        RANK[a.job.status] - RANK[b.job.status] ||
        (a.job.due && b.job.due ? a.job.due.localeCompare(b.job.due) : a.job.due ? -1 : b.job.due ? 1 : 0) ||
        a.created.localeCompare(b.created),
    )
    .map((x) => x.job);
}

export type EnquiryLite = { id: string; reference: string; kind: string; name: string; email: string; topic: string | null; created_at: string; handled_at: string | null };
export type MessageItem = { id: string; who: string; what: string; reference: string; at: string };

/** The messages nobody has answered yet, newest first. A message from the account Help page is told apart from a new lead. */
export function messagesToAnswer(enquiries: EnquiryLite[]): MessageItem[] {
  return enquiries
    .filter((e) => !e.handled_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => ({ id: e.id, who: e.name || e.email, what: e.kind === "contact" ? "Message" : "Website enquiry", reference: e.reference, at: e.created_at }));
}
