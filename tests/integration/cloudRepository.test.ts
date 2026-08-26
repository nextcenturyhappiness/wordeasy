import { describe, expect, it } from "vitest";

import { CloudPayloadError, parseNewAssignmentSet } from "../../src/data/cloud/parsers";
import type { CloudRpcClient } from "../../src/data/cloud/rpcClient";
import {
  DisposedCloudRepositoryError,
  SupabaseCloudRepository
} from "../../src/data/cloud/supabaseCloudRepository";
import type { CloudPushEvent } from "../../src/data/cloud/types";

function researchAssignments(): Array<Record<string, unknown>> {
  return [
    ...Array.from({ length: 5 }, (_, index) => ({
      card_id: `general-${String(index)}`,
      category: "general_research",
      position: index + 1
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      card_id: `statistics-${String(index)}`,
      category: "statistics_methodology",
      position: index + 6
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      card_id: `bioinformatics-${String(index)}`,
      category: "bioinformatics",
      position: index + 8
    }))
  ];
}

function readyResearchPayload(): Record<string, unknown> {
  return {
    status: "ready",
    set_id: "set-a",
    module: "research_english",
    study_date: "2026-08-26",
    timezone: "Asia/Shanghai",
    shortage: null,
    assignments: researchAssignments()
  };
}

function pushEvent(userId = "user-a"): CloudPushEvent {
  return {
    eventId: "10000000-0000-4000-8000-000000000001",
    presentationActionId: "action-a",
    userId,
    cardId: "card-a",
    wordSenseId: "sense-a",
    module: "research_english",
    queue: "new",
    studyDate: "2026-08-26",
    rating: "good",
    reviewedAt: "2026-08-26T08:00:00.000Z",
    timezone: "Asia/Shanghai",
    deviceId: "device-a",
    deviceSequence: 1,
    baseRevision: 0,
    schedulerBefore: {},
    schedulerAfter: { due: "2026-08-27T08:00:00.000Z" },
    schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
    syncStatus: "pending",
    createdAt: "2026-08-26T08:00:00.000Z",
    dueAt: "2026-08-27T08:00:00.000Z"
  };
}

class RecordingRpcClient implements CloudRpcClient {
  readonly calls: Array<{ functionName: string; parameters: Record<string, unknown> }> = [];

  constructor(private readonly response: unknown) {}

  call(functionName: string, parameters: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ functionName, parameters });
    return Promise.resolve(this.response);
  }
}

function rpcWithResponse(response: unknown): RecordingRpcClient {
  return new RecordingRpcClient(response);
}

