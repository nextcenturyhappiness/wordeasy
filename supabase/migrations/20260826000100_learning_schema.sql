create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.modules (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  constraint modules_supported_slug check (slug in ('research_english', 'medical_english'))
);

create table public.categories (
  id uuid primary key,
  module_id uuid not null references public.modules (id) on delete restrict,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  unique (module_id, slug),
  unique (id, module_id)
);

create table public.words (
  id uuid primary key,
  stable_key text not null unique,
  lemma text not null,
  display_form text not null,
  ipa text not null,
  part_of_speech text not null,
  created_at timestamptz not null default statement_timestamp()
);

create table public.word_senses (
  id uuid primary key,
  stable_key text not null unique,
  word_id uuid not null references public.words (id) on delete restrict,
  module_id uuid not null references public.modules (id) on delete restrict,
  category_id uuid not null,
  meaning_en text not null,
  meaning_zh text not null,
  usage_note text not null,
  created_at timestamptz not null default statement_timestamp(),
  foreign key (category_id, module_id)
    references public.categories (id, module_id) on delete restrict,
  unique (id, module_id)
);

create table public.contexts (
  id uuid primary key,
  stable_key text not null unique,
  word_sense_id uuid not null references public.word_senses (id) on delete restrict,
  context_sentence text not null,
  target_text text not null,
  plain_english_paraphrase text not null,
  sentence_translation_zh text not null,
  collocations text[] not null,
  context_genre text not null,
  source_type text not null,
  source_title text,
  source_url text,
  doi text,
  pmid text,
  created_at timestamptz not null default statement_timestamp(),
  constraint contexts_sentence_not_blank check (btrim(context_sentence) <> ''),
  constraint contexts_target_not_blank check (btrim(target_text) <> ''),
  constraint contexts_target_present check (position(lower(target_text) in lower(context_sentence)) > 0),
  constraint contexts_collocations_not_empty check (cardinality(collocations) > 0),
  constraint contexts_source_type check (source_type in ('original_example', 'verified_source')),
  constraint contexts_original_source_empty check (
    source_type <> 'original_example'
    or (source_title is null and source_url is null and doi is null and pmid is null)
  ),
  unique (id, word_sense_id)
);

create table public.cards (
  id uuid primary key,
  stable_key text not null unique,
  word_sense_id uuid not null references public.word_senses (id) on delete restrict,
  context_id uuid not null,
  card_type text not null default 'context',
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  foreign key (context_id, word_sense_id)
    references public.contexts (id, word_sense_id) on delete restrict,
  unique (word_sense_id, context_id, card_type)
);

create function public.validate_profile_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = new.timezone
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid IANA timezone';
  end if;
  return new;
end;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create trigger profiles_validate_timezone
before insert or update of timezone on public.profiles
for each row execute function public.validate_profile_timezone();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.daily_assignment_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete restrict,
  study_date date not null,
  timezone text not null,
  status text not null,
  requested_count smallint not null default 10,
  assigned_count smallint not null,
  shortage_category_slug text,
  shortage_required smallint,
  shortage_available smallint,
  shortage_message text,
  selection_version text not null default 'assignment-v1',
  created_at timestamptz not null default statement_timestamp(),
  constraint daily_assignment_sets_status check (status in ('ready', 'shortage')),
  constraint daily_assignment_sets_counts check (
    requested_count = 10
    and (
      (
        status = 'ready'
        and assigned_count = 10
        and shortage_required is null
        and shortage_available is null
        and shortage_message is null
      )
      or (
        status = 'shortage'
        and assigned_count = 0
        and shortage_required is not null
        and shortage_available is not null
        and shortage_message is not null
      )
    )
  ),
  unique (user_id, module_id, study_date),
  unique (id, user_id, module_id, study_date)
);

create table public.daily_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_set_id uuid not null,
  user_id uuid not null,
  module_id uuid not null,
  study_date date not null,
  card_id uuid not null references public.cards (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  position smallint not null,
  created_at timestamptz not null default statement_timestamp(),
  foreign key (assignment_set_id, user_id, module_id, study_date)
    references public.daily_assignment_sets (id, user_id, module_id, study_date)
    on delete cascade,
  constraint daily_assignments_position_positive check (position between 1 and 10),
  unique (user_id, module_id, study_date, card_id),
  unique (user_id, module_id, study_date, position)
);

