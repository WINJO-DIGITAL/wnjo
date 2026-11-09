"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { faqs, groupFaqs, matchesFaq } from "@/lib/faq";

/**
 * Questions grouped by topic. Each answer is a <details>, so the whole list works without JavaScript. The search
 * box only appears once the page is running, so nobody sees a control that does nothing.
 */
export function Faq() {
  const [query, setQuery] = useState("");
  // False on the server and during the first render; true once the page is running in the browser.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const inputId = useId();
  const status = useId();

  const groups = groupFaqs();
  const visible = faqs.filter((item) => matchesFaq(item, query));
  const count = visible.length;

  return (
    <>
      {ready && (
        <div className="faq-search" role="search">
          <label htmlFor={inputId} className="acct-label">Search questions</label>
          <input
            id={inputId}
            type="search"
            className="acct-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “prices” or “hosting”"
            autoComplete="off"
            aria-describedby={status}
          />
          <p id={status} className="acct-meta" aria-live="polite">
            {query.trim() ? `${count} ${count === 1 ? "question matches" : "questions match"}` : ""}
          </p>
        </div>
      )}

      {groups.map((group) => {
        const items = group.items.filter((item) => matchesFaq(item, query));
        if (items.length === 0) return null;
        return (
          <section key={group.id} className="faq-group" aria-labelledby={`faq-${group.id}`}>
            <h2 id={`faq-${group.id}`} className="faq-group__title">{group.title}</h2>
            <div className="faq">
              {items.map((item) => (
                <details key={item.q} className="faq__item">
                  <summary>
                    <span className="faq__q">{item.q}</span>
                    <span className="faq__short">{item.short}</span>
                    <span className="faq__more">
                      Full answer <span className="faq__icon" aria-hidden="true" />
                    </span>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        );
      })}

      {ready && count === 0 && (
        <p className="acct-meta">No questions match that search. <Link href="/contact?topic=other">Ask us directly</Link>.</p>
      )}

      <aside className="faq-ask inverse" aria-labelledby="faq-ask-title">
        <h2 id="faq-ask-title" className="faq-ask__title">
          Still have a question?
        </h2>
        <p>Ask us anything, and we&apos;ll reply.</p>
        <div className="btn-row">
          <Link href="/contact?topic=other" className="btn btn--primary">
            Talk to us
          </Link>
          <Link href="/build" className="btn btn--secondary">
            Build my website
          </Link>
        </div>
      </aside>
    </>
  );
}
