# API reference

WNJO has one public HTTP endpoint and a set of database functions that the signed-in site calls directly. Both enforce their own rules; the caller's input is always validated.

## POST /api/enquiry
Submits a contact message or a project brief.

**Request** — JSON, at most 32 KB.

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | `"contact"` or `"brief"` | yes | Briefs carry the questionnaire answers and are re-priced on the server. |
| `name` | string | yes | |
| `email` | string | yes | Lower-cased. |
| `company` | string | no | |
| `topic` | string | yes | One of the enquiry topics (for example `website`, `bespoke`). Unknown values become `other`. |
| `budget` | string | no | One of the budget bands. |
| `timeline` | string | no | One of the timeline options. |
| `message` | string | contact: yes | Brief: optional additional notes. |
| `startedAt` | number | yes | Time the form was opened (ms since epoch). Submissions faster than 2.5 seconds are treated as automated. |
| `website` | string | no | Honeypot. Humans leave it empty; if it's filled the request is accepted but ignored. |
| `answers`, `business`, `goals`, `launchDate` | — | brief only | Questionnaire answers and project details. |

**Responses**
| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "ok": true, "reference": "WNJO-XXXXXX" }` | Saved and/or emailed. The reference is quoted to the customer. |
| 400 | `{ "error": "..." }` | Body is not valid JSON or not an object. |
| 413 | `{ "error": "..." }` | Body too large. |
| 422 | `{ "error": "...", "fields": { ... } }` | Validation failed; `fields` gives a message per field. |
| 429 | `{ "error": "..." }` | Too many submissions from one connection. Try again in a few minutes. |
| 502 | `{ "error": "..." }` | Neither saving nor emailing succeeded. The customer should try again. |
| 503 | `{ "error": "...", "code": "not_configured" }` | Neither storage nor email is configured. |

Saving happens first, so an enquiry survives an email failure. Enquiries are emailed to the address in `ENQUIRY_TO_EMAIL` when email is configured.

## Database functions (called by the signed-in site)
All are `security definer` with `search_path` set, are granted to `authenticated` only, and check the caller themselves.

| Function | Arguments | Who may call | Effect |
|---|---|---|---|
| `accept_quote(version_id, name, terms_version, user_agent?)` | uuid, text, text, text | A member of the client organisation the quote was issued to | Records the acceptance, marks the quote accepted. Only the latest, open, unexpired version can be accepted, once. Returns the acceptance id. |
| `decline_quote(version_id, reason?)` | uuid, text | Same as above | Marks the quote declined. |
| `decide_approval(request_id, decision, comment?)` | uuid, text (`approve` or `request_changes`), text | A member of the client organisation that owns the project | Records the decision once. Changes need a comment of at least three characters. Returns the response id. |

Errors are raised with a Postgres error code and a message safe to show: `42501` (not signed in), `P0002` (not found, which is also returned for records the caller can't see), `22023` (the request is not allowed in the current state).

## Server-only operations
Quote storage (`store_quote`), enquiry saving and agent run recording use the server's secret key and are not callable from the browser. They are described in [SECURITY.md](SECURITY.md).

## Tables the site reads directly
The signed-in site reads tables through the Supabase client, limited by row-level security. Each read returns only what the signed-in person may see: their own orders, notifications and quotes; their organisation's projects, messages (customer-visible only) and files (customer-visible only); and, for agency staff, their tenant's records. Writes from the browser are limited to the cases listed in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
