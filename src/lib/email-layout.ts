/**
 * The branded layout for customer emails. Each email is written once, as plain text (the words are the source of
 * truth), and this turns that text into an HTML email in the same look as the website: a cream page, one card, the
 * wordmark at the top, headings and "Label: value" details set out as a panel, and a single button for the main step.
 *
 * It is pure (no network, no database) so it can be tested. Everything from the text is escaped, so a visitor's
 * words can never add markup. The plain text still goes out with the HTML, for mail readers that prefer it.
 */

const COLOR = {
  page: "#f2ece2",
  card: "#fffdf9",
  ink: "#3a2d22",
  ink2: "#574a3f",
  ink3: "#665f57",
  line: "#e0d6c7",
  panel: "#f7f3eb",
  accent: "#a84a26",
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "details"; rows: [string, string][] }
  | { kind: "link"; url: string };

/** A short line on its own that reads as a heading: capitals, or a short phrase with no ending punctuation. */
const isHeading = (line: string) =>
  line.length <= 40 && !/[.,!?:;]$/.test(line) && !/^https?:\/\//.test(line) && !/^Hi\b/.test(line) && /^[A-Za-z]/.test(line);

/** "Label: value", where the label is short (for example "Plan: Care, £95 a month"). */
const DETAIL = /^([A-Z][A-Za-z0-9 ()/'&-]{0,28}): (.+)$/;
const URL_LINE = /^https?:\/\/\S+$/;

/** Splits the plain text into blocks: headings, paragraphs, a details panel and standalone links. */
export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd());
  const blocks: Block[] = [];
  let i = 0;
  // Blank lines separate blocks; a line right after a blank line can be a heading.
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (URL_LINE.test(line)) {
      blocks.push({ kind: "link", url: line });
      i++;
      continue;
    }
    if (DETAIL.test(line)) {
      const rows: [string, string][] = [];
      while (i < lines.length && DETAIL.test(lines[i])) {
        const m = DETAIL.exec(lines[i])!;
        rows.push([m[1], m[2]]);
        i++;
      }
      blocks.push({ kind: "details", rows });
      continue;
    }
    const afterBlank = i === 0 || lines[i - 1].trim() === "";
    const nextIsContent = i + 1 < lines.length && lines[i + 1].trim() !== "";
    if (afterBlank && isHeading(line) && nextIsContent) {
      blocks.push({ kind: "heading", text: line });
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !URL_LINE.test(lines[i]) && !DETAIL.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "paragraph", lines: para });
  }
  return blocks;
}

/** The button text for the step an email links to, so the words match where the link goes. */
export function buttonLabel(url: string): string {
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    return "Open link";
  }
  if (path.startsWith("/subscribe/") && path !== "/subscribe/done") return "Continue to payment";
  if (path === "/account" || path.startsWith("/account/")) return "Go to your account";
  if (path.startsWith("/website-projects")) return "View website projects";
  if (path.startsWith("/pricing")) return "View plans";
  if (path.startsWith("/work")) return "See our work";
  if (path.startsWith("/contact")) return "Contact us";
  return "Open link";
}

const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

function renderBlock(block: Block, mainLink: boolean): string {
  switch (block.kind) {
    case "heading":
      return `<p style="margin:28px 0 10px;font-family:${SANS};font-size:12px;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${COLOR.ink3};font-weight:600;">${escapeHtml(block.text)}</p>`;
    case "paragraph":
      return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:26px;color:${COLOR.ink2};">${block.lines.map(escapeHtml).join("<br>")}</p>`;
    case "details": {
      const rows = block.rows
        .map(
          ([label, value], idx) =>
            `<tr><td style="padding:10px 0;${idx ? `border-top:1px solid ${COLOR.line};` : ""}font-family:${SANS};font-size:14px;line-height:20px;color:${COLOR.ink3};width:38%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 0;${idx ? `border-top:1px solid ${COLOR.line};` : ""}font-family:${SANS};font-size:15px;line-height:21px;color:${COLOR.ink};vertical-align:top;">${escapeHtml(value)}</td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:${COLOR.panel};border:1px solid ${COLOR.line};border-radius:12px;"><tr><td style="padding:6px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table>`;
    }
    case "link": {
      if (!isWebUrl(block.url)) return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;color:${COLOR.ink2};">${escapeHtml(block.url)}</p>`;
      const href = escapeHtml(block.url);
      if (mainLink) {
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:999px;background:${COLOR.ink};"><a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:${COLOR.card};text-decoration:none;border-radius:999px;">${escapeHtml(buttonLabel(block.url))}</a></td></tr></table><p style="margin:0 0 16px;font-family:${SANS};font-size:13px;line-height:19px;color:${COLOR.ink3};word-break:break-all;">${href}</p>`;
      }
      return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:22px;"><a href="${href}" style="color:${COLOR.accent};text-decoration:underline;word-break:break-all;">${href}</a></p>`;
    }
  }
}

export type EmailLayoutOptions = {
  /** The public site address, for the links in the footer. */
  siteUrl: string;
};

/** The whole HTML email. The text is the source; the subject shows as a hidden preview line in most mail apps. */
export function renderEmailHtml(message: { subject: string; text: string }, options: EmailLayoutOptions): string {
  const site = options.siteUrl.replace(/\/+$/, "");
  const blocks = parseBlocks(message.text);
  // The sign-off "WINJO DIGITAL" is set in the footer rather than read as a last paragraph.
  const last = blocks[blocks.length - 1];
  const signed = last && last.kind === "paragraph" && last.lines.length === 1 && last.lines[0] === "WINJO DIGITAL";
  // The first web link is the email's one main button, wherever it sits in the text; any others stay as plain links.
  const visible = signed ? blocks.slice(0, -1) : blocks;
  const mainIndex = visible.findIndex((b) => b.kind === "link" && isWebUrl(b.url));
  const body = visible.map((b, i) => renderBlock(b, i === mainIndex)).join("\n");
  const preview = message.text.replace(/\s+/g, " ").trim().slice(0, 110);

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(message.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:0 4px 18px;font-family:${SANS};">
<span style="font-family:${SANS};font-size:15px;font-weight:700;letter-spacing:0.16em;color:${COLOR.ink};">WINJO DIGITAL</span>
</td></tr>
<tr><td style="background:${COLOR.card};border:1px solid ${COLOR.line};border-radius:18px;padding:36px 36px 28px;">
${body}
${signed ? `<p style="margin:26px 0 0;font-family:${SERIF};font-size:17px;line-height:24px;color:${COLOR.ink};">WINJO DIGITAL</p>` : ""}
</td></tr>
<tr><td style="padding:22px 6px 0;font-family:${SANS};font-size:12px;line-height:19px;color:${COLOR.ink3};">
<p style="margin:0 0 8px;">WINJO DIGITAL &middot; Based in Thornton-Cleveleys, Lancashire</p>
<p style="margin:0 0 8px;">Questions? Just reply to this email.</p>
<p style="margin:0;"><a href="${escapeHtml(site)}/terms" style="color:${COLOR.ink3};">Terms</a> &middot; <a href="${escapeHtml(site)}/privacy" style="color:${COLOR.ink3};">Privacy</a> &middot; <a href="${escapeHtml(site)}/work" style="color:${COLOR.ink3};">Our work</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
