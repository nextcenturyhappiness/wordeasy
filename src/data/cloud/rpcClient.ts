import type { SupabaseClient } from "@supabase/supabase-js";

interface RpcDatabase {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<
      string,
      {
        Args: Record<string, unknown>;
        Returns: unknown;
      }
    >;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface CloudRpcClient {
  call(functionName: string, parameters: Record<string, unknown>): Promise<unknown>;
}

export class SupabaseRpcError extends Error {
  constructor(
    readonly operation: string,
    readonly code: string | null,
    message: string
  ) {
    super(`Supabase RPC ${operation} failed: ${message}`);
    this.name = "SupabaseRpcError";
  }
}

export function createCloudRpcClient(client: SupabaseClient): CloudRpcClient {
  const typedClient = client as unknown as SupabaseClient<RpcDatabase>;
  return {
    async call(functionName, parameters) {
      const { data, error } = await typedClient.rpc(functionName, parameters);
      if (error !== null) {
        throw new SupabaseRpcError(functionName, error.code, error.message);
      }
      return data;
    }
  };
}
