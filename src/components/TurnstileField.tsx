"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** The bot check. Renders nothing until the public site key is set, so the form works without it. */
export function TurnstileField({ onToken }: { onToken: (token: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let widgetId = "";
    let cancelled = false;
    let timer = 0;

    const render = () => {
      if (cancelled || !el.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(el.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const wait = () => {
      if (window.turnstile) render();
      else timer = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(timer);
          render();
        }
      }, 50);
    };

    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "1";
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      wait();
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={el} className="turnstile" />;
}

export const turnstileRequired = SITE_KEY.length > 0;
