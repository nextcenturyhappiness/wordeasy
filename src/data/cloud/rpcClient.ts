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

interface EdgeFunctionsClient {
  functions: {
    invoke(
      functionName: string,
      options: { body: Record<string, unknown> }
    ): Promise<{ data: unknown; error: { message: string } | null }>;
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

export class SupabaseFunctionError extends Error {
  constructor(
    readonly operation: string,
    message: string
  ) {
    super(`Supabase Edge Function ${operation} failed: ${message}`);
    this.name = "SupabaseFunctionError";
  }
}

export function createCloudRpcClient(client: SupabaseClient): CloudRpcClient {
  const typedClient = client as unknown as SupabaseClient<RpcDatabase>;
  const edgeClient = client as unknown as EdgeFunctionsClient;
  return {
    async call(functionName, parameters) {
      if (functionName.startsWith("edge:")) {
        const edgeFunctionName = functionName.slice("edge:".length);
        if (edgeFunctionName.length === 0) {
          throw new SupabaseFunctionError(functionName, "function name is required");
        }
        const { data, error } = await edgeClient.functions.invoke(edgeFunctionName, {
          body: parameters
        });
        if (error !== null) {
          throw new SupabaseFunctionError(edgeFunctionName, error.message);
        }
        return data;
      }
      const { data, error } = await typedClient.rpc(functionName, parameters);
      if (error !== null) {
        throw new SupabaseRpcError(functionName, error.code, error.message);
      }
      return data;
    }
  };
}
