-- Medical daily new-card assignment becomes 7 morphology + 3 chart/class.
-- Additive replacement of ensure_daily_assignment_v1_unlocked only; ingest stays as in 009.

create or replace function public.ensure_daily_assignment_v1_unlocked(
  p_module_slug text,
  p_requested_study_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_server_study_date date;
  v_module_id uuid;
  v_set_id uuid;
  v_category_slug text;
  v_category_label text;
  v_required integer;
  v_available integer;
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select profile.timezone
  into v_timezone
  from public.profiles as profile
  where profile.user_id = v_user_id;

  if v_timezone is null then
    raise exception using errcode = 'P0002', message = 'profile required';
  end if;

  v_server_study_date := (pg_catalog.statement_timestamp() at time zone v_timezone)::date;
  if p_requested_study_date is distinct from v_server_study_date then
    raise exception using
      errcode = '22023',
      message = 'requested study_date does not match profile timezone date';
  end if;

  select module.id
  into v_module_id
  from public.modules as module
  where module.slug = p_module_slug and module.active;

  if v_module_id is null then
    raise exception using errcode = '22023', message = 'unknown or inactive module';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'new-assignment:' || v_user_id::text || ':' || v_module_id::text || ':' || p_requested_study_date::text,
      0
    )
  );

  select assignment_set.id
  into v_set_id
  from public.daily_assignment_sets as assignment_set
  where assignment_set.user_id = v_user_id
    and assignment_set.module_id = v_module_id
    and assignment_set.study_date = p_requested_study_date;

  if v_set_id is not null then
    return public.render_daily_assignment(v_set_id);
  end if;

  if p_module_slug = 'research_english' then
    for v_category_slug, v_category_label, v_required in
      select quota.category_slug, quota.category_label, quota.required
      from (
        values
          ('general_research'::text, 'General Research'::text, 5),
          ('statistics_methodology'::text, 'Statistics / Methodology'::text, 2),
          ('bioinformatics'::text, 'Bioinformatics'::text, 3)
      ) as quota(category_slug, category_label, required)
      order by case quota.category_slug
        when 'general_research' then 1
        when 'statistics_methodology' then 2
        else 3
      end
    loop
      select count(*)::integer
      into v_available
      from public.cards as card
      join public.word_senses as sense on sense.id = card.word_sense_id
      join public.categories as category on category.id = sense.category_id
      where card.active
        and sense.module_id = v_module_id
        and category.active
        and category.slug = v_category_slug
        and not exists (
          select 1
          from public.daily_assignments as prior_assignment
          where prior_assignment.user_id = v_user_id
            and prior_assignment.card_id = card.id
        );

      if v_available < v_required then
        insert into public.daily_assignment_sets (
          user_id,
          module_id,
          study_date,
          timezone,
          status,
          assigned_count,
          shortage_category_slug,
          shortage_required,
          shortage_available,
          shortage_message
        )
        values (
          v_user_id,
          v_module_id,
          p_requested_study_date,
          v_timezone,
          'shortage',
          0,
          v_category_slug,
          v_required,
          v_available,
          'Not enough new ' || v_category_label || ' cards are available.'
        )
        returning id into v_set_id;

        return public.render_daily_assignment(v_set_id);
      end if;
    end loop;
  else
    for v_category_slug, v_category_label, v_required in
      select quota.category_slug, quota.category_label, quota.required
      from (
        values
          ('morphology'::text, '词根构词'::text, 7),
          ('clinical'::text, 'Medical chart / class'::text, 3)
      ) as quota(category_slug, category_label, required)
      order by case quota.category_slug
        when 'morphology' then 1
        else 2
      end
    loop
      select count(*)::integer
      into v_available
      from public.cards as card
      join public.word_senses as sense on sense.id = card.word_sense_id
      join public.categories as category on category.id = sense.category_id
      where card.active
        and sense.module_id = v_module_id
        and category.active
        and (
          (v_category_slug = 'morphology' and category.slug = 'morphology')
          or (v_category_slug = 'clinical' and category.slug <> 'morphology')
        )
        and not exists (
          select 1
          from public.daily_assignments as prior_assignment
          where prior_assignment.user_id = v_user_id
            and prior_assignment.card_id = card.id
        );

      if v_available < v_required then
        insert into public.daily_assignment_sets (
          user_id,
          module_id,
          study_date,
          timezone,
          status,
          assigned_count,
          shortage_category_slug,
          shortage_required,
          shortage_available,
          shortage_message
        )
        values (
          v_user_id,
          v_module_id,
          p_requested_study_date,
          v_timezone,
          'shortage',
          0,
          v_category_slug,
          v_required,
          v_available,
          'Not enough new ' || v_category_label || ' cards are available.'
        )
        returning id into v_set_id;

        return public.render_daily_assignment(v_set_id);
      end if;
    end loop;
  end if;

  insert into public.daily_assignment_sets (
    user_id,
    module_id,
    study_date,
    timezone,
    status,
    assigned_count
  )
  values (
    v_user_id,
    v_module_id,
    p_requested_study_date,
    v_timezone,
    'ready',
    10
  )
  returning id into v_set_id;

  if p_module_slug = 'research_english' then
    with ranked as (
      select
        card.id as card_id,
        sense.category_id,
        category.slug as category_slug,
        row_number() over (
          partition by category.slug
          order by
            extensions.digest(
              pg_catalog.convert_to(
                v_user_id::text || ':' || p_requested_study_date::text || ':' || card.id::text,
                'UTF8'
              ),
              'sha256'
            ),
            card.id
        ) as category_position
      from public.cards as card
      join public.word_senses as sense on sense.id = card.word_sense_id
      join public.categories as category on category.id = sense.category_id
      where card.active
        and category.active
        and sense.module_id = v_module_id
        and category.slug in (
          'general_research',
          'statistics_methodology',
          'bioinformatics'
        )
        and not exists (
          select 1
          from public.daily_assignments as prior_assignment
          where prior_assignment.user_id = v_user_id
            and prior_assignment.card_id = card.id
        )
    ),
    picked as (
      select ranked.*
      from ranked
      where
        (category_slug = 'general_research' and category_position <= 5)
        or (category_slug = 'statistics_methodology' and category_position <= 2)
        or (category_slug = 'bioinformatics' and category_position <= 3)
    ),
    positioned as (
      select
        picked.*,
        row_number() over (
          order by
            case picked.category_slug
              when 'general_research' then 1
              when 'statistics_methodology' then 2
              else 3
            end,
            picked.category_position,
            picked.card_id
        ) as final_position
      from picked
    )
    insert into public.daily_assignments (
      assignment_set_id,
      user_id,
      module_id,
      study_date,
      card_id,
      category_id,
      position
    )
    select
      v_set_id,
      v_user_id,
      v_module_id,
      p_requested_study_date,
      positioned.card_id,
      positioned.category_id,
      positioned.final_position::smallint
    from positioned
    order by positioned.final_position;
  else
    with ranked as (
      select
        card.id as card_id,
        sense.category_id,
        case
          when category.slug = 'morphology' then 'morphology'
          else 'clinical'
        end as bucket_slug,
        row_number() over (
          partition by case
            when category.slug = 'morphology' then 'morphology'
            else 'clinical'
          end
          order by
            extensions.digest(
              pg_catalog.convert_to(
                v_user_id::text || ':' || p_requested_study_date::text || ':' || card.id::text,
                'UTF8'
              ),
              'sha256'
            ),
            card.id
        ) as bucket_position
      from public.cards as card
      join public.word_senses as sense on sense.id = card.word_sense_id
      join public.categories as category on category.id = sense.category_id
      where card.active
        and category.active
        and sense.module_id = v_module_id
        and not exists (
          select 1
          from public.daily_assignments as prior_assignment
          where prior_assignment.user_id = v_user_id
            and prior_assignment.card_id = card.id
        )
    ),
    picked as (
      select ranked.*
      from ranked
      where
        (bucket_slug = 'clinical' and bucket_position <= 3)
        or (bucket_slug = 'morphology' and bucket_position <= 7)
    ),
    positioned as (
      select
        picked.*,
        row_number() over (
          order by
            case picked.bucket_slug
              when 'morphology' then 1
              else 2
            end,
            picked.bucket_position,
            picked.card_id
        ) as final_position
      from picked
    )
    insert into public.daily_assignments (
      assignment_set_id,
      user_id,
      module_id,
      study_date,
      card_id,
      category_id,
      position
    )
    select
      v_set_id,
      v_user_id,
      v_module_id,
      p_requested_study_date,
      positioned.card_id,
      positioned.category_id,
      positioned.final_position::smallint
    from positioned
    order by positioned.final_position;
  end if;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 10 then
    raise exception using errcode = '40001', message = 'assignment selection was not atomic';
  end if;

  return public.render_daily_assignment(v_set_id);
end;
$$;

