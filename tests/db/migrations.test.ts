import { describe, expect, it } from "vitest";

import assignmentSql from "../../supabase/migrations/20260826000200_assignment_rpcs.sql?raw";
import preferencesSql from "../../supabase/migrations/20260826000400_account_preferences_rpcs.sql?raw";
import schemaSql from "../../supabase/migrations/20260826000100_learning_schema.sql?raw";
import seedSql from "../../supabase/migrations/20260826000500_seed_content.sql?raw";
import syncSql from "../../supabase/migrations/20260826000300_review_sync_rpcs.sql?raw";

const SCHEMA = schemaSql.toLowerCase();
const ASSIGNMENTS = assignmentSql.toLowerCase();
const SYNC = syncSql.toLowerCase();
const PREFERENCES = preferencesSql.toLowerCase();
const SEED = seedSql.toLowerCase();

const PUBLIC_CONTENT_TABLES = [
  "modules",
  "categories",
  "words",
  "word_senses",
  "contexts",
  "cards"
];
const PRIVATE_TABLES = [
  "profiles",
  "daily_assignment_sets",
  "daily_assignments",
  "daily_review_assignment_sets",
  "daily_review_assignments",
  "review_events",
  "review_event_applications",
  "review_states",
  "learned_word_senses",
  "study_days",
  "user_settings"
];

