create table private.echo_backend_state (
 singleton boolean primary key default true check (singleton),
 legacy_open boolean not null default true,
 changed_at timestamptz not null default now()
);
alter table private.echo_backend_state enable row level security;
revoke all on private.echo_backend_state from public,anon,authenticated,service_role;
insert into private.echo_backend_state(singleton,legacy_open) values(true,true);

create function private.echo_legacy_open() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select legacy_open from private.echo_backend_state where singleton),false);
$$;
revoke all on function private.echo_legacy_open() from public,anon;
grant execute on function private.echo_legacy_open() to authenticated,service_role;

create function private.echo_require_legacy_write() returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from private.echo_backend_state where singleton and legacy_open for share;
 if not found then raise exception 'Echo account data has moved to Google Sheets. Refresh Echo.' using errcode='55000'; end if;
end;
$$;
revoke all on function private.echo_require_legacy_write() from public,anon;
grant execute on function private.echo_require_legacy_write() to authenticated,service_role;
grant usage on schema private to service_role;

create function private.echo_guard_legacy_row() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform private.echo_require_legacy_write();
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end;
$$;
revoke all on function private.echo_guard_legacy_row() from public,anon,authenticated,service_role;

do $$
declare table_name text;
begin
 foreach table_name in array array['profiles','likes','playlists','playlist_items','friendships','messages','account_entitlements','echo_admins'] loop
  execute format('create trigger echo_guard_legacy_writes before insert or update or delete on public.%I for each row execute function private.echo_guard_legacy_row()',table_name);
  execute format('create policy echo_legacy_read on public.%I as restrictive for select to authenticated using ((select private.echo_legacy_open()))',table_name);
 end loop;
end;
$$;

create or replace function private.delete_current_user() returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.echo_require_legacy_write();
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from auth.sessions where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end;
$$;

create policy echo_legacy_avatar_access on storage.objects as restrictive for all to authenticated
using (bucket_id<>'echo-avatars' or (select private.echo_legacy_open()))
with check (bucket_id<>'echo-avatars' or (select private.echo_legacy_open()));
