import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLOR_SWATCHES, normalizeColor, paletteColor } from '../src/client/color.js';

test('Color parsing normalizes short and long HEX with an optional hash', () => {
  for (const [input, expected] of [
    ['#abc', '#aabbcc'], ['AbC', '#aabbcc'], ['  #A1b2C3  ', '#a1b2c3'],
    ['234ee8', '#234ee8'], ['#000', '#000000'], ['fff', '#ffffff'],
  ]) assert.equal(normalizeColor(input), expected, input);
});

test('RGB parsing supports comma/space components, percentages, and fractional channels', () => {
  for (const [input, expected] of [
    ['rgb(255, 0, 128)', '#ff0080'], ['RGB(255 0 128)', '#ff0080'],
    ['rgb(100%, 0%, 50%)', '#ff0080'], ['rgb(100% 0 50%)', '#ff0080'],
    ['rgb(12.5 20.4 30.6)', '#0d141f'], ['rgb(+1e2 .5 0)', '#640100'],
    ['rgb(0 0 0)', '#000000'], ['rgb(255 255 255)', '#ffffff'],
  ]) assert.equal(normalizeColor(input), expected, input);
});

test('HSL parsing wraps hue and supports standard angle units', () => {
  for (const [input, expected] of [
    ['hsl(0, 100%, 50%)', '#ff0000'], ['HSL(120 100% 50%)', '#00ff00'],
    ['hsl(480deg 100% 50%)', '#00ff00'], ['hsl(-120 100% 50%)', '#0000ff'],
    ['hsl(.5turn 100% 50%)', '#00ffff'], ['hsl(3.141592653589793rad 100% 50%)', '#00ffff'],
    ['hsl(200grad 100% 50%)', '#00ffff'], ['hsl(210 50% 40%)', '#336699'],
    ['hsl(45 0% 50%)', '#808080'], ['hsl(100 100% 0%)', '#000000'],
    ['hsl(100 100% 100%)', '#ffffff'],
  ]) assert.equal(normalizeColor(input), expected, input);
});

test('Color parsing rejects alpha, out-of-range values, extra syntax, and malformed input', () => {
  for (const input of [
    null, undefined, 123, {}, ['#abc'], '', 'Ocean', 'red', 'transparent',
    '#ab', '#abcd', '#abcdef00', '##abc', '#ggg', '#abc extra',
    'rgba(255,0,0,1)', 'hsla(0,100%,50%,1)', 'rgb(255 0 0 / 1)', 'hsl(0 100% 50% / 100%)',
    'rgb(256 0 0)', 'rgb(-1 0 0)', 'rgb(101% 0% 0%)', 'rgb(1e309 0 0)',
    'rgb(NaN 0 0)', 'rgb(Infinity 0 0)', 'rgb(1, 2 3)', 'rgb(1 2 3 4)', 'rgb(100%, 0, 50%)',
    'rgb(1,2,)', 'rgb(1,,3)', 'rgb(1 2 3) junk', 'rgb(calc(1) 2 3)',
    'hsl(0 101% 50%)', 'hsl(0 50% -1%)', 'hsl(0 50% 101%)', 'hsl(0 50 50%)',
    'hsl(1e309 50% 50%)', 'hsl(1px 50% 50%)', 'hsl(0,50%,50%,1)',
  ]) assert.equal(normalizeColor(input), null, JSON.stringify(input));
});

test('Legacy palettes and hex swatches remain compatible with stored colors', () => {
  assert.equal(paletteColor('Ocean'), '#234ee8');
  assert.equal(paletteColor('Sunset'), '#bd442f');
  assert.equal(paletteColor('Forest'), '#25664c');
  assert.equal(paletteColor('rgb(255 0 128)'), '#ff0080');
  assert.equal(paletteColor('#ABC'), '#aabbcc');
  assert.equal(paletteColor('invalid'), '#234ee8');
  assert.deepEqual(COLOR_SWATCHES.slice(0, 3), ['#234ee8', '#bd442f', '#25664c']);
  assert.ok(COLOR_SWATCHES.length >= 7);
  assert.ok(COLOR_SWATCHES.every(color => /^#[0-9a-f]{6}$/.test(color)));
  assert.equal(new Set(COLOR_SWATCHES).size, COLOR_SWATCHES.length);
});
