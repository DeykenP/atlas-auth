const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses short duration strings like "15m", "30d", "60s" into milliseconds. */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected e.g. "15m", "30d".`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}
