import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export interface Tag { tag: string; name: string }

/** Tags are independent of the application objects identified by item IDs. */
export class Tagging {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tagging_tags (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tagging_items (
        item TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (item, tag)
      );
      CREATE INDEX IF NOT EXISTS tagging_items_tag ON tagging_items(tag);
    `);
  }

  define(name: string, id: string = randomUUID()): string {
    if (!name.trim()) throw new Error('A tag needs a name.');
    this.db.prepare('INSERT INTO tagging_tags (id, name) VALUES (?, ?)').run(id, name.trim());
    return id;
  }

  rename(tag: string, name: string): void {
    this.requireTag(tag);
    if (!name.trim()) throw new Error('A tag needs a name.');
    this.db.prepare('UPDATE tagging_tags SET name = ? WHERE id = ?').run(name.trim(), tag);
  }

  retire(tag: string): void {
    this.requireTag(tag);
    this.db.prepare('DELETE FROM tagging_items WHERE tag = ?').run(tag);
    this.db.prepare('DELETE FROM tagging_tags WHERE id = ?').run(tag);
  }

  add(item: string, tag: string): void {
    this.requireTag(tag);
    if (this.db.prepare('SELECT 1 FROM tagging_items WHERE item = ? AND tag = ?').get(item, tag)) {
      throw new Error('This tag is already on the item.');
    }
    this.db.prepare('INSERT INTO tagging_items (item, tag) VALUES (?, ?)').run(item, tag);
  }

  remove(item: string, tag: string): void {
    const result = this.db.prepare('DELETE FROM tagging_items WHERE item = ? AND tag = ?').run(item, tag);
    if (!result.changes) throw new Error('This tag is not on the item.');
  }

  _suggest(text: string): Tag[] {
    // JS case folding handles the Unicode names in the hand-maintained catalog.
    const needle = text.toLocaleLowerCase();
    return this.all().filter(tag => tag.name.toLocaleLowerCase().includes(needle))
      .map(({ id, name }) => ({ tag: id, name }));
  }

  _tagsOf(item: string): Tag[] {
    return (this.db.prepare(`SELECT t.id AS tag, t.name FROM tagging_tags t
      JOIN tagging_items i ON i.tag = t.id WHERE i.item = ? ORDER BY t.name, t.id`).all(item) as unknown as Tag[])
      .map(row => ({ ...row }));
  }

  _itemsWith(tags: string[]): { item: string; matched: number }[] {
    const unique = [...new Set(tags)];
    if (!unique.length) return [];
    return (this.db.prepare(`SELECT item, COUNT(*) AS matched FROM tagging_items
      WHERE tag IN (${unique.map(() => '?').join(',')}) GROUP BY item ORDER BY matched DESC, item`)
      .all(...unique) as unknown as { item: string; matched: number }[]).map(row => ({ ...row }));
  }

  all(): { id: string; name: string }[] {
    return (this.db.prepare('SELECT id, name FROM tagging_tags ORDER BY name, id').all() as unknown as { id: string; name: string }[])
      .map(row => ({ ...row }));
  }

  private requireTag(tag: string): void {
    if (!this.db.prepare('SELECT 1 FROM tagging_tags WHERE id = ?').get(tag)) throw new Error('Unknown tag.');
  }
}
