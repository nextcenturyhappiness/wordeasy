export class LocalDatabaseMigrationError extends Error {
  readonly cause: unknown;

  constructor(databaseName: string, cause: unknown) {
    super(`Could not open or migrate local learning database ${databaseName}.`);
    this.name = "LocalDatabaseMigrationError";
    this.cause = cause;
  }
}
