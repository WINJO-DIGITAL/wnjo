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

const cafeHours = [
  { day: "Mon to Fri", open: "08:00", close: "16:00" },
  { day: "Sat, Sun", open: "09:00", close: "17:00" },
];

export const SAMPLE_CAFE_FACTS: CustomerFacts = {
  businessName: "Harbour Bakery",
  services: [
    { name: "Flat white", price: "£3.20" },
    { name: "Bacon roll", price: "£5.50" },
    { name: "Sourdough toast", price: "£4.00" },
    { name: "Cake of the day" },
  ],
  hours: cafeHours,
  highlights: [{ value: "Dogs", label: "Welcome inside" }, { value: "Vegan", label: "Options on the menu" }],
  phone: "01274 960456",
  address: "4 Quay Street, Whitby",
};

export const SAMPLE_CAFE: SiteContent = {
  business: { name: "Harbour Bakery", tagline: "Bakery and café in Whitby", phone: "01274 960456", address: "4 Quay Street, Whitby" },
  theme: { colour: "#a84a26", look: "warm" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Fresh bread and good coffee on Quay Street", intro: "Breakfast, lunch and cake at Harbour Bakery in Whitby.", cta: "Request a table" },
    {
      kind: "services",
      heading: "Menu",
      items: [
        { name: "Flat white", price: "£3.20" },
        { name: "Bacon roll", price: "£5.50" },
        { name: "Sourdough toast", price: "£4.00" },
        { name: "Cake of the day" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: cafeHours },
    { kind: "facts", items: [{ value: "Dogs", label: "Welcome inside" }, { value: "Vegan", label: "Options on the menu" }] },
    { kind: "area", heading: "Find us", text: "We are at 4 Quay Street, Whitby." },
    { kind: "enquiry", heading: "Request a table", intro: "Tell us the day and time and we will reply.", cta: "Send request", prompt: "Date, time and how many of you?" },
    { kind: "cta", headline: "Save a table for breakfast?", cta: "Request a table" },
  ],
};

export const SAMPLE_ELECTRICIAN_FACTS: CustomerFacts = {
  businessName: "Spark & Co",
  services: [{ name: "Full rewire" }, { name: "Fuse board upgrade", price: "£450" }, { name: "Smoke alarm testing" }],
  areas: ["Leeds", "Wakefield", "Harrogate"],
  highlights: [{ value: "Free", label: "Quotes" }, { value: "Same day", label: "Call-outs available" }],
  phone: "0113 496 0789",
  email: "jobs@sparkandco.example",
};

export const SAMPLE_ELECTRICIAN: SiteContent = {
  business: { name: "Spark & Co", tagline: "Electricians across West Yorkshire", phone: "0113 496 0789", email: "jobs@sparkandco.example" },
  theme: { colour: "#2b2b2b", look: "bold" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Electricians for Leeds, Wakefield and Harrogate", intro: "Rewires, fuse boards and alarm testing from Spark & Co.", cta: "Get a free quote" },
    {
      kind: "services",
      heading: "What we do",
      items: [{ name: "Full rewire" }, { name: "Fuse board upgrade", price: "£450" }, { name: "Smoke alarm testing" }],
    },
    { kind: "facts", items: [{ value: "Free", label: "Quotes" }, { value: "Same day", label: "Call-outs available" }] },
    { kind: "area", heading: "Areas we cover", text: "We work in Leeds, Wakefield and Harrogate." },
    { kind: "enquiry", heading: "Get a free quote", intro: "Tell us about the job and we will reply.", cta: "Send request", prompt: "What do you need doing?" },
    { kind: "cta", headline: "Need an electrician?", cta: "Get a free quote" },
  ],
};

const physioHours = [
  { day: "Mon to Thu", open: "08:00", close: "19:00" },
  { day: "Fri", open: "08:00", close: "17:00" },
  { day: "Sat", open: "09:00", close: "13:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_PHYSIO_FACTS: CustomerFacts = {
  businessName: "Calm Physio",
  services: [
    { name: "Initial assessment", price: "£60" },
    { name: "Follow-up session", price: "£45" },
    { name: "Sports injury treatment" },
    { name: "Rehabilitation plan" },
  ],
  hours: physioHours,
  highlights: [{ value: "Same week", label: "Appointments available" }, { value: "Evening", label: "Slots available" }],
  phone: "0117 496 0321",
  email: "appointments@calmphysio.example",
  address: "8 Park Row, Bristol",
};

export const SAMPLE_PHYSIO: SiteContent = {
  business: { name: "Calm Physio", tagline: "Physiotherapy in Bristol", phone: "0117 496 0321", email: "appointments@calmphysio.example", address: "8 Park Row, Bristol" },
  theme: { colour: "#3d3a7a", look: "minimal" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Physiotherapy on Park Row", intro: "Assessment, treatment and rehabilitation at Calm Physio, Bristol.", cta: "Request an appointment" },
    {
      kind: "services",
      heading: "Treatments",
      items: [
        { name: "Initial assessment", price: "£60" },
        { name: "Follow-up session", price: "£45" },
        { name: "Sports injury treatment" },
        { name: "Rehabilitation plan" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: physioHours },
    { kind: "facts", items: [{ value: "Same week", label: "Appointments available" }, { value: "Evening", label: "Slots available" }] },
    { kind: "area", heading: "Find us", text: "We are at 8 Park Row, Bristol." },
    { kind: "enquiry", heading: "Request an appointment", intro: "Tell us what you need help with and when suits, and we will reply.", cta: "Send request", prompt: "What would you like help with?" },
    { kind: "cta", headline: "Ready to book an assessment?", cta: "Request an appointment" },
  ],
};

/** Every sector's sample build, with the facts it was written from. */
export const SAMPLES: Record<string, { content: SiteContent; facts: CustomerFacts }> = {
  barber: { content: SAMPLE_BARBER, facts: SAMPLE_BARBER_FACTS },
  cafe: { content: SAMPLE_CAFE, facts: SAMPLE_CAFE_FACTS },
  electrician: { content: SAMPLE_ELECTRICIAN, facts: SAMPLE_ELECTRICIAN_FACTS },
  physio: { content: SAMPLE_PHYSIO, facts: SAMPLE_PHYSIO_FACTS },
};
