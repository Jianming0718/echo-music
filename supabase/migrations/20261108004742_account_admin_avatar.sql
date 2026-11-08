alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profiles_avatar_owner check (avatar_path is null or avatar_path ~ ('^'||id::text||'/[0-9a-f-]{36}[.]jpg$'));
grant update(avatar_path) on public.profiles to authenticated;
create index profiles_avatar_lookup on public.profiles(avatar_path) where avatar_path is not null;
create table public.account_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 account_status text not null default 'active' check (account_status in ('active','suspended','disabled')),
 tier text not null default 'free' check (tier in ('free','premium')),
 premium_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.account_entitlements enable row level security;
revoke all on public.account_entitlements from public,anon,authenticated;
grant select on public.account_entitlements to authenticated;
grant all on public.account_entitlements to service_role;
create policy entitlements_read_self on public.account_entitlements for select to authenticated using (user_id=(select auth.uid()));
create function private.account_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.account_entitlements where user_id=auth.uid() and account_status<>'active');
$$;
revoke all on function private.account_active() from public,anon;
grant execute on function private.account_active() to authenticated;
create policy account_active_profiles on public.profiles as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
create policy account_active_likes on public.likes as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
create policy account_active_playlists on public.playlists as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
create policy account_active_items on public.playlist_items as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
create policy account_active_friendships on public.friendships as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
create policy account_active_messages on public.messages as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('echo-avatars','echo-avatars',false,1048576,array['image/jpeg']);
create policy echo_avatars_read on storage.objects for select to authenticated using (
 bucket_id='echo-avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.profiles where avatar_path=storage.objects.name))
);
create policy echo_avatars_upload on storage.objects for insert to authenticated with check (
 bucket_id='echo-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}[.]jpg$') and (select private.account_active())
);
create policy echo_avatars_remove on storage.objects for delete to authenticated using (bucket_id='echo-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
