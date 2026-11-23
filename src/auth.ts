import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SESSION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_NAME = 'ff_session';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Passwords are salted independently; the original password is never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded?: string): Promise<boolean> {
  // Missing users do the same expensive work as existing users.
  const [, salt, stored] = (encoded ?? `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`).split('$');
  if (!salt || !stored) return false;
  const key = await derive(password, salt);
  const expected = Buffer.from(stored, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected) && encoded !== undefined;
}

function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionToken(request: IncomingMessage): string | undefined {
  const token = request.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

export function sessionUser(db: DatabaseSync, request: IncomingMessage): string | undefined {
  const token = sessionToken(request);
  if (!token) return undefined;
  const row = db.prepare('SELECT user_id, expires_at FROM app_sessions WHERE token_hash = ?')
    .get(digest(token)) as { user_id: string; expires_at: number } | undefined;
  if (!row) return undefined;
  if (row.expires_at <= Date.now()) {
    db.prepare('DELETE FROM app_sessions WHERE token_hash = ?').run(digest(token));
    return undefined;
  }
  return row.user_id;
}

export function createSession(db: DatabaseSync, userId: string, response: ServerResponse, secure: boolean): void {
  db.prepare('DELETE FROM app_sessions WHERE expires_at <= ?').run(Date.now());
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(digest(token), userId, Date.now() + SESSION_SECONDS * 1000);
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`);
}

export function destroySession(db: DatabaseSync, request: IncomingMessage, response: ServerResponse, secure: boolean): void {
  const token = sessionToken(request);
  if (token) db.prepare('DELETE FROM app_sessions WHERE token_hash = ?').run(digest(token));
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
}
