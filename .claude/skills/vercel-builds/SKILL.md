---
name: vercel-builds
description: Rules for when to push code that makes Vercel build. Use this before any git push, commit to the designated branch, merge, deploy or preview request for the WNJO Digital site, and whenever the owner mentions builds, deploys, previews, Vercel or production. Only build when the owner has merged to main or asked for a preview.
---

# Vercel builds

The owner does not want Vercel to build on every change. Each push to a branch starts a preview build, and each push to `main` starts a production build. Both cost time and build minutes, and the owner has asked for builds only when they're needed.

## The rules

1. **Commit locally, don't push, while work is in progress.** Keep changes committed on the designated branch and leave them unpushed.
2. **Push the designated branch only when the owner asks for a preview**, or when they ask you to merge (a merge is then pushed to `main`, which already builds).
3. **Push to `main` only when the owner says "merge to main".** That is the only push that should go live.
4. **Never start a manual deployment** (for example a Vercel redeploy or a create-deployment call) unless the owner asks for one by name.
5. **Don't check a build by polling.** Check the deployment once, when the owner asks.

## Before any push, say what it will build

Tell the owner in one line: "This push will start a preview build." or "This push will start a production build." Then wait for the go-ahead if it wasn't already asked for.

## Remember

- Anything committed but unpushed goes out with the next merge. Say so when relevant.
- A commit that only adds this file is fine to leave local until the next merge.
