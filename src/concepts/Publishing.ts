import type { DatabaseSync } from 'node:sqlite';

export class Publishing {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS publishing_users (user TEXT PRIMARY KEY, handle TEXT UNIQUE NOT NULL);
      CREATE TABLE IF NOT EXISTS publishing_publications (
        publisher TEXT PRIMARY KEY, item TEXT UNIQUE NOT NULL, listedOn TEXT, listedOrder INTEGER
      );
    `);
  }

  claim(user: string, handle: string): void {
    if (!/^[a-z0-9-]+$/.test(handle)) throw new Error('Use lowercase letters, numbers, and hyphens for your handle.');
    if (this._handle(user)) throw new Error('This user already has a handle.');
    if (this._byHandle(handle)) throw new Error('This handle is already taken.');
    this.db.prepare('INSERT INTO publishing_users (user, handle) VALUES (?, ?)').run(user, handle);
  }

  publish(publisher: string, item: string): void {
    if (!this._handle(publisher)) throw new Error('Claim a handle before publishing.');
    if (this._publisherOf(item)) throw new Error('This item is already published.');
    this.db.prepare(`INSERT INTO publishing_publications (publisher, item) VALUES (?, ?)
      ON CONFLICT(publisher) DO UPDATE SET item = excluded.item`).run(publisher, item);
  }

  list(publisher: string): void {
    const published = this._published(publisher);
    if (!published) throw new Error('Publish a bio before turning on discovery.');
    if (published.listed) throw new Error('This publication is already listed.');
    this.db.prepare(`UPDATE publishing_publications SET listedOn = ?,
      listedOrder = (SELECT COALESCE(MAX(listedOrder), 0) + 1 FROM publishing_publications)
      WHERE publisher = ?`).run(new Date().toISOString(), publisher);
  }

  unlist(publisher: string): void {
    if (!this._published(publisher)?.listed) throw new Error('This publication is not listed.');
    this.db.prepare('UPDATE publishing_publications SET listedOn = NULL, listedOrder = NULL WHERE publisher = ?').run(publisher);
  }

  unpublish(publisher: string): void {
    if (!this.db.prepare('DELETE FROM publishing_publications WHERE publisher = ?').run(publisher).changes) {
      throw new Error('This user has no published bio.');
    }
  }

  release(user: string): void {
    if (!this._handle(user)) throw new Error('This user has no handle.');
    if (this._published(user)) throw new Error('Unpublish before releasing a handle.');
    this.db.prepare('DELETE FROM publishing_users WHERE user = ?').run(user);
  }

  _byHandle(handle: string): string | undefined {
    return (this.db.prepare('SELECT user FROM publishing_users WHERE handle = ?').get(handle) as { user: string } | undefined)?.user;
  }

  _handle(user: string): string | undefined {
    return (this.db.prepare('SELECT handle FROM publishing_users WHERE user = ?').get(user) as { handle: string } | undefined)?.handle;
  }

  _published(publisher: string): { item: string; listed: boolean } | undefined {
    const row = this.db.prepare('SELECT item, listedOn FROM publishing_publications WHERE publisher = ?').get(publisher) as
      { item: string; listedOn: string | null } | undefined;
    return row ? { item: row.item, listed: row.listedOn !== null } : undefined;
  }

  _publisherOf(item: string): string | undefined {
    return (this.db.prepare('SELECT publisher FROM publishing_publications WHERE item = ?').get(item) as { publisher: string } | undefined)?.publisher;
  }

  _listed(): { publisher: string; item: string; listedOn: string }[] {
    return (this.db.prepare(`SELECT publisher, item, listedOn FROM publishing_publications
      WHERE listedOn IS NOT NULL ORDER BY listedOn DESC, listedOrder DESC, publisher`)
      .all() as unknown as { publisher: string; item: string; listedOn: string }[]).map(row => ({ ...row }));
  }
}
