import Link from "next/link";
import { faqs } from "@/lib/faq";

/**
 * Answers at a glance: each question is a card with its short answer large, and the full
 * answer a tap away (built on <details>, so it works without JavaScript). Anyone with a
 * question left is one tap from asking.
 */
export function Faq() {
  return (
    <>
      <div className="faq">
        {faqs.map((item) => (
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
      <aside className="faq-ask inverse" aria-labelledby="faq-ask-title">
        <h2 id="faq-ask-title" className="faq-ask__title">
          Still have a <span className="serif-em">question?</span>
        </h2>
        <p>Ask us anything. We reply within one working day, Monday to Friday.</p>
        <div className="btn-row">
          <Link href="/contact?topic=other" className="btn btn--primary">
            Talk to us
          </Link>
          <Link href="/build" className="btn btn--secondary">
            Get my price
          </Link>
        </div>
      </aside>
    </>
  );
}