describe("Supabase cloud repository boundary", () => {
  it("accepts only a complete Research 5+2+3 assignment", async () => {
    const rpc = rpcWithResponse(readyResearchPayload());
    const repository = new SupabaseCloudRepository("user-a", rpc);

    await expect(
      repository.ensureNewAssignment("research_english", "2026-08-26")
    ).resolves.toMatchObject({ status: "ready", assignments: { length: 10 } });
    expect(rpc.calls).toEqual([
      {
        functionName: "ensure_daily_assignment",
        parameters: {
          p_module_slug: "research_english",
          p_requested_study_date: "2026-08-26"
        }
      }
    ]);
    expect(rpc.calls[0]?.parameters).not.toHaveProperty("user_id");
  });

  it("rejects partial ready sets and partial shortage sets", () => {
    expect(() =>
      parseNewAssignmentSet({
        ...readyResearchPayload(),
        assignments: researchAssignments().slice(0, 9)
      })
    ).toThrow(CloudPayloadError);
    expect(() =>
      parseNewAssignmentSet({
        ...readyResearchPayload(),
        status: "shortage",
        shortage: {
          code: "content_shortage",
          category: "bioinformatics",
          required: 3,
          available: 2,
          message: "Not enough new Bioinformatics cards are available."
        }
      })
    ).toThrow("empty shortage assignment");
  });

  it("omits user_id from ingest and refuses cross-account local events", async () => {
    const response = [
      {
        event_id: "10000000-0000-4000-8000-000000000001",
        card_id: "card-a",
        status: "duplicate",
        application_status: "applied",
        canonical_revision: 1,
        reason: null,
        clock_anomaly: false
      }
    ];
    const rpc = rpcWithResponse(response);
    const repository = new SupabaseCloudRepository("user-a", rpc);

    await expect(repository.pushEvents([pushEvent()])).resolves.toMatchObject([
      { status: "duplicate", canonicalRevision: 1 }
    ]);
    const parameters = rpc.calls[0]?.parameters;
    expect(parameters).not.toBeUndefined();
    const serialized = (parameters?.p_events as Array<Record<string, unknown>>)[0];
    expect(serialized).not.toHaveProperty("user_id");
    expect(serialized).toMatchObject({
      event_id: "10000000-0000-4000-8000-000000000001",
      due_at: "2026-08-27T08:00:00.000Z"
    });

    await expect(repository.pushEvents([pushEvent("user-b")])).rejects.toThrow(
      "different account scope"
    );
    expect(rpc.calls).toHaveLength(1);
  });

  it("pulls canonical states with an independent monotonic state cursor", async () => {
    const rpc = rpcWithResponse({
      events: [],
      states: [],
      conflicted_card_ids: [],
      next_cursor: {
        received_at: "2026-08-26T08:00:00.000Z",
        event_id: "10000000-0000-4000-8000-000000000001",
        state_sequence: 12,
        state_epoch: "trusted-review-state-v1"
      },
      has_more: false
    });
    const repository = new SupabaseCloudRepository("user-a", rpc);

    await expect(
      repository.pullChanges(
        {
          receivedAt: "2026-08-26T08:00:00.000Z",
          eventId: "10000000-0000-4000-8000-000000000001",
          stateSequence: 11,
          stateEpoch: "trusted-review-state-v1"
        },
        200
      )
    ).resolves.toMatchObject({ nextCursor: { stateSequence: 12 } });
    expect(rpc.calls).toEqual([
      {
        functionName: "pull_learning_changes",
        parameters: {
          p_after_received_at: "2026-08-26T08:00:00.000Z",
          p_after_event_id: "10000000-0000-4000-8000-000000000001",
          p_after_state_sequence: 11,
          p_state_epoch: "trusted-review-state-v1",
          p_limit: 200
        }
      }
    ]);
  });

  it("cannot be reused after its account runtime is disposed", async () => {
    const rpc = rpcWithResponse(readyResearchPayload());
    const repository = new SupabaseCloudRepository("user-a", rpc);
    repository.dispose();

    await expect(
      repository.ensureNewAssignment("research_english", "2026-08-26")
    ).rejects.toBeInstanceOf(DisposedCloudRepositoryError);
  });

  it("routes canonical reconciliation through the trusted Edge boundary", async () => {
    const response = {
      status: "committed",
      card_id: "card-a",
      module: "research_english",
      scheduler_state: { trusted: true },
      due_at: "2026-08-27T08:00:00.000Z",
      last_reviewed_at: "2026-08-26T08:00:00.000Z",
      revision: 2,
      scheduler_implementation_version: "ts-fsrs@5.4.1/default-v1",
      expected_revision: 1,
      event_set_hash: "trusted-hash"
    };
    const rpc = rpcWithResponse(response);
    const repository = new SupabaseCloudRepository("user-a", rpc);

    await expect(repository.reconcileCard("card-a")).resolves.toMatchObject({
      cardId: "card-a",
      revision: 2,
      schedulerState: { trusted: true }
    });
    expect(rpc.calls).toEqual([
      {
        functionName: "edge:review-sync",
        parameters: { action: "reconcile_card", card_id: "card-a" }
      }
    ]);
    expect(rpc.calls[0]?.parameters).not.toHaveProperty("scheduler_state");
  });
});
