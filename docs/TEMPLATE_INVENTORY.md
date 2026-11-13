# Master template: inventory of existing projects

Purpose: find what in the finished projects can be reused as sections of one master template (see `AI_BUILD_SPEC.md`). Sources: RAENG Fitness (done), Duratek (done, read at commit `c65a567`), WINJO Digital (this repo, done). Boonma is still to do.

## Source 1: RAENG Fitness

Repo `WNJOWEB/raengfitness`, read at commit `f2ab687`. Next.js 16.4, React 19.3, Tailwind CSS v4, TypeScript strict, Vitest, Playwright and axe-core for accessibility. Static output on Vercel.

### How it is organised (the useful part)

The site keeps **content** and **components** apart. The components only read typed content files, and nothing in a component is specific to the business. That is the shape a template needs: the AI fills the content files, and the components render them.

Content files (`src/content/`): `site.ts` (business facts, address, social), `services.ts`, `classes.ts` (timetable), `faq.ts`, `journey.ts`, `coaching.ts`, `payments.ts`, and `types.ts` (the typed shapes).

**Every fact that could mislead a customer carries a status, `confirmed` or `provisional`.** Provisional content is hidden on the live site and only shown, with a marker, in preview. This already matches our rule that nothing may be invented: anything the customer hasn't supplied stays hidden.

### Reusable sections (public site)

| Section | What it does | Template use |
| --- | --- | --- |
| `PageHeader` | Page title block | Keep |
| `HeroVideo` | Silent looping hero video with a still poster, a visible pause control, and reduced-motion handling | Keep as one hero variant. Needs a video or a still |
| `WaysToTrain` | Service cards with points and prices | Keep as the services section |
| `PriceList` | Shows only publishable prices, or "get in touch" if none | Keep as the prices section |
| `Timetable` | Weekly timetable with four layouts | Keep for sectors with classes or opening hours |
| `HowToBook` | Short booking steps | Keep |
| `Journey` | A process or story in steps | Keep |
| `Faq` | Questions in native `<details>`, works without JavaScript | Keep |
| `Location` | Address block with a directions button | Keep |
| `CtaBand` | Closing call to action | Keep |
| `JsonLd` | Structured data for search | Keep |

Supporting: `Section` and `SectionHeading`, `ButtonLink`, `Carousel`, `Provisional`, `KeepHyphens`, and the site header, footer, navigation and logo.

### Not reusable as-is

- **Booking** (`BookingWizard`, `AvailabilityCalendar`, `BookingPage`, `OnlineOnboarding`): tied to this business's Supabase tables (`akb_` prefix) and class-capacity rules. The template needs a simpler booking section instead.
- **Coach portal** (`src/app/coach/`): clients, finances, ledger, refunds, sessions, subscriptions. Specific to one business. Leave out.
- Business wording, photos and the Instagram alternative component.

## What this means for the template

1. **The template is its own project, not part of this repo.** RAENG uses Tailwind v4 and this repo uses plain CSS. A customer site is the template copied, with its content files written by the AI.
2. **Sections plus content schema.** One content file per concern, typed, with the confirmed/provisional status kept.
3. **Sector presets** choose which sections appear, their order and the default look. A barber preset leads with booking and prices, a café with the menu and hours.
4. **Booking is the one heavy piece.** Start with a "request a booking" form that emails the owner. Add a full booking system later, only for sectors that need it.

## Source 2: Duratek

Repo `WNJOWEB/duratek`, read at commit `c65a567`. Next.js 16.4, React 19.3, Supabase, Tailwind CSS v4. A product brand site for a waterproof flooring range, not a service business.

### Reusable parts

| Part | What it does | Template use |
| --- | --- | --- |
| `SpecStrip` | Four headline facts in a row (value and label) | Keep as the "why us" strip for any sector. Fill from the customer's own facts |
| `PostcodeSearch` | Plain GET form, works without JavaScript, shareable results | Keep for "find us" or "where to buy". Useful for trades and shops with areas served |
| `SampleRequest` | Form to request samples, with a server action | Keep as the enquiry form pattern (short fields, clear confirmation) |
| `HeroCarousel` | Full-width slides with an image, a swatch and a link | Keep as a hero variant for sectors with photos (cafés, salons) |
| `FinishGallery`, `FinishCard`, `ColourSwatches` | Gallery of products with colour options | Keep as a gallery and "services with photos" section |
| `Warranty` | Warranty and guarantee block | Keep. Only with the customer's own terms |
| `HowItWorks`, `AudienceSwitch`, `ClosingCta` | Process steps, a choice between audiences, closing call to action | Keep as the process, and the closing call to action |
| `JsonLd` | Structured data for search | Keep |

### Not reusable

- The range and inspiration pages are specific to flooring. Leave out.
- Supabase catalogue and sample tables are specific to the product.

## Source 3: WINJO Digital (this repo)

This repo is the agency's own site, not a client site. Its useful parts are the designs and the interaction patterns, not its content.

- **The four sector designs** in `SiteStyler` (Café, Barber, Electrician, Physio): the designs to base the first presets on. They already have images, copy and a colour approach for each sector.
- **Interaction patterns:** the plan swiper (`PlanSwiper`), the booking demo (`BookingDemo`) for a step-by-step booking display, and the clip showcase for video.
- **Not reusable:** the marketing pages and the admin and account screens. Those are about the agency, not customer sites.

## Combined: what the master template draws from

| Template section | Taken from |
| --- | --- |
| Hero (photo or video) | RAENG `HeroVideo`, Duratek `HeroCarousel` |
| Services and prices | RAENG `WaysToTrain`, `PriceList` |
| Opening hours or timetable | RAENG `Timetable` |
| Gallery | Duratek `FinishGallery` |
| "Why us" facts | Duratek `SpecStrip` |
| Find us or service areas | Duratek `PostcodeSearch`, RAENG `Location` |
| Enquiry or booking request | Duratek `SampleRequest` (request form), RAENG `HowToBook` |
| FAQ | RAENG `Faq` |
| Closing call to action | RAENG `CtaBand`, Duratek `ClosingCta` |
| Sector designs | WINJO `SiteStyler` presets |

## Still to do

- Inventory Boonma (needs its repo name; it isn't in the repos I can see).
- Decide whether EV Exec and FYStay are worth a look for a menu or gallery section.
- Choose the content schema, then build the first sector preset (Barber).
