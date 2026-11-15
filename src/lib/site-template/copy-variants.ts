/**
 * Alternative fixed wording, so two businesses in the same sector don't read as one site. Each sector has its own
 * wording (in presets.ts) plus two alternatives here; a business gets one of the three, chosen from its name, so the
 * same business always gets the same one. All of it is written by us and makes no claim about the business, so it is
 * as safe as the original and the model has nothing to get wrong. It passes the same checks and sector rules.
 */
export type CopyVariant = {
  /** The heading above the list of what they offer. Short enough for the menu (16 characters). */
  servicesHeading: string;
  /** The heading above the photos. */
  galleryHeading: string;
  /** The line above the request form. At most 18 words. */
  enquiryIntro: string;
  /** The line before the last button. At most 8 words. */
  closingHeadline: string;
};

export const COPY_VARIANTS: Record<string, CopyVariant[]> = {
  barber: [
    { servicesHeading: "Prices", galleryHeading: "In the chair", enquiryIntro: "Pick a day and time and we will confirm.", closingHeadline: "Time for a trim?" },
    { servicesHeading: "What we offer", galleryHeading: "Around the shop", enquiryIntro: "Send the time you would like and we will get back to you.", closingHeadline: "Book your next cut." },
  ],
  cafe: [
    { servicesHeading: "On the menu", galleryHeading: "Around the café", enquiryIntro: "Send the day, time and numbers and we will reply.", closingHeadline: "Fancy a table?" },
    { servicesHeading: "Food and drink", galleryHeading: "A look inside", enquiryIntro: "Tell us when you would like to come and we will confirm.", closingHeadline: "Come and sit down." },
  ],
  electrician: [
    { servicesHeading: "Jobs we do", galleryHeading: "Recent work", enquiryIntro: "Describe the job and we will get back to you.", closingHeadline: "Got a job in mind?" },
    { servicesHeading: "How we can help", galleryHeading: "Past jobs", enquiryIntro: "Send us the details and we will reply.", closingHeadline: "Tell us about the job." },
  ],
  physio: [
    { servicesHeading: "How we can help", galleryHeading: "In the clinic", enquiryIntro: "Tell us what is bothering you and when suits, and we will reply.", closingHeadline: "Want to book a visit?" },
    { servicesHeading: "Appointments", galleryHeading: "The clinic", enquiryIntro: "Send a few details and a time that suits, and we will confirm.", closingHeadline: "Book your appointment." },
  ],
  massage: [
    { servicesHeading: "Our treatments", galleryHeading: "Inside the room", enquiryIntro: "Choose a treatment and a time, and we will confirm.", closingHeadline: "Book some time out." },
    { servicesHeading: "What we offer", galleryHeading: "A look around", enquiryIntro: "Tell us what you would like and when, and we will reply.", closingHeadline: "Ready when you are." },
  ],
  beauty: [
    { servicesHeading: "Our treatments", galleryHeading: "Recent work", enquiryIntro: "Pick a treatment and a time, and we will confirm.", closingHeadline: "Ready when you are." },
    { servicesHeading: "What we offer", galleryHeading: "Photos", enquiryIntro: "Tell us what you would like and when, and we will reply.", closingHeadline: "Book your appointment." },
  ],
  fitness: [
    { servicesHeading: "Our classes", galleryHeading: "In the studio", enquiryIntro: "Choose a class or session and we will reply.", closingHeadline: "Come and try one." },
    { servicesHeading: "What's on", galleryHeading: "Studio photos", enquiryIntro: "Tell us what you would like to try and we will reply.", closingHeadline: "Join a session." },
  ],
  "holiday-let": [
    { servicesHeading: "Places to stay", galleryHeading: "Take a look", enquiryIntro: "Send your dates and party size and we will confirm.", closingHeadline: "Plan your stay." },
    { servicesHeading: "Our stays", galleryHeading: "The property", enquiryIntro: "Tell us when you would like to come and how many, and we will reply.", closingHeadline: "Find your dates." },
  ],
  plumbing: [
    { servicesHeading: "Jobs we do", galleryHeading: "Recent jobs", enquiryIntro: "Describe the problem and we will get back to you.", closingHeadline: "Got a plumbing job?" },
    { servicesHeading: "How we can help", galleryHeading: "Past jobs", enquiryIntro: "Send us the details and we will reply.", closingHeadline: "Tell us what needs fixing." },
  ],
  building: [
    { servicesHeading: "Work we take on", galleryHeading: "Recent projects", enquiryIntro: "Describe the project and we will get back to you.", closingHeadline: "Got a project in mind?" },
    { servicesHeading: "How we can help", galleryHeading: "Past projects", enquiryIntro: "Send us the details and we will reply.", closingHeadline: "Tell us about the project." },
  ],
  cleaning: [
    { servicesHeading: "Cleans we offer", galleryHeading: "Photos", enquiryIntro: "Describe what needs cleaning and we will get back to you.", closingHeadline: "Time for a clean?" },
    { servicesHeading: "How we can help", galleryHeading: "Recent work", enquiryIntro: "Send us the details and we will reply.", closingHeadline: "Tell us what needs cleaning." },
  ],
};

/** A small, stable number from a name (FNV-1a), so the same business always gets the same wording. */
export function nameHash(name: string): number {
  let h = 2166136261;
  for (const ch of name.trim().toLowerCase()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** The alternative wording this business gets, or null for the sector's own wording. */
export function variantFor(sectorId: string, businessName: string): CopyVariant | null {
  const options = COPY_VARIANTS[sectorId] ?? [];
  const pick = nameHash(businessName) % (options.length + 1);
  return pick === 0 ? null : options[pick - 1];
}
