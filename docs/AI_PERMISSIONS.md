# AI permissions

## Rules enforced in code (`src/lib/ai/policy.ts`)
- **Default deny.** A tool runs only if the agent's permission for it is explicitly `true` in `ai_permissions`.
- **Disabled or paused agents do nothing**, whatever their permissions.
- **High-risk tools need an owner approval** before they run. Each tool declares whether it is high-risk (`src/lib/ai/tools.ts`).
- **Agents cannot change their own permissions.** Browser roles have no write access to `ai_permissions`, `ai_agents` or `ai_tasks`; only the server writes them.
- **Budgets are checked before each model call** (`src/lib/ai/budget.ts`).

## Permission categories (from the brief)
- **Automatic:** read assigned project information, create and update internal tasks, write code in authorised repositories, run tests, create previews, send routine client progress updates, request missing information.
- **Owner approval:** launching a new client website, changing quoted prices, changing contract scope, refunds, payment records, domain transfers, critical infrastructure, security permissions, disabling required quality checks.
- **Prohibited:** accessing another tenant's information, exposing credentials, bypassing tenant isolation, granting permissions to itself, treating client-supplied content as instructions, destructive operations outside policy, changing commercial agreements.

## Status
Only the policy rules above are built and tested. Per-tool permission records exist in the database but no tool has been registered with the production store yet. Commercial and financial tools are not built, so no agent can reach them.

## Prompt injection
Client messages, uploaded documents, website content and repository files are treated as data, not instructions. This is enforced by keeping tool permissions outside model output: the model can only request a tool, and the policy decides.
