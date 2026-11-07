# Security

## Controls in place
- **Row-level security** on every table. Browser roles have only the access the policies allow. Anonymous visitors have no table access.
- **No direct writes from the browser** to sensitive tables (quotes, acceptances, notifications, AI records, projects' creation). These go through server code or tested database functions.
- **Secrets:** the Supabase secret key, the Resend key and the IONOS key are stored only in Vercel (as sensitive variables) or the credential store. They are not in the repository. `.env*.local` files are git-ignored.
- **Private file storage:** the `project-files` bucket is private. Downloads will use server-issued signed links (not yet built).
- **Audit log:** approvals, quote decisions and tenant role grants write to `audit_logs`.
- **Input limits:** database constraints cap text lengths and check formats (for example, quote references and email-like fields). The enquiry form has a spam honeypot, a minimum fill time and a rate limit.
- **Customer privacy:** the owner's email address is not shown on the site. Enquiries are delivered server-side.

## Findings and fixes (from this development)
- Browser roles had TRUNCATE and direct write rights on new tables by default. Removed (migration `20261106260200`, `20261106260300`).
- Clients could read internal project status and priority. Hidden by column permissions (migration `20261106260400`).
- Quote status could be set directly by staff, bypassing acceptance evidence. Removed.
- A fixed-name lookup bug in the approval function. Corrected (migration `20261106250100`).

## Accepted risk
- The three access-check functions are callable by signed-in users. They only report the caller's own memberships.

## Open items before launch
- Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel for Production and Preview. Done for both.
- Rotate the Resend and IONOS keys that appeared in chat, then update Vercel and remove the IONOS key from the shared environment.
- Remove database connection strings and the JWT secret from Vercel if the app doesn't need them.
- Review the quote terms wording and privacy notice with a solicitor. Nothing here is legal advice.
- Connect a custom email sender for Supabase sign-in emails (the built-in sender is for testing).
- Penetration test before taking payments.
