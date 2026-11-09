"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { contactPhoneHref } from "@/lib/site";

/** Pages that already are the next step, so the bar would only get in the way. */
const HIDDEN_ON = ["/contact", "/build", "/account", "/admin"];

/**
 * Phones and tablets: once the visitor has scrolled past the opening screen, a slim bar
 * slides up with the two next steps. It steps aside over sections that already offer them
 * (the hero and its showcase, call-to-action bands, the footer) and whenever another
 * button reaches the strip along the bottom it would cover.
 */
export function StickyCta() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (HIDDEN_ON.includes(pathname)) return;
    if (pathname === "/") {
      // Homepage: the bar takes over once the hero (which ends with the top "Build my website" button) has scrolled away,
      // on every screen size, and steps aside only over the footer.
      let topVisible = true;
      let footerVisible = false;
      const apply = () => setShow(!topVisible && !footerVisible);
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
        return Boolean(top);
      };
      const found = attach();
      const waiter = found ? null : new MutationObserver(() => attach() && waiter?.disconnect());
      waiter?.observe(document.body, { childList: true, subtree: true });
      return () => {
        waiter?.disconnect();
        topObserver.disconnect();
        footerObserver.disconnect();
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

  return (
    <aside className="sticky-cta" aria-label="Get started" data-show={show} inert={!show}>
      <Link href="/build" className="btn btn--primary">
        Build my website
      </Link>
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
