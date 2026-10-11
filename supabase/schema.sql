-- Run this in Supabase Dashboard -> SQL Editor.
create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  study_hours numeric not null check (study_hours >= 0 and study_hours <= 24),
  attendance numeric not null check (attendance >= 0 and attendance <= 100),
  previous_marks numeric not null check (previous_marks >= 0 and previous_marks <= 100),
  assignments_completed numeric not null check (assignments_completed >= 0 and assignments_completed <= 100),
  predicted_marks numeric not null check (predicted_marks >= 0 and predicted_marks <= 100),
  performance text not null,
  created_at timestamptz not null default now()
);

alter table public.predictions enable row level security;

drop policy if exists "Read own predictions" on public.predictions;
create policy "Read own predictions"
on public.predictions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Insert own predictions" on public.predictions;
create policy "Insert own predictions"
on public.predictions for insert to authenticated
with check ((select auth.uid()) = user_id);

