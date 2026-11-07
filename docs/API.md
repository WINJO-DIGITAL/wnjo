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

## Background and staff endpoints

Routes that act for the business. None of them accept a payload that decides who they act for: identity comes from the caller's own sign-in token, or from the server's `CRON_SECRET`.

| Route | Who calls it | Effect | Responses |
|---|---|---|---|
| `GET /api/cron/events` | Vercel Cron, daily 07:45 UTC, with `Authorization: Bearer $CRON_SECRET` | Processes due AI events, runs queued agent tasks (including tasks re-queued by an approval, and stuck tasks recovered), then sends queued customer emails. | 200 `{ events, tasks, notifications }`; 401 wrong secret; 503 not configured; 500 failed. |
| `POST /api/notifications/send` | Any signed-in person, from the staff and client screens after a change | Processes due AI events, then sends queued customer emails. Only work already written to the database is done. | 200 `{ events, mail }`; 401 not signed in; 503 mail not configured (with `events`); 500 failed. |
| `POST /api/admin/approvals/[id]` | Owner or admin of the approval's agency | Body `{ "decision": "approve" \| "reject" }`. Approving allows that tool for that task and re-queues it; rejecting fails the task. | 200 `{ status }`; 401 not signed in; 404 not found or not an owner/admin; 409 already decided; 422 invalid. |
| `POST /api/admin/ai/settings` | Owner or admin of the agency | Body `{ "tenantId", "change" }`. `change` is `{ "action": "budget", "monthlyPence", "warnAtPence" }` or `{ "action": "agent", "agentKey", "enabled", "paused" }`. Every change is written to the audit log. | 200 `{ ok }`; 401 not signed in; 404 not an owner/admin of that agency; 422 invalid (with a `reason`); 500 failed. |
| `POST /api/files/upload-url` | Signed-in person with access to the project | Body `{ projectId, fileName, mimeType, sizeBytes, internal? }`. Returns a one-time upload link for a new path. Clients cannot request internal uploads. | 200 `{ path, token }`; 401; 403 not allowed; 404 no such project for this person; 422 invalid (with `reason`). |
| `POST /api/files/confirm` | Same | Body `{ projectId, path, fileName, mimeType, sizeBytes, internal? }`. Records the file once the object is confirmed in storage with the declared size. | 200 `{ id }`; 401; 403; 404; 409 not uploaded or already recorded; 422. |
| `GET /api/files/[id]` | Anyone who can read the file | Returns a 5-minute download link `{ url, fileName }`. | 200; 401; 404 (also for files the person may not see); 422. |
| `POST /api/stripe/webhook` | Stripe, with a signed request | A paid deposit is marked paid, a `deposit_paid` event is recorded and processed. A retry still records the event. | 200 handled or ignored; 400 bad signature; 500 retry. |

## Server-only operations
Quote storage (`store_quote`), enquiry saving and agent run recording use the server's secret key and are not callable from the browser. They are described in [SECURITY.md](SECURITY.md).

## Tables the site reads directly
The signed-in site reads tables through the Supabase client, limited by row-level security. Each read returns only what the signed-in person may see: their own orders, notifications and quotes; their organisation's projects, messages (customer-visible only) and files (customer-visible only); and, for agency staff, their tenant's records. Writes from the browser are limited to the cases listed in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
