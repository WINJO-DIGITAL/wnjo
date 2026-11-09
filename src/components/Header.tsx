"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { primaryNav, type NavItem, type NavLink, type NavMenu, contactPhoneHref } from "@/lib/site";
import { AccountMenu } from "./account/AccountMenu";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { Logo } from "./Logo";
import { ScrollProgress } from "./ScrollProgress";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const isCurrent = (pathname: string, item: NavItem) =>
  isActive(pathname, item.href) || (item.also ?? []).some((href) => isActive(pathname, href));

function Chevron({ dir = "down", size = 10 }: { dir?: "down" | "right" | "left"; size?: number }) {
  const rotate = { down: 0, right: -90, left: 90 }[dir];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M1.5 3.25 5 6.75l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Header navigations carry this type, so the page cross-fades (see app/template.tsx). */
const NAV = ["nav-menu"];

type OnNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => void;

function MenuLink({
  link,
  className,
  current,
  onNavigate,
}: {
  link: NavLink;
  className?: string;
  current?: boolean;
  onNavigate?: OnNavigate;
}) {
  if (link.external) {
    return (
      <a href={link.href} className={className} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
        {link.label}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link
      href={link.href}
      className={className}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      transitionTypes={NAV}
    >
      {link.label}
    </Link>
  );
}

/** The contents of a menu: large primary links, then smaller groups. Shared by desktop and mobile. */
function MenuContents({
  menu,
  variant,
  current,
  onNavigate,
}: {
  menu: NavMenu;
  variant: "flyout" | "mobile";
  /** The link to underline: the one last pressed, or the page you're on. */
  current: NavLink | null;
  /** The click handler for each link (it's told which link was pressed). */
  onNavigate: (link: NavLink) => OnNavigate;
}) {
  let i = 0;
  return (
    <div className={`menu menu--${variant}`}>
      <ul role="list" className="menu__primary">
        {menu.primary.map((link) => (
          <li key={link.label} style={{ "--i": i++ } as React.CSSProperties}>
            <MenuLink link={link} current={link === current} onNavigate={onNavigate(link)} />
          </li>
        ))}
      </ul>
      {menu.groups.map((group) => (
        <div key={group.title} className="menu__group" style={{ "--i": i++ } as React.CSSProperties}>
          <p className="menu__title">{group.title}</p>
          <ul role="list">
            {group.links.map((link) => (
              <li key={link.label}>
                <MenuLink link={link} current={link === current} onNavigate={onNavigate(link)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The link in a menu to underline: the one last pressed, while you're still on its page;
 * otherwise the first link to the page you're on (several can share a page).
 */
function currentLink(menu: NavMenu, pathname: string, picked: NavLink | null): NavLink | null {
  const links = [...menu.primary, ...menu.groups.flatMap((g) => g.links)];
  if (picked && picked.href.split("#")[0] === pathname) {
    const match = links.find((l) => l.href === picked.href && l.label === picked.label);
    if (match) return match;
  }
  return links.find((l) => l.href === pathname) ?? null;
}

function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile menu
  const [sub, setSub] = useState<number | null>(null); // mobile submenu
  const [lastSub, setLastSub] = useState<number | null>(null);
  // The option whose sub-menu you just came Back from: it keeps the line while the menu is open.
  const [backFrom, setBackFrom] = useState<number | null>(null);
  const [flyout, setFlyout] = useState<number | null>(null); // desktop flyout
  const [lastFlyout, setLastFlyout] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [picked, setPicked] = useState<NavLink | null>(null); // the menu link last pressed
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  // On the homepage, the nav item for the section in view (sections carry data-nav="/path").
  const [spy, setSpy] = useState<string | null>(null);
  const pointing = useRef(false);

  // The line under the nav: rests under the current section, follows hover and focus.
  const moveBar = useCallback((link: HTMLElement | null | undefined) => {
    const nav = navRef.current;
    if (!nav) return;
    if (!link) return setBar((b) => ({ ...b, on: false }));
    const pad = parseFloat(getComputedStyle(link).paddingLeft) || 0;
    const x = link.getBoundingClientRect().left - nav.getBoundingClientRect().left + pad;
    setBar({ x, w: link.offsetWidth - pad * 2, on: true });
  }, []);
  const restBar = useCallback(
    () =>
      moveBar(navRef.current?.querySelector<HTMLElement>('.nav-link[aria-current="page"], .nav-link[data-section]')),
    [moveBar],
  );

  useEffect(() => {
    if (!pointing.current) restBar();
    window.addEventListener("resize", restBar);
    // Web fonts change link widths once they load.
    document.fonts?.ready.then(restBar).catch(() => {});
    return () => window.removeEventListener("resize", restBar);
  }, [pathname, spy, restBar]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-nav]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = sections[0]?.dataset.nav ?? null;
      for (const section of sections)
        if (section.getBoundingClientRect().top <= line) current = section.dataset.nav ?? null;
      setSpy(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);
  const openTimer = useRef<number | null>(null);
  // Desktop flyout height, measured so the panel glides between menus of different heights.
  const measureRef = useRef<HTMLDivElement>(null);
  const [flyoutHeight, setFlyoutHeight] = useState(0);
  const [switching, setSwitching] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const subRef = useRef<number | null>(null);

  // Close everything whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setSub(null);
    setFlyout(null);
  }

  const closeAll = useCallback(() => {
    setOpen(false);
    setSub(null);
    setFlyout(null);
  }, []);

  // Menus close in the same render as the new page, so an open menu is part of the
  // outgoing snapshot and fades away with the old page rather than vanishing first.
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(false);
    setSub(null);
    setFlyout(null);
  }

  /**
   * For menu links: a link to another page closes the menu with the navigation (above);
   * one to this page, or to another site in a new tab, closes it now.
   */
  const closeIfSamePage = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const url = new URL(e.currentTarget.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) closeAll();
    },
    [closeAll],
  );

  const pickAndNavigate = (link: NavLink) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    setPicked(link);
    closeIfSamePage(e);
  };

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  };

  const showFlyout = (i: number | null) => {
    // Moving from one open menu to another gets a quicker cross-fade than opening from closed.
    setSwitching(flyout !== null && i !== null && i !== flyout);
    setFlyout(i);
    if (i !== null) setLastFlyout(i);
  };

  // Apple-style intent: a short delay before opening, instant switching once open.
  const hoverItem = (i: number | null) => {
    clearTimers();
    if (flyout !== null) return showFlyout(i);
    if (i === null) return;
    openTimer.current = window.setTimeout(() => showFlyout(i), 140);
  };

  const leaveHeader = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setFlyout(null), 160);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    const el = measureRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setFlyoutHeight(Math.ceil(entry.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Desktop flyout: Escape closes it and returns focus to its toggle.
  useEffect(() => {
    if (flyout === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const toggle = document.querySelector<HTMLButtonElement>(`[data-flyout-toggle="${flyout}"]`);
      setFlyout(null);
      toggle?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flyout]);

  // Mobile menu: lock scroll, Escape steps back then closes, close on desktop resize.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (subRef.current !== null) {
        setSub(null);
      } else {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => window.matchMedia("(min-width: 74rem)").matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    subRef.current = sub;
  }, [sub]);

  // Move focus to the first item of whichever mobile view just appeared.
  useEffect(() => {
    if (!open) return;
    const selector = sub === null ? ".mm-pane--root a, .mm-pane--root button" : ".mm-pane--sub button";
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>(selector)?.focus());
  }, [open, sub]);

  const openSub = (i: number) => {
    setSub(i);
    setLastSub(i);
  };

  const flyoutItem = lastFlyout !== null ? primaryNav[lastFlyout] : null;
  const subItem = lastSub !== null ? primaryNav[lastSub] : null;

  return (
    <>
      <header
        className="site-header"
        style={{ viewTransitionName: "site-header" }}
        data-scrolled={scrolled || open || flyout !== null}
        data-open={open || flyout !== null}
        onMouseLeave={leaveHeader}
        onMouseEnter={() => closeTimer.current && window.clearTimeout(closeTimer.current)}
      >
        <div className="container container--wide site-header__inner">
          <Link
            href="/"
            className="brand"
            aria-label="WINJO DIGITAL home"
            onMouseEnter={() => hoverItem(null)}
            onClick={closeIfSamePage}
            transitionTypes={NAV}
          >
            <Logo preload />
          </Link>

          <nav className="nav-desktop" aria-label="Main" ref={navRef}>
            <ul
              role="list"
              onMouseEnter={() => (pointing.current = true)}
              onMouseLeave={() => {
                pointing.current = false;
                restBar();
              }}
            >
              {primaryNav.map((item, i) =>
                item.mobileOnly ? null : (
                  <li
                    key={item.href}
                    className="nav-item"
                    onMouseEnter={(e) => {
                      hoverItem(item.menu ? i : null);
                      moveBar(e.currentTarget.querySelector<HTMLElement>(".nav-link"));
                    }}
                  >
                    <Link
                      href={item.href}
                      className="nav-link"
                      aria-current={isCurrent(pathname, item) ? "page" : undefined}
                      data-active={flyout === i || undefined}
                      data-section={(spy === item.href && !isCurrent(pathname, item)) || undefined}
                      onFocus={(e) => moveBar(e.currentTarget)}
                      onBlur={restBar}
                      onClick={(e) => {
                        clearTimers();
                        closeIfSamePage(e);
                      }}
                      transitionTypes={NAV}
                    >
                      {item.label}
                    </Link>
                    {item.menu && (
                      <button
                        type="button"
                        className="nav-chevron"
                        data-flyout-toggle={i}
                        aria-expanded={flyout === i}
                        aria-controls="nav-flyout"
                        aria-label={`${item.label} menu`}
                        onClick={() => {
                          clearTimers();
                          showFlyout(flyout === i ? null : i);
                          if (flyout !== i) {
                            window.requestAnimationFrame(() =>
                              flyoutRef.current?.querySelector<HTMLElement>("a")?.focus(),
                            );
                          }
                        }}
                      >
                        <Chevron />
                      </button>
                    )}
                  </li>
                ),
              )}
            </ul>
            <span
              className="nav-indicator"
              aria-hidden="true"
              data-on={bar.on || undefined}
              style={{ transform: `translateX(${bar.x}px)`, width: bar.w }}
            />
          </nav>

          <div className="header-cta" onMouseEnter={() => hoverItem(null)}>
            <AccountMenu signedOutLink />
            <Link href="/build" className="btn btn--primary btn--sm" onClick={closeIfSamePage} transitionTypes={NAV}>
              Build my website
            </Link>
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => {
              setOpen((v) => !v);
              setSub(null);
              setBackFrom(null);
            }}
          >
            <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
            <span className="menu-toggle__bars" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>

        {/* Desktop flyout: inside the header so it drops from the bar. */}
        <div
          id="nav-flyout"
          ref={flyoutRef}
          className="flyout"
          data-open={flyout !== null}
          data-switch={switching || undefined}
          aria-hidden={flyout === null}
          inert={flyout === null}
          style={
            {
              "--flyout-h": `${flyout !== null ? flyoutHeight : 0}px`,
              viewTransitionName: "nav-flyout",
            } as React.CSSProperties
          }
        >
          <div className="flyout__clip">
            <div ref={measureRef}>
              <div className="container container--wide flyout__inner" key={lastFlyout ?? "none"}>
                {flyoutItem?.menu && (
                  <MenuContents
                    menu={flyoutItem.menu}
                    variant="flyout"
                    current={currentLink(flyoutItem.menu, pathname, picked)}
                    onNavigate={pickAndNavigate}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <ScrollProgress />
      </header>

      {/* Blurs the page behind the desktop flyout. Outside <header> so Safari sizes it to the viewport. */}
      <div
        className="nav-backdrop"
        data-open={flyout !== null}
        aria-hidden="true"
        onMouseEnter={() => setFlyout(null)}
        style={{ viewTransitionName: "nav-backdrop" }}
      />

      {/* Mobile menu, outside <header>: Safari sizes fixed children of a backdrop-filtered parent to that parent. */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className="mobile-menu"
        hidden={!open}
        data-sub={sub !== null}
        style={{ viewTransitionName: "mobile-menu" }}
      >
        <nav
          aria-label="Main mobile"
          className="mm-pane mm-pane--root"
          inert={sub !== null}
          data-back={backFrom !== null || undefined}
        >
          <ul role="list">
            {primaryNav.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as React.CSSProperties}>
                {item.menu ? (
                  <button
                    type="button"
                    className="mm-link"
                    onClick={() => openSub(i)}
                    aria-label={`${item.label}: more`}
                    data-current={
                      (backFrom === null ? isCurrent(pathname, item) || spy === item.href : backFrom === i) || undefined
                    }
                  >
                    {item.label}
                    <Chevron dir="right" size={14} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className="mm-link"
                    aria-current={isCurrent(pathname, item) ? "page" : undefined}
                    data-current={spy === item.href || undefined}
                    onClick={closeIfSamePage}
                    transitionTypes={NAV}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Link
            href="/build"
            className="btn btn--primary mm-cta"
            onClick={closeIfSamePage}
            transitionTypes={NAV}
            style={{ "--i": primaryNav.length } as React.CSSProperties}
          >
            Build my website
          </Link>
          {contactPhoneHref && (
            <a
              href={contactPhoneHref}
              className="btn btn--secondary mm-cta"
              style={{ "--i": primaryNav.length + 1 } as React.CSSProperties}
            >
              Call us
            </a>
          )}
        </nav>

        <div className="mm-pane mm-pane--sub" inert={sub === null} aria-hidden={sub === null}>
          {subItem?.menu && (
            <div key={lastSub}>
              <button
                type="button"
                className="mm-back"
                onClick={() => {
                  setBackFrom(sub);
                  setSub(null);
                }}
              >
                <Chevron dir="left" size={14} />
                <span>Back</span>
              </button>
              <MenuContents
                menu={subItem.menu}
                variant="mobile"
                current={currentLink(subItem.menu, pathname, picked)}
                onNavigate={pickAndNavigate}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** The client and staff dashboards get their own top bar; every other page gets the site header. */
export function Header() {
  const pathname = usePathname();
  // A private preview shows the customer's website, not ours.
  if (pathname.startsWith("/preview/")) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <DashboardHeader variant="staff" />;
  if (pathname === "/account" || pathname.startsWith("/account/")) return <DashboardHeader variant="customer" />;
  return <SiteHeader />;
}
