import { mailConfig, sendEnquiryEmail } from "@/lib/mailer";

type Built = { reference: string; businessName: string; email: string };

const adminLink = () => `${(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk").replace(/\/+$/, "")}/admin#builds`;

/** The email to the owner, once the AI has a website draft for them to look at. Nothing has reached the customer. */
export function readyForReviewMessage(
  site: Built & { checksOk: boolean; issues: number; sector?: string; look?: string; kind: "template" | "text" },
): { subject: string; text: string } {
  const what = site.sector && site.look ? `${site.sector} template, ${site.look} look` : site.kind === "text" ? "text-only draft" : "draft";
  if (site.checksOk) {
    return {
      subject: `Ready for your review: ${site.businessName} [${site.reference}]`,
      text: [
        `The website for ${site.businessName} is built (${what}) and passed every automatic check.`,
        "",
        "Nothing has gone to the customer. Open it, then either release it to them, or write a change note and the AI will rewrite it.",
        adminLink(),
      ].join("\n"),
    };
  }
  return {
    subject: `Needs your look: ${site.businessName} [${site.reference}]`,
    text: [
      `The website for ${site.businessName} is built (${what}) but ${site.issues} automatic check${site.issues === 1 ? "" : "s"} failed.`,
      "",
      "Nothing has gone to the customer. Open it to see what failed. You can send it back to the AI with a change note, or release it yourself.",
      adminLink(),
    ].join("\n"),
  };
}

export function buildFailedMessage(site: Built, reason: string): { subject: string; text: string } {
  return {
    subject: `Needs you: ${site.businessName} could not be built [${site.reference}]`,
    text: [
      `The AI tried twice to build the website for ${site.businessName} and could not finish.`,
      `Reason: ${reason}`,
      "",
      "Nothing has gone to the customer. Open the website in Admin to start the build again, or to write it by hand.",
      adminLink(),
    ].join("\n"),
  };
}

/** Best effort: a failed email never undoes a build. With no mail settings it does nothing. */
export async function alertOwner(site: Built, message: { subject: string; text: string }): Promise<void> {
  const config = mailConfig();
  if (!config) return;
  try {
    await sendEnquiryEmail(config, { subject: message.subject, text: message.text, replyTo: site.email });
  } catch {
    console.error("Owner alert not sent");
  }
}
