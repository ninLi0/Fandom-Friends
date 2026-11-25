const NUMBER = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?';
const RGB_CHANNEL = new RegExp(`^(${NUMBER})(%)?$`, 'i');
const PERCENTAGE = new RegExp(`^(${NUMBER})%$`, 'i');
const HUE = new RegExp(`^(${NUMBER})(deg|turn|rad|grad)?$`, 'i');

export const COLOR_SWATCHES = [
  '#234ee8', '#bd442f', '#25664c', '#7546be', '#bb3176', '#a86718', '#384052',
] as const;

const LEGACY_COLORS = new Map([
  ['Ocean', COLOR_SWATCHES[0]],
  ['Sunset', COLOR_SWATCHES[1]],
  ['Forest', COLOR_SWATCHES[2]],
]);

function hex(channels: number[]): string {
  return `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function rgbChannel(input: string): number | null {
  const match = RGB_CHANNEL.exec(input);
  if (!match) return null;
  const value = Number(match[1]);
  const percentage = Boolean(match[2]);
  if (!Number.isFinite(value) || value < 0 || value > (percentage ? 100 : 255)) return null;
  return percentage ? value * 255 / 100 : value;
}

function percentage(input: string): number | null {
  const match = PERCENTAGE.exec(input);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value / 100 : null;
}

function hue(input: string): number | null {
  const match = HUE.exec(input);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  // Reduce before conversion so even very large finite angles cannot overflow.
  let degrees: number;
  switch (match[2]?.toLowerCase()) {
    case 'turn': degrees = (value % 1) * 360; break;
    case 'rad': degrees = (value % (2 * Math.PI)) * 180 / Math.PI; break;
    case 'grad': degrees = (value % 400) * 0.9; break;
    default: degrees = value % 360;
  }
  return ((degrees % 360) + 360) % 360;
}

/** Accept only opaque HEX, RGB, or HSL colors and store one consistent format. */
export function normalizeColor(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  const shortHex = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(text);
  if (shortHex) {
    const digits = shortHex[1]!.toLowerCase();
    return `#${digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits}`;
  }

  const functionColor = /^(rgb|hsl)\(([^()]*)\)$/i.exec(text);
  if (!functionColor) return null;
  const body = functionColor[2]!.trim();
  const commaSeparated = body.includes(',');
  const components = commaSeparated ? body.split(',').map(part => part.trim()) : body.split(/\s+/);
  if (components.length !== 3) return null;
  const [first, second, third] = components as [string, string, string];

  if (functionColor[1]!.toLowerCase() === 'rgb') {
    // Legacy comma syntax requires either three percentages or three numbers.
    if (commaSeparated && components.some(part => part.endsWith('%')) && !components.every(part => part.endsWith('%'))) return null;
    const channels = components.map(rgbChannel);
    return channels.every(channel => channel !== null) ? hex(channels as number[]) : null;
  }

  const degrees = hue(first);
  const saturation = percentage(second);
  const lightness = percentage(third);
  if (degrees === null || saturation === null || lightness === null) return null;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = degrees / 60;
  const intermediate = chroma * (1 - Math.abs(sector % 2 - 1));
  const offset = lightness - chroma / 2;
  const channels = sector < 1 ? [chroma, intermediate, 0]
    : sector < 2 ? [intermediate, chroma, 0]
    : sector < 3 ? [0, chroma, intermediate]
    : sector < 4 ? [0, intermediate, chroma]
    : sector < 5 ? [intermediate, 0, chroma]
    : [chroma, 0, intermediate];
  return hex(channels.map(channel => (channel + offset) * 255));
}

/** Keep old saved palette names readable while allowing normalized custom colors. */
export function paletteColor(palette: string): string {
  return LEGACY_COLORS.get(palette.trim()) ?? normalizeColor(palette) ?? COLOR_SWATCHES[0];
}
