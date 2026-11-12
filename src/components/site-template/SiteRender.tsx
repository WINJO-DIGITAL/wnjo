import type { CSSProperties } from "react";
import type { HoursItem, Section, SiteContent } from "@/lib/site-template/schema";
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

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

function hoursText(h: HoursItem): string {
  if (h.closed) return "Closed";
  if (h.open && h.close) return `${h.open} to ${h.close}`;
  return h.open ?? "";
}

function find<K extends Section["kind"]>(content: SiteContent, kind: K): Extract<Section, { kind: K }> | undefined {
  return content.sections.find((s): s is Extract<Section, { kind: K }> => s.kind === kind);
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

/** Where the booking form posts, and what happened the last time it did. Without it the form is inactive (a preview). */
export type EnquiryProps = { action: string; token: string; state?: "sent" | "error" };

export function SiteRender({ content, heroImage, enquiry }: { content: SiteContent; heroImage?: string; enquiry?: EnquiryProps }) {
  const { business, theme } = content;
  const colour = HEX.test(theme.colour) ? theme.colour : "#1a1a1a";
  const style = { "--accent": colour, "--on-accent": onColour(colour) } as CSSProperties;
  const bookable = find(content, "enquiry");
  const photo = safeImage(heroImage);
  // A section that draws nothing (a gallery with no usable pictures) gets no nav link, so no link points at nothing.
  const nav = content.sections.flatMap((s) => (ANCHOR_IDS[s.kind] && !(s.kind === "gallery" && !s.images.some((im) => safeImage(im.src))) ? [{ id: ANCHOR_IDS[s.kind]!.id, label: navLabel(s)! }] : []));

  return (
    <div className={css.site} data-look={theme.look} style={style}>
      <header className={css.nav}>
        <b className={css.logo}>{business.name}</b>
        <nav aria-label="Sections" className={css.links}>
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              {n.label}
            </a>
          ))}
        </nav>
        {bookable && (
          <a className={css.btn} href="#book">
            {bookable.cta}
          </a>
        )}
      </header>

      {content.sections.map((s, i) => {
        switch (s.kind) {
          case "hero":
            return (
              <section key={i} className={css.hero} data-variant={photo && s.variant !== "plain" ? "photo" : "plain"}>
                {photo && s.variant !== "plain" && (
                  // eslint-disable-next-line @next/next/no-img-element -- customer uploads come from private storage, not the image optimiser
                  <img className={css.heroImg} src={photo} alt="" />
                )}
                <div className={css.heroCopy}>
                  <h1>{s.headline}</h1>
                  <p>{s.intro}</p>
                  <span className={css.heroActions}>
                    <a className={css.btn} href="#book">
                      {s.cta}
                    </a>
                    {business.phone && (
                      <a className={css.btnGhost} href={telHref(business.phone)}>
                        Call {business.phone}
                      </a>
                    )}
                  </span>
                </div>
              </section>
            );
          case "services":
            return (
              <section key={i} id="services" className={css.section}>
                <h2>{s.heading}</h2>
                <ul className={css.menu}>
                  {s.items.map((it, j) => (
                    <li key={j}>
                      <span className={css.menuName}>{it.name}</span>
                      {it.price && <span className={css.price}>{it.price}</span>}
                      {it.description && <span className={css.menuText}>{it.description}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          case "hours":
            return (
              <section key={i} id="hours" className={css.section}>
                <h2>{s.heading}</h2>
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
            return (
              <section key={i} id="gallery" className={css.section}>
                <h2>{s.heading}</h2>
                <div className={css.gallery}>
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
                <h2>{s.heading}</h2>
                <p className={css.body}>{s.text}</p>
                {business.address && (
                  <a className={css.link} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}>
                    Get directions
                  </a>
                )}
              </section>
            );
          case "enquiry":
            return (
              <section key={i} id="book" className={`${css.section} ${css.book}`}>
                <h2>{s.heading}</h2>
                <p className={css.body}>{s.intro}</p>
                {enquiry?.state === "sent" ? (
                  <div className={css.sent} role="status">
                    <b>Request sent</b>
                    <span>Thanks. {business.name} has your request and will reply to confirm a time.</span>
                  </div>
                ) : (
                  <form className={css.form} action={enquiry?.action} method={enquiry ? "post" : undefined}>
                    {enquiry?.state === "error" && (
                      <p className={css.formError} role="alert">
                        That didn&apos;t send. Check your phone number or email and try again.
                      </p>
                    )}
                    {enquiry && <input type="hidden" name="token" value={enquiry.token} />}
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
                    <label>
                      {s.prompt || "Anything we should know?"}
                      <textarea name="message" rows={3} maxLength={1000} />
                    </label>
                    <button className={css.btn} type={enquiry ? "submit" : "button"}>
                      {s.cta}
                    </button>
                  </form>
                )}
                {(business.phone || business.email) && (
                  <p className={css.contact}>
                    {business.phone && <a href={telHref(business.phone)}>{business.phone}</a>}
                    {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
                  </p>
                )}
              </section>
            );
          case "faq":
            return (
              <section key={i} id="faq" className={css.section}>
                <h2>{s.heading}</h2>
                <div className={css.faq}>
                  {s.items.map((q, j) => (
                    <details key={j}>
                      <summary>{q.question}</summary>
                      <p>{q.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          case "cta":
            return (
              <section key={i} className={css.closing}>
                <h2>{s.headline}</h2>
                <a className={css.btn} href="#book">
                  {s.cta}
                </a>
              </section>
            );
        }
      })}

      <footer className={css.foot}>
        <span>{business.name}</span>
        {business.address && <span>{business.address}</span>}
      </footer>
    </div>
  );
}
