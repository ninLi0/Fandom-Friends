import type { DatabaseSync } from 'node:sqlite';

/** A directed acyclic graph: an item can have several broader parents. */
export class Grouping {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS grouping_parents (
      item TEXT NOT NULL, parent TEXT NOT NULL, PRIMARY KEY (item, parent)
    )`);
  }

  place(item: string, parent: string): void {
    if (item === parent) throw new Error('An item cannot belong to itself.');
    if (this.db.prepare('SELECT 1 FROM grouping_parents WHERE item = ? AND parent = ?').get(item, parent)) {
      throw new Error('This parent is already assigned.');
    }
    if (this._above(parent).some(row => row.broader === item)) throw new Error('This grouping would create a cycle.');
    this.db.prepare('INSERT INTO grouping_parents (item, parent) VALUES (?, ?)').run(item, parent);
  }

  remove(item: string, parent: string): void {
    if (!this.db.prepare('DELETE FROM grouping_parents WHERE item = ? AND parent = ?').run(item, parent).changes) {
      throw new Error('This parent is not assigned.');
    }
  }

  _under(item: string): { member: string; direct: boolean }[] {
    const rows = this.db.prepare(`WITH RECURSIVE descendants(id) AS (
      SELECT item FROM grouping_parents WHERE parent = ?
      UNION SELECT g.item FROM grouping_parents g JOIN descendants d ON g.parent = d.id
    ) SELECT id AS member, EXISTS (
      SELECT 1 FROM grouping_parents WHERE item = id AND parent = ?
    ) AS direct FROM descendants ORDER BY id`).all(item, item) as unknown as { member: string; direct: number }[];
    return rows.map(row => ({ ...row, direct: Boolean(row.direct) }));
  }

  _above(item: string): { broader: string; direct: boolean }[] {
    const rows = this.db.prepare(`WITH RECURSIVE ancestors(id) AS (
      SELECT parent FROM grouping_parents WHERE item = ?
      UNION SELECT g.parent FROM grouping_parents g JOIN ancestors a ON g.item = a.id
    ) SELECT id AS broader, EXISTS (
      SELECT 1 FROM grouping_parents WHERE parent = id AND item = ?
    ) AS direct FROM ancestors ORDER BY id`).all(item, item) as unknown as { broader: string; direct: number }[];
    return rows.map(row => ({ ...row, direct: Boolean(row.direct) }));
  }

  _top(): string[] {
    return (this.db.prepare(`SELECT DISTINCT parent FROM grouping_parents
      WHERE parent NOT IN (SELECT item FROM grouping_parents) ORDER BY parent`).all() as unknown as { parent: string }[])
      .map(row => row.parent);
  }
}
