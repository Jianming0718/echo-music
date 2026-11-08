create function public.delete_my_account(expected_user uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>expected_user then raise exception 'Account session changed' using errcode='42501'; end if;
 perform private.delete_current_user();
end;
$$;
revoke all on function public.delete_my_account(uuid) from public,anon;
grant execute on function public.delete_my_account(uuid) to authenticated;
