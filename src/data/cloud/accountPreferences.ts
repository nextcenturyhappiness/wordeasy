import type { SettingsGateway, ThemePreference } from "../../application/contracts";
import { assertIanaTimezone } from "../../domain/time";
import type { LearningDatabase } from "../../db/learningDatabase";
import { IndexedDbSettingsGateway } from "../indexedDbSettingsGateway";
import type { CloudRpcClient } from "./rpcClient";

const PENDING_PREFERENCES_KEY = "pending-account-preferences-v1";

export interface AccountPreferences {
  timezone: string;
  theme: ThemePreference;
}

function parsePreferences(value: unknown, expectedUserId: string): AccountPreferences {
  if (typeof value !== "object" || value === null) {
    throw new Error("Cloud account preferences must be an object.");
  }
  const timezone = "timezone" in value ? value.timezone : undefined;
  const theme = "theme" in value ? value.theme : undefined;
  const userId = "user_id" in value ? value.user_id : undefined;
  if (userId !== expectedUserId) {
    throw new Error("Cloud account preferences escaped their account scope.");
  }
  if (typeof timezone !== "string") {
    throw new Error("Cloud account preferences omitted the timezone.");
  }
  assertIanaTimezone(timezone);
  if (theme !== "system" && theme !== "light" && theme !== "dark") {
    throw new Error("Cloud account preferences contain an invalid theme.");
  }
  return { timezone, theme };
}

export class AccountCloudSettingsGateway implements SettingsGateway {
  readonly #local: IndexedDbSettingsGateway;

  constructor(
    private readonly database: LearningDatabase,
    readonly userId: string,
    private readonly rpc: CloudRpcClient,
    private readonly now: () => Date = () => new Date()
  ) {
    if (userId.trim().length === 0) {
      throw new Error("Cloud settings require an account userId.");
    }
    this.#local = new IndexedDbSettingsGateway(database, userId);
  }

  getTheme(): Promise<ThemePreference> {
    return this.#local.getTheme();
  }

  async setTheme(theme: ThemePreference): Promise<void> {
    await this.#local.setTheme(theme);
    await this.#markPending();
  }

  getTimezone(): Promise<string> {
    return this.#local.getTimezone();
  }

  async setTimezone(timezone: string): Promise<void> {
    await this.#local.setTimezone(timezone);
    await this.#markPending();
  }

  async syncRemote(): Promise<AccountPreferences> {
    const local = await this.#readLocal();
    const pending = await this.database.sync_metadata.get([this.userId, PENDING_PREFERENCES_KEY]);
    const payload = await this.rpc.call(
      pending === undefined ? "ensure_account_preferences" : "set_account_preferences",
      {
        p_timezone: local.timezone,
        p_theme: local.theme
      }
    );
    const remote = parsePreferences(payload, this.userId);
    const updatedAt = this.now().toISOString();

    await this.database.transaction(
      "rw",
      this.database.local_profile,
      this.database.local_settings,
      this.database.sync_metadata,
      async () => {
        const profile = await this.database.local_profile.get(this.userId);
        if (profile === undefined) {
          throw new Error(`No local profile exists for ${this.userId}.`);
        }
        await this.database.local_profile.put({ ...profile, timezone: remote.timezone, updatedAt });
        await this.database.local_settings.put({
          userId: this.userId,
          key: "timezone",
          value: remote.timezone,
          updatedAt
        });
        await this.database.local_settings.put({
          userId: this.userId,
          key: "theme",
          value: remote.theme,
          updatedAt
        });
        await this.database.sync_metadata.delete([this.userId, PENDING_PREFERENCES_KEY]);
      }
    );
    return remote;
  }

  async #readLocal(): Promise<AccountPreferences> {
    const [timezone, theme] = await Promise.all([this.getTimezone(), this.getTheme()]);
    return { timezone, theme };
  }

  async #markPending(): Promise<void> {
    const local = await this.#readLocal();
    const updatedAt = this.now().toISOString();
    await this.database.sync_metadata.put({
      userId: this.userId,
      key: PENDING_PREFERENCES_KEY,
      value: { ...local, updatedAt },
      updatedAt
    });
  }
}
