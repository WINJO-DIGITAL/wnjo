/**
 * The brief for a website the owner builds by hand, written as one block of Markdown to paste into a CLAUDE.md (or the
 * first message of a new project). It holds everything the customer told us, in their own words, and the rules that keep
 * a hand-built site honest. Pure, so it is tested without a database.
 */
import { extrasRows } from "@/lib/brief-extras";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { categoryLines, GOALS, STYLES, type BriefFile, type WebsiteBrief } from "@/lib/website-brief";

export type HandoffFile = Pick<BriefFile, "name" | "type" | "size" | "role" | "alt"> & { /** A short-lived download link, when one was made. */ url?: string };

export type HandoffInput = {
  reference: string;
  businessName: string;
  contactName: string;
  email: string;
  plan: string;
  /** When the customer sent their goals, as a date. */
  sentOn?: string;
  brief: WebsiteBrief;
  files: HandoffFile[];
  adminUrl: string;
};

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const line = (label: string, value: string | undefined | null) => (value && value.trim() ? `- **${label}:** ${value.trim().replace(/\n+/g, "; ")}` : "");
const clean = (lines: string[]) => lines.filter(Boolean).join("\n");

/** What each file is, in the customer's terms. */
const fileRole = (f: HandoffFile) => (f.role === "logo" ? "Logo" : f.role === "hero" ? "Main photo" : f.type.startsWith("image/") ? "Photo" : "Document");

export function buildHandoffBrief(input: HandoffInput): string {
  const { brief } = input;
  const p = brief.profile;
  const goals = brief.goals.map((g) => GOALS[g]?.label ?? g);
  const style = brief.style ? STYLES[brief.style]?.label : null;
  const sector = brief.site ? (SECTOR_PRESETS[brief.site.sector]?.label ?? brief.site.sector) : null;
  const businessType = sector ?? brief.otherBusinessType;
  const answers = brief.site?.answers;

  const sections: string[] = [];

  sections.push(`# Website brief: ${input.businessName}`);
  sections.push(
    clean([
      `> Reference ${input.reference} · ${input.plan} · ${input.contactName} <${input.email}>${input.sentOn ? ` · goals sent ${input.sentOn}` : ""}`,
    ]),
  );

  sections.push(
    [
      "## What to build",
      `Build ${input.businessName} a genuinely bespoke website, designed for this business and not poured into a template. The look is the owner's call; the content below is the customer's and must be used as given.`,
      "",
      "### Rules",
      "- Use only the facts in this brief. Never invent prices, opening hours, testimonials, reviews, statistics, awards, qualifications, years in business, names or contact details. If something isn't here, leave it out or ask the owner.",
      "- Write in plain British English, in the customer's own voice where they gave it. No hype, no promised results.",
      "- The customer's own words (their description, what makes them different, their proof) are the source for the copy. Quote them or tighten them; don't embellish.",
      "- Mobile first, fast, and accessible (WCAG AA contrast, keyboard-friendly, real alt text on every image).",
      "- Use the customer's logo and photos exactly as supplied. Don't crop, recolour or redraw a logo.",
      "- For quality and structure, look at the owner's finished sites in the WINJO-DIGITAL GitHub organisation: raengfitness, duratek, Boonma and evexec. The owner owns all of that code and its booking systems and may reuse any of it.",
      "- Requests and bookings go to the owner's request form or the customer's phone or WhatsApp. Don't build a booking system unless the brief asks for one.",
    ].join("\n"),
  );

  sections.push(
    [
      "## The business",
      clean([
        line("Name", input.businessName),
        line("Kind of business", businessType),
        line("Contact name", input.contactName),
        line("Email", p.email || answers?.email || input.email),
        line("Phone", p.phone || answers?.phone),
        line("Address", answers?.address),
        line("WhatsApp", answers?.whatsapp),
        line("Areas covered", p.areas || answers?.areas),
        line("Hours or availability", p.hours),
        ...categoryLines(brief),
        line("Package", input.plan),
      ]),
    ].join("\n"),
  );

  const services = (answers?.servicesText || p.services || "").trim();
  if (services) {
    sections.push(["## Services and prices", "", "As the customer wrote them (one per line; a price only where they gave one):", "", services.split(/\r?\n/).filter((l) => l.trim()).map((l) => `- ${l.trim()}`).join("\n")].join("\n"));
  }

  const own = clean([
    line("What makes them different", p.differentiator || answers?.about),
    line("About the business, in their words", p.about),
    line("Proof they can show", p.proof),
    line("Who their customers are", p.customers),
    line("Tone they asked for", p.tone),
    line("What they want people to do first", p.firstActions.join(", ")),
    ...(answers?.details ? Object.entries(answers.details).filter(([, v]) => v).map(([k, v]) => line(k, v)) : []),
    line("Reviews they want shown", answers?.reviews),
    line("Google Business Profile", answers?.googleProfile),
    line("Other links", answers?.links),
  ]);
  if (own) sections.push(["## In the customer's words", own].join("\n"));

  sections.push(
    [
      "## What the website is for",
      clean([
        line("Goals", goals.join(", ")),
        line("About the goal", brief.goalNote),
        line("Pages they asked for", brief.pages.join(", ")),
        line("Look they asked for", style),
        line("Colours", brief.colours || answers?.colour),
        line("Websites they like", brief.references.join(", ")),
        line("To avoid", brief.avoid),
        line("It also needs to", brief.functionality),
      ]),
    ].join("\n"),
  );

  const extras = extrasRows(brief.extras);
  const extraLines = extras.map(([label, value]) => `- **${label.replace(/[:]+$/, "")}:** ${value}`);
  if (extraLines.length) sections.push(["## Everything else they told us", extraLines.join("\n")].join("\n"));

  if (input.files.length) {
    sections.push(
      [
        "## Files",
        "Download links are short-lived. Open the website in Admin, Website builds for fresh ones.",
        "",
        ...input.files.map((f) => `- **${fileRole(f)}:** ${f.name} (${kb(f.size)})${f.alt ? `, "${f.alt}"` : ""}${f.url ? `: ${f.url}` : ""}`),
      ].join("\n"),
    );
  } else {
    sections.push("## Files\nThe customer uploaded nothing yet. Build without photos and say so, or ask the owner.");
  }

  sections.push(["## When it's built", `Tell the owner. They will release it for the customer to review from ${input.adminUrl}.`].join("\n"));

  return `${sections.join("\n\n")}\n`;
}
