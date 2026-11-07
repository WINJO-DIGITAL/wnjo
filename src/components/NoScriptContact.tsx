import { contactPhoneHref } from "@/lib/site";

// Any time before the visitor submits will do: the server only checks that the form wasn't filled in instantly.
const LOADED_AT = String(Date.now());

/**
 * For visitors without JavaScript: a plain form that posts straight to the enquiry route, which answers with a page.
 * Only a name, email and message are asked for. Shown only when JavaScript is off.
 */
export function NoScriptContact() {
  return (
    <noscript>
      <form className="form noscript-form" action="/api/enquiry" method="post">
        <h2 className="h3">Send us a message</h2>
        <input type="hidden" name="kind" value="contact" />
        <input type="hidden" name="topic" value="other" />
        <input type="hidden" name="startedAt" value={LOADED_AT} />
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="ns-website">Leave this empty</label>
          <input id="ns-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <label htmlFor="ns-name" className="acct-label">Your name</label>
        <input id="ns-name" name="name" type="text" autoComplete="name" required className="acct-input" />
        <label htmlFor="ns-email" className="acct-label">Email address</label>
        <input id="ns-email" name="email" type="email" autoComplete="email" required className="acct-input" />
        <label htmlFor="ns-message" className="acct-label">What do you need?</label>
        <textarea id="ns-message" name="message" required minLength={10} rows={5} className="acct-input" />
        <button type="submit" className="btn btn--primary">Send message</button>
        {contactPhoneHref && (
          <p className="muted">
            Prefer to talk? <a href={contactPhoneHref}>Call us</a>.
          </p>
        )}
      </form>
    </noscript>
  );
}
