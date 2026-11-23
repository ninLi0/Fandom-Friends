import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { Tagging } from '../src/concepts/Tagging.js';
import { Synonymizing } from '../src/concepts/Synonymizing.js';
import { Grouping } from '../src/concepts/Grouping.js';
import { Templating } from '../src/concepts/Templating.js';
import { Publishing } from '../src/concepts/Publishing.js';
import { CATALOG_TAGS, seedCatalog } from '../src/catalog.js';

test('Tagging suggestions, shared tags, and intersection counts', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const tags = new Tagging(db);
    const fandom = tags.define('Frieren');
    const activity = tags.define('Sketch swaps');
    tags.add('alice', fandom);
    tags.add('alice', activity);
    tags.add('bob', fandom);
    assert.deepEqual(tags._suggest('FRIE'), [{ tag: fandom, name: 'Frieren' }]);
    assert.deepEqual(tags._itemsWith([fandom, activity, activity]), [
      { item: 'alice', matched: 2 }, { item: 'bob', matched: 1 },
    ]);
    assert.deepEqual(tags._itemsWith([]), []);
    assert.throws(() => tags.add('alice', activity), /already/);
    assert.throws(() => tags.add('alice', 'missing'), /Unknown/);
    assert.throws(() => tags.define('   '), /name/);
    tags.rename(activity, 'Art trades');
    assert.equal(tags._tagsOf('alice')[0]?.name, 'Art trades');
    tags.remove('alice', activity);
    assert.throws(() => tags.remove('alice', activity), /not on/);
    tags.retire(fandom);
    assert.deepEqual(tags._tagsOf('alice'), []);
    assert.deepEqual(tags._tagsOf('bob'), []);
  } finally { db.close(); }
});

test('Tagging searches literal substrings instead of SQL wildcards', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const tags = new Tagging(db);
    tags.define('100% fan');
    tags.define('other');
    assert.equal(tags._suggest('%').length, 1);
    assert.equal(tags._suggest('_').length, 0);
  } finally { db.close(); }
});

test('Synonymizing returns a whole equivalence group and unlink reverses one link', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const synonyms = new Synonymizing(db);
    synonyms.link('sousou', 'frieren');
    synonyms.link('japanese', 'frieren');
    assert.deepEqual(new Set(synonyms._same('sousou')), new Set(['frieren', 'sousou', 'japanese']));
    assert.deepEqual(new Set(synonyms._same('frieren')), new Set(['frieren', 'sousou', 'japanese']));
    assert.equal(synonyms._canonical('japanese'), 'frieren');
    assert.throws(() => synonyms.link('frieren', 'other'), /canonical/);
    assert.throws(() => synonyms.link('other', 'sousou'), /directly/);
    assert.throws(() => synonyms.link('sousou', 'other'), /directly/);
    assert.throws(() => synonyms.link('same', 'same'), /own/);
    synonyms.unlink('sousou');
    assert.deepEqual(synonyms._same('sousou'), ['sousou']);
    assert.deepEqual(new Set(synonyms._same('frieren')), new Set(['frieren', 'japanese']));
    assert.throws(() => synonyms.unlink('sousou'), /not linked/);
  } finally { db.close(); }
});

test('Grouping traverses multiple parents, reports direct edges, and rejects cycles', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const groups = new Grouping(db);
    groups.place('fern', 'frieren');
    groups.place('stark', 'frieren');
    groups.place('fern-stark', 'fern');
    groups.place('fern-stark', 'stark');
    assert.deepEqual(groups._under('frieren'), [
      { member: 'fern', direct: true }, { member: 'fern-stark', direct: false }, { member: 'stark', direct: true },
    ]);
    assert.deepEqual(groups._above('fern-stark'), [
      { broader: 'fern', direct: true }, { broader: 'frieren', direct: false }, { broader: 'stark', direct: true },
    ]);
    assert.deepEqual(groups._top(), ['frieren']);
    assert.throws(() => groups.place('frieren', 'fern-stark'), /cycle/);
    assert.throws(() => groups.place('fern', 'fern'), /itself/);
    assert.throws(() => groups.place('fern', 'frieren'), /already/);
    // A second, direct route must be marked direct even when a longer route also exists.
    groups.place('fern-stark', 'frieren');
    assert.equal(groups._under('frieren').find(row => row.member === 'fern-stark')?.direct, true);
    groups.remove('fern-stark', 'fern');
    assert.equal(groups._above('fern-stark').some(row => row.broader === 'fern'), false);
    assert.throws(() => groups.remove('fern-stark', 'fern'), /not assigned/);
  } finally { db.close(); }
});

test('Templating carries overrides between templates and reset follows the template', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const templates = new Templating(db);
    assert.equal(templates._look('alice'), undefined);
    const poster = templates.define('Poster', 'poster', 'Sans', 'Ocean');
    const columns = templates.define('Columns', 'columns', 'Serif', 'Sunset');
    templates.makeDefault(poster);
    assert.deepEqual(templates._look('alice'), { template: poster, layout: 'poster', font: 'Sans', palette: 'Ocean' });
    templates.setFont('alice', 'Mono');
    templates.setPalette('alice', 'Forest');
    templates.apply('alice', columns);
    assert.deepEqual(templates._look('alice'), { template: columns, layout: 'columns', font: 'Mono', palette: 'Forest' });
    assert.throws(() => templates.apply('alice', columns), /already/);
    templates.reset('alice');
    assert.deepEqual(templates._look('alice'), { template: columns, layout: 'columns', font: 'Serif', palette: 'Sunset' });
    assert.throws(() => templates.reset('alice'), /no font/);
    templates.revise(columns, 'Sans', 'Forest');
    assert.equal(templates._look('alice')?.palette, 'Forest');
    assert.throws(() => templates.retire(columns), /in use/);
    assert.throws(() => templates.retire(poster), /default/);
    templates.remove('alice');
    assert.equal(templates._look('alice')?.template, poster);
    templates.retire(columns);
    assert.equal(templates._templates().length, 1);
    assert.throws(() => templates.define('Poster', 'minimal', 'Mono', 'Forest'), /already exists/);
  } finally { db.close(); }
});

