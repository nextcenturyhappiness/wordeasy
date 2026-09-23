import type { SettingsGateway, ThemePreference } from "../../application/contracts";
import { assertIanaTimezone, systemIanaTimezone } from "../../domain/time";
import type { LearningDatabase } from "../../db/learningDatabase";
import { IndexedDbSettingsGateway } from "../indexedDbSettingsGateway";
import {
  themeMigrationRemoteAdjusted,
  themeSystemMigrationMetadataKey
} from "../themePreferenceMigration";
import type { CloudRpcClient } from "./rpcClient";

const PENDING_PREFERENCES_KEY = "pending-account-preferences-v1";

export interface AccountPreferences {
  timezone: string;
  theme: ThemePreference;
}

export interface AccountCloudSettingsGatewayOptions {
  now?: () => Date;
  resolveTimezone?: () => string;
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
  readonly #now: () => Date;
  readonly #resolveTimezone: () => string;

  constructor(
    private readonly database: LearningDatabase,
    readonly userId: string,
    private readonly rpc: CloudRpcClient,
    options: AccountCloudSettingsGatewayOptions = {}
  ) {
    if (userId.trim().length === 0) {
      throw new Error("Cloud settings require an account userId.");
    }
    this.#local = new IndexedDbSettingsGateway(database, userId);
    this.#now = options.now ?? (() => new Date());
    this.#resolveTimezone = options.resolveTimezone ?? systemIanaTimezone;
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
    const osTimezone = this.#resolveTimezone();
    assertIanaTimezone(osTimezone);
    const local = await this.#readLocal();
    if (local.timezone !== osTimezone) {
      await this.setTimezone(osTimezone);
    }
    const aligned = await this.#readLocal();
    const pending = await this.database.sync_metadata.get([this.userId, PENDING_PREFERENCES_KEY]);
    let payload = await this.rpc.call(
      pending === undefined ? "ensure_account_preferences" : "set_account_preferences",
      {
        p_timezone: aligned.timezone,
        p_theme: aligned.theme
      }
    );
    let remote = parsePreferences(payload, this.userId);
    if (remote.timezone !== osTimezone) {
      payload = await this.rpc.call("set_account_preferences", {
        p_timezone: osTimezone,
        p_theme: remote.theme
      });
      remote = parsePreferences(payload, this.userId);
    }
    remote = await this.#replaceLegacyRemoteSystem(remote, osTimezone);
    const updatedAt = this.#now().toISOString();

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
        await this.database.local_profile.put({ ...profile, timezone: osTimezone, updatedAt });
        await this.database.local_settings.put({
          userId: this.userId,
          key: "timezone",
          value: osTimezone,
          updatedAt
        });
        await this.database.local_settings.put({
          userId: this.userId,
          key: "theme",
          value: remote.theme,
          updatedAt
        });
        await this.database.sync_metadata.delete([this.userId, PENDING_PREFERENCES_KEY]);
        const migrationKey: [string, string] = [this.userId, themeSystemMigrationMetadataKey];
        const migration = await this.database.sync_metadata.get(migrationKey);
        const migratedAt =
          typeof migration?.value === "object" &&
          migration.value !== null &&
          "migratedAt" in migration.value &&
          typeof migration.value.migratedAt === "string"
            ? migration.value.migratedAt
            : updatedAt;
        await this.database.sync_metadata.put({
          userId: this.userId,
          key: themeSystemMigrationMetadataKey,
          value: { migratedAt, remoteAdjusted: true },
          updatedAt
        });
      }
    );
    return { timezone: osTimezone, theme: remote.theme };
  }

  async #replaceLegacyRemoteSystem(
    remote: AccountPreferences,
    osTimezone: string
  ): Promise<AccountPreferences> {
    if (remote.theme !== "system") {
      return remote;
    }
    const marker = await this.database.sync_metadata.get([
      this.userId,
      themeSystemMigrationMetadataKey
    ]);
    if (themeMigrationRemoteAdjusted(marker?.value)) {
      return remote;
    }
    const localTheme = (await this.#readLocal()).theme;
    if (localTheme === "system") {
      return remote;
    }
    const payload = await this.rpc.call("set_account_preferences", {
      p_timezone: osTimezone,
      p_theme: localTheme
    });
    return parsePreferences(payload, this.userId);
  }

  async #readLocal(): Promise<AccountPreferences> {
    const [timezone, theme] = await Promise.all([this.getTimezone(), this.getTheme()]);
    return { timezone, theme };
  }

  async #markPending(): Promise<void> {
    const local = await this.#readLocal();
    const updatedAt = this.#now().toISOString();
    await this.database.sync_metadata.put({
      userId: this.userId,
      key: PENDING_PREFERENCES_KEY,
      value: { ...local, updatedAt },
      updatedAt
    });
  }
}
