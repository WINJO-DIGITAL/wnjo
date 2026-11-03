/**
 * Frequently asked questions. Answers state only what the site already commits to
 * (package inclusions, written scope before payment, provisional pricing). Policies
 * still open in README §15 (deposits, refunds, ownership terms) are not invented here.
 * `short` is the answer at a glance, shown large on the card; it must say no more than `a`.
 */
export const faqs: { q: string; short: string; a: string }[] = [
  {
    q: "How long does a project take?",
    short: "A date in writing",
    a: "It depends on the size of the site and the features it needs: a five-page website is a much smaller job than a web application. Once the scope is agreed, we confirm a delivery date in writing. We don't promise dates before that.",
  },
  {
    q: "How many revisions are included?",
    short: "2–3 rounds",
    a: "Each package lists its design revision rounds: two for Essential and three for Professional. Premium projects agree their review stages in the written scope. Bigger changes of direction are discussed, and quoted, before any extra work.",
  },
  {
    q: "How do payments work?",
    short: "Nothing until agreed",
    a: "Your written quote sets out the price, any deposit and the payment schedule before you commit to anything. We never take payment for work that hasn't been scoped and agreed. Prices exclude VAT, and our VAT treatment is still being confirmed.",
  },
  {
    q: "Who owns the website?",
    short: "Your brand and domain",
    a: "Your content, branding and domain are yours, and we can register your domain in your name. Ownership of the design and code is set out clearly in your agreement before any work starts.",
  },
  {
    q: "What happens after launch?",
    short: "30–60 days support",
    a: "Every package includes handover support: 30 days for Essential and Professional, 60 for Premium. After that you can host the site yourself, or choose a Hosting, Care or Care Plus plan for hosting, updates, small changes and support.",
  },
  {
    q: "Can you build an app for my business?",
    short: "Yes",
    a: "Yes. Apps are scoped individually: a conversation about how your business works, then a written scope, price and payment schedule for you to approve. We developed the driver and operator apps for EV Exec, and we run our own platform, FYStay.",
  },
  {
    q: "Can you add features to my site later?",
    short: "Yes",
    a: "Yes. New features and improvements are quoted as separate work, or covered by the monthly hours included in Care Plus.",
  },
];
