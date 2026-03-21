export function timeAgo(value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const deltaSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (deltaSeconds < 60) {
    return 'just now';
  }

  const ranges = [
    { unit: 'minute', seconds: 60 },
    { unit: 'hour',   seconds: 60 * 60 },
    { unit: 'day',    seconds: 60 * 60 * 24 },
    { unit: 'week',   seconds: 60 * 60 * 24 * 7 },
    { unit: 'month',  seconds: 60 * 60 * 24 * 30 },
    { unit: 'year',   seconds: 60 * 60 * 24 * 365 },
  ] as const;

  for (let i = ranges.length - 1; i >= 0; i--) {
    const range = ranges[i];
    if (deltaSeconds >= range.seconds) {
      const amount = Math.floor(deltaSeconds / range.seconds);
      if (range.unit === 'day' && amount === 1) return 'yesterday';
      return `${amount} ${range.unit}${amount === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
}

export function formatRating(rating: number | null | undefined): string {
  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    return 'Unrated';
  }
  // Show "3.5" not "3.50", "5" not "5.0"
  return rating % 1 === 0 ? String(rating) : rating.toFixed(1);
}

export function getRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    0.5: 'Awful',
    1.0: 'Bad',
    1.5: 'Poor',
    2.0: 'Meh',
    2.5: 'OK',
    3.0: 'Fine',
    3.5: 'Good',
    4.0: 'Great',
    4.5: 'Excellent',
    5.0: 'Perfect',
  };
  return labels[rating] ?? '';
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}
