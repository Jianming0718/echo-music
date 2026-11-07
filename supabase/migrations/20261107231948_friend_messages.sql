create table public.messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 body text not null default '' check (char_length(body) <= 2000),
 track jsonb,
 created_at timestamptz not null default clock_timestamp(),
 check (sender_id <> recipient_id),
 check (char_length(btrim(body)) > 0 or track is not null),
 constraint messages_track_valid check (
  track is null or (
   jsonb_typeof(track)='object' and octet_length(track::text)<=8192
   and track - array['id','title','artist','cover','album','duration','provider','videoId','category'] = '{}'::jsonb
   and char_length(coalesce(track->>'title','')) between 1 and 300
   and char_length(coalesce(track->>'artist','')) between 1 and 300
   and (
    (track->>'provider'='youtube' and coalesce(track->>'videoId','') ~ '^[A-Za-z0-9_-]{11}$' and track->>'id'='youtube-'||(track->>'videoId'))
    or (track->>'provider'='Audius' and coalesce(track->>'id','') ~ '^audius-[A-Za-z0-9]+$')
    or (track->>'provider'='bundle' and track->>'id' in ('sanctuary','hiraeth','childhood','moonlight'))
   ) is true
  )
 )
);
create index messages_pair_time on public.messages (least(sender_id,recipient_id),greatest(sender_id,recipient_id),created_at desc,id desc);
create index messages_sender on public.messages(sender_id);
create index messages_recipient on public.messages(recipient_id);
alter table public.messages enable row level security;
revoke all on public.messages from public,anon,authenticated;
grant select on public.messages to authenticated;
grant insert(id,sender_id,recipient_id,body,track) on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated using (
 (sender_id=(select auth.uid()) and private.is_friend(recipient_id))
 or (recipient_id=(select auth.uid()) and private.is_friend(sender_id))
);
create policy messages_send on public.messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and private.is_friend(recipient_id)
);
create function public.read_friend_messages(other_user uuid,before_time timestamptz default null,before_id uuid default null)
returns setof public.messages language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_friend(other_user) then
  raise exception 'Friends only' using errcode='42501';
 end if;
 if (before_time is null) <> (before_id is null) then raise exception 'Invalid cursor'; end if;
 return query select m.* from public.messages m
 where least(m.sender_id,m.recipient_id)=least(auth.uid(),other_user)
  and greatest(m.sender_id,m.recipient_id)=greatest(auth.uid(),other_user)
  and (before_time is null or (m.created_at,m.id)<(before_time,before_id))
 order by m.created_at desc,m.id desc limit 40;
end;
$$;
revoke all on function public.read_friend_messages(uuid,timestamptz,uuid) from public,anon;
grant execute on function public.read_friend_messages(uuid,timestamptz,uuid) to authenticated;
