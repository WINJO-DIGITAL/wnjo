/**
 * The broad kinds of business a customer picks first. They cover the industries that make up most UK businesses, so
 * one question set works for an accountant as well as a plumber. A customer picks one category, then answers the
 * shared questions, then the two or three questions the category asks for. Nothing here is a template.
 */

export type CategoryQuestion = { id: string; label: string; hint: string };
export type BusinessCategory = { id: string; label: string; hint: string; examples: string; questions: CategoryQuestion[] };

export const CATEGORIES: BusinessCategory[] = [
  {
    id: "trades",
    label: "Trades and home services",
    hint: "Work done at the customer's home or premises",
    examples: "Electricians, plumbers, builders, roofers, cleaners, gardeners, removals",
    questions: [
      { id: "callouts", label: "Do you offer emergency call-outs?", hint: "For example: 24-hour call-outs, or weekday work only." },
      { id: "quotes", label: "Do you give free quotes?", hint: "For example: free quotes for all jobs, or a charge for a visit." },
      { id: "accreditations", label: "Any trade accreditations?", hint: "For example: Gas Safe, NICEIC, FMB. Only if you hold them." },
    ],
  },
  {
    id: "professional",
    label: "Professional and creative services",
    hint: "Advice, design, legal, financial or technical work",
    examples: "Accountants, solicitors, consultants, architects, designers, photographers, IT and web",
    questions: [
      { id: "clients", label: "Who do you help most?", hint: "For example: small businesses, sole traders, families, charities." },
      { id: "howStart", label: "How does work usually start?", hint: "For example: a free first call, a written proposal, or a project brief." },
      { id: "credentials", label: "Professional memberships or qualifications?", hint: "Only those you hold, such as ICAEW, the Law Society or RIBA." },
    ],
  },
  {
    id: "retail",
    label: "Shops and retail",
    hint: "Selling goods in a shop, at a market or online",
    examples: "Independent shops, florists, wholesalers, makers, online sellers",
    questions: [
      { id: "sells", label: "What do you sell?", hint: "For example: homeware, flowers, clothing, handmade gifts." },
      { id: "online", label: "Do you sell online?", hint: "For example: yes, with delivery; or in shop only." },
      { id: "delivery", label: "Delivery or collection?", hint: "For example: next-day delivery in Lancashire, or collect in store." },
    ],
  },
  {
    id: "health",
    label: "Health, beauty and wellbeing",
    hint: "Treatments and care for the body and mind",
    examples: "Barbers, salons, massage, physio, clinics, dentists, therapists",
    questions: [
      { id: "treatments", label: "What treatments do you offer?", hint: "For example: haircuts, massage, physio sessions, counselling." },
      { id: "firstVisit", label: "What happens at a first visit?", hint: "For example: an assessment, then a plan agreed with you." },
      { id: "regulated", label: "Any regulated or registered status?", hint: "Only if you hold it, such as HCPC or a CQC registration. Never a promise of results." },
    ],
  },
  {
    id: "education",
    label: "Education, childcare and training",
    hint: "Teaching, care for children, and skills training",
    examples: "Nurseries, tutors, driving schools, music and dance, training providers",
    questions: [
      { id: "ages", label: "Who are your lessons or sessions for?", hint: "For example: under-5s, school pupils, adults returning to study." },
      { id: "sessions", label: "How do sessions work?", hint: "For example: weekly one-to-one, a course over six weeks, or drop-in." },
      { id: "registration", label: "Any registration or accreditation?", hint: "Only if you hold it, such as Ofsted or a recognised awarding body." },
    ],
  },
  {
    id: "transport",
    label: "Transport, vehicles and motoring",
    hint: "Moving people, goods and vehicles",
    examples: "Taxis, couriers, garages, MOT and servicing, car hire",
    questions: [
      { id: "covers", label: "Where do you cover?", hint: "For example: Preston and within 20 miles, or all of Lancashire." },
      { id: "advance", label: "Do customers book in advance?", hint: "For example: yes, by phone or online; or walk-up only." },
      { id: "fixedPrices", label: "Do you quote fixed prices?", hint: "For example: fixed airport fares, or a quote for each job." },
    ],
  },
  {
    id: "fitness",
    label: "Fitness, sport and leisure",
    hint: "Classes, coaching and places to be active",
    examples: "Gyms, personal trainers, yoga, sports clubs, activity centres",
    questions: [
      { id: "classes", label: "What classes or sessions do you run?", hint: "For example: circuit training, swimming lessons, 1-to-1 coaching." },
      { id: "forWhom", label: "Who is it for?", hint: "For example: beginners, over-50s, children, competitive athletes." },
      { id: "membership", label: "How do people join?", hint: "For example: drop in, book a session, or a monthly membership." },
    ],
  },
  {
    id: "food",
    label: "Food, drink and events",
    hint: "Places to eat and drink, and events to host or plan",
    examples: "Cafés, restaurants, pubs, caterers, wedding venues, event planners",
    questions: [
      { id: "menu", label: "What is on the menu or offered?", hint: "For example: breakfasts and lunches, a set wedding menu, or event planning." },
      { id: "bookings", label: "How do customers book?", hint: "For example: walk-ins welcome, a table booking by phone, or an enquiry form." },
      { id: "capacity", label: "How many can you cater for or seat?", hint: "For example: 40 covers, or up to 150 guests." },
    ],
  },
  {
    id: "property",
    label: "Property and accommodation",
    hint: "Buying, selling, letting and staying",
    examples: "Estate and letting agents, holiday lets, B&Bs, hotels",
    questions: [
      { id: "service", label: "What do you do?", hint: "For example: sales, lettings, property management, holiday stays." },
      { id: "areas", label: "Which areas do you cover?", hint: "For example: Blackpool and the Fylde coast." },
      { id: "enquiries", label: "How do people enquire?", hint: "For example: a phone call, a viewing request, or a booking form." },
    ],
  },
  {
    id: "community",
    label: "Charities, community and faith",
    hint: "Not-for-profit groups, charities, clubs and congregations",
    examples: "Charities, community groups, sports and social clubs, churches and faith groups",
    questions: [
      { id: "who", label: "Who do you help or serve?", hint: "For example: families in crisis, young people, the local community." },
      { id: "involved", label: "How can people get involved?", hint: "For example: volunteer, donate, join a group, or attend a service." },
      { id: "charityNumber", label: "Charity or registration number?", hint: "Only if you have one, so people can check it." },
    ],
  },
];

/** The "something else" choice, for a business that doesn't fit the ten. */
export const OTHER_CATEGORY = "other";

export const CATEGORY_IDS: readonly string[] = [...CATEGORIES.map((c) => c.id), OTHER_CATEGORY];

export function categoryById(id: string | undefined | null): BusinessCategory | null {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}
