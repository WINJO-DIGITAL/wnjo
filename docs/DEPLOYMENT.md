# Deployment

## Environments
- **Production:** builds from `main` on Vercel, serving `www.wnjoweb.co.uk` (the bare domain redirects to it).
- **Preview:** builds every branch push. Use the branch alias `wnjo-git-claude-gallant-albattani-rjj387-wnjo.vercel.app`.

## Releasing
1. Push to the working branch, check the preview.
2. Get the owner's approval.
3. Merge into `main` (fast-forward). Production builds automatically.
4. Check the production site: `/admin` should return "page not found" on production (the staff area is not yet part of the approved release). The homepage should load normally.

**Never deploy a new client website to production without owner approval.**

## Database changes
Apply migrations in filename order, each as its own change. Run the matching `supabase/tests` file afterwards. Destructive changes (dropping columns or tables) need the owner's explicit confirmation first.

## Environment variables
See `ENVIRONMENT_VARIABLES.md`.

## Recovery
- **Bad production deploy:** Vercel can roll back to a previous production deployment. If older deployments have been removed, redeploy `main` at the last approved commit.
- **Database mistake:** restore from Supabase backups (check the plan's backup retention before relying on it).
- **Domain problems:** the DNS records are at IONOS. Keep the Resend and Vercel records in place; the email records IONOS already had must not be changed.
