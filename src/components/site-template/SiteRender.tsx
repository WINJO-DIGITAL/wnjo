import { flowFor } from "@/lib/site-template/flow";
import type { CSSProperties } from "react";
import { serviceChoices } from "@/lib/site-template/enquiry";
import { mapsEmbedUrl, safeHttpsUrl } from "@/lib/site-template/seo";
import { LAYOUTS, type HoursItem, type Layout, type Section, type SiteContent } from "@/lib/site-template/schema";
import css from "./SiteRender.module.css";

/**
 * Lays a template build out as a page. It reads typed content only and never writes HTML from it: every string
 * goes through React as text, links are built here from the checked phone and email, and image addresses must be
 * https or a path on this site. A page that gets this far has passed `checkSite`, but nothing here relies on that.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Black or white, whichever reads better on the theme colour. */
function onColour(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#161616" : "#ffffff";
}

/** Only https addresses and paths on this site are shown as images. */
export function safeImage(src: string | undefined): string | null {
  if (!src) return null;
  if (/^https:\/\//i.test(src)) return src;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return null;
}

/** A headline in two tones: the last words in the accent, as on a portfolio site. Short headlines stay one tone. */
function twoTone(headline: string) {
  const words = headline.trim().split(/\s+/);
  if (words.length < 4) return headline;
  const at = Math.ceil(words.length / 2);
  return (
    <>
      {words.slice(0, at).join(" ")} <span className={css.tone}>{words.slice(at).join(" ")}</span>
    </>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** A wa.me link. A leading 0 is treated as a UK number; a number that already has a country code is left as it is. */
function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `44${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

function hoursText(h: HoursItem): string {
  if (h.closed) return "Closed";
  if (h.open && h.close) return `${h.open} to ${h.close}`;
  return h.open ?? "";
}

const ANCHOR_IDS: Partial<Record<Section["kind"], { id: string; fallback: string }>> = {
  services: { id: "services", fallback: "Services" },
  hours: { id: "hours", fallback: "Hours" },
  gallery: { id: "gallery", fallback: "Gallery" },
  area: { id: "find-us", fallback: "Find us" },
  faq: { id: "faq", fallback: "Questions" },
};

/** The nav names a section by its own short heading ("Menu", "Prices"), and falls back to a plain word. */
function navLabel(s: Section): string | null {
  const a = ANCHOR_IDS[s.kind];
  if (!a) return null;
  const heading = "heading" in s ? s.heading.trim() : "";
  return heading && heading.length <= 16 ? heading : a.fallback;
}

/** The sections of the page being shown. The home page is the content's own sections. */
function pageSections(content: SiteContent, slug: string): { sections: Section[]; slug: string } {
  const page = slug ? content.pages?.find((p) => p.slug === slug) : undefined;
  return page ? { sections: page.sections, slug: page.slug } : { sections: content.sections, slug: "" };
}

/** The page whose sections hold the request form, so every "book" button can point there. */
function bookingSlug(content: SiteContent): string | null {
  if (content.sections.some((s) => s.kind === "enquiry")) return "";
  return content.pages?.find((p) => p.sections.some((s) => s.kind === "enquiry"))?.slug ?? null;
}

/**
 * The order the home page is shown in. A picture-led layout brings the photos up under the top of the page; an
 * information-led one brings the key facts and the price list up. Nothing is added or removed.
 */
export function arrange(sections: Section[], layout: Layout): Section[] {
  const lead: Section["kind"][] = layout === "showcase" ? ["gallery"] : layout === "essentials" ? ["facts", "services"] : [];
  if (!lead.length || sections[0]?.kind !== "hero") return sections;
  const moved = lead.flatMap((kind) => sections.filter((s) => s.kind === kind));
  return [sections[0], ...moved, ...sections.slice(1).filter((s) => !lead.includes(s.kind))];
}

/** The link to a page. A preview or staff view can swap it for its own (a tab, `?page=`). */
export const defaultPageHref = (slug: string) => (slug ? `?page=${slug}` : "?");

/** Where the booking form posts, and what happened the last time it did. Without it the form is inactive (a preview). */
/** The token is the private preview's. A live site has none: the address it is served on says which site the request is for. */
export type EnquiryProps = { action: string; token?: string; state?: "sent" | "error" };

export type SiteRenderProps = {
  content: SiteContent;
  heroImage?: string;
  enquiry?: EnquiryProps;
  /** The page to show, by slug. Empty or unknown means the home page. */
  page?: string;
  /** Builds the link to a page. Defaults to `?page=slug`. */
  pageHref?: (slug: string) => string;
};

export function SiteRender({ content, heroImage, enquiry, page = "", pageHref = defaultPageHref }: SiteRenderProps) {
  const { business, theme } = content;
  const layout: Layout = (LAYOUTS as readonly string[]).includes(theme.layout ?? "") ? (theme.layout as Layout) : "showcase";
  const shown = pageSections(content, page);
  const current = shown.slug === "" ? { ...shown, sections: flowFor(theme.look, arrange(shown.sections, layout)) } : shown;
  const multi = (content.pages?.length ?? 0) > 0;
  // A page that is one main section under its own title (About, Services, Gallery, FAQs) doesn't repeat the title as a second heading.
  const solo = current.slug !== "" && current.sections.filter((x) => x.kind !== "pagehead" && x.kind !== "cta").length === 1;
  const head = (text: string, label?: string) => (solo ? null : <h2 data-eyebrow={label}>{text}</h2>);
  const bookOn = bookingSlug(content);
  // Every "book" button goes to the form, on this page or on the page that holds it.
  const bookHref = bookOn === null || bookOn === current.slug ? "#book" : `${pageHref(bookOn)}#book`;
  const colour = HEX.test(theme.colour) ? theme.colour : "#1a1a1a";
  const style = { "--accent": colour, "--on-accent": onColour(colour) } as CSSProperties;
  const bookable = bookOn === null ? undefined : [...content.sections, ...(content.pages ?? []).flatMap((p) => p.sections)].find((s): s is Extract<Section, { kind: "enquiry" }> => s.kind === "enquiry");
  const services = serviceChoices(content);
  // The footer lists what they do, from the customer's own service names, and where.
  const serviceNames = [...content.sections, ...(content.pages ?? []).flatMap((p) => p.sections)].flatMap((x) => (x.kind === "services" ? x.items.map((i) => i.name) : [])).filter((n, i, all) => all.indexOf(n) === i).slice(0, 6);
  const reviews = (content.reviews ?? []).filter((review) => review.quote.trim() && review.name.trim());
  const profile = safeHttpsUrl(business.googleProfile);
  const photo = safeImage(heroImage);
  const logo = safeImage(business.logo);
  // A section that draws nothing (a gallery with no usable pictures) gets no nav link, so no link points at nothing.
  const nav = current.sections.flatMap((s) => (ANCHOR_IDS[s.kind] && !(s.kind === "gallery" && !s.images.some((im) => safeImage(im.src))) ? [{ id: ANCHOR_IDS[s.kind]!.id, label: navLabel(s)! }] : []));
  if (!multi && reviews.length) nav.push({ id: "reviews", label: "Reviews" });

  const renderSection = (s: Section, i: number) => {
    switch (s.kind) {
      case "hero":
        return (
          <section key={i} className={css.hero} data-variant={photo && s.variant !== "plain" ? "photo" : "plain"}>
            {photo && s.variant !== "plain" && (
              // eslint-disable-next-line @next/next/no-img-element -- customer uploads come from private storage, not the image optimiser
              <img className={css.heroImg} src={photo} alt="" fetchPriority="high" decoding="async" />
            )}
            <div className={css.heroCopy}>
              {/* With no photograph, the logo leads the page: it is the one picture the customer gave us. */}
              {logo && theme.look !== "executive" && !(photo && s.variant !== "plain") && (
                // eslint-disable-next-line @next/next/no-img-element -- customer logos come from private storage, not the image optimiser
                <img className={css.heroLogo} src={logo} alt={business.name} />
              )}
              {theme.look === "executive" && business.areas && business.areas.length > 0 && (
                <p className={css.areaLine}>
                  {business.areas.slice(0, 3).map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </p>
              )}
              <h1>{theme.look === "executive" ? twoTone(s.headline) : s.headline}</h1>
              <p>{s.intro}</p>
              <span className={css.heroActions}>
                <a className={css.btn} href={bookHref}>
                  {s.cta}
                </a>
                {business.phone && (
                  <a className={css.btnGhost} href={telHref(business.phone)}>
                    Call {business.phone}
                  </a>
                )}
              </span>
            </div>
            {/* A feature card beside the headline, as on a portfolio site: the logo or name, what they do, where, and the number. */}
            <aside className={css.heroCard} aria-label={business.name}>
              {/* The logo is already in the header: the card carries the name, so it is not shown twice. */}
              <b>{business.name}</b>
              {business.tagline && <p>{business.tagline}</p>}
              {business.areas && business.areas.length > 0 && (
                <ul>
                  {business.areas.slice(0, 6).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              {business.phone && <a href={telHref(business.phone)}>{business.phone}</a>}
            </aside>
          </section>
        );
      case "services":
        return (
          <section key={i} id="services" className={css.section} aria-label={solo ? s.heading : undefined}>
            {head(s.heading, "Services")}
            <ul className={css.menu} data-wide={!s.teaser && s.items.length > 5 ? "" : undefined}>
              {(s.teaser ? s.items.slice(0, s.teaser) : s.items).map((it, j) => (
                <li key={j}>
                  <span className={css.menuName}>{it.name}</span>
                  {it.price && <span className={css.price}>{it.price}</span>}
                  {it.description && <span className={css.menuText}>{it.description}</span>}
                </li>
              ))}
            </ul>
            {s.teaser && s.items.length > s.teaser && (
              <a className={css.more} href={pageHref("services")}>
                See all {s.items.length}
              </a>
            )}
          </section>
        );
      case "hours":
        return (
          <section key={i} id="hours" className={css.section}>
            <h2 data-eyebrow="Opening hours">{s.heading}</h2>
            <dl className={css.hours}>
              {s.items.map((h, j) => (
                <div key={j} data-closed={h.closed ? "" : undefined}>
                  <dt>{h.day}</dt>
                  <dd>{hoursText(h)}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      case "gallery": {
        const images = s.images.flatMap((im) => {
          const src = safeImage(im.src);
          return src ? [{ src, alt: im.alt }] : [];
        });
        if (!images.length) return null;
        // On its own page the photos keep their own shapes, and a description the customer wrote is shown as a caption.
        if (current.slug === "gallery") {
          const caption = (alt: string) => (alt && !alt.toLowerCase().startsWith(`${business.name.toLowerCase()} photo`) ? alt : null);
          return (
            <section key={i} id="gallery" className={css.section} aria-label={solo ? s.heading : undefined}>
              {head(s.heading, "Gallery")}
              <div className={css.wall}>
                {images.map((im, j) => (
                  <figure key={j}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- see the hero image */}
                    <img src={im.src} alt={im.alt} loading="lazy" />
                    {caption(im.alt) && <figcaption>{caption(im.alt)}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          );
        }
        return (
          <section key={i} id="gallery" className={css.section} aria-label={solo ? s.heading : undefined}>
            {head(s.heading, "Gallery")}
            <div className={css.gallery} data-count={Math.min(images.length, 6)} tabIndex={0} role="group" aria-label={`${s.heading}: photos`}>
              {images.map((im, j) => (
                // eslint-disable-next-line @next/next/no-img-element -- see the hero image
                <img key={j} src={im.src} alt={im.alt} loading="lazy" />
              ))}
            </div>
          </section>
        );
      }
      case "facts":
        return (
          <section key={i} className={css.facts}>
            {s.items.map((f, j) => (
              <p key={j}>
                <b>{f.value}</b>
                <span>{f.label}</span>
              </p>
            ))}
          </section>
        );
      case "area":
        return (
          <section key={i} id="find-us" className={css.section}>
            <h2 data-eyebrow="Find us">{s.heading}</h2>
            <p className={css.body}>{s.text}</p>
            {business.address && (
              <a className={css.more} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}>
                Get directions
              </a>
            )}
            {business.address && (current.slug === "contact" || !multi) && (
              <iframe className={css.map} title={`Map of ${business.address}`} src={mapsEmbedUrl(business.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            )}
          </section>
        );
      case "enquiry":
        return (
          <section key={i} id="book" className={`${css.section} ${css.book}`}>
            <div className={css.bookIntro}>
              <h2 data-eyebrow="Get in touch">{s.heading}</h2>
              <p className={css.body}>{s.intro}</p>
              {(business.phone || business.email) && (
                <p className={css.contact}>
                  {business.phone && <a href={telHref(business.phone)}>{business.phone}</a>}
                  {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
                </p>
              )}
            </div>
            {enquiry?.state === "sent" ? (
              <div className={css.sent} role="status">
                <b>Request sent</b>
                <span>Thanks. {business.name} has your request and will reply to confirm a time.</span>
              </div>
            ) : (
              <form className={css.form} action={enquiry?.action} method={enquiry ? "post" : undefined} encType={enquiry ? "multipart/form-data" : undefined}>
                {enquiry?.state === "error" && (
                  <p className={css.formError} role="alert">
                    That didn&apos;t send. Check your phone number or email and try again.
                  </p>
                )}
                {enquiry?.token && <input type="hidden" name="token" value={enquiry.token} />}
                {/* The page the form is on, so the visitor comes back to it with the confirmation. */}
                {enquiry && <input type="hidden" name="page" value={current.slug} />}
                {/* A field real visitors never see: bots fill it in, and the request is dropped. */}
                <input className={css.trap} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label>
                  Name
                  <input name="name" autoComplete="name" maxLength={80} required />
                </label>
                <label>
                  Phone or email
                  <input name="contact" autoComplete="email" maxLength={120} required />
                </label>
                {services.length > 0 && (
                  <label>
                    Service
                    <select name="service" required defaultValue="">
                      <option value="" disabled>
                        Choose a service
                      </option>
                      {services.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Photo <span className={css.optional}>(optional)</span>
                  <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
                </label>
                <label>
                  {s.prompt || "Anything we should know?"}
                  <textarea name="message" rows={3} maxLength={1000} />
                </label>
                <button className={css.btn} type={enquiry ? "submit" : "button"}>
                  {s.cta}
                </button>
              </form>
            )}
          </section>
        );
      case "faq":
        return (
          <section key={i} id="faq" className={css.section} aria-label={solo ? s.heading : undefined}>
            {head(s.heading, "Questions")}
            <div className={css.faq}>
              {s.items.map((q, j) => (
                <details key={j}>
                  <summary>{q.question}</summary>
                  <p>{q.answer}</p>
                </details>
              ))}
            </div>
            {/* On its own page, where to go if the answer isn't there: only the customer's own phone and request form. */}
            {current.slug === "faq" && (business.phone || bookable) && (
              <p className={css.faqMore}>
                Can&apos;t see your answer?{" "}
                {business.phone && (
                  <>
                    Call <a href={telHref(business.phone)}>{business.phone}</a>
                    {bookable ? " or " : "."}
                  </>
                )}
                {bookable && (
                  <>
                    <a href={bookHref}>send a request</a>.
                  </>
                )}
              </p>
            )}
          </section>
        );
      case "cta":
        return (
          <section key={i} className={css.closing}>
            <h2>{s.headline}</h2>
            <a className={css.btn} href={bookHref}>
              {s.cta}
            </a>
          </section>
        );
      case "pagehead":
        return (
          <section key={i} className={css.pagehead}>
            <h1>{s.headline}</h1>
            <p>{s.intro}</p>
          </section>
        );
      case "about": {
        const photo = s.image && safeImage(s.image.src) ? { src: safeImage(s.image.src)!, alt: s.image.alt } : null;
        return (
          <section key={i} id="about" className={`${css.section} ${css.about}`} data-photo={photo ? "" : undefined} aria-label={solo ? s.heading : undefined}>
            <div className={css.aboutText}>
              {head(s.heading, "About")}
              {s.text && <p className={css.body}>{s.text}</p>}
              {s.points.length > 0 && (
                <dl className={css.points}>
                  {s.points.map((pt, j) => (
                    <div key={j}>
                      <dt>{pt.label}</dt>
                      {/* A line of proof is one fact per line, not one run-on paragraph. */}
                      <dd>
                        {pt.text
                          .split(/(?<=[.!?])\s+/)
                          .filter(Boolean)
                          .map((line, k) => (
                            <span key={k} className={css.proofLine}>
                              {line}
                            </span>
                          ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- see the hero image
              <img className={css.aboutImg} src={photo.src} alt={photo.alt} loading="lazy" />
            )}
          </section>
        );
      }
    }
  };
  // Neighbouring "hours" and "find us" sections are shown as one pair.
  const groups: { s: Section; i: number }[][] = [];
  current.sections.forEach((s, i) => {
    const last = groups[groups.length - 1];
    const pairs = (k: Section["kind"]) => k === "hours" || k === "area";
    if (last && last.length === 1 && pairs(s.kind) && pairs(last[0].s.kind) && last[0].s.kind !== s.kind) last.push({ s, i });
    else groups.push([{ s, i }]);
  });

  return (
    <div className={css.site} data-look={theme.look} data-layout={layout} style={style}>
      <header className={css.nav}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- customer logos come from private storage, not the image optimiser
          <img className={css.logoImg} src={logo} alt={business.name} />
        ) : (
          <b className={css.logo}>{business.name}</b>
        )}
        <nav aria-label={multi ? "Pages" : "Sections"} className={css.links}>
          {multi
            ? [{ slug: "", title: "Home" }, ...(content.pages ?? [])].map((p) => (
                <a key={p.slug} href={pageHref(p.slug)} aria-current={p.slug === current.slug ? "page" : undefined}>
                  {p.title}
                </a>
              ))
            : nav.map((n) => (
                <a key={n.id} href={`#${n.id}`}>
                  {n.label}
                </a>
              ))}
        </nav>
        {business.phone && (
          <a className={`${css.btnGhost} ${css.call}`} href={telHref(business.phone)}>
            Call
          </a>
        )}
        {bookable && (
          <a className={css.btn} href={bookHref}>
            {bookable.cta}
          </a>
        )}
      </header>

      {groups.map((group, g) =>
        group.length > 1 || group[0].s.kind === "hours" || group[0].s.kind === "area" ? (
          // Hours and where to find the business sit side by side: together they answer "can I come now?".
          <div key={g} className={css.info}>
            {group.map(({ s, i }) => renderSection(s, i))}
          </div>
        ) : (
          renderSection(group[0].s, group[0].i)
        ),
      )}

      {current.slug === "" && reviews.length > 0 && (
        <section id="reviews" className={css.section}>
          <h2 data-eyebrow="Reviews">Reviews</h2>
          <ul className={css.reviews} role="list">
            {reviews.map((review) => (
              <li key={`${review.name}-${review.quote.slice(0, 24)}`}>
                <blockquote>
                  <p>{review.quote}</p>
                  <footer>
                    {review.name}
                    {review.source ? <span>{review.source}</span> : null}
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className={css.foot}>
        <div>
          <b className={css.logo}>{business.name}</b>
          {business.tagline && <span>{business.tagline}</span>}
        </div>
        {serviceNames.length > 0 && (
          <div>
            <b className={css.footHead}>Services</b>
            {serviceNames.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        )}
        {business.areas && business.areas.length > 0 && (
          <div>
            <b className={css.footHead}>Areas</b>
            {business.areas.slice(0, 8).map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        )}
        {(business.address || business.phone || business.email || profile) && (
          <div>
            <b className={css.footHead}>Contact</b>
            {business.address && <span>{business.address}</span>}
            {business.phone && <a href={telHref(business.phone)}>{business.phone}</a>}
            {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
            {profile && (
              <a href={profile} rel="noopener noreferrer">
                Google Business Profile
              </a>
            )}
          </div>
        )}
        {multi && (
          <div>
            {[{ slug: "", title: "Home" }, ...(content.pages ?? [])].map((p) => (
              <a key={p.slug} href={pageHref(p.slug)}>
                {p.title}
              </a>
            ))}
          </div>
        )}
      </footer>

      {/* On a phone the two things a visitor wants stay within reach of a thumb. */}
      {(bookable || business.phone) && (
        <div className={css.dock}>
          {business.phone && (
            <a className={css.btnGhost} href={telHref(business.phone)}>
              Call us
            </a>
          )}
          {bookable && (
            <a className={css.btn} href={bookHref}>
              {bookable.cta}
            </a>
          )}
        </div>
      )}

      {business.whatsapp && (
        <a className={css.whatsapp} href={whatsappHref(business.whatsapp)} rel="noopener noreferrer">
          WhatsApp
        </a>
      )}
    </div>
  );
}
