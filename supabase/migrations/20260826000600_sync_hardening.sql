-- Serialize assignment snapshots and event ingestion within one user/module.
-- Existing v1 bodies are retained under private names only where their selection
-- logic is still valid; browser grants stay on the hardened wrappers.

-- Fail closed even when a deployment runner does not wrap the complete file in
-- one transaction. Mutating browser RPCs are reopened only after replacement.
revoke all on function public.ingest_review_events(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.commit_reconciled_review_state(
  uuid,
  bigint,
  text,
  jsonb,
  timestamptz,
  timestamptz,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.get_reconciliation_bundle(uuid)
  from public, anon, authenticated, service_role;

create sequence public.review_state_change_sequence;
revoke all on sequence public.review_state_change_sequence from public, anon, authenticated;

alter table public.review_states
  add column change_sequence bigint not null
  default nextval('public.review_state_change_sequence'::regclass);

create unique index review_states_change_sequence_idx
  on public.review_states (change_sequence);
create index review_states_user_change_idx
  on public.review_states (user_id, change_sequence);

alter function public.ensure_daily_assignment(text, date)
  rename to ensure_daily_assignment_v1_unlocked;
alter function public.ensure_daily_review_assignment(text, date)
  rename to ensure_daily_review_assignment_v1_unlocked;

revoke all on function public.ensure_daily_assignment_v1_unlocked(text, date)
  from public, anon, authenticated, service_role;
revoke all on function public.ensure_daily_review_assignment_v1_unlocked(text, date)
  from public, anon, authenticated, service_role;

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
  v_module_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
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
      'learning-module:' || v_user_id::text || ':' || v_module_id::text,
      0
    )
  );

  return public.ensure_daily_assignment_v1_unlocked(
    p_module_slug,
    p_requested_study_date
  );
end;
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
      'learning-module:' || v_user_id::text || ':' || v_module_id::text,
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

  if exists (
    select 1
    from public.review_event_applications as application
    join public.review_events as event
      on event.event_id = application.event_id
      and event.user_id = application.user_id
      and event.card_id = application.card_id
    where application.user_id = v_user_id
      and event.module_id = v_module_id
      and application.status = 'pending_reconciliation'
  ) then
    raise exception using
      errcode = '55000',
      message = 'trusted review-state replay required before assignment freeze';
  end if;

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
    0
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

  get diagnostics v_count = row_count;

  update public.daily_review_assignment_sets as assignment_set
  set assigned_count = v_count
  where assignment_set.id = v_set_id;

  return public.render_daily_review_assignment(v_set_id);
end;
$$;

revoke all on function public.ensure_daily_assignment(text, date) from public, anon;
revoke all on function public.ensure_daily_review_assignment(text, date) from public, anon;
grant execute on function public.ensure_daily_assignment(text, date) to authenticated;
grant execute on function public.ensure_daily_review_assignment(text, date) to authenticated;

-- Browser event ingest is append-only. Scheduler evidence remains immutable audit
-- evidence, but only trusted replay may materialize review_states.
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
      where card.id = v_card_id and card.active;

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