function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create function public.${name}`);
  if (start < 0) {
    throw new Error(`Missing SQL function ${name}.`);
  }
  const end = sql.indexOf("$$;", start);
  if (end < 0) {
    throw new Error(`Unterminated SQL function ${name}.`);
  }
  return sql.slice(start, end + 3);
}

describe("Supabase migration contracts", () => {
  it("normalizes Context Cards and protects their entity relationships", () => {
    for (const table of PUBLIC_CONTENT_TABLES) {
      expect(SCHEMA).toContain(`create table public.${table}`);
    }
    expect(SCHEMA).toContain("foreign key (category_id, module_id)");
    expect(SCHEMA).toContain("foreign key (context_id, word_sense_id)");
    expect(SCHEMA).toContain("contexts_target_present");
    expect(SCHEMA).toContain("contexts_collocations_not_empty");
  });

  it("creates required private tables, constraints, and query indexes", () => {
    for (const table of PRIVATE_TABLES) {
      expect(SCHEMA).toContain(`create table public.${table}`);
    }
    expect(SCHEMA).toContain("event_id uuid primary key");
    expect(SCHEMA).toContain("primary key (user_id, card_id)");
    expect(SCHEMA).toContain("unique (user_id, module_id, study_date, card_id)");
    expect(SCHEMA).toContain("unique (user_id, module_id, study_date, position)");
    expect(SCHEMA).toContain("review_states_due_idx");
    expect(SCHEMA).toContain("review_events_card_time_idx");
    expect(SCHEMA).toContain("review_events_pull_idx");
  });

  it("enables RLS for every private table and exposes content read-only", () => {
    for (const table of PRIVATE_TABLES) {
      expect(SCHEMA).toContain(`alter table public.${table} enable row level security`);
    }
    for (const table of PUBLIC_CONTENT_TABLES) {
      expect(SCHEMA).toContain(`alter table public.${table} enable row level security`);
      expect(SCHEMA).toContain(`policy ${table}_authenticated_read`);
    }
    expect(SCHEMA).toContain("from anon, authenticated");
    expect(SCHEMA).toContain("to authenticated");
    expect(SCHEMA).not.toMatch(/grant\s+(insert|update|delete)[^;]*public\.cards/);
  });

  it("binds private policies to auth.uid and makes Review events immutable", () => {
    expect(SCHEMA.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(13);
    expect(SCHEMA).toContain("create trigger review_events_immutable");
    expect(SCHEMA).toContain("before update or delete on public.review_events");
    expect(SCHEMA).toContain("review events are immutable");
    expect(SCHEMA).not.toMatch(/grant\s+(update|delete)[^;]*review_events/);
  });

  it("freezes all-or-nothing Research 5+2+3 and Medical 10 assignments", () => {
    const body = functionBody(ASSIGNMENTS, "ensure_daily_assignment");
    expect(body).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(body).toContain("auth.uid()");
    expect(body).toContain("statement_timestamp() at time zone v_timezone");
    expect(body).toContain("('general_research'::text, 'general research'::text, 5)");
    expect(body).toContain("('statistics_methodology'::text, 'statistics / methodology'::text, 2)");
    expect(body).toContain("('bioinformatics'::text, 'bioinformatics'::text, 3)");
    expect(body).toContain("if v_available < 10 then");
    expect(body).toContain("status,\n          assigned_count");
    expect(body).toContain("'shortage',\n          0");
    expect(body).toContain(
      "not exists (\n          select 1\n          from public.daily_assignments"
    );
    expect(body).toContain("extensions.digest");
    expect(body).toContain("if v_inserted <> 10 then");
  });

  it("freezes even an empty Review queue at the next profile-local midnight", () => {
    const body = functionBody(ASSIGNMENTS, "ensure_daily_review_assignment");
    expect(body).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(body).toContain("p_requested_study_date + 1");
    expect(body).toContain("at time zone v_timezone");
    expect(body).toContain("state.due_at < v_cutoff_at");
    expect(body.indexOf("insert into public.daily_review_assignment_sets")).toBeLessThan(
      body.indexOf("insert into public.daily_review_assignments")
    );
  });

  it("hardens every client RPC with auth binding and an empty search path", () => {
    const functions: Array<[string, string]> = [
      [ASSIGNMENTS, "ensure_daily_assignment"],
      [ASSIGNMENTS, "ensure_daily_review_assignment"],
      [ASSIGNMENTS, "get_daily_learning_snapshot"],
      [SYNC, "ingest_review_events"],
      [SYNC, "pull_learning_changes"],
      [SYNC, "get_reconciliation_bundle"],
      [SYNC, "commit_reconciled_review_state"]
    ];
    for (const [sql, name] of functions) {
      const body = functionBody(sql, name);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = ''");
      expect(body).toContain("auth.uid()");
    }
    expect(`${ASSIGNMENTS}\n${SYNC}`).not.toContain("service_role");
  });

  it("ingests immutable events idempotently and separates application state", () => {
    const body = functionBody(SYNC, "ingest_review_events");
    expect(body).toContain("event_fingerprint");
    expect(body).toContain("review-event:");
    expect(body).toContain("event_id_collision");
    expect(body).toContain("status', 'duplicate'");
    expect(body).toContain("insert into public.review_event_applications");
    expect(body).toContain("base_revision_mismatch");
    expect(body).toContain("pending_reconciliation");
    expect(body).not.toMatch(/update public\.review_events/);
  });

  it("uses stable per-card ordering and event-set CAS for reconciliation", () => {
    const bundle = functionBody(SYNC, "get_reconciliation_bundle");
    const commit = functionBody(SYNC, "commit_reconciled_review_state");
    const order = "event.ordering_at, event.device_id, event.device_sequence, event.event_id";
    expect(bundle).toContain(order);
    expect(bundle).toContain("event_set_hash");
    expect(commit).toContain(order);
    expect(commit).toContain("v_current_revision is distinct from p_expected_revision");
    expect(commit).toContain("v_actual_hash is distinct from p_event_set_hash");
    expect(commit).toContain("status', 'stale'");
    expect(commit).toContain("status = 'reconciled'");
  });

  it("records clock anomalies without mutating their reviewed_at evidence", () => {
    const body = functionBody(SYNC, "ingest_review_events");
    expect(body).toContain("v_reviewed_at > v_received_at + interval '1 day'");
    expect(body).toContain("v_reviewed_at < v_received_at - interval '365 days'");
    expect(body).toContain(
      "v_ordering_at := case when v_clock_anomaly then v_received_at else v_reviewed_at end"
    );
    expect(SCHEMA).toContain("reviewed_at timestamptz not null");
    expect(SCHEMA).toContain("ordering_at timestamptz not null");
  });

  it("creates account preferences only for auth.uid and returns scope evidence", () => {
    for (const name of ["ensure_account_preferences", "set_account_preferences"]) {
      const body = functionBody(PREFERENCES, name);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = ''");
      expect(body).toContain("auth.uid()");
      expect(body).toContain("'user_id', v_user_id");
      expect(body).not.toContain("p_user_id");
    }
    expect(PREFERENCES).toContain("to authenticated");
    expect(PREFERENCES).not.toContain("service_role");
  });

  it("ships the validated normalized content as a controlled migration", () => {
    for (const table of PUBLIC_CONTENT_TABLES) {
      expect(SEED).toContain(`insert into public.${table}`);
    }
    expect(SEED).toContain("generated from data/seed-data.json");
    expect(SEED.match(/'context_recall', true\)/g)).toHaveLength(60);
    expect(SEED).toContain("begin;");
    expect(SEED).toContain("commit;");
  });
});