test('Templating has one default and changing it updates unassigned items', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const templates = new Templating(db);
    const first = templates.define('First', 'poster', 'Sans', 'Ocean');
    const second = templates.define('Second', 'minimal', 'Serif', 'Sunset');
    templates.makeDefault(first);
    templates.setPalette('custom', 'Forest');
    templates.makeDefault(second);
    assert.equal(templates._templates().filter(template => template.default).length, 1);
    assert.equal(templates._look('plain')?.template, second);
    assert.equal(templates._look('custom')?.template, second);
    assert.equal(templates._look('custom')?.palette, 'Forest');
    assert.throws(() => templates.makeDefault(second), /already/);
    assert.throws(() => templates.apply('alice', 'missing'), /Unknown/);
  } finally { db.close(); }
});

test('Publishing replaces exactly one public item while retaining discovery state', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const publishing = new Publishing(db);
    assert.throws(() => publishing.publish('alice', 'one'), /handle/);
    publishing.claim('alice', 'alice-1');
    assert.throws(() => publishing.claim('bob', 'alice-1'), /taken/);
    assert.throws(() => publishing.claim('bob', 'UpperCase'), /lowercase/);
    assert.throws(() => publishing.claim('alice', 'another'), /already/);
    assert.equal(publishing._byHandle('alice-1'), 'alice');
    publishing.publish('alice', 'one');
    assert.deepEqual(publishing._published('alice'), { item: 'one', listed: false });
    publishing.list('alice');
    const listedOn = publishing._listed()[0]?.listedOn;
    assert.ok(listedOn);
    publishing.publish('alice', 'two');
    assert.deepEqual(publishing._published('alice'), { item: 'two', listed: true });
    assert.equal(publishing._publisherOf('one'), undefined);
    assert.equal(publishing._publisherOf('two'), 'alice');
    assert.equal(publishing._listed()[0]?.listedOn, listedOn);
    assert.throws(() => publishing.release('alice'), /Unpublish/);
    assert.throws(() => publishing.publish('alice', 'two'), /already/);
    publishing.unlist('alice');
    assert.deepEqual(publishing._listed(), []);
    assert.equal(publishing._byHandle('alice-1'), 'alice');
    assert.equal(publishing._published('alice')?.item, 'two');
    publishing.unpublish('alice');
    assert.equal(publishing._published('alice'), undefined);
    assert.equal(publishing._handle('alice'), 'alice-1');
    publishing.release('alice');
    assert.equal(publishing._handle('alice'), undefined);
  } finally { db.close(); }
});

test('Publishing orders new listings first, including unlist and relist', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const publishing = new Publishing(db);
    for (const user of ['alice', 'bob', 'carol']) {
      publishing.claim(user, user);
      publishing.publish(user, `${user}-bio`);
      publishing.list(user);
    }
    assert.deepEqual(publishing._listed().map(row => row.publisher), ['carol', 'bob', 'alice']);
    publishing.unlist('alice');
    publishing.list('alice');
    assert.deepEqual(publishing._listed().map(row => row.publisher), ['alice', 'carol', 'bob']);
    publishing.unpublish('alice');
    assert.equal(publishing._listed().some(row => row.publisher === 'alice'), false);
    assert.throws(() => publishing.list('alice'), /Publish/);
    assert.throws(() => publishing.unlist('alice'), /not listed/);
  } finally { db.close(); }
});

test('Catalog seed is idempotent and canonical grouping supports broader search', () => {
  const db = new DatabaseSync(':memory:');
  try {
    seedCatalog(db);
    const tags = new Tagging(db);
    const count = tags.all().length;
    assert.ok(count > CATALOG_TAGS.length);
    tags.add('alice', 'fern-stark');
    seedCatalog(db);
    assert.equal(tags.all().length, count);
    assert.equal(tags._tagsOf('alice')[0]?.tag, 'fern-stark');
    assert.equal(new Synonymizing(db)._canonical('frieren-alias-1'), 'frieren');
    assert.equal(new Synonymizing(db)._canonical('fern-stark-alias-1'), 'fern-stark');
    assert.ok(new Grouping(db)._under('frieren').some(row => row.member === 'fern-stark'));
    assert.equal(new Templating(db)._templates().length, 3);
    assert.equal(new Templating(db)._look('new-bio')?.template, 'poster');
  } finally { db.close(); }
});

test('Concept state survives closing and reopening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'fandom-concepts-'));
  const path = join(directory, 'test.sqlite');
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path);
    seedCatalog(db);
    new Tagging(db).add('bio', 'fern');
    new Templating(db).setFont('bio', 'Serif');
    const publishing = new Publishing(db);
    publishing.claim('alice', 'alice');
    publishing.publish('alice', 'bio');
    publishing.list('alice');
    db.close();
    db = new DatabaseSync(path);
    assert.equal(new Tagging(db)._tagsOf('bio')[0]?.tag, 'fern');
    assert.equal(new Synonymizing(db)._canonical('frieren-alias-1'), 'frieren');
    assert.ok(new Grouping(db)._above('fern').some(row => row.broader === 'frieren'));
    assert.equal(new Templating(db)._look('bio')?.font, 'Serif');
    assert.deepEqual(new Publishing(db)._published('alice'), { item: 'bio', listed: true });
  } finally { db?.close(); rmSync(directory, { recursive: true, force: true }); }
});
