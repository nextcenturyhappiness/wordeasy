create function public.ensure_account_preferences(
  p_timezone text,
  p_theme text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_theme text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = p_timezone
  ) then
    raise exception using errcode = '22023', message = 'invalid IANA timezone';
  end if;

  if p_theme not in ('system', 'light', 'dark') then
    raise exception using errcode = '22023', message = 'invalid theme';
  end if;

  insert into public.profiles (user_id, timezone)
  values (v_user_id, p_timezone)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id, theme)
  values (v_user_id, p_theme)
  on conflict (user_id) do nothing;

  select profile.timezone, settings.theme
  into v_timezone, v_theme
  from public.profiles as profile
  join public.user_settings as settings on settings.user_id = profile.user_id
  where profile.user_id = v_user_id;

  return jsonb_build_object('user_id', v_user_id, 'timezone', v_timezone, 'theme', v_theme);
end;
$$;

create function public.set_account_preferences(
  p_timezone text,
  p_theme text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = p_timezone
  ) then
    raise exception using errcode = '22023', message = 'invalid IANA timezone';
  end if;

  if p_theme not in ('system', 'light', 'dark') then
    raise exception using errcode = '22023', message = 'invalid theme';
  end if;

  insert into public.profiles (user_id, timezone)
  values (v_user_id, p_timezone)
  on conflict (user_id) do update set timezone = excluded.timezone;

  insert into public.user_settings (user_id, theme)
  values (v_user_id, p_theme)
  on conflict (user_id) do update set theme = excluded.theme;

  return jsonb_build_object('user_id', v_user_id, 'timezone', p_timezone, 'theme', p_theme);
end;
$$;

revoke all on function public.ensure_account_preferences(text, text) from public, anon;
revoke all on function public.set_account_preferences(text, text) from public, anon;

grant execute on function public.ensure_account_preferences(text, text) to authenticated;
grant execute on function public.set_account_preferences(text, text) to authenticated;
