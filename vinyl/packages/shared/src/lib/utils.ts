export function timeAgo(value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const deltaSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (deltaSeconds < 60) {
    return "just now";
  }

  const ranges = [
    { unit: "minute", seconds: 60 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "week", seconds: 60 * 60 * 24 * 7 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "year", seconds: 60 * 60 * 24 * 365 }
  ] as const;

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const range = ranges[index];
    if (deltaSeconds >= range.seconds) {
      const amount = Math.floor(deltaSeconds / range.seconds);
      return `${amount} ${range.unit}${amount === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

export function formatRating(rating: number | null | undefined): string {
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return "Unrated";
  }

  return rating.toFixed(1);
}
