const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

// Number of weekdays (Mon-Fri) from start to end, inclusive.
export function countWeekdays(start, end) {
  let n = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}
