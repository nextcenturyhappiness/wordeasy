import type { SettingsGateway, ThemePreference } from "../../application/contracts";
import { assertIanaTimezone } from "../../domain/time";
import type { LearningDatabase } from "../../db/learningDatabase";

export class DemoSettingsGateway implements SettingsGateway {
  constructor(
    private readonly database: LearningDatabase,
    private readonly userId: string
  ) {}

  async getTheme(): Promise<ThemePreference> {
    const setting = await this.database.local_settings.get([this.userId, "theme"]);
    if (setting?.value === "system" || setting?.value === "light" || setting?.value === "dark") {
      return setting.value;
    }
    return "system";
  }

  async setTheme(theme: ThemePreference): Promise<void> {
    await this.database.local_settings.put({
      userId: this.userId,
      key: "theme",
      value: theme,
      updatedAt: new Date().toISOString()
    });
  }

  async getTimezone(): Promise<string> {
    const profile = await this.database.local_profile.get(this.userId);
    if (profile === undefined) {
      throw new Error(`No local profile exists for ${this.userId}.`);
    }
    return profile.timezone;
  }

  async setTimezone(timezone: string): Promise<void> {
    assertIanaTimezone(timezone);
    const updatedAt = new Date().toISOString();
    await this.database.transaction(
      "rw",
      this.database.local_profile,
      this.database.local_settings,
      async () => {
        const profile = await this.database.local_profile.get(this.userId);
        if (profile === undefined) {
          throw new Error(`No local profile exists for ${this.userId}.`);
        }
        await this.database.local_profile.put({ ...profile, timezone, updatedAt });
        await this.database.local_settings.put({
          userId: this.userId,
          key: "timezone",
          value: timezone,
          updatedAt
        });
      }
    );
  }
}
