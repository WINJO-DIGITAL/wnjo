-- Long agent tasks (Phase 4k). A task keeps its conversation and how many model calls it has made, so a run that
-- pauses at its time limit can resume later. Written only by the server.
alter table public.ai_tasks add column transcript jsonb not null default '[]'::jsonb;
alter table public.ai_tasks add column model_calls integer not null default 0 check (model_calls >= 0);
