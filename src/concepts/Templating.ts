import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export interface TemplateLook { template: string; layout: string; font: string; palette: string }
export interface Template extends TemplateLook { name: string; default: boolean }

export class Templating {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS templating_templates (
        id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, layout TEXT NOT NULL,
        font TEXT NOT NULL, palette TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS templating_default (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), template TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS templating_items (
        item TEXT PRIMARY KEY, template TEXT, font TEXT, palette TEXT
      );
    `);
  }

  define(name: string, layout: string, font: string, palette: string, id: string = randomUUID()): string {
    if (!name.trim()) throw new Error('A template needs a name.');
    if (this.db.prepare('SELECT 1 FROM templating_templates WHERE name = ?').get(name.trim())) {
      throw new Error('A template with this name already exists.');
    }
    this.db.prepare('INSERT INTO templating_templates (id, name, layout, font, palette) VALUES (?, ?, ?, ?, ?)')
      .run(id, name.trim(), layout, font, palette);
    return id;
  }

  revise(template: string, font: string, palette: string): void {
    this.requireTemplate(template);
    this.db.prepare('UPDATE templating_templates SET font = ?, palette = ? WHERE id = ?').run(font, palette, template);
  }

  makeDefault(template: string): void {
    this.requireTemplate(template);
    if (this.defaultId() === template) throw new Error('This template is already the default.');
    this.db.prepare(`INSERT INTO templating_default (singleton, template) VALUES (1, ?)
      ON CONFLICT(singleton) DO UPDATE SET template = excluded.template`).run(template);
  }

  retire(template: string): void {
    this.requireTemplate(template);
    if (this.defaultId() === template) throw new Error('The default template cannot be retired.');
    if (this.db.prepare('SELECT 1 FROM templating_items WHERE template = ?').get(template)) {
      throw new Error('A template in use cannot be retired.');
    }
    this.db.prepare('DELETE FROM templating_templates WHERE id = ?').run(template);
  }

  apply(item: string, template: string): void {
    this.requireTemplate(template);
    if (this.db.prepare('SELECT 1 FROM templating_items WHERE item = ? AND template = ?').get(item, template)) {
      throw new Error('This template is already applied.');
    }
    this.db.prepare(`INSERT INTO templating_items (item, template) VALUES (?, ?)
      ON CONFLICT(item) DO UPDATE SET template = excluded.template`).run(item, template);
  }

  setFont(item: string, font: string): void {
    this.db.prepare(`INSERT INTO templating_items (item, font) VALUES (?, ?)
      ON CONFLICT(item) DO UPDATE SET font = excluded.font`).run(item, font);
  }

  setPalette(item: string, palette: string): void {
    this.db.prepare(`INSERT INTO templating_items (item, palette) VALUES (?, ?)
      ON CONFLICT(item) DO UPDATE SET palette = excluded.palette`).run(item, palette);
  }

  reset(item: string): void {
    const row = this.db.prepare('SELECT font, palette FROM templating_items WHERE item = ?').get(item);
    if (!row || (row.font === null && row.palette === null)) throw new Error('This item has no font or palette overrides.');
    this.db.prepare('UPDATE templating_items SET font = NULL, palette = NULL WHERE item = ?').run(item);
  }

  remove(item: string): void {
    const row = this.db.prepare('SELECT template, font, palette FROM templating_items WHERE item = ?').get(item);
    if (!row || (row.template === null && row.font === null && row.palette === null)) throw new Error('This item has no styling to remove.');
    this.db.prepare('DELETE FROM templating_items WHERE item = ?').run(item);
  }

  _templates(): Template[] {
    const defaultId = this.defaultId();
    return (this.db.prepare('SELECT id AS template, name, layout, font, palette FROM templating_templates ORDER BY name, id')
      .all() as unknown as Omit<Template, 'default'>[]).map(template => ({ ...template, default: template.template === defaultId }));
  }

  _look(item: string): TemplateLook | undefined {
    const overrides = this.db.prepare('SELECT template, font, palette FROM templating_items WHERE item = ?').get(item) as
      { template: string | null; font: string | null; palette: string | null } | undefined;
    const templateId = overrides?.template ?? this.defaultId();
    if (!templateId) return undefined;
    const template = this.db.prepare('SELECT id AS template, layout, font, palette FROM templating_templates WHERE id = ?')
      .get(templateId) as unknown as TemplateLook;
    return { ...template, font: overrides?.font ?? template.font, palette: overrides?.palette ?? template.palette };
  }

  private defaultId(): string | undefined {
    return (this.db.prepare('SELECT template FROM templating_default WHERE singleton = 1').get() as { template: string } | undefined)?.template;
  }

  private requireTemplate(template: string): void {
    if (!this.db.prepare('SELECT 1 FROM templating_templates WHERE id = ?').get(template)) throw new Error('Unknown template.');
  }
}
