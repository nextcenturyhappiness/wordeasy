create function public.render_daily_assignment(p_set_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'status', assignment_set.status,
    'set_id', assignment_set.id,
    'module', module.slug,
    'study_date', assignment_set.study_date,
    'timezone', assignment_set.timezone,
    'shortage', case
      when assignment_set.status = 'shortage' then jsonb_build_object(
        'code', 'content_shortage',
        'category', assignment_set.shortage_category_slug,
        'required', assignment_set.shortage_required,
        'available', assignment_set.shortage_available,
        'message', assignment_set.shortage_message
      )
      else null
    end,
    'assignments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'card_id', assignment.card_id,
            'category', category.slug,
            'position', assignment.position
          )
          order by assignment.position
        )
        from public.daily_assignments as assignment
        join public.categories as category on category.id = assignment.category_id
        where assignment.assignment_set_id = assignment_set.id
      ),
      '[]'::jsonb
    )
  )
  from public.daily_assignment_sets as assignment_set
  join public.modules as module on module.id = assignment_set.module_id
  where assignment_set.id = p_set_id;
$$;

create function public.ensure_daily_assignment(
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
    select count(*)::integer
    into v_available
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
      );

    if v_available < 10 then
      insert into public.daily_assignment_sets (
        user_id,
        module_id,
        study_date,
        timezone,
        status,
        assigned_count,
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
        10,
        v_available,
        'Not enough new Medical English cards are available.'
      )
      returning id into v_set_id;

      return public.render_daily_assignment(v_set_id);
    end if;
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
    with category_history as (
      select
        category.id as category_id,
        count(prior_assignment.id)::bigint as prior_count
      from public.categories as category
      left join public.daily_assignments as prior_assignment
        on prior_assignment.user_id = v_user_id
        and prior_assignment.module_id = v_module_id
        and prior_assignment.category_id = category.id
      where category.module_id = v_module_id and category.active
      group by category.id
    ),
    ranked as (
      select
        card.id as card_id,
        sense.category_id,
        category.sort_order,
        category_history.prior_count,
        row_number() over (
          partition by sense.category_id
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
      join category_history on category_history.category_id = sense.category_id
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
      order by
        ranked.prior_count + ranked.category_position - 1,
        ranked.category_position,
        ranked.sort_order,
        extensions.digest(
          pg_catalog.convert_to(
            v_user_id::text || ':' || p_requested_study_date::text || ':' || ranked.card_id::text,
            'UTF8'
          ),
          'sha256'
        ),
        ranked.card_id
      limit 10
    ),
    positioned as (
      select
        picked.*,
        row_number() over (
          order by
            picked.prior_count + picked.category_position - 1,
            picked.category_position,
            picked.sort_order,
            extensions.digest(
              pg_catalog.convert_to(
                v_user_id::text || ':' || p_requested_study_date::text || ':' || picked.card_id::text,
                'UTF8'
              ),
              'sha256'
            ),
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

create function public.render_daily_review_assignment(p_set_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'status', 'ready',
    'set_id', assignment_set.id,
    'module', module.slug,
    'study_date', assignment_set.study_date,
    'timezone', assignment_set.timezone,
    'cutoff_at', assignment_set.cutoff_at,
    'assignments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'card_id', assignment.card_id,
            'position', assignment.position,
            'due_at_snapshot', assignment.due_at_snapshot
          )
          order by assignment.position
        )
        from public.daily_review_assignments as assignment
        where assignment.assignment_set_id = assignment_set.id
      ),
      '[]'::jsonb
    )
  )
  from public.daily_review_assignment_sets as assignment_set
  join public.modules as module on module.id = assignment_set.module_id
  where assignment_set.id = p_set_id;
$$;

