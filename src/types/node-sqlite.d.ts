// The app runs on Node 26; @types/node 20 predates its built-in SQLite driver.
declare module "node:sqlite" {
  type SQLValue = string | number | bigint | null | Uint8Array;
  export class DatabaseSync {
    constructor(path: string, options?: { enableForeignKeyConstraints?: boolean });
    exec(sql: string): void;
    prepare(sql: string): {
      get(...values: SQLValue[]): Record<string, unknown> | undefined;
      all(...values: SQLValue[]): Record<string, unknown>[];
      run(...values: SQLValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    };
    close(): void;
    createSession(options?: object): unknown;
  }
}