create table public.daily_review_assignment_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete restrict,
  study_date date not null,
  timezone text not null,
  cutoff_at timestamptz not null,
  assigned_count integer not null,
  selection_version text not null default 'review-assignment-v1',
  created_at timestamptz not null default statement_timestamp(),
  constraint daily_review_assignment_sets_count check (assigned_count >= 0),
  unique (user_id, module_id, study_date),
  unique (id, user_id, module_id, study_date)
);

create table public.daily_review_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_set_id uuid not null,
  user_id uuid not null,
  module_id uuid not null,
  study_date date not null,
  card_id uuid not null references public.cards (id) on delete restrict,
  position integer not null,
  due_at_snapshot timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  foreign key (assignment_set_id, user_id, module_id, study_date)
    references public.daily_review_assignment_sets (id, user_id, module_id, study_date)
    on delete cascade,
  constraint daily_review_assignments_position_positive check (position > 0),
  unique (user_id, module_id, study_date, card_id),
  unique (user_id, module_id, study_date, position)
);

create table public.review_events (
  event_id uuid primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  word_sense_id uuid not null references public.word_senses (id) on delete restrict,
  module_id uuid not null references public.modules (id) on delete restrict,
  presentation_action_id text not null,
  queue_kind text not null,
  study_date date not null,
  timezone text not null,
  rating text not null,
  reviewed_at timestamptz not null,
  received_at timestamptz not null default statement_timestamp(),
  ordering_at timestamptz not null,
  clock_anomaly boolean not null default false,
  device_id text not null,
  device_sequence bigint not null,
  base_revision bigint not null,
  scheduler_before jsonb not null,
  scheduler_after jsonb not null,
  due_at timestamptz not null,
  scheduler_implementation_version text not null,
  event_fingerprint text not null,
  created_at_server timestamptz not null default statement_timestamp(),
  constraint review_events_queue check (queue_kind in ('new', 'review')),
  constraint review_events_rating check (rating in ('again', 'hard', 'good', 'easy')),
  constraint review_events_device_sequence check (device_sequence > 0),
  constraint review_events_base_revision check (base_revision >= 0),
  constraint review_events_scheduler_before_object check (jsonb_typeof(scheduler_before) = 'object'),
  constraint review_events_scheduler_after_object check (jsonb_typeof(scheduler_after) = 'object'),
  unique (user_id, presentation_action_id),
  unique (user_id, device_id, device_sequence),
  unique (event_id, user_id, card_id)
);

create table public.review_event_applications (
  event_id uuid primary key,
  user_id uuid not null,
  card_id uuid not null,
  status text not null,
  observed_revision bigint not null,
  canonical_revision bigint,
  conflict_reason text,
  clock_anomaly boolean not null default false,
  updated_at timestamptz not null default statement_timestamp(),
  foreign key (event_id, user_id, card_id)
    references public.review_events (event_id, user_id, card_id) on delete restrict,
  constraint review_event_applications_status check (
    status in ('applied', 'pending_reconciliation', 'reconciled', 'rejected')
  ),
  constraint review_event_applications_revision check (
    observed_revision >= 0 and (canonical_revision is null or canonical_revision >= 0)
  )
);

create table public.review_states (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  module_id uuid not null references public.modules (id) on delete restrict,
  scheduler_state_json jsonb not null,
  due_at timestamptz,
  last_reviewed_at timestamptz not null,
  revision bigint not null,
  scheduler_implementation_version text not null,
  canonical_event_set_hash text,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, card_id),
  constraint review_states_scheduler_object check (jsonb_typeof(scheduler_state_json) = 'object'),
  constraint review_states_revision check (revision >= 0)
);

create table public.learned_word_senses (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete restrict,
  word_sense_id uuid not null,
  first_card_id uuid not null references public.cards (id) on delete restrict,
  first_event_id uuid not null references public.review_events (event_id) on delete restrict,
  first_learned_at timestamptz not null,
  primary key (user_id, module_id, word_sense_id),
  foreign key (word_sense_id, module_id)
    references public.word_senses (id, module_id) on delete restrict
);

