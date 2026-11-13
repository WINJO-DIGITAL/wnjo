"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { contactPhoneHref } from "@/lib/site";
import { PLAN_EVENT } from "@/lib/plan-selection";
import { WEBSITE_PLANS, type WebsitePlanId } from "@/lib/pricing";

/** Pages that already are the next step, so the bar would only get in the way. */
const HIDDEN_ON = ["/contact", "/build", "/build/project", "/account", "/admin"];

/**
 * Phones and tablets: once the visitor has scrolled past the opening screen, a slim bar
 * slides up with the two next steps. It steps aside over sections that already offer them
 * (the hero and its showcase, call-to-action bands, the footer) and whenever another
 * button reaches the strip along the bottom it would cover.
 */
export function StickyCta() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  // The plan chosen on the homepage, so the bar can carry it into the calculator.
  const [plan, setPlan] = useState<string | null>(null);
  useEffect(() => {
    const onPlan = (e: Event) => setPlan((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener(PLAN_EVENT, onPlan);
    return () => window.removeEventListener(PLAN_EVENT, onPlan);
  }, []);
  // The pricing page is where a plan is chosen, so the bar comes up the moment one is picked (and goes when it is
  // cleared); it steps aside only over the footer. Only the homepage waits for the visitor to scroll.
  const [footerInView, setFooterInView] = useState(false);
  useEffect(() => {
    if (pathname !== "/pricing") return;
    const footer = document.querySelector(".site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting));
    observer.observe(footer);
    return () => {
      observer.disconnect();
      setFooterInView(false);
    };
  }, [pathname]);
  useEffect(() => {
    if (HIDDEN_ON.includes(pathname) || pathname === "/pricing") return;
    if (pathname === "/") {
      // Homepage: the bar takes over once the hero (which ends with the top "Get started" button) has scrolled away,
      // on every screen size, and steps aside only over the footer.
      let topVisible = true;
      let footerVisible = false;
      let closingVisible = false;
      const apply = () => setShow(!topVisible && !footerVisible && !closingVisible);
      // The closing band already offers the same next step, so the bar doesn't repeat it there.
      const closingObserver = new IntersectionObserver(([entry]) => {
        closingVisible = entry.isIntersecting;
        apply();
      });
      const topObserver = new IntersectionObserver(([entry]) => {
        topVisible = entry.isIntersecting;
        apply();
      });
      const footerObserver = new IntersectionObserver(([entry]) => {
        footerVisible = entry.isIntersecting;
        apply();
      });
      // The hero is part of the page; if it isn't there yet when this bar mounts, wait for it.
      let watched: Element | null = null;
      const attach = () => {
        const top = document.querySelector(".hero-ed");
        const footer = document.querySelector(".site-footer");
        if (top && top !== watched) {
          watched = top;
          topObserver.observe(top);
        }
        if (footer) footerObserver.observe(footer);
        const closing = document.querySelector(".cta-band");
        if (closing) closingObserver.observe(closing);
        return Boolean(top);
      };
      const found = attach();
      const waiter = found ? null : new MutationObserver(() => attach() && waiter?.disconnect());
      waiter?.observe(document.body, { childList: true, subtree: true });
      return () => {
        waiter?.disconnect();
        topObserver.disconnect();
        footerObserver.disconnect();
        closingObserver.disconnect();
        setShow(false);
      };
    }
    const blockers = new Set<Element>();
    let frame = 0;
    const update = () => {
      frame = 0;
      setShow(window.scrollY > window.innerHeight * 0.75 && blockers.size === 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const track = (entries: IntersectionObserverEntry[]) => {
      for (const e of entries) {
        if (e.isIntersecting) blockers.add(e.target);
        else blockers.delete(e.target);
      }
      schedule();
    };
    // Sections that already are the next step: anywhere on screen.
    const sections = new IntersectionObserver(track);
    document.querySelectorAll(".cta-band, .site-footer, [data-cta-hide]").forEach((el) => sections.observe(el));
    // Other buttons only matter in the strip the bar covers, along the bottom of the screen.
    const buttons = new IntersectionObserver(track, { rootMargin: "-82% 0px 0px 0px" });
    document.querySelectorAll("main .btn").forEach((el) => buttons.observe(el));
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      sections.disconnect();
      buttons.disconnect();
      window.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      setShow(false);
    };
  }, [pathname]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const visible = pathname === "/pricing" ? Boolean(plan) && !footerInView : show;
  const chosen = plan && plan in WEBSITE_PLANS ? WEBSITE_PLANS[plan as WebsitePlanId] : null;

  return (
    <aside className="sticky-cta" aria-label="Get started" data-show={visible} data-chosen={chosen ? true : undefined} inert={!visible}>
      {chosen ? (
        <Link href={`/build?plan=${plan}`} className="btn btn--primary">
          Continue with {chosen.name}
        </Link>
      ) : (
        <Link href="#packages" className="btn btn--primary">
          Choose a package
        </Link>
      )}
      {contactPhoneHref ? (
        <a href={contactPhoneHref} className="btn btn--secondary">
          Call us
        </a>
      ) : (
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Email us
        </Link>
      )}
    </aside>
  );
}
