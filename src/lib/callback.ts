/**
 * The call-back promise shown after someone asks for a price. Working hours are the owner's default, Monday to Friday,
 * 9am to 5pm UK time, and can be changed here. Pure, so the rule is tested with fixed times.
 */
export const WORKING_HOURS = { days: [1, 2, 3, 4, 5], start: 9, end: 17 } as const;

function londonParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return { day, hour };
}

/** True when a call can still happen within the hour: a working day, and at least an hour before closing. */
export function canCallWithinHour(now: Date, hours = WORKING_HOURS): boolean {
  const { day, hour } = londonParts(now);
  return (hours.days as readonly number[]).includes(day) && hour >= hours.start && hour < hours.end - 1;
}

export function callbackPromise(now: Date, hours = WORKING_HOURS): string {
  return canCallWithinHour(now, hours)
    ? "We'll call you within the hour to talk it through."
    : "We'll call you first thing next working day to talk it through.";
}

/** The plain-text email a customer gets with their instant quote. Prices are whole pounds. */
export function quoteEmail(input: { name: string; quoteReference: string; low: number; high: number; siteUrl: string; callback: string }) {
  const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const site = input.siteUrl.replace(/\/+$/, "");
  return {
    subject: `Your WNJO quote ${input.quoteReference}`,
    text: [
      `Hi ${first},`,
      "",
      `Thanks for your brief. Your quote ${input.quoteReference} is ready: ${gbp(input.low)} to ${gbp(input.high)}, with no VAT added.`,
      "",
      `To see the full quote and accept it, sign in at ${site}/account with this email address.`,
      "",
      input.callback,
      "",
      "WNJO",
    ].join("\n"),
  };
}
