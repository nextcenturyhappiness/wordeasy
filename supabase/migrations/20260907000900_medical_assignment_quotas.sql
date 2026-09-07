-- Medical daily new-card assignment becomes 7 chart/class + 3 morphology.
-- Review ingest may score deactivated specialty cards so FSRS progress is not stranded.

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
          ('clinical'::text, 'Medical chart / class'::text, 7),
          ('morphology'::text, '词根构词'::text, 3)
      ) as quota(category_slug, category_label, required)
      order by case quota.category_slug
        when 'clinical' then 1
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
        (bucket_slug = 'clinical' and bucket_position <= 7)
        or (bucket_slug = 'morphology' and bucket_position <= 3)
    ),
    positioned as (
      select
        picked.*,
        row_number() over (
          order by
            case picked.bucket_slug
              when 'clinical' then 1
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

revoke all on function public.ensure_daily_assignment_v1_unlocked(text, date)
  from public, anon, authenticated, service_role;

-- Deactivated specialty cards remain scoreable so existing FSRS progress can sync.
create or replace function public.ingest_review_events(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lock_module_id uuid;
  v_payload jsonb;
  v_results jsonb := '[]'::jsonb;
  v_event_id uuid;
  v_card_id uuid;
  v_word_sense_id uuid;
  v_module_id uuid;
  v_module_slug text;
  v_presentation_action_id text;
  v_queue_kind text;
  v_study_date date;
  v_timezone text;
  v_assignment_timezone text;
  v_rating text;
  v_reviewed_at timestamptz;
  v_received_at timestamptz;
  v_ordering_at timestamptz;
  v_clock_anomaly boolean;
  v_device_id text;
  v_device_sequence bigint;
  v_base_revision bigint;
  v_scheduler_before jsonb;
  v_scheduler_after jsonb;
  v_due_at timestamptz;
  v_scheduler_version text;
  v_fingerprint text;
  v_existing_user_id uuid;
  v_existing_fingerprint text;
  v_observed_revision bigint;
  v_application_status text;
  v_canonical_revision bigint;
  v_conflict_reason text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if jsonb_typeof(p_events) <> 'array' then
    raise exception using errcode = '22023', message = 'events must be a JSON array';
  end if;
  if jsonb_array_length(p_events) > 200 then
    raise exception using errcode = '22023', message = 'event batch exceeds 200 records';
  end if;

  -- Transaction-level locks persist until return. Acquire all requested module
  -- locks in UUID order so two differently ordered batches cannot deadlock.
  for v_lock_module_id in
    select module.id
    from public.modules as module
    where module.slug in (
      select distinct payload.value ->> 'module'
      from jsonb_array_elements(p_events) as payload(value)
    )
    order by module.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'learning-module:' || v_user_id::text || ':' || v_lock_module_id::text,
        0
      )
    );
  end loop;

  for v_payload in select value from jsonb_array_elements(p_events)
  loop
    begin
      if jsonb_typeof(v_payload) <> 'object' then
        raise exception using errcode = '22023', message = 'event must be an object';
      end if;

      if v_payload ? 'user_id'
        and (v_payload ->> 'user_id')::uuid is distinct from v_user_id then
        raise exception using errcode = '42501', message = 'event user_id does not match authenticated user';
      end if;

      v_event_id := (v_payload ->> 'event_id')::uuid;
      v_card_id := (v_payload ->> 'card_id')::uuid;
      v_module_slug := v_payload ->> 'module';
      v_presentation_action_id := v_payload ->> 'presentation_action_id';
      v_queue_kind := v_payload ->> 'queue_kind';
      v_study_date := (v_payload ->> 'study_date')::date;
      v_timezone := v_payload ->> 'timezone';
      v_rating := v_payload ->> 'rating';
      v_reviewed_at := (v_payload ->> 'reviewed_at')::timestamptz;
      v_device_id := v_payload ->> 'device_id';
      v_device_sequence := (v_payload ->> 'device_sequence')::bigint;
      v_base_revision := (v_payload ->> 'base_revision')::bigint;
      v_scheduler_before := v_payload -> 'scheduler_before';
      v_scheduler_after := v_payload -> 'scheduler_after';
      v_due_at := (v_payload ->> 'due_at')::timestamptz;
      v_scheduler_version := v_payload ->> 'scheduler_implementation_version';

      if v_presentation_action_id is null or btrim(v_presentation_action_id) = ''
        or v_device_id is null or btrim(v_device_id) = ''
        or v_scheduler_version is null or btrim(v_scheduler_version) = '' then
        raise exception using errcode = '22023', message = 'event identifiers and scheduler version are required';
      end if;
      if v_queue_kind not in ('new', 'review') then
        raise exception using errcode = '22023', message = 'invalid queue kind';
      end if;
      if v_rating not in ('again', 'hard', 'good', 'easy') then
        raise exception using errcode = '22023', message = 'invalid rating';
      end if;
      if v_device_sequence <= 0 or v_base_revision < 0 then
        raise exception using errcode = '22023', message = 'invalid sequence or revision';
      end if;
      if jsonb_typeof(v_scheduler_before) <> 'object'
        or jsonb_typeof(v_scheduler_after) <> 'object' then
        raise exception using errcode = '22023', message = 'scheduler evidence must be JSON objects';
      end if;
      if not exists (
        select 1 from pg_catalog.pg_timezone_names where name = v_timezone
      ) then
        raise exception using errcode = '22023', message = 'invalid IANA timezone';
      end if;
      if (v_reviewed_at at time zone v_timezone)::date is distinct from v_study_date then
        raise exception using errcode = '22023', message = 'study_date does not match reviewed_at timezone date';
      end if;

      select sense.id, sense.module_id, module.slug
      into v_word_sense_id, v_module_id, v_module_slug
      from public.cards as card
      join public.word_senses as sense on sense.id = card.word_sense_id
      join public.modules as module on module.id = sense.module_id
      where card.id = v_card_id;

      if v_module_id is null or v_module_slug is distinct from (v_payload ->> 'module') then
        raise exception using errcode = '22023', message = 'card and module do not match';
      end if;
      if v_payload ? 'word_sense_id'
        and (v_payload ->> 'word_sense_id')::uuid is distinct from v_word_sense_id then
        raise exception using errcode = '22023', message = 'card and word sense do not match';
      end if;

      v_assignment_timezone := null;
      if v_queue_kind = 'new' then
        select assignment_set.timezone
        into v_assignment_timezone
        from public.daily_assignments as assignment
        join public.daily_assignment_sets as assignment_set
          on assignment_set.id = assignment.assignment_set_id
        where assignment.user_id = v_user_id
          and assignment.module_id = v_module_id
          and assignment.study_date = v_study_date
          and assignment.card_id = v_card_id
          and assignment_set.status = 'ready';
      else
        select assignment_set.timezone
        into v_assignment_timezone
        from public.daily_review_assignments as assignment
        join public.daily_review_assignment_sets as assignment_set
          on assignment_set.id = assignment.assignment_set_id
        where assignment.user_id = v_user_id
          and assignment.module_id = v_module_id
          and assignment.study_date = v_study_date
          and assignment.card_id = v_card_id;
      end if;

      if v_assignment_timezone is null or v_assignment_timezone is distinct from v_timezone then
        v_results := v_results || jsonb_build_array(
          jsonb_build_object(
            'event_id', v_event_id,
            'card_id', v_card_id,
            'status', 'rejected',
            'application_status', null,
            'canonical_revision', null,
            'reason', 'queue_membership_mismatch',
            'clock_anomaly', false
          )
        );
        continue;
      end if;

      v_received_at := pg_catalog.statement_timestamp();
      v_clock_anomaly :=
        v_reviewed_at > v_received_at + interval '1 day'
        or v_reviewed_at < v_received_at - interval '365 days';
      v_ordering_at := case when v_clock_anomaly then v_received_at else v_reviewed_at end;

      v_fingerprint := encode(
        extensions.digest(
          pg_catalog.convert_to(
            jsonb_build_object(
              'event_id', v_event_id,
              'user_id', v_user_id,
              'card_id', v_card_id,
              'word_sense_id', v_word_sense_id,
              'module_id', v_module_id,
              'presentation_action_id', v_presentation_action_id,
              'queue_kind', v_queue_kind,
              'study_date', v_study_date,
              'timezone', v_timezone,
              'rating', v_rating,
              'reviewed_at', v_reviewed_at,
              'device_id', v_device_id,
              'device_sequence', v_device_sequence,
              'base_revision', v_base_revision,
              'scheduler_before', v_scheduler_before,
              'scheduler_after', v_scheduler_after,
              'due_at', v_due_at,
              'scheduler_implementation_version', v_scheduler_version
            )::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      );

      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('review-event:' || v_event_id::text, 0)
      );

      select event.user_id, event.event_fingerprint
      into v_existing_user_id, v_existing_fingerprint
      from public.review_events as event
      where event.event_id = v_event_id;

      if found then
        if v_existing_user_id is distinct from v_user_id
          or v_existing_fingerprint is distinct from v_fingerprint then
          v_results := v_results || jsonb_build_array(
            jsonb_build_object(
              'event_id', v_event_id,
              'status', 'rejected',
              'reason', 'event_id_collision'
            )
          );
        else
          select application.status, application.canonical_revision, application.conflict_reason
          into v_application_status, v_canonical_revision, v_conflict_reason
          from public.review_event_applications as application
          where application.event_id = v_event_id;

          v_results := v_results || jsonb_build_array(
            jsonb_build_object(
              'event_id', v_event_id,
              'card_id', v_card_id,
              'status', case
                when v_application_status = 'rejected' then 'rejected'
                else 'duplicate'
              end,
              'application_status', v_application_status,
              'canonical_revision', v_canonical_revision,
              'reason', v_conflict_reason,
              'clock_anomaly', v_clock_anomaly
            )
          );
        end if;
        continue;
      end if;

      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'review-card:' || v_user_id::text || ':' || v_card_id::text,
          0
        )
      );

      insert into public.review_events (
        event_id,
        user_id,
        card_id,
        word_sense_id,
        module_id,
        presentation_action_id,
        queue_kind,
        study_date,
        timezone,
        rating,
        reviewed_at,
        received_at,
        ordering_at,
        clock_anomaly,
        device_id,
        device_sequence,
        base_revision,
        scheduler_before,
        scheduler_after,
        due_at,
        scheduler_implementation_version,
        event_fingerprint
      )
      values (
        v_event_id,
        v_user_id,
        v_card_id,
        v_word_sense_id,
        v_module_id,
        v_presentation_action_id,
        v_queue_kind,
        v_study_date,
        v_timezone,
        v_rating,
        v_reviewed_at,
        v_received_at,
        v_ordering_at,
        v_clock_anomaly,
        v_device_id,
        v_device_sequence,
        v_base_revision,
        v_scheduler_before,
        v_scheduler_after,
        v_due_at,
        v_scheduler_version,
        v_fingerprint
      );

      select state.revision
      into v_observed_revision
      from public.review_states as state
      where state.user_id = v_user_id and state.card_id = v_card_id;

      v_observed_revision := coalesce(v_observed_revision, 0);

      insert into public.review_event_applications (
        event_id,
        user_id,
        card_id,
        status,
        observed_revision,
        canonical_revision,
        conflict_reason,
        clock_anomaly
      )
      values (
        v_event_id,
        v_user_id,
        v_card_id,
        'pending_reconciliation',
        v_observed_revision,
        null,
        'trusted_replay_required',
        v_clock_anomaly
      );

      if v_queue_kind = 'new' then
        insert into public.learned_word_senses (
          user_id,
          module_id,
          word_sense_id,
          first_card_id,
          first_event_id,
          first_learned_at
        )
        values (
          v_user_id,
          v_module_id,
          v_word_sense_id,
          v_card_id,
          v_event_id,
          v_ordering_at
        )
        on conflict (user_id, module_id, word_sense_id) do nothing;
      end if;

      insert into public.study_days (
        user_id,
        study_date,
        timezone,
        first_event_id,
        first_studied_at
      )
      values (
        v_user_id,
        v_study_date,
        v_timezone,
        v_event_id,
        v_ordering_at
      )
      on conflict (user_id, study_date) do nothing;

      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'event_id', v_event_id,
          'card_id', v_card_id,
          'status', 'conflict',
          'application_status', 'pending_reconciliation',
          'canonical_revision', null,
          'reason', 'trusted_replay_required',
          'clock_anomaly', v_clock_anomaly
        )
      );
    exception
      when unique_violation then
        v_results := v_results || jsonb_build_array(
          jsonb_build_object(
            'event_id', v_payload ->> 'event_id',
            'status', 'rejected',
            'reason', 'device_sequence_or_action_collision'
          )
        );
      when others then
        v_results := v_results || jsonb_build_array(
          jsonb_build_object(
            'event_id', v_payload ->> 'event_id',
            'status', 'rejected',
            'reason', 'invalid_event'
          )
        );
    end;
  end loop;

  return v_results;
end;
$$;

revoke all on function public.ingest_review_events(jsonb) from public, anon;
grant execute on function public.ingest_review_events(jsonb) to authenticated;
