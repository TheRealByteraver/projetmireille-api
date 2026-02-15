import sqlite3 from 'sqlite3';

export default class Context {
  db: sqlite3.Database;
  enableLogging: boolean;

  constructor(filename: string, enableLogging: boolean) {
    this.db = new sqlite3.Database(filename);
    this.enableLogging = enableLogging;
  }

  static prepareQuery(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  static log(text: string, params: unknown[]): void {
    console.info(`Running query: "${text}", with params: ${JSON.stringify(params)}`);
  }

  execute(text: string, ...params: unknown[]): Promise<void> {
    const sql = Context.prepareQuery(text);
    if (this.enableLogging) {
      Context.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  query(text: string, ...params: unknown[]): Promise<unknown[]> {
    const sql = Context.prepareQuery(text);
    if (this.enableLogging) {
      Context.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, data: unknown[]) => {
        if (err) reject(err);
        else resolve(data || []);
      });
    });
  }

  async retrieve(text: string, ...params: unknown[]): Promise<unknown[]> {
    return this.query(text, ...params);
  }

  async retrieveSingle(text: string, ...params: unknown[]): Promise<Record<string, unknown> | undefined> {
    const data = await this.query(text, ...params);
    let record: Record<string, unknown> | undefined;
    if (data && data.length === 1) {
      record = data[0] as Record<string, unknown>;
    } else if (data && data.length > 1) {
      throw new Error('Unexpected number of rows encountered.');
    }
    return record;
  }

  async retrieveValue(text: string, ...params: unknown[]): Promise<unknown> {
    const data = await this.query(text, ...params);
    if (data && data.length === 1) {
      const record = data[0] as Record<string, unknown>;
      const keys = Object.keys(record);
      if (keys.length === 1) {
        return record[keys[0]];
      }
      throw new Error('Unexpected number of values encountered.');
    }
    throw new Error('Unexpected number of rows encountered.');
  }
}