create table public.study_days (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  study_date date not null,
  timezone text not null,
  first_event_id uuid not null references public.review_events (event_id) on delete restrict,
  first_studied_at timestamptz not null,
  primary key (user_id, study_date)
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  theme text not null default 'system',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint user_settings_theme check (theme in ('system', 'light', 'dark'))
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create index daily_assignments_lookup_idx
  on public.daily_assignments (user_id, module_id, study_date, position);
create index daily_assignments_card_history_idx
  on public.daily_assignments (user_id, card_id);
create index daily_review_assignments_lookup_idx
  on public.daily_review_assignments (user_id, module_id, study_date, position);
create index review_states_due_idx
  on public.review_states (user_id, due_at) where due_at is not null;
create index review_states_module_due_idx
  on public.review_states (user_id, module_id, due_at) where due_at is not null;
create index review_events_card_time_idx
  on public.review_events (user_id, card_id, reviewed_at, event_id);
create index review_events_pull_idx
  on public.review_events (user_id, received_at, event_id);
create index review_event_applications_conflict_idx
  on public.review_event_applications (user_id, status, card_id);

create function public.reject_review_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'review events are immutable';
end;
$$;

create trigger review_events_immutable
before update or delete on public.review_events
for each row execute function public.reject_review_event_mutation();

alter table public.modules enable row level security;
alter table public.categories enable row level security;
alter table public.words enable row level security;
alter table public.word_senses enable row level security;
alter table public.contexts enable row level security;
alter table public.cards enable row level security;

create policy modules_authenticated_read on public.modules
  for select to authenticated using (true);
create policy categories_authenticated_read on public.categories
  for select to authenticated using (true);
create policy words_authenticated_read on public.words
  for select to authenticated using (true);
create policy word_senses_authenticated_read on public.word_senses
  for select to authenticated using (true);
create policy contexts_authenticated_read on public.contexts
  for select to authenticated using (true);
create policy cards_authenticated_read on public.cards
  for select to authenticated using (true);

alter table public.profiles enable row level security;
alter table public.daily_assignment_sets enable row level security;
alter table public.daily_assignments enable row level security;
alter table public.daily_review_assignment_sets enable row level security;
alter table public.daily_review_assignments enable row level security;
alter table public.review_events enable row level security;
alter table public.review_event_applications enable row level security;
alter table public.review_states enable row level security;
alter table public.learned_word_senses enable row level security;
alter table public.study_days enable row level security;
alter table public.user_settings enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy daily_assignment_sets_select_own on public.daily_assignment_sets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_assignments_select_own on public.daily_assignments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_review_assignment_sets_select_own on public.daily_review_assignment_sets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_review_assignments_select_own on public.daily_review_assignments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy review_events_select_own on public.review_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy review_event_applications_select_own on public.review_event_applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy review_states_select_own on public.review_states
  for select to authenticated using ((select auth.uid()) = user_id);
create policy learned_word_senses_select_own on public.learned_word_senses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy study_days_select_own on public.study_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table
  public.modules,
  public.categories,
  public.words,
  public.word_senses,
  public.contexts,
  public.cards
from anon, authenticated;

grant select on table
  public.modules,
  public.categories,
  public.words,
  public.word_senses,
  public.contexts,
  public.cards
to authenticated;

revoke all on table
  public.profiles,
  public.daily_assignment_sets,
  public.daily_assignments,
  public.daily_review_assignment_sets,
  public.daily_review_assignments,
  public.review_events,
  public.review_event_applications,
  public.review_states,
  public.learned_word_senses,
  public.study_days,
  public.user_settings
from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_settings to authenticated;
grant select on table
  public.daily_assignment_sets,
  public.daily_assignments,
  public.daily_review_assignment_sets,
  public.daily_review_assignments,
  public.review_events,
  public.review_event_applications,
  public.review_states,
  public.learned_word_senses,
  public.study_days
to authenticated;

revoke all on function public.validate_profile_timezone() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.reject_review_event_mutation() from public, anon, authenticated;