-- Service-only replay boundary. The Edge Function authenticates the user, then
-- supplies that verified UUID to these functions with its server credential.
create function public.get_reconciliation_bundle_trusted(
  p_user_id uuid,
  p_card_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_id uuid;
  v_module_slug text;
  v_event_ids uuid[];
  v_event_set_hash text;
  v_events jsonb;
  v_expected_revision bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'trusted worker role required';
  end if;

  select sense.module_id, module.slug
  into v_module_id, v_module_slug
  from public.cards as card
  join public.word_senses as sense on sense.id = card.word_sense_id
  join public.modules as module on module.id = sense.module_id
  where card.id = p_card_id;

  if v_module_id is null then
    raise exception using errcode = 'P0002', message = 'card not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'learning-module:' || p_user_id::text || ':' || v_module_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'review-card:' || p_user_id::text || ':' || p_card_id::text,
      0
    )
  );

  select
    coalesce(
      array_agg(
        event.event_id
        order by event.ordering_at, event.device_id, event.device_sequence, event.event_id
      ),
      array[]::uuid[]
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', event.event_id,
          'card_id', event.card_id,
          'module', v_module_slug,
          'rating', event.rating,
          'reviewed_at', event.reviewed_at,
          'ordering_at', event.ordering_at,
          'clock_anomaly', event.clock_anomaly,
          'device_id', event.device_id,
          'device_sequence', event.device_sequence,
          'base_revision', event.base_revision
        )
        order by event.ordering_at, event.device_id, event.device_sequence, event.event_id
      ),
      '[]'::jsonb
    )
  into v_event_ids, v_events
  from public.review_events as event
  join public.review_event_applications as application
    on application.event_id = event.event_id
    and application.user_id = event.user_id
    and application.card_id = event.card_id
  where event.user_id = p_user_id
    and event.card_id = p_card_id
    and application.status in ('applied', 'pending_reconciliation', 'reconciled');

  if cardinality(v_event_ids) = 0 then
    raise exception using errcode = 'P0002', message = 'no review events for card';
  end if;

  v_event_set_hash := encode(
    extensions.digest(
      pg_catalog.convert_to(array_to_string(v_event_ids, ','), 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  select state.revision
  into v_expected_revision
  from public.review_states as state
  where state.user_id = p_user_id and state.card_id = p_card_id;

  return jsonb_build_object(
    'card_id', p_card_id,
    'module', v_module_slug,
    'baseline', jsonb_build_object(
      'state', '{}'::jsonb,
      'due_at', null,
      'revision', 0
    ),
    'events', v_events,
    'expected_revision', coalesce(v_expected_revision, 0),
    'event_set_hash', v_event_set_hash
  );
end;
$$;

create function public.commit_reconciled_review_state_trusted(
  p_user_id uuid,
  p_card_id uuid,
  p_expected_revision bigint,
  p_event_set_hash text,
  p_scheduler_state jsonb,
  p_due_at timestamptz,
  p_last_reviewed_at timestamptz,
  p_scheduler_implementation_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_id uuid;
  v_current_revision bigint;
  v_event_ids uuid[];
  v_actual_hash text;
  v_new_revision bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'trusted worker role required';
  end if;
  if jsonb_typeof(p_scheduler_state) <> 'object'
    or p_scheduler_implementation_version is null
    or btrim(p_scheduler_implementation_version) = '' then
    raise exception using errcode = '22023', message = 'invalid reconciled scheduler state';
  end if;

  select sense.module_id
  into v_module_id
  from public.cards as card
  join public.word_senses as sense on sense.id = card.word_sense_id
  where card.id = p_card_id;

  if v_module_id is null then
    raise exception using errcode = 'P0002', message = 'card not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'learning-module:' || p_user_id::text || ':' || v_module_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'review-card:' || p_user_id::text || ':' || p_card_id::text,
      0
    )
  );

  select state.revision
  into v_current_revision
  from public.review_states as state
  where state.user_id = p_user_id and state.card_id = p_card_id;

  v_current_revision := coalesce(v_current_revision, 0);

  select coalesce(
    array_agg(
      event.event_id
      order by event.ordering_at, event.device_id, event.device_sequence, event.event_id
    ),
    array[]::uuid[]
  )
  into v_event_ids
  from public.review_events as event
  join public.review_event_applications as application
    on application.event_id = event.event_id
    and application.user_id = event.user_id
    and application.card_id = event.card_id
  where event.user_id = p_user_id
    and event.card_id = p_card_id
    and application.status in ('applied', 'pending_reconciliation', 'reconciled');

  v_actual_hash := encode(
    extensions.digest(
      pg_catalog.convert_to(array_to_string(v_event_ids, ','), 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if v_current_revision is distinct from p_expected_revision
    or v_actual_hash is distinct from p_event_set_hash then
    return jsonb_build_object(
      'status', 'stale',
      'current_revision', v_current_revision,
      'event_set_hash', v_actual_hash
    );
  end if;

  v_new_revision := cardinality(v_event_ids);
  if v_new_revision = 0 then
    raise exception using errcode = '22023', message = 'cannot reconcile an empty event set';
  end if;

  insert into public.review_states (
    user_id,
    card_id,
    module_id,
    scheduler_state_json,
    due_at,
    last_reviewed_at,
    revision,
    scheduler_implementation_version,
    canonical_event_set_hash,
    change_sequence,
    updated_at
  )
  values (
    p_user_id,
    p_card_id,
    v_module_id,
    p_scheduler_state,
    p_due_at,
    p_last_reviewed_at,
    v_new_revision,
    p_scheduler_implementation_version,
    v_actual_hash,
    nextval('public.review_state_change_sequence'::regclass),
    pg_catalog.statement_timestamp()
  )
  on conflict (user_id, card_id) do update
  set
    scheduler_state_json = excluded.scheduler_state_json,
    due_at = excluded.due_at,
    last_reviewed_at = excluded.last_reviewed_at,
    revision = excluded.revision,
    scheduler_implementation_version = excluded.scheduler_implementation_version,
    canonical_event_set_hash = excluded.canonical_event_set_hash,
    change_sequence = excluded.change_sequence,
    updated_at = excluded.updated_at;

  update public.review_event_applications as application
  set
    status = 'reconciled',
    canonical_revision = v_new_revision,
    conflict_reason = null,
    updated_at = pg_catalog.statement_timestamp()
  where application.user_id = p_user_id
    and application.card_id = p_card_id
    and application.status in ('applied', 'pending_reconciliation', 'reconciled');

  return jsonb_build_object(
    'status', 'committed',
    'revision', v_new_revision,
    'event_set_hash', v_actual_hash
  );
end;
$$;

-- Existing events predate queue-membership enforcement. Keep their immutable
-- audit evidence, but reject events that cannot prove they belonged to the
-- exact stable assignment that was already present when the server received
-- them. Every remaining event must be replayed through the trusted worker.
with classified_event as materialized (
  select
    application.event_id,
    application.status as previous_status,
    application.conflict_reason as previous_conflict_reason,
    case event.queue_kind
      when 'new' then exists (
        select 1
        from public.daily_assignments as assignment
        join public.daily_assignment_sets as assignment_set
          on assignment_set.id = assignment.assignment_set_id
          and assignment_set.user_id = assignment.user_id
          and assignment_set.module_id = assignment.module_id
          and assignment_set.study_date = assignment.study_date
        where assignment.user_id = event.user_id
          and assignment.module_id = event.module_id
          and assignment.study_date = event.study_date
          and assignment.card_id = event.card_id
          and assignment_set.status = 'ready'
          and assignment_set.timezone = event.timezone
          and assignment_set.created_at <= event.received_at
      )
      when 'review' then exists (
        select 1
        from public.daily_review_assignments as assignment
        join public.daily_review_assignment_sets as assignment_set
          on assignment_set.id = assignment.assignment_set_id
          and assignment_set.user_id = assignment.user_id
          and assignment_set.module_id = assignment.module_id
          and assignment_set.study_date = assignment.study_date
        where assignment.user_id = event.user_id
          and assignment.module_id = event.module_id
          and assignment.study_date = event.study_date
          and assignment.card_id = event.card_id
          and assignment_set.timezone = event.timezone
          and assignment_set.created_at <= event.received_at
      )
      else false
    end as valid_membership
  from public.review_event_applications as application
  join public.review_events as event
    on event.event_id = application.event_id
    and event.user_id = application.user_id
    and event.card_id = application.card_id
)
update public.review_event_applications as application
set
  status = case
    when classified_event.previous_status <> 'rejected'
      and classified_event.valid_membership then 'pending_reconciliation'
    else 'rejected'
  end,
  canonical_revision = null,
  conflict_reason = case
    when classified_event.previous_status = 'rejected' then coalesce(
      classified_event.previous_conflict_reason,
      'legacy_rejected'
    )
    when classified_event.valid_membership then 'legacy_untrusted_state_rebuild_required'
    else 'legacy_queue_membership_invalid'
  end,
  updated_at = pg_catalog.statement_timestamp()
from classified_event
where classified_event.event_id = application.event_id;

-- No browser-produced FSRS materialization survives this migration. Account
-- startup performs trusted replay before freezing either module's assignments.
delete from public.review_states;

-- Derived progress tables are rebuilt from membership-validated evidence so a
-- rejected legacy event cannot suppress a future New card or create a streak.
delete from public.learned_word_senses;

insert into public.learned_word_senses (
  user_id,
  module_id,
  word_sense_id,
  first_card_id,
  first_event_id,
  first_learned_at
)
select distinct on (event.user_id, event.module_id, event.word_sense_id)
  event.user_id,
  event.module_id,
  event.word_sense_id,
  event.card_id,
  event.event_id,
  event.ordering_at
from public.review_events as event
join public.review_event_applications as application
  on application.event_id = event.event_id
  and application.user_id = event.user_id
  and application.card_id = event.card_id
where event.queue_kind = 'new'
  and application.status in ('applied', 'pending_reconciliation', 'reconciled')
order by
  event.user_id,
  event.module_id,
  event.word_sense_id,
  event.ordering_at,
  event.device_id,
  event.device_sequence,
  event.event_id;

delete from public.study_days;

insert into public.study_days (
  user_id,
  study_date,
  timezone,
  first_event_id,
  first_studied_at
)
select distinct on (event.user_id, event.study_date)
  event.user_id,
  event.study_date,
  event.timezone,
  event.event_id,
  event.ordering_at
from public.review_events as event
join public.review_event_applications as application
  on application.event_id = event.event_id
  and application.user_id = event.user_id
  and application.card_id = event.card_id
where application.status in ('applied', 'pending_reconciliation', 'reconciled')
order by
  event.user_id,
  event.study_date,
  event.ordering_at,
  event.device_id,
  event.device_sequence,
  event.event_id;

-- Rejected legacy evidence remains queryable under RLS for audit, but it must
-- not enter browser materializations or advance the application's event cursor.
drop function public.pull_learning_changes(timestamptz, uuid, integer);

create function public.pull_learning_changes(
  p_after_state_sequence bigint,
  p_state_epoch text,
  p_after_received_at timestamptz default '1970-01-01T00:00:00Z',
  p_after_event_id uuid default '00000000-0000-0000-0000-000000000000',
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_events jsonb;
  v_states jsonb;
  v_conflicted_cards jsonb;
  v_next_received_at timestamptz := p_after_received_at;
  v_next_event_id uuid := p_after_event_id;
  v_effective_after_state_sequence bigint;
  v_next_state_sequence bigint;
  v_event_has_more boolean;
  v_state_has_more boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if p_limit < 1 or p_limit > 500 then
    raise exception using errcode = '22023', message = 'pull limit must be between 1 and 500';
  end if;
  if p_after_state_sequence < 0 then
    raise exception using errcode = '22023', message = 'state cursor must not be negative';
  end if;
  v_effective_after_state_sequence := case
    when p_state_epoch = 'trusted-review-state-v1' then p_after_state_sequence
    else 0
  end;
  v_next_state_sequence := v_effective_after_state_sequence;

  with page as (
    select event.*
    from public.review_events as event
    join public.review_event_applications as application
      on application.event_id = event.event_id
      and application.user_id = event.user_id
      and application.card_id = event.card_id
    where event.user_id = v_user_id
      and application.status in ('applied', 'pending_reconciliation', 'reconciled')
      and (event.received_at, event.event_id) > (p_after_received_at, p_after_event_id)
    order by event.received_at, event.event_id
    limit p_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', page.event_id,
          'card_id', page.card_id,
          'word_sense_id', page.word_sense_id,
          'module', module.slug,
          'presentation_action_id', page.presentation_action_id,
          'queue_kind', page.queue_kind,
          'study_date', page.study_date,
          'timezone', page.timezone,
          'rating', page.rating,
          'reviewed_at', page.reviewed_at,
          'received_at', page.received_at,
          'ordering_at', page.ordering_at,
          'clock_anomaly', page.clock_anomaly,
          'device_id', page.device_id,
          'device_sequence', page.device_sequence,
          'base_revision', page.base_revision,
          'scheduler_before', page.scheduler_before,
          'scheduler_after', page.scheduler_after,
          'due_at', page.due_at,
          'scheduler_implementation_version', page.scheduler_implementation_version,
          'application_status', application.status,
          'canonical_revision', application.canonical_revision,
          'conflict_reason', application.conflict_reason
        )
        order by page.received_at, page.event_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (array_agg(page.received_at order by page.received_at desc, page.event_id desc))[1],
      p_after_received_at
    ),
    coalesce(
      (array_agg(page.event_id order by page.received_at desc, page.event_id desc))[1],
      p_after_event_id
    )
  into v_events, v_next_received_at, v_next_event_id
  from page
  join public.modules as module on module.id = page.module_id
  join public.review_event_applications as application on application.event_id = page.event_id;

  select exists (
    select 1
    from public.review_events as event
    join public.review_event_applications as application
      on application.event_id = event.event_id
      and application.user_id = event.user_id
      and application.card_id = event.card_id
    where event.user_id = v_user_id
      and application.status in ('applied', 'pending_reconciliation', 'reconciled')
      and (event.received_at, event.event_id) > (v_next_received_at, v_next_event_id)
  ) into v_event_has_more;

  with state_page as (
    select state.*, module.slug as module_slug
    from public.review_states as state
    join public.modules as module on module.id = state.module_id
    where state.user_id = v_user_id
      and state.change_sequence > v_effective_after_state_sequence
    order by state.change_sequence
    limit p_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'card_id', state_page.card_id,
          'module', state_page.module_slug,
          'scheduler_state', state_page.scheduler_state_json,
          'due_at', state_page.due_at,
          'last_reviewed_at', state_page.last_reviewed_at,
          'revision', state_page.revision,
          'scheduler_implementation_version', state_page.scheduler_implementation_version,
          'canonical_event_set_hash', state_page.canonical_event_set_hash,
          'updated_at', state_page.updated_at
        )
        order by state_page.change_sequence
      ),
      '[]'::jsonb
    ),
    coalesce(max(state_page.change_sequence), v_effective_after_state_sequence)
  into v_states, v_next_state_sequence
  from state_page;

  select exists (
    select 1
    from public.review_states as state
    where state.user_id = v_user_id
      and state.change_sequence > v_next_state_sequence
  ) into v_state_has_more;

  select coalesce(jsonb_agg(conflict.card_id order by conflict.card_id), '[]'::jsonb)
  into v_conflicted_cards
  from (
    select distinct application.card_id
    from public.review_event_applications as application
    where application.user_id = v_user_id
      and application.status = 'pending_reconciliation'
  ) as conflict;

  return jsonb_build_object(
    'events', v_events,
    'states', v_states,
    'conflicted_card_ids', v_conflicted_cards,
    'next_cursor', jsonb_build_object(
      'received_at', v_next_received_at,
      'event_id', v_next_event_id,
      'state_sequence', v_next_state_sequence,
      'state_epoch', 'trusted-review-state-v1'
    ),
    'has_more', v_event_has_more or v_state_has_more
  );
end;
$$;

revoke all on function public.commit_reconciled_review_state(
  uuid,
  bigint,
  text,
  jsonb,
  timestamptz,
  timestamptz,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.get_reconciliation_bundle(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.pull_learning_changes(bigint, text, timestamptz, uuid, integer)
  from public, anon;

revoke all on function public.get_reconciliation_bundle_trusted(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.commit_reconciled_review_state_trusted(
  uuid,
  uuid,
  bigint,
  text,
  jsonb,
  timestamptz,
  timestamptz,
  text
) from public, anon, authenticated;

grant execute on function public.get_reconciliation_bundle_trusted(uuid, uuid)
  to service_role;
grant execute on function public.commit_reconciled_review_state_trusted(
  uuid,
  uuid,
  bigint,
  text,
  jsonb,
  timestamptz,
  timestamptz,
  text
) to service_role;
grant execute on function public.pull_learning_changes(bigint, text, timestamptz, uuid, integer)
  to authenticated;
