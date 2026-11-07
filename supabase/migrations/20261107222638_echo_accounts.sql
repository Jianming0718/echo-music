create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null check (char_length(display_name) between 1 and 40),
 created_at timestamptz not null default now()
);
create table public.likes (
 user_id uuid not null references auth.users(id) on delete cascade,
 track_id text not null check (char_length(track_id) between 1 and 100),
 track jsonb not null check (jsonb_typeof(track) = 'object' and octet_length(track::text) <= 32768),
 created_at timestamptz not null default now(),
 primary key (user_id, track_id)
);
create table public.playlists (
 id text primary key check (char_length(id) between 1 and 100),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 cover text not null default '',
 visibility text not null default 'private' check (visibility in ('private','friends')),
 created_at timestamptz not null default now()
);
create table public.playlist_items (
 playlist_id text not null references public.playlists(id) on delete cascade,
 track_id text not null check (char_length(track_id) between 1 and 100),
 track jsonb not null check (jsonb_typeof(track) = 'object' and octet_length(track::text) <= 32768),
 position integer not null default 0 check (position >= 0),
 primary key (playlist_id, track_id)
);
create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references public.profiles(id) on delete cascade,
 addressee_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check (requester_id <> addressee_id)
);
create unique index friendships_pair on public.friendships (least(requester_id,addressee_id), greatest(requester_id,addressee_id));
create index likes_owner on public.likes (user_id,created_at);
create index playlists_owner on public.playlists (user_id,created_at);
create index friendships_recipient on public.friendships (addressee_id,status);
create index friendships_requester on public.friendships (requester_id,status);
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.friendships enable row level security;
revoke all on public.profiles, public.likes, public.playlists, public.playlist_items, public.friendships from anon, authenticated;
grant select,insert,delete on public.profiles to authenticated;
grant update (handle,display_name) on public.profiles to authenticated;
grant select,insert,update,delete on public.likes, public.playlists, public.playlist_items to authenticated;
grant select,insert,delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid()) is not null);
create policy profiles_create on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete on public.profiles for delete to authenticated using (id = (select auth.uid()));
create policy likes_owner_all on public.likes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy friends_read on public.friendships for select to authenticated using ((select auth.uid()) in (requester_id,addressee_id));
create policy friends_request on public.friendships for insert to authenticated with check (requester_id = (select auth.uid()) and status = 'pending');
create policy friends_accept on public.friendships for update to authenticated using (addressee_id = (select auth.uid()) and status = 'pending') with check (addressee_id = (select auth.uid()) and status = 'accepted');
create policy friends_remove on public.friendships for delete to authenticated using ((select auth.uid()) in (requester_id,addressee_id));
create function private.is_friend(other_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.friendships where status='accepted' and ((requester_id=auth.uid() and addressee_id=other_user) or (addressee_id=auth.uid() and requester_id=other_user)));
$$;
revoke all on function private.is_friend(uuid) from public;
grant execute on function private.is_friend(uuid) to authenticated;
create policy playlists_read on public.playlists for select to authenticated using (user_id = (select auth.uid()) or (visibility='friends' and private.is_friend(user_id)));
create policy playlists_create on public.playlists for insert to authenticated with check (user_id = (select auth.uid()));
create policy playlists_edit on public.playlists for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy playlists_remove on public.playlists for delete to authenticated using (user_id = (select auth.uid()));
create policy items_read on public.playlist_items for select to authenticated using (exists(select 1 from public.playlists p where p.id=playlist_items.playlist_id and (p.user_id=(select auth.uid()) or (p.visibility='friends' and private.is_friend(p.user_id)))));
create policy items_create on public.playlist_items for insert to authenticated with check (exists(select 1 from public.playlists where id=playlist_id and user_id=(select auth.uid())));
create policy items_edit on public.playlist_items for update to authenticated using (exists(select 1 from public.playlists where id=playlist_id and user_id=(select auth.uid()))) with check (exists(select 1 from public.playlists where id=playlist_id and user_id=(select auth.uid())));
create policy items_remove on public.playlist_items for delete to authenticated using (exists(select 1 from public.playlists where id=playlist_id and user_id=(select auth.uid())));
create function public.save_playlist(playlist_id text, playlist_name text, playlist_cover text, playlist_visibility text, tracks jsonb) returns void language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(tracks) <> 'array' or jsonb_array_length(tracks) > 500 then raise exception 'Invalid playlist size'; end if;
 if exists(select 1 from public.playlists where id=playlist_id and user_id<>auth.uid()) then raise exception 'Playlist is not owned by this account'; end if;
 insert into public.playlists(id,user_id,name,cover,visibility) values(playlist_id,auth.uid(),playlist_name,playlist_cover,playlist_visibility)
 on conflict(id) do update set name=excluded.name,cover=excluded.cover,visibility=excluded.visibility;
 delete from public.playlist_items where public.playlist_items.playlist_id=save_playlist.playlist_id;
 insert into public.playlist_items(playlist_id,track_id,track,position)
 select save_playlist.playlist_id,item->>'id',item,(ordinality-1)::integer from jsonb_array_elements(tracks) with ordinality as entries(item,ordinality);
end;
$$;
revoke all on function public.save_playlist(text,text,text,text,jsonb) from public;
grant execute on function public.save_playlist(text,text,text,text,jsonb) to authenticated;
create function private.delete_current_user() returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from auth.sessions where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end;
$$;
revoke all on function private.delete_current_user() from public;
grant execute on function private.delete_current_user() to authenticated;
create function public.delete_my_account() returns void language sql security invoker set search_path = '' as $$
 select private.delete_current_user();
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
