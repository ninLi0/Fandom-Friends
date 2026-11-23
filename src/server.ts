import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Tagging } from './concepts/Tagging.js';
import { Synonymizing } from './concepts/Synonymizing.js';
import { Grouping } from './concepts/Grouping.js';
import { Templating } from './concepts/Templating.js';
import { Publishing } from './concepts/Publishing.js';
import { CATALOG_TAGS, TEMPLATES, FONTS, PALETTES, seedCatalog } from './catalog.js';
import { createSession, destroySession, hashPassword, sessionUser, verifyPassword } from './auth.js';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type BioRow = {
  id: string; owner_id: string; name: string; display_name: string; note: string;
  template_id: string; font: string | null; palette: string | null; updated_at: string;
};
type BioInput = {
  name: string; displayName: string; note: string; tagIds: string[];
  templateId: string; font: string | null; palette: string | null;
};

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new HttpError(400, `${label} must be ${min}–${max} characters.`);
  return trimmed;
}

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') {
    throw new HttpError(415, 'Send this request as application/json.');
  }
  const limit = 24 * 1024;
  if (Number(request.headers['content-length']) > limit) {
    request.resume();
    throw new HttpError(413, 'This request is too large.');
  }
  // Keep draining oversized chunked requests so a 413 response can reach the client.
  const content = await new Promise<Buffer>((resolveBody, reject) => {
    let size = 0;
    let rejected = false;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      if (rejected) return;
      size += chunk.length;
      if (size > limit) {
        rejected = true;
        chunks.length = 0;
        reject(new HttpError(413, 'This request is too large.'));
      } else chunks.push(chunk);
    });
    request.on('end', () => { if (!rejected) resolveBody(Buffer.concat(chunks)); });
    request.on('error', reject);
  });
  let parsed: unknown;
  try { parsed = JSON.parse(content.toString('utf8')); }
  catch { throw new HttpError(400, 'The request contains invalid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'Send a JSON object.');
  return parsed as Record<string, unknown>;
}

function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

export type AppOptions = { dbPath?: string; secureCookies?: boolean; publicDir?: string; clientDir?: string };

/** The HTTP boundary coordinates independent concepts and checks every item's owner. */
export function createApp(options: AppOptions = {}) {
  const dbPath = options.dbPath ?? process.env.DATABASE_PATH ?? resolve(PROJECT_ROOT, 'data/fandom-friends.sqlite');
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_bios (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, display_name TEXT NOT NULL, note TEXT NOT NULL,
      template_id TEXT NOT NULL, font TEXT, palette TEXT, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS app_bios_owner ON app_bios(owner_id);
    CREATE INDEX IF NOT EXISTS app_sessions_expiry ON app_sessions(expires_at);
  `);
  const tagging = new Tagging(db);
  const synonyms = new Synonymizing(db);
  const grouping = new Grouping(db);
  const templating = new Templating(db);
  const publishing = new Publishing(db);
  seedCatalog(db);
  const secureCookies = options.secureCookies ?? (process.env.SECURE_COOKIES === undefined
    ? process.env.NODE_ENV === 'production'
    : process.env.SECURE_COOKIES === 'true');
  const publicDir = options.publicDir ?? resolve(PROJECT_ROOT, 'public');
  const clientDir = options.clientDir ?? resolve(PROJECT_ROOT, 'dist/src/client');
  const authAttempts = new Map<string, { count: number; resetAt: number }>();

  function transaction<T>(operation: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function user(id: string) {
    const row = db.prepare('SELECT id, username FROM app_users WHERE id = ?').get(id) as { id: string; username: string } | undefined;
    return row ? { ...row, handle: publishing._handle(id) ?? null } : null;
  }

  function signedIn(request: IncomingMessage): string {
    const id = sessionUser(db, request);
    if (!id) throw new HttpError(401, 'Sign in to continue.');
    return id;
  }

  function ownBio(id: string, owner: string): BioRow {
    const row = db.prepare('SELECT * FROM app_bios WHERE id = ? AND owner_id = ?').get(id, owner) as BioRow | undefined;
    // Missing and someone else's private bio receive the same response.
    if (!row) throw new HttpError(404, 'Bio not found.');
    return row;
  }

  function bioView(row: BioRow) {
    return {
      id: row.id, name: row.name, displayName: row.display_name, note: row.note,
      tagIds: tagging._tagsOf(row.id).map((tag) => tag.tag), templateId: row.template_id,
      font: row.font, palette: row.palette, look: templating._look(row.id), updatedAt: row.updated_at,
    };
  }

  function cardView(publisher: string) {
    const publication = publishing._published(publisher);
    const handle = publishing._handle(publisher);
    if (!publication || !handle) throw new HttpError(404, 'This person has no public bio.');
    const row = db.prepare('SELECT * FROM app_bios WHERE id = ? AND owner_id = ?').get(publication.item, publisher) as BioRow | undefined;
    if (!row) throw new HttpError(404, 'This person has no public bio.');
    return {
      handle, displayName: row.display_name, note: row.note,
      tagIds: tagging._tagsOf(row.id).map((tag) => tag.tag), look: templating._look(row.id), listed: publication.listed,
    };
  }

  function normalizeTag(id: unknown): string {
    if (typeof id !== 'string' || !tagging.all().some((tag) => tag.id === id)) throw new HttpError(400, 'Choose a tag from the tag list.');
    return synonyms._canonical(id);
  }

  function parseBio(input: Record<string, unknown>): BioInput {
    if (!Array.isArray(input.tagIds) || input.tagIds.length > 40) throw new HttpError(400, 'Choose up to 40 tags.');
    const tagIds = [...new Set(input.tagIds.map(normalizeTag))];
    const templateId = text(input.templateId, 'Template', 1, 40);
    if (!TEMPLATES.some((template) => template.id === templateId)) throw new HttpError(400, 'Choose an available template.');
    const font = input.font ?? null;
    const palette = input.palette ?? null;
    if (font !== null && !(FONTS as readonly unknown[]).includes(font)) throw new HttpError(400, 'Choose an available font.');
    if (palette !== null && !(PALETTES as readonly unknown[]).includes(palette)) throw new HttpError(400, 'Choose an available palette.');
    return {
      name: text(input.name, 'Saved bio name', 1, 60), displayName: text(input.displayName, 'Display name', 1, 60),
      note: text(input.note ?? '', 'Personal note', 0, 280), tagIds, templateId,
      font: font as string | null, palette: palette as string | null,
    };
  }

  function saveBio(id: string, owner: string, input: BioInput, exists: boolean) {
    return transaction(() => {
      const now = new Date().toISOString();
      if (exists) {
        db.prepare('UPDATE app_bios SET name=?, display_name=?, note=?, template_id=?, font=?, palette=?, updated_at=? WHERE id=? AND owner_id=?')
          .run(input.name, input.displayName, input.note, input.templateId, input.font, input.palette, now, id, owner);
        for (const tag of tagging._tagsOf(id)) tagging.remove(id, tag.tag);
        templating.remove(id);
      } else {
        db.prepare('INSERT INTO app_bios (id,owner_id,name,display_name,note,template_id,font,palette,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
          .run(id, owner, input.name, input.displayName, input.note, input.templateId, input.font, input.palette, now);
      }
      for (const tag of input.tagIds) tagging.add(id, tag);
      templating.apply(id, input.templateId);
      if (input.font !== null) templating.setFont(id, input.font);
      if (input.palette !== null) templating.setPalette(id, input.palette);
      return bioView(ownBio(id, owner));
    });
  }

  function authThrottle(request: IncomingMessage): void {
    const key = request.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    // Prune during use; a long-running local server does not retain old addresses.
    for (const [address, attempt] of authAttempts) if (attempt.resetAt <= now) authAttempts.delete(address);
    const attempt = authAttempts.get(key);
    if (attempt && attempt.count >= 30) throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.');
    authAttempts.set(key, { count: (attempt?.count ?? 0) + 1, resetAt: attempt?.resetAt ?? now + 15 * 60 * 1000 });
  }

  async function serveFile(response: ServerResponse, file: string, contentType: string, head: boolean): Promise<void> {
    let content: Buffer;
    try { content = await readFile(file); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new HttpError(404, 'Not found.');
      throw error;
    }
    response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': content.length, 'Cache-Control': 'no-cache' });
    response.end(head ? undefined : content);
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (path.startsWith('/api/') && !['GET', 'HEAD'].includes(method)) {
      const origin = request.headers.origin;
      const expectedOrigin = `${secureCookies ? 'https' : 'http'}://${request.headers.host}`;
      if ((origin && origin !== expectedOrigin) || request.headers['sec-fetch-site'] === 'cross-site') {
        throw new HttpError(403, 'Open Fandom Friends directly to make changes.');
      }
    }

    if (method === 'GET' && path === '/api/catalog') {
      json(response, 200, { tags: CATALOG_TAGS, templates: TEMPLATES, fonts: FONTS, palettes: PALETTES }); return;
    }
    if (method === 'GET' && path === '/api/me') {
      const id = sessionUser(db, request);
      json(response, 200, { user: id ? user(id) : null }); return;
    }
    if (method === 'POST' && (path === '/api/auth/register' || path === '/api/auth/login')) {
      authThrottle(request);
      const input = await body(request);
      const username = text(input.username, 'Username', 3, 32).toLowerCase();
      if (!/^[a-z0-9_-]+$/.test(username)) throw new HttpError(400, 'Usernames use letters, numbers, underscores, and hyphens.');
      if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 128) {
        throw new HttpError(400, 'Use a password of 10–128 characters.');
      }
      if (path === '/api/auth/register') {
        if (input.adult !== true) throw new HttpError(400, 'Fandom Friends is for adults aged 18 and older.');
        const passwordHash = await hashPassword(input.password);
        if (db.prepare('SELECT id FROM app_users WHERE username = ?').get(username)) throw new HttpError(409, 'That username is already in use.');
        const id = randomUUID();
        db.prepare('INSERT INTO app_users (id,username,password_hash,created_at) VALUES (?,?,?,?)')
          .run(id, username, passwordHash, new Date().toISOString());
        destroySession(db, request, response, secureCookies);
        createSession(db, id, response, secureCookies);
        json(response, 201, { user: user(id) }); return;
      }
      const row = db.prepare('SELECT id, password_hash FROM app_users WHERE username = ?').get(username) as { id: string; password_hash: string } | undefined;
      if (!await verifyPassword(input.password, row?.password_hash)) throw new HttpError(401, 'Username or password is incorrect.');
      destroySession(db, request, response, secureCookies);
      createSession(db, row!.id, response, secureCookies);
      json(response, 200, { user: user(row!.id) }); return;
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      destroySession(db, request, response, secureCookies);
      json(response, 200, {}); return;
    }

    const publicMatch = path.match(/^\/api\/cards\/([a-z0-9-]+)$/);
    if (method === 'GET' && publicMatch) {
      const owner = publishing._byHandle(publicMatch[1]!);
      if (!owner) throw new HttpError(404, 'This person has no public bio.');
      json(response, 200, { card: cardView(owner) }); return;
    }

    if (path.startsWith('/api/')) {
      const owner = signedIn(request);
      if (method === 'POST' && path === '/api/handle') {
        const input = await body(request);
        const handle = text(input.handle, 'Handle', 3, 32);
        if (!/^[a-z0-9-]+$/.test(handle)) throw new HttpError(400, 'Handles use lowercase letters, numbers, and hyphens.');
        if (publishing._handle(owner)) throw new HttpError(409, 'Your public handle is already set.');
        if (publishing._byHandle(handle)) throw new HttpError(409, 'That handle is already in use.');
        publishing.claim(owner, handle);
        json(response, 200, { user: user(owner) }); return;
      }
      if (method === 'GET' && path === '/api/bios') {
        const rows = db.prepare('SELECT * FROM app_bios WHERE owner_id = ? ORDER BY updated_at DESC, id').all(owner) as BioRow[];
        json(response, 200, { bios: rows.map(bioView), publication: publishing._published(owner) ?? null }); return;
      }
      if (method === 'POST' && path === '/api/bios') {
        const input = parseBio(await body(request));
        const count = db.prepare('SELECT count(*) AS count FROM app_bios WHERE owner_id = ?').get(owner) as { count: number };
        if (count.count >= 20) throw new HttpError(400, 'You can save up to 20 bios. Delete one before making another.');
        json(response, 201, { bio: saveBio(randomUUID(), owner, input, false) }); return;
      }
      const bioMatch = path.match(/^\/api\/bios\/([a-zA-Z0-9-]+)$/);
      if (bioMatch && (method === 'PUT' || method === 'DELETE')) {
        const id = bioMatch[1]!;
        ownBio(id, owner);
        if (method === 'PUT') {
          json(response, 200, { bio: saveBio(id, owner, parseBio(await body(request)), true) }); return;
        }
        transaction(() => {
          if (publishing._published(owner)?.item === id) publishing.unpublish(owner);
          for (const tag of tagging._tagsOf(id)) tagging.remove(id, tag.tag);
          templating.remove(id);
          db.prepare('DELETE FROM app_bios WHERE id = ? AND owner_id = ?').run(id, owner);
        });
        json(response, 200, {}); return;
      }
      if (method === 'POST' && path === '/api/publication') {
        const input = await body(request);
        const id = text(input.bioId, 'Bio', 1, 100);
        ownBio(id, owner);
        if (!publishing._handle(owner)) throw new HttpError(400, 'Choose your public handle before publishing.');
        if (!tagging._tagsOf(id).length) throw new HttpError(400, 'Add at least one tag before publishing.');
        if (publishing._published(owner)?.item !== id) publishing.publish(owner, id);
        json(response, 200, { publication: publishing._published(owner) }); return;
      }
      if (method === 'DELETE' && path === '/api/publication') {
        if (publishing._published(owner)) publishing.unpublish(owner);
        json(response, 200, { publication: null }); return;
      }
      if (method === 'PUT' && path === '/api/publication/listing') {
        const input = await body(request);
        if (typeof input.listed !== 'boolean') throw new HttpError(400, 'Choose whether you are open to new friends.');
        const publication = publishing._published(owner);
        if (!publication) throw new HttpError(400, 'Publish a bio before enabling discovery.');
        if (input.listed !== publication.listed) {
          if (input.listed) publishing.list(owner);
          else publishing.unlist(owner);
        }
        json(response, 200, { publication: publishing._published(owner) }); return;
      }
      if (method === 'GET' && path === '/api/discover') {
        const requested = (url.searchParams.get('tags') ?? '').split(',').filter(Boolean);
        if (requested.length > 40) throw new HttpError(400, 'Choose up to 40 search tags.');
        const selected = [...new Set(requested.map(normalizeTag))];
        // Each selected tag is an AND clause; synonyms and descendants are alternatives within it.
        const clauses = selected.map((tag) => {
          const alternatives = new Set<string>();
          for (const same of synonyms._same(tag)) {
            for (const candidate of [same, ...grouping._under(same).map((member) => member.member)]) {
              for (const equivalent of synonyms._same(candidate)) alternatives.add(equivalent);
            }
          }
          return alternatives;
        });
        const cards = publishing._listed().filter((publication) => {
          if (publication.publisher === owner) return false;
          const tags = tagging._tagsOf(publication.item).map((tag) => tag.tag);
          return clauses.every((clause) => tags.some((tag) => clause.has(tag)));
        }).map((publication) => cardView(publication.publisher));
        json(response, 200, { cards }); return;
      }
      throw new HttpError(404, 'Not found.');
    }

    if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
    if (path === '/styles.css') { await serveFile(response, resolve(publicDir, 'styles.css'), 'text/css; charset=utf-8', method === 'HEAD'); return; }
    if (path === '/favicon.svg') { await serveFile(response, resolve(publicDir, 'favicon.svg'), 'image/svg+xml', method === 'HEAD'); return; }
    if (path.startsWith('/assets/')) {
      let asset: string;
      try { asset = decodeURIComponent(path.slice('/assets/'.length)); }
      catch { throw new HttpError(400, 'Invalid asset URL.'); }
      const file = resolve(clientDir, asset);
      if (!/^[a-zA-Z0-9_./-]+\.js(?:\.map)?$/.test(asset) || !file.startsWith(resolve(clientDir) + sep)) throw new HttpError(404, 'Not found.');
      await serveFile(response, file, asset.endsWith('.map') ? 'application/json' : 'text/javascript; charset=utf-8', method === 'HEAD'); return;
    }
    if (['/', '/editor', '/discover', '/login', '/register'].includes(path) || /^\/u\/[a-z0-9-]+$/.test(path)) {
      await serveFile(response, resolve(publicDir, 'index.html'), 'text/html; charset=utf-8', method === 'HEAD'); return;
    }
    throw new HttpError(404, 'Not found.');
  }

  const server = createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      if (response.headersSent) { response.destroy(); return; }
      if (error instanceof HttpError) json(response, error.status, { error: error.message });
      else {
        console.error('Request failed:', error);
        json(response, 500, { error: 'Something went wrong. Please try again.' });
      }
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 50;

  return {
    server, db,
    async close(): Promise<void> {
      if (server.listening) await new Promise<void>((resolveClose, reject) => {
        server.close((error) => error ? reject(error) : resolveClose());
        server.closeIdleConnections();
      });
      db.close();
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  app.server.listen(port, host, () => console.log(`Fandom Friends is running at http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().then(() => process.exit(0)); });
}
