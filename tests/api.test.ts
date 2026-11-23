import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';

type User = { id: string; username: string; handle: string | null };
type Bio = { id: string; name: string; displayName: string; note: string; tagIds: string[]; look: { layout: string; font: string; palette: string } };
type Card = Omit<Bio, 'id' | 'name'> & { handle: string; listed: boolean };
type ApiData = {
  user?: User | null; bio?: Bio; bios?: Bio[]; card?: Card; cards?: Card[];
  publication?: { item: string; listed: boolean } | null; error?: string;
};

async function running(dbPath = ':memory:') {
  const app = createApp({ dbPath, secureCookies: false });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  assert.ok(address && typeof address !== 'string');
  return { ...app, base: `http://127.0.0.1:${address.port}` };
}

class Client {
  cookie = '';
  constructor(public base: string) {}
  async api(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(`${this.base}${path}`, {
      method, headers: { ...(this.cookie ? { Cookie: this.cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0]!;
    return { response, status: response.status, data: await response.json() as ApiData };
  }
  async register(username: string) {
    const result = await this.api('/api/auth/register', 'POST', { username, password: 'a good password 123', adult: true });
    assert.equal(result.status, 201);
    assert.ok(result.data.user);
    return result;
  }
}

function bioInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Private working title', displayName: 'Alice', note: 'Let’s talk about our favorite stories.',
    tagIds: ['fern-stark-alias-1', 'sketch-swaps'], templateId: 'poster', font: null, palette: null, ...overrides,
  };
}

test('bios remain owner-only; public cards, switching, listing, and AND hierarchy search work together', async (t) => {
  const app = await running();
  t.after(() => app.close());
  const alice = new Client(app.base);
  const bob = new Client(app.base);
  const charlie = new Client(app.base);
  const stranger = new Client(app.base);

  assert.equal((await stranger.api('/api/bios')).status, 401);
  assert.equal((await stranger.api('/api/discover')).status, 401);
  await alice.register('alice_login_private');
  await bob.register('bob_login_private');
  await charlie.register('charlie_login_private');
  assert.equal((await alice.api('/api/handle', 'POST', { handle: 'alice' })).status, 200);
  assert.equal((await bob.api('/api/handle', 'POST', { handle: 'bob' })).status, 200);
  assert.equal((await charlie.api('/api/handle', 'POST', { handle: 'alice' })).status, 409);
  assert.equal((await charlie.api('/api/handle', 'POST', { handle: 'charlie' })).status, 200);

  const first = await alice.api('/api/bios', 'POST', bioInput());
  assert.equal(first.status, 201);
  const firstId = first.data.bio!.id;
  assert.deepEqual(new Set(first.data.bio!.tagIds), new Set(['fern-stark', 'sketch-swaps']), 'aliases canonicalize on write');
  const second = await alice.api('/api/bios', 'POST', bioInput({ name: 'Another private draft', tagIds: ['episode-discussions'], displayName: 'Alice’s second card' }));
  const secondId = second.data.bio!.id;
  assert.equal((await alice.api('/api/bios')).data.bios!.length, 2);
  assert.equal((await bob.api(`/api/bios/${firstId}`, 'PUT', bioInput())).status, 404);
  assert.equal((await bob.api(`/api/bios/${firstId}`, 'DELETE')).status, 404);
  assert.equal((await bob.api('/api/publication', 'POST', { bioId: firstId })).status, 404);
  assert.equal((await stranger.api('/api/cards/alice')).status, 404, 'saved does not mean public');

  assert.equal((await alice.api('/api/publication', 'POST', { bioId: firstId })).status, 200);
  const publicResult = await stranger.api('/api/cards/alice');
  assert.equal(publicResult.status, 200);
  assert.deepEqual(Object.keys(publicResult.data.card!).sort(), ['displayName', 'handle', 'listed', 'look', 'note', 'tagIds']);
  assert.equal(publicResult.data.card!.displayName, 'Alice');
  assert.equal(publicResult.data.card!.listed, false);
  assert.equal((await bob.api('/api/discover')).data.cards!.length, 0, 'link-only publication stays out of discovery');
  assert.equal((await alice.api('/api/publication/listing', 'PUT', { listed: true })).status, 200);
  assert.equal((await alice.api('/api/discover')).data.cards!.length, 0, 'search excludes viewer');
  assert.deepEqual((await bob.api('/api/discover?tags=frieren')).data.cards!.map((card) => card.handle), ['alice'], 'pairing counts under characters and fandom');
  assert.equal((await bob.api('/api/discover?tags=frieren-alias-2,fan-art')).data.cards!.length, 1, 'alias plus transitive interest parent match');
  assert.equal((await bob.api('/api/discover?tags=frieren,episode-discussions')).data.cards!.length, 0, 'every selected tag is required');
  assert.equal((await bob.api('/api/discover?tags=not-a-tag')).status, 400);
  assert.equal((await bob.api('/api/bios')).data.bios!.length, 0, 'search never changes the viewer’s bios');

  // A second listed user demonstrates newest-first ordering, while Alice remains listed after switching.
  const charlieBio = await charlie.api('/api/bios', 'POST', bioInput({ displayName: 'Charlie' }));
  await charlie.api('/api/publication', 'POST', { bioId: charlieBio.data.bio!.id });
  await charlie.api('/api/publication/listing', 'PUT', { listed: true });
  assert.deepEqual((await bob.api('/api/discover')).data.cards!.map((card) => card.handle), ['charlie', 'alice']);
  const switched = await alice.api('/api/publication', 'POST', { bioId: secondId });
  assert.equal(switched.data.publication!.listed, true);
  assert.equal((await stranger.api('/api/cards/alice')).data.card!.displayName, 'Alice’s second card');
  assert.equal((await bob.api('/api/discover?tags=frieren')).data.cards!.length, 1, 'old public bio no longer participates');
  assert.deepEqual((await bob.api('/api/discover?tags=episode-discussions')).data.cards!.map((card) => card.handle), ['alice']);

  const edited = await alice.api(`/api/bios/${secondId}`, 'PUT', bioInput({ name: 'Renamed private title', displayName: 'New public name', note: '<script>alert(1)</script>', tagIds: ['fern'], templateId: 'columns', font: 'Mono', palette: 'Forest' }));
  assert.equal(edited.status, 200);
  assert.deepEqual(edited.data.bio!.look, { template: 'columns', layout: 'columns', font: 'Mono', palette: 'Forest' });
  assert.equal((await stranger.api('/api/cards/alice')).data.card!.displayName, 'New public name', 'saved changes become public');
  const invalid = await alice.api(`/api/bios/${secondId}`, 'PUT', bioInput({ tagIds: ['invented-tag'], displayName: 'Should not save' }));
  assert.equal(invalid.status, 400);
  assert.equal((await stranger.api('/api/cards/alice')).data.card!.displayName, 'New public name', 'failed update changes nothing');

  await alice.api('/api/publication/listing', 'PUT', { listed: false });
  assert.equal((await stranger.api('/api/cards/alice')).status, 200, 'unlisting preserves link');
  assert.deepEqual((await bob.api('/api/discover')).data.cards!.map((card) => card.handle), ['charlie']);
  await alice.api('/api/publication', 'DELETE');
  assert.equal((await stranger.api('/api/cards/alice')).status, 404);
  assert.equal((await alice.api('/api/me')).data.user!.handle, 'alice', 'unpublishing preserves address');
  await alice.api('/api/publication', 'POST', { bioId: firstId });
  await alice.api(`/api/bios/${firstId}`, 'DELETE');
  assert.equal((await stranger.api('/api/cards/alice')).status, 404, 'deleting the displayed bio also unpublishes');
  assert.equal((await alice.api('/api/bios')).data.bios!.length, 1);
});

test('authentication validates age and input, hashes credentials, rejects cross-origin changes, and revokes sessions', async (t) => {
  const app = await running();
  t.after(() => app.close());
  const visitor = new Client(app.base);
  assert.equal((await visitor.api('/api/me')).data.user, null);
  assert.equal((await visitor.api('/api/auth/register', 'POST', { username: 'young', password: 'long enough password', adult: false })).status, 400);
  assert.equal((await visitor.api('/api/auth/register', 'POST', { username: 'adult', password: 'short', adult: true })).status, 400);
  const registered = await visitor.register('adult');
  const setCookie = registered.response.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  const password = app.db.prepare('SELECT password_hash FROM app_users WHERE username = ?').get('adult')!.password_hash as string;
  assert.match(password, /^scrypt\$/);
  assert.ok(!password.includes('a good password 123'));
  const tokens = app.db.prepare('SELECT token_hash FROM app_sessions').all();
  assert.ok(!JSON.stringify(tokens).includes(visitor.cookie.slice('ff_session='.length)), 'session bearer token is not stored');
  assert.equal((await visitor.api('/api/handle', 'POST', { handle: 'adult' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await visitor.api('/api/handle', 'POST', { handle: 'adult' }, { Origin: app.base })).status, 200);
  assert.equal((await visitor.api('/api/handle', 'POST', { handle: 'another' })).status, 409, 'handle is stable');
  assert.equal((await visitor.api('/api/bios', 'POST', bioInput({ font: 'Unreadable' }))).status, 400);
  assert.equal((await visitor.api('/api/bios', 'POST', bioInput({ templateId: 'unknown' }))).status, 400);
  assert.equal((await visitor.api('/api/bios', 'POST', bioInput({ note: 'x'.repeat(25 * 1024) }))).status, 413);
  const malformed = await fetch(`${app.base}/api/bios`, { method: 'POST', headers: { Cookie: visitor.cookie, 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(malformed.status, 400);
  const wrongType = await fetch(`${app.base}/api/bios`, { method: 'POST', headers: { Cookie: visitor.cookie, 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(wrongType.status, 415);
  const forged = new Client(app.base);
  forged.cookie = `ff_session=${'a'.repeat(43)}`;
  assert.equal((await forged.api('/api/me')).data.user, null);
  const oldCookie = visitor.cookie;
  await visitor.api('/api/auth/logout', 'POST');
  forged.cookie = oldCookie;
  assert.equal((await forged.api('/api/bios')).status, 401, 'logout invalidates the server-side session');
  assert.equal((await visitor.api('/api/auth/login', 'POST', { username: 'adult', password: 'wrong password 123' })).status, 401);
  assert.equal((await visitor.api('/api/auth/login', 'POST', { username: 'missing_user', password: 'wrong password 123' })).status, 401);
  const login = await visitor.api('/api/auth/login', 'POST', { username: 'ADULT', password: 'a good password 123' });
  assert.equal(login.status, 200);
  assert.equal(login.data.user!.handle, 'adult');
  app.db.prepare('UPDATE app_sessions SET expires_at = ?').run(Date.now() - 1);
  assert.equal((await visitor.api('/api/me')).data.user, null, 'expired sessions cannot authenticate');

  for (const path of ['/src/server.ts', '/assets/../server.js', '/data/fandom-friends.sqlite', '/.git/config']) {
    assert.equal((await fetch(app.base + path)).status, 404, `private file is not served: ${path}`);
  }
  const shell = await fetch(app.base + '/u/adult');
  assert.equal(shell.status, 200);
  assert.match(shell.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
  const source = await fetch(app.base + '/assets/app.js');
  assert.equal(source.status, 200);
  assert.match(source.headers.get('content-type')!, /javascript/);
});

test('authentication attempts are throttled before expensive password work', async (t) => {
  const app = await running();
  t.after(() => app.close());
  const visitor = new Client(app.base);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.equal((await visitor.api('/api/auth/login', 'POST', { username: 'test', password: 'short' })).status, 400);
  }
  assert.equal((await visitor.api('/api/auth/login', 'POST', { username: 'test', password: 'short' })).status, 429);
});

test('saved bios, publication, and signed-in sessions survive restarting the server', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fandom-friends-api-'));
  const file = join(directory, 'app.sqlite');
  let app = await running(file);
  try {
    const alice = new Client(app.base);
    await alice.register('persistent');
    await alice.api('/api/handle', 'POST', { handle: 'persistent' });
    const created = await alice.api('/api/bios', 'POST', bioInput());
    await alice.api('/api/publication', 'POST', { bioId: created.data.bio!.id });
    await alice.api('/api/publication/listing', 'PUT', { listed: true });
    const cookie = alice.cookie;
    await app.close();
    app = await running(file);
    const returned = new Client(app.base);
    returned.cookie = cookie;
    assert.equal((await returned.api('/api/me')).data.user!.username, 'persistent');
    assert.equal((await returned.api('/api/bios')).data.bios!.length, 1);
    const stranger = new Client(app.base);
    const published = await stranger.api('/api/cards/persistent');
    assert.equal(published.status, 200);
    assert.equal(published.data.card!.listed, true);
    assert.deepEqual(new Set(published.data.card!.tagIds), new Set(['fern-stark', 'sketch-swaps']));
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
