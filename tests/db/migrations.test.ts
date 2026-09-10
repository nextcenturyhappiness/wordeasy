import { describe, expect, it } from "vitest";

import assignmentSql from "../../supabase/migrations/20260826000200_assignment_rpcs.sql?raw";
import hardeningSql from "../../supabase/migrations/20260826000600_sync_hardening.sql?raw";
import preferencesSql from "../../supabase/migrations/20260826000400_account_preferences_rpcs.sql?raw";
import schemaSql from "../../supabase/migrations/20260826000100_learning_schema.sql?raw";
import seedSql from "../../supabase/migrations/20260826000500_seed_content.sql?raw";
import seedBatch2Sql from "../../supabase/migrations/20260903000700_seed_content_batch2.sql?raw";
import medicalReshapeSql from "../../supabase/migrations/20260907000800_medical_morphology.sql?raw";
import medicalQuotaSql from "../../supabase/migrations/20260907000900_medical_assignment_quotas.sql?raw";
import medicalPdfExpansionSql from "../../supabase/migrations/20260907001000_medical_pdf_expansion.sql?raw";
import medicalQuotaFlipSql from "../../supabase/migrations/20260907001100_medical_assignment_quota_flip.sql?raw";
import essentialAssignmentSql from "../../supabase/migrations/20260908001300_essential_medical_assignment.sql?raw";
import essentialSeedSql from "../../supabase/migrations/20260908001400_essential_medical_seed.sql?raw";
import essentialRefreshSql from "../../supabase/migrations/20260910001600_essential_medical_roots_sentences.sql?raw";
import essentialClinicalSql from "../../supabase/migrations/20260910001700_essential_medical_clinical_sentences.sql?raw";
import shortageSelfHealSql from "../../supabase/migrations/20260908001500_assignment_shortage_self_heal.sql?raw";
import medicalChartMidlevelSql from "../../supabase/migrations/20260907001200_medical_chart_midlevel.sql?raw";
import syncSql from "../../supabase/migrations/20260826000300_review_sync_rpcs.sql?raw";
import edgeFsrs from "../../supabase/functions/_shared/fsrs.ts?raw";
import edgeHandler from "../../supabase/functions/review-sync/index.ts?raw";

