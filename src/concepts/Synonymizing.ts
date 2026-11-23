import type { DatabaseSync } from 'node:sqlite';

/** A shallow, reversible equivalence relation, with one canonical item per group. */
export class Synonymizing {
  constructor(private readonly db: DatabaseSync) {
    db.exec('CREATE TABLE IF NOT EXISTS synonymizing_links (item TEXT PRIMARY KEY, canonical TEXT NOT NULL)');
  }

  link(item: string, canonical: string): void {
    if (item === canonical) throw new Error('An item cannot be its own synonym.');
    if (this.isAlias(item) || this.isAlias(canonical)) throw new Error('Synonyms must point directly to an unlinked canonical item.');
    if (this.db.prepare('SELECT 1 FROM synonymizing_links WHERE canonical = ?').get(item)) {
      throw new Error('A canonical item with synonyms cannot become a synonym.');
    }
    this.db.prepare('INSERT INTO synonymizing_links (item, canonical) VALUES (?, ?)').run(item, canonical);
  }

  unlink(item: string): void {
    if (!this.db.prepare('DELETE FROM synonymizing_links WHERE item = ?').run(item).changes) {
      throw new Error('This item is not linked to a canonical item.');
    }
  }

  _same(item: string): string[] {
    const canonical = this._canonical(item);
    return [canonical, ...(this.db.prepare('SELECT item FROM synonymizing_links WHERE canonical = ? ORDER BY item')
      .all(canonical) as unknown as { item: string }[]).map(row => row.item)];
  }

  _canonical(item: string): string {
    return (this.db.prepare('SELECT canonical FROM synonymizing_links WHERE item = ?').get(item) as { canonical: string } | undefined)?.canonical ?? item;
  }

  private isAlias(item: string): boolean {
    return Boolean(this.db.prepare('SELECT 1 FROM synonymizing_links WHERE item = ?').get(item));
  }
}
