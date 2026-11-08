create table public.echo_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.echo_admins enable row level security;
revoke all on public.echo_admins from public,anon,authenticated;
grant select on public.echo_admins to authenticated;
grant all on public.echo_admins to service_role;
create policy echo_admins_read_self on public.echo_admins for select to authenticated using (user_id=(select auth.uid()));