create function public.ensure_daily_review_assignment(
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
  v_cutoff_at timestamptz;
  v_module_id uuid;
  v_set_id uuid;
  v_count integer;
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

  v_cutoff_at := ((p_requested_study_date + 1)::timestamp at time zone v_timezone);

  select module.id
  into v_module_id
  from public.modules as module
  where module.slug = p_module_slug and module.active;

  if v_module_id is null then
    raise exception using errcode = '22023', message = 'unknown or inactive module';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'review-assignment:' || v_user_id::text || ':' || v_module_id::text || ':' || p_requested_study_date::text,
      0
    )
  );

  select assignment_set.id
  into v_set_id
  from public.daily_review_assignment_sets as assignment_set
  where assignment_set.user_id = v_user_id
    and assignment_set.module_id = v_module_id
    and assignment_set.study_date = p_requested_study_date;

  if v_set_id is not null then
    return public.render_daily_review_assignment(v_set_id);
  end if;

  select count(*)::integer
  into v_count
  from public.review_states as state
  where state.user_id = v_user_id
    and state.module_id = v_module_id
    and state.due_at is not null
    and state.due_at < v_cutoff_at
    and not exists (
      select 1
      from public.daily_assignments as new_assignment
      where new_assignment.user_id = v_user_id
        and new_assignment.module_id = v_module_id
        and new_assignment.study_date = p_requested_study_date
        and new_assignment.card_id = state.card_id
    );

  insert into public.daily_review_assignment_sets (
    user_id,
    module_id,
    study_date,
    timezone,
    cutoff_at,
    assigned_count
  )
  values (
    v_user_id,
    v_module_id,
    p_requested_study_date,
    v_timezone,
    v_cutoff_at,
    v_count
  )
  returning id into v_set_id;

  insert into public.daily_review_assignments (
    assignment_set_id,
    user_id,
    module_id,
    study_date,
    card_id,
    position,
    due_at_snapshot
  )
  select
    v_set_id,
    v_user_id,
    v_module_id,
    p_requested_study_date,
    state.card_id,
    row_number() over (
      order by
        state.due_at,
        extensions.digest(
          pg_catalog.convert_to(
            v_user_id::text || ':' || p_requested_study_date::text || ':' || state.card_id::text,
            'UTF8'
          ),
          'sha256'
        ),
        state.card_id
    )::integer,
    state.due_at
  from public.review_states as state
  where state.user_id = v_user_id
    and state.module_id = v_module_id
    and state.due_at is not null
    and state.due_at < v_cutoff_at
    and not exists (
      select 1
      from public.daily_assignments as new_assignment
      where new_assignment.user_id = v_user_id
        and new_assignment.module_id = v_module_id
        and new_assignment.study_date = p_requested_study_date
        and new_assignment.card_id = state.card_id
    )
  order by 6;

  return public.render_daily_review_assignment(v_set_id);
end;
$$;

create function public.get_daily_learning_snapshot(
  p_module_slug text,
  p_study_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_module_id uuid;
  v_new_set_id uuid;
  v_review_set_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select module.id
  into v_module_id
  from public.modules as module
  where module.slug = p_module_slug;

  if v_module_id is null then
    raise exception using errcode = '22023', message = 'unknown module';
  end if;

  select assignment_set.id
  into v_new_set_id
  from public.daily_assignment_sets as assignment_set
  where assignment_set.user_id = v_user_id
    and assignment_set.module_id = v_module_id
    and assignment_set.study_date = p_study_date;

  select assignment_set.id
  into v_review_set_id
  from public.daily_review_assignment_sets as assignment_set
  where assignment_set.user_id = v_user_id
    and assignment_set.module_id = v_module_id
    and assignment_set.study_date = p_study_date;

  return jsonb_build_object(
    'new_assignment', case
      when v_new_set_id is null then null
      else public.render_daily_assignment(v_new_set_id)
    end,
    'review_assignment', case
      when v_review_set_id is null then null
      else public.render_daily_review_assignment(v_review_set_id)
    end,
    'cards', coalesce(
      (
        select jsonb_agg(card_payload.payload order by card_payload.card_id)
        from (
          select distinct on (card.id)
            card.id as card_id,
            jsonb_build_object(
              'card_id', card.id,
              'word_id', word.id,
              'word_sense_id', sense.id,
              'context_id', context.id,
              'module', module.slug,
              'category', category.slug,
              'lemma', word.lemma,
              'display_form', word.display_form,
              'ipa', word.ipa,
              'part_of_speech', word.part_of_speech,
              'meaning_en', sense.meaning_en,
              'meaning_zh', sense.meaning_zh,
              'usage_note', sense.usage_note,
              'context_sentence', context.context_sentence,
              'target_text', context.target_text,
              'plain_english_paraphrase', context.plain_english_paraphrase,
              'sentence_translation_zh', context.sentence_translation_zh,
              'collocations', context.collocations,
              'source_type', context.source_type,
              'source_title', context.source_title,
              'source_url', context.source_url,
              'doi', context.doi,
              'pmid', context.pmid
            ) as payload
          from public.cards as card
          join public.contexts as context on context.id = card.context_id
          join public.word_senses as sense on sense.id = card.word_sense_id
          join public.words as word on word.id = sense.word_id
          join public.modules as module on module.id = sense.module_id
          join public.categories as category on category.id = sense.category_id
          where card.id in (
            select assignment.card_id
            from public.daily_assignments as assignment
            where assignment.assignment_set_id = v_new_set_id
            union
            select assignment.card_id
            from public.daily_review_assignments as assignment
            where assignment.assignment_set_id = v_review_set_id
          )
          order by card.id
        ) as card_payload
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.render_daily_assignment(uuid) from public, anon, authenticated;
revoke all on function public.render_daily_review_assignment(uuid) from public, anon, authenticated;
revoke all on function public.ensure_daily_assignment(text, date) from public, anon;
revoke all on function public.ensure_daily_review_assignment(text, date) from public, anon;
revoke all on function public.get_daily_learning_snapshot(text, date) from public, anon;

grant execute on function public.ensure_daily_assignment(text, date) to authenticated;
grant execute on function public.ensure_daily_review_assignment(text, date) to authenticated;
grant execute on function public.get_daily_learning_snapshot(text, date) to authenticated;