const SCHEMA = schemaSql.toLowerCase();
const ASSIGNMENTS = assignmentSql.toLowerCase();
const HARDENING = hardeningSql.toLowerCase();
const SYNC = syncSql.toLowerCase();
const MEDICAL_QUOTAS = medicalQuotaSql.toLowerCase();
const MEDICAL_QUOTA_FLIP = medicalQuotaFlipSql.toLowerCase();
const ESSENTIAL_ASSIGNMENT = essentialAssignmentSql.toLowerCase();
const ESSENTIAL_SEED = essentialSeedSql.toLowerCase();
const ESSENTIAL_REFRESH = essentialRefreshSql.toLowerCase();
const ESSENTIAL_CLINICAL = essentialClinicalSql.toLowerCase();
const SHORTAGE_SELF_HEAL = shortageSelfHealSql.toLowerCase();
const EFFECTIVE_ASSIGNMENTS = `${ASSIGNMENTS}\n${HARDENING}\n${MEDICAL_QUOTAS}\n${MEDICAL_QUOTA_FLIP}\n${ESSENTIAL_ASSIGNMENT}\n${SHORTAGE_SELF_HEAL}`;
const EFFECTIVE_SYNC = `${SYNC}\n${HARDENING}\n${MEDICAL_QUOTAS}`;
const SEED_PDF_EXPANSION = medicalPdfExpansionSql.toLowerCase();
const SEED_CHART_MIDLEVEL = medicalChartMidlevelSql.toLowerCase();
const PREFERENCES = preferencesSql.toLowerCase();
const SEED = seedSql.toLowerCase();
const SEED_BATCH2 = seedBatch2Sql.toLowerCase();
const SEED_RESHAPE = medicalReshapeSql.toLowerCase();

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
  const plainStart = sql.lastIndexOf(`create function public.${name}(`);
  const replacementStart = sql.lastIndexOf(`create or replace function public.${name}(`);
  const start = Math.max(plainStart, replacementStart);
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

  it("freezes all-or-nothing Research 5+2+3 and Medical 7+3 assignments", () => {
    const body = functionBody(EFFECTIVE_ASSIGNMENTS, "ensure_daily_assignment_v1_unlocked");
    expect(body).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(body).toContain("auth.uid()");
    expect(body).toContain("statement_timestamp() at time zone v_timezone");
    expect(body).toContain("('general_research'::text, 'general research'::text, 5)");
    expect(body).toContain("('statistics_methodology'::text, 'statistics / methodology'::text, 2)");
    expect(body).toContain("('bioinformatics'::text, 'bioinformatics'::text, 3)");
    expect(body).toContain("('clinical'::text, 'medical chart / class'::text, 3)");
    expect(body).toContain("('morphology'::text, '词根构词'::text, 7)");
    expect(body).toContain("p_module_slug = 'essential_medical'");
    expect(body).toContain("not enough new 必备医学英语 cards are available.");
    expect(body).toContain("status,\n          assigned_count");
    expect(body).toContain("'shortage',\n          0");
    expect(body).toContain(
      "not exists (\n          select 1\n          from public.daily_assignments"
    );
    expect(body).toContain("extensions.digest");
    expect(body).toContain("if v_inserted <> 10 then");
    expect(body).toContain("bucket_slug = 'clinical' and bucket_position <= 3");
    expect(body).toContain("bucket_slug = 'morphology' and bucket_position <= 7");
    expect(body).toContain("v_existing_status is distinct from 'shortage'");
    expect(body).toContain("delete from public.daily_assignment_sets");
    expect(body).toContain("assignment_set.status = 'shortage'");
    expect(body).toContain("assignment_set.assigned_count = 0");
  });

  it("freezes even an empty Review queue at the next profile-local midnight", () => {
    const body = functionBody(EFFECTIVE_ASSIGNMENTS, "ensure_daily_review_assignment");
    expect(body).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(body).toContain("p_requested_study_date + 1");
    expect(body).toContain("at time zone v_timezone");
    expect(body).toContain("state.due_at < v_cutoff_at");
    expect(body.indexOf("insert into public.daily_review_assignment_sets")).toBeLessThan(
      body.indexOf("insert into public.daily_review_assignments")
    );
    expect(body).toContain("get diagnostics v_count = row_count");
    expect(body).toContain("set assigned_count = v_count");
    expect(body).not.toContain("select count(*)::integer");
    expect(body).toContain("application.status = 'pending_reconciliation'");
    expect(body).toContain("trusted review-state replay required before assignment freeze");
  });

  it("hardens every client RPC with auth binding and an empty search path", () => {
    const functions: Array<[string, string]> = [
      [EFFECTIVE_ASSIGNMENTS, "ensure_daily_assignment"],
      [EFFECTIVE_ASSIGNMENTS, "ensure_daily_review_assignment"],
      [ASSIGNMENTS, "get_daily_learning_snapshot"],
      [EFFECTIVE_SYNC, "ingest_review_events"],
      [EFFECTIVE_SYNC, "pull_learning_changes"]
    ];
    for (const [sql, name] of functions) {
      const body = functionBody(sql, name);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = ''");
      expect(body).toContain("auth.uid()");
    }
    expect(HARDENING).toContain("to service_role");
  });

  it("ingests immutable events idempotently and separates application state", () => {
    const body = functionBody(EFFECTIVE_SYNC, "ingest_review_events");
    expect(body).toContain("event_fingerprint");
    expect(body).toContain("review-event:");
    expect(body).toContain("event_id_collision");
    expect(body).toContain("else 'duplicate'");
    expect(body).toContain("when v_application_status = 'rejected' then 'rejected'");
    expect(body).toContain("insert into public.review_event_applications");
    expect(body).toContain("pending_reconciliation");
    expect(body).toContain("trusted_replay_required");
    expect(body).not.toMatch(/update public\.review_events/);
    expect(body).not.toContain("insert into public.review_states");
    expect(body).not.toContain("update public.review_states");
  });

  it("uses stable per-card ordering and event-set CAS for reconciliation", () => {
    const bundle = functionBody(HARDENING, "get_reconciliation_bundle_trusted");
    const commit = functionBody(HARDENING, "commit_reconciled_review_state_trusted");
    const order = "event.ordering_at, event.device_id, event.device_sequence, event.event_id";
    expect(bundle).toContain(order);
    expect(bundle).toContain("event_set_hash");
    expect(commit).toContain(order);
    expect(commit).toContain("v_current_revision is distinct from p_expected_revision");
    expect(commit).toContain("v_actual_hash is distinct from p_event_set_hash");
    expect(commit).toContain("status', 'stale'");
    expect(commit).toContain("status = 'reconciled'");
    for (const body of [bundle, commit]) {
      expect(body).toContain(
        "application.status in ('applied', 'pending_reconciliation', 'reconciled')"
      );
      expect(body).not.toContain("application.status <> 'rejected'");
    }
  });

  it("quarantines invalid legacy events before rebuilding trusted materializations", () => {
    const pull = functionBody(EFFECTIVE_SYNC, "pull_learning_changes");
    expect(HARDENING).toContain("application.status as previous_status");
    expect(HARDENING).toContain("classified_event.previous_status <> 'rejected'");
    expect(HARDENING).toContain("legacy_queue_membership_invalid");
    expect(HARDENING).toContain("assignment_set.created_at <= event.received_at");
    expect(HARDENING).toContain("delete from public.review_states;");
    expect(HARDENING).toContain("delete from public.learned_word_senses;");
    expect(HARDENING).toContain("delete from public.study_days;");
    expect(HARDENING).toContain("create sequence public.review_state_change_sequence");
    expect(HARDENING).toContain("review_states_user_change_idx");
    expect(HARDENING).toContain("change_sequence = excluded.change_sequence");
    expect(pull).toContain("p_after_state_sequence bigint");
    expect(pull).toContain("p_state_epoch text");
    expect(pull).toContain("else 0");
    expect(pull).toContain("state.change_sequence > v_effective_after_state_sequence");
    expect(pull).toContain("'state_epoch', 'trusted-review-state-v1'");
    expect(pull).toContain("v_event_has_more or v_state_has_more");
    expect(pull).toContain(
      "application.status in ('applied', 'pending_reconciliation', 'reconciled')"
    );
    expect(pull).not.toContain("application.status <> 'rejected'");
  });

  it("records clock anomalies without mutating their reviewed_at evidence", () => {
    const body = functionBody(EFFECTIVE_SYNC, "ingest_review_events");
    expect(body).toContain("v_reviewed_at > v_received_at + interval '1 day'");
    expect(body).toContain("v_reviewed_at < v_received_at - interval '365 days'");
    expect(body).toContain(
      "v_ordering_at := case when v_clock_anomaly then v_received_at else v_reviewed_at end"
    );
    expect(SCHEMA).toContain("reviewed_at timestamptz not null");
    expect(SCHEMA).toContain("ordering_at timestamptz not null");
  });

  it("shares a user-module lock across assignment, ingest, and trusted commit", () => {
    const lockPrefix = "'learning-module:' || v_user_id::text || ':' || v_module_id::text";
    expect(functionBody(EFFECTIVE_ASSIGNMENTS, "ensure_daily_assignment")).toContain(lockPrefix);
    expect(functionBody(EFFECTIVE_ASSIGNMENTS, "ensure_daily_review_assignment")).toContain(
      lockPrefix
    );
    expect(functionBody(EFFECTIVE_SYNC, "ingest_review_events")).toContain(
      "'learning-module:' || v_user_id::text || ':' || v_lock_module_id::text"
    );
    expect(functionBody(HARDENING, "commit_reconciled_review_state_trusted")).toContain(
      "'learning-module:' || p_user_id::text || ':' || v_module_id::text"
    );
  });

  it("rejects events outside their exact stable New or Review assignment", () => {
    const body = functionBody(EFFECTIVE_SYNC, "ingest_review_events");
    expect(body).toContain("from public.daily_assignments as assignment");
    expect(body).toContain("from public.daily_review_assignments as assignment");
    expect(body).toContain("assignment_set.timezone");
    expect(body).toContain("queue_membership_mismatch");
  });

  it("revokes browser canonical-state RPCs and grants only trusted worker commits", () => {
    expect(HARDENING).toMatch(
      /revoke all on function public\.commit_reconciled_review_state\([\s\S]*?from public, anon, authenticated, service_role;/u
    );
    expect(HARDENING).not.toMatch(
      /grant execute on function public\.commit_reconciled_review_state\([\s\S]*?to authenticated;/u
    );
    expect(HARDENING).toContain(
      "grant execute on function public.commit_reconciled_review_state_trusted("
    );
    expect(HARDENING).toContain("to service_role;");
    expect(edgeHandler).toContain("service.auth.getUser(token)");
    expect(edgeHandler).toContain("commit_reconciled_review_state_trusted");
    expect(edgeHandler).toContain("essential_medical");
    expect(edgeHandler).not.toContain("p_scheduler_state: payload");
    expect(edgeFsrs).toContain('from "npm:ts-fsrs@5.4.1"');
    expect(edgeFsrs).toContain('"ts-fsrs@5.4.1/default-v1"');
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

  it("adds the second 60 cards in a later additive migration", () => {
    expect(SEED_BATCH2).toContain("additive insert of the second 60 context cards");
    expect(SEED_BATCH2).toContain("do not rewrite 20260826000500_seed_content.sql");
    expect(SEED_BATCH2).toContain("insert into public.words");
    expect(SEED_BATCH2).toContain("insert into public.word_senses");
    expect(SEED_BATCH2).toContain("insert into public.contexts");
    expect(SEED_BATCH2).toContain("insert into public.cards");
    expect(SEED_BATCH2).not.toContain("insert into public.modules");
    expect(SEED_BATCH2.match(/'context_recall', true\)/g)).toHaveLength(60);
    expect(SEED_BATCH2).toContain("begin;");
    expect(SEED_BATCH2).toContain("commit;");
  });

  it("adds Medical morphology cards and deactivates shipped specialty cards additively", () => {
    expect(SEED_RESHAPE).toContain("do not rewrite 20260826000500_seed_content.sql");
    expect(SEED_RESHAPE).toContain("insert into public.categories");
    expect(SEED_RESHAPE).toContain("'morphology'");
    expect(SEED_RESHAPE).toContain("词根构词");
    expect(SEED_RESHAPE).toContain("insert into public.cards");
    expect(SEED_RESHAPE).toContain("update public.cards");
    expect(SEED_RESHAPE).toContain("set active = false");
    expect(SEED_RESHAPE).toContain("med-physiology-preload-001");
    expect(SEED_RESHAPE).toContain("med-morphology-endocarditis-001");
    expect(SEED_RESHAPE).toContain("begin;");
    expect(SEED_RESHAPE).toContain("commit;");
  });

  it("adds owner-PDF morphology and easy chart cards additively", () => {
    expect(SEED_PDF_EXPANSION).toContain("or 20260907000800_medical_morphology.sql");
    expect(SEED_PDF_EXPANSION).toContain("insert into public.cards");
    expect(SEED_PDF_EXPANSION).toContain("med-morphology-stomatitis-001");
    expect(SEED_PDF_EXPANSION).toContain("med-morphology-asymptomatic-001");
    expect(SEED_PDF_EXPANSION).toContain("med-symptoms-symptom-001");
    expect(SEED_PDF_EXPANSION).not.toContain("update public.cards");
    expect(SEED_PDF_EXPANSION).toContain("begin;");
    expect(SEED_PDF_EXPANSION).toContain("commit;");
  });

  it("raises the Medical chart pool with mid-level PDF lemmas additively", () => {
    expect(SEED_CHART_MIDLEVEL).toContain("or 20260907001000_medical_pdf_expansion.sql");
    expect(SEED_CHART_MIDLEVEL).toContain("insert into public.cards");
    expect(SEED_CHART_MIDLEVEL).toContain("update public.cards");
    expect(SEED_CHART_MIDLEVEL).toContain("set active = false");
    expect(SEED_CHART_MIDLEVEL).toContain("med-symptoms-symptom-001");
    expect(SEED_CHART_MIDLEVEL).toContain("med-anatomy-esophagus-001");
    expect(SEED_CHART_MIDLEVEL).toContain("med-pharmacology-insulin-001");
    expect(SEED_CHART_MIDLEVEL).toContain("begin;");
    expect(SEED_CHART_MIDLEVEL).toContain("commit;");
  });

  it("replaces empty shortage sets once the catalog can fill the quota", () => {
    expect(SHORTAGE_SELF_HEAL).toContain("ensure_daily_assignment_v1_unlocked");
    expect(SHORTAGE_SELF_HEAL).toContain("ready sets stay frozen");
    expect(SHORTAGE_SELF_HEAL).toContain("v_existing_status is distinct from 'shortage'");
    expect(SHORTAGE_SELF_HEAL).toContain("delete from public.daily_assignment_sets");
    expect(SHORTAGE_SELF_HEAL).toContain("and assignment_set.status = 'shortage'");
    expect(SHORTAGE_SELF_HEAL).toContain("and assignment_set.assigned_count = 0");
    expect(SHORTAGE_SELF_HEAL).toContain("if v_deleted <> 1 then");
    expect(SHORTAGE_SELF_HEAL).toContain("'essential_medical'");
    expect(SHORTAGE_SELF_HEAL).toContain("'research_english'");
    expect(SHORTAGE_SELF_HEAL).toContain("p_module_slug = 'research_english'");
    expect(SHORTAGE_SELF_HEAL).not.toContain("drop function");
    expect(SHORTAGE_SELF_HEAL).not.toContain("drop table");
  });

  it("adds Essential Medical daily assignment of 10 from the core pool", () => {
    expect(ESSENTIAL_ASSIGNMENT).toContain("ensure_daily_assignment_v1_unlocked");
    expect(ESSENTIAL_ASSIGNMENT).toContain("'essential_medical'");
    expect(ESSENTIAL_ASSIGNMENT).toContain("'core'");
    expect(ESSENTIAL_ASSIGNMENT).toContain("v_required := 10");
    expect(ESSENTIAL_ASSIGNMENT).toContain("ranked.card_position <= 10");
    expect(ESSENTIAL_ASSIGNMENT).toContain("'research_english'");
    expect(ESSENTIAL_ASSIGNMENT).toContain("medical 7+3 unchanged");
    expect(ESSENTIAL_ASSIGNMENT).toContain("category.slug = 'core'");
  });

  it("upserts Essential Medical cards with empty collocations", () => {
    expect(ESSENTIAL_SEED).toContain("generated from data/essential-medical");
    expect(ESSENTIAL_SEED).toContain("drop constraint if exists contexts_collocations_not_empty");
    expect(ESSENTIAL_SEED).toContain("modules_supported_slug");
    expect(ESSENTIAL_SEED).toContain("'essential_medical'");
    expect(ESSENTIAL_SEED).toContain("必备医学英语");
    expect(ESSENTIAL_SEED).toContain("ess-core-abdomen-001");
    expect(ESSENTIAL_SEED.match(/'context_recall', true\)/g)?.length).toBeGreaterThanOrEqual(660);
    expect(ESSENTIAL_SEED).toContain("begin;");
    expect(ESSENTIAL_SEED).toContain("commit;");
  });

  it("refreshes Essential Medical copy additively without rewriting card ids", () => {
    expect(ESSENTIAL_REFRESH).toContain("additive refresh for");
    expect(ESSENTIAL_REFRESH).toContain("update public.word_senses");
    expect(ESSENTIAL_REFRESH).toContain("usage_note");
    expect(ESSENTIAL_REFRESH).toContain("update public.contexts");
    expect(ESSENTIAL_REFRESH).toContain("context_sentence");
    expect(ESSENTIAL_REFRESH).toContain("plain_english_paraphrase");
    expect(ESSENTIAL_REFRESH).toContain("sentence_translation_zh");
    expect(ESSENTIAL_REFRESH).toContain("5d71a3cd-0f3c-5de7-b30e-9325e52ebc04");
    expect(ESSENTIAL_REFRESH).toContain("bronchio-");
    expect(ESSENTIAL_REFRESH).not.toContain("drop table");
    expect(ESSENTIAL_REFRESH).not.toContain("delete from public.cards");
    expect(ESSENTIAL_REFRESH).not.toContain("insert into public.cards");
  });

  it("refreshes Essential Medical sentences additively without rewriting card ids or usage notes", () => {
    expect(ESSENTIAL_CLINICAL).toContain("additive refresh for");
    expect(ESSENTIAL_CLINICAL).toContain("clinical/physiological sentences");
    expect(ESSENTIAL_CLINICAL).toContain("update public.contexts");
    expect(ESSENTIAL_CLINICAL).toContain("context_sentence");
    expect(ESSENTIAL_CLINICAL).toContain("plain_english_paraphrase");
    expect(ESSENTIAL_CLINICAL).toContain("sentence_translation_zh");
    expect(ESSENTIAL_CLINICAL).toContain("4c07b9d7-f594-59fc-9551-5514640d6cfb");
    expect(ESSENTIAL_CLINICAL).toContain("phagocytosis");
    expect(ESSENTIAL_CLINICAL).toContain("engulf bacteria");
    expect(ESSENTIAL_CLINICAL).not.toContain("update public.word_senses");
    expect(ESSENTIAL_CLINICAL).not.toContain("drop table");
    expect(ESSENTIAL_CLINICAL).not.toContain("delete from public.cards");
    expect(ESSENTIAL_CLINICAL).not.toContain("insert into public.cards");
  });
});
