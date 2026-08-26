import { createClient } from "npm:@supabase/supabase-js@2.112.4";

import {
  FSRS_IMPLEMENTATION_VERSION,
  replayFsrs,
  type ReconciliationBundle,
  type ReconciliationEvent,
  type ReviewRating
} from "../_shared/fsrs.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface TrustedServiceClient {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  rpc(
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function moduleSlug(value: unknown): ReconciliationBundle["module"] {
  if (value !== "research_english" && value !== "medical_english") {
    throw new Error("bundle.module is invalid.");
  }
  return value;
}

function rating(value: unknown): ReviewRating {
  if (value !== "again" && value !== "hard" && value !== "good" && value !== "easy") {
    throw new Error("event.rating is invalid.");
  }
  return value;
}

function parseEvent(
  value: unknown,
  expectedCardId: string,
  expectedModule: ReconciliationBundle["module"]
): ReconciliationEvent {
  const item = record(value, "event");
  const cardId = string(item.card_id, "event.card_id");
  const module = moduleSlug(item.module);
  if (cardId !== expectedCardId || module !== expectedModule) {
    throw new Error("Trusted bundle mixed card or module scopes.");
  }
  return {
    eventId: string(item.event_id, "event.event_id"),
    cardId,
    module,
    rating: rating(item.rating),
    orderingAt: string(item.ordering_at, "event.ordering_at"),
    deviceId: string(item.device_id, "event.device_id"),
    deviceSequence: integer(item.device_sequence, "event.device_sequence")
  };
}

function parseBundle(value: unknown, expectedCardId: string): ReconciliationBundle {
  const item = record(value, "bundle");
  const cardId = string(item.card_id, "bundle.card_id");
  if (cardId !== expectedCardId) {
    throw new Error("Trusted bundle returned a different card.");
  }
  const module = moduleSlug(item.module);
  if (!Array.isArray(item.events)) {
    throw new Error("bundle.events must be an array.");
  }
  return {
    cardId,
    module,
    events: item.events.map((event) => parseEvent(event, cardId, module)),
    expectedRevision: integer(item.expected_revision, "bundle.expected_revision"),
    eventSetHash: string(item.event_set_hash, "bundle.event_set_hash")
  };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/iu)?.[1];
  if (token === undefined) {
    return jsonResponse({ error: "authentication_required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serverCredential = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl === undefined || serverCredential === undefined) {
    return jsonResponse({ error: "server_configuration_error" }, 500);
  }

  const service = createClient(supabaseUrl, serverCredential, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as TrustedServiceClient;
  const { data: userData, error: userError } = await service.auth.getUser(token);
  if (userError !== null || userData.user === null) {
    return jsonResponse({ error: "invalid_session" }, 401);
  }
  const userId = userData.user.id;

  try {
    const payload = record(await request.json(), "request");
    if (payload.action !== "reconcile_card") {
      return jsonResponse({ error: "unknown_action" }, 400);
    }
    const cardId = string(payload.card_id, "request.card_id");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: bundlePayload, error: bundleError } = await service.rpc(
        "get_reconciliation_bundle_trusted",
        { p_user_id: userId, p_card_id: cardId }
      );
      if (bundleError !== null) {
        throw new Error(`trusted bundle failed: ${bundleError.message}`);
      }
      const bundle = parseBundle(bundlePayload, cardId);
      const state = replayFsrs(bundle);
      const { data: commitPayload, error: commitError } = await service.rpc(
        "commit_reconciled_review_state_trusted",
        {
          p_user_id: userId,
          p_card_id: cardId,
          p_expected_revision: bundle.expectedRevision,
          p_event_set_hash: bundle.eventSetHash,
          p_scheduler_state: state.schedulerState,
          p_due_at: state.dueAt,
          p_last_reviewed_at: state.lastReviewedAt,
          p_scheduler_implementation_version: FSRS_IMPLEMENTATION_VERSION
        }
      );
      if (commitError !== null) {
        throw new Error(`trusted commit failed: ${commitError.message}`);
      }
      const commit = record(commitPayload, "commit");
      if (commit.status === "stale") {
        continue;
      }
      if (commit.status !== "committed") {
        throw new Error("Trusted commit returned an unknown status.");
      }
      return jsonResponse({
        status: "committed",
        card_id: cardId,
        module: bundle.module,
        scheduler_state: state.schedulerState,
        due_at: state.dueAt,
        last_reviewed_at: state.lastReviewedAt,
        revision: integer(commit.revision, "commit.revision"),
        scheduler_implementation_version: FSRS_IMPLEMENTATION_VERSION,
        expected_revision: bundle.expectedRevision,
        event_set_hash: string(commit.event_set_hash, "commit.event_set_hash")
      });
    }

    return jsonResponse({ error: "reconciliation_stale" }, 409);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "trusted_reconciliation_failed";
    return jsonResponse({ error: message }, 400);
  }
});
