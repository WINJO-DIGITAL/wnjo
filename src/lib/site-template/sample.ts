/** A made-up barber used to prove the Barber template: its content passes every check and renders in full. */
import type { CustomerFacts, SiteContent } from "./schema";

const hours = [
  { day: "Mon to Fri", open: "09:00", close: "18:00" },
  { day: "Sat", open: "09:00", close: "16:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_BARBER_FACTS: CustomerFacts = {
  businessName: "Hartley & Sons",
  services: [
    { name: "Cut & style", price: "£22" },
    { name: "Skin fade", price: "£20" },
    { name: "Hot towel shave", price: "£18" },
    { name: "Beard trim" },
  ],
  hours,
  phone: "01632 960123",
  email: "book@hartley.example",
  address: "12 High Street, Leeds",
};

export const SAMPLE_BARBER: SiteContent = {
  business: { name: "Hartley & Sons", tagline: "Barbers in Leeds", phone: "01632 960123", email: "book@hartley.example", address: "12 High Street, Leeds" },
  theme: { colour: "#1f3a34", look: "classic" },
  sections: [
    { kind: "hero", variant: "photo", headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons, Leeds.", cta: "Request a booking" },
    {
      kind: "services",
      heading: "Cuts and prices",
      items: [
        { name: "Cut & style", price: "£22" },
        { name: "Skin fade", price: "£20" },
        { name: "Hot towel shave", price: "£18" },
        { name: "Beard trim" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: hours },
    { kind: "facts", items: [{ value: "Walk-ins", label: "Always welcome" }, { value: "Leeds", label: "High Street" }] },
    { kind: "area", heading: "Find us", text: "We are at 12 High Street, Leeds." },
    { kind: "enquiry", heading: "Request a booking", intro: "Tell us when suits and we will reply.", cta: "Send request" },
    { kind: "cta", headline: "Ready for a fresh cut?", cta: "Request a booking" },
  ],
};
