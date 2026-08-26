import { createClient } from "@supabase/supabase-js";

import { SupabaseAuthGateway, type SessionCache } from "../auth/SupabaseAuthGateway";
import { createCloudRpcClient, type CloudRpcClient } from "./cloud/rpcClient";

export interface SupabaseRemoteServices {
  auth: SupabaseAuthGateway;
  rpc: CloudRpcClient;
}

export async function createSupabaseRemoteServices(
  url: string,
  publishableKey: string,
  sessionCache: SessionCache
): Promise<SupabaseRemoteServices> {
  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  const auth = new SupabaseAuthGateway(client, sessionCache);
  await auth.restoreLocal();
  return { auth, rpc: createCloudRpcClient(client) };
}
