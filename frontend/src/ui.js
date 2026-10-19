// Small presentation helpers shared across pages.

// Each leave type gets a colour dot instead of an emoji.
const TYPE_COLOR = { Annual: '#c6ff3d', Sick: '#ff6b8b', Casual: '#6bd6ff', Unpaid: '#a6a6b5' };
export const typeColor = (name) => TYPE_COLOR[name] || '#8b7bff';

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Stable colour per name, so a person always looks the same.
export function hueFor(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
export const colorFor = (name) => `hsl(${hueFor(name)} 75% 62%)`;

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'still up';
  if (h < 12) return 'morning';
  if (h < 18) return 'hey';
  return 'evening';
}

const DAY = 86400000;
export function daysUntil(isoDate) {
  const target = new Date(`${isoDate}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / DAY);
}

export const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
