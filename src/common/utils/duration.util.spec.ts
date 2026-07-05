import { parseDurationToMs } from './duration.util';

describe('parseDurationToMs', () => {
  it.each([
    ['15m', 15 * 60 * 1000],
    ['30d', 30 * 24 * 60 * 60 * 1000],
    ['60s', 60 * 1000],
    ['2h', 2 * 60 * 60 * 1000],
    ['1s', 1000],
  ])('parses %s to %i ms', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it.each(['15', '15x', 'm15', '', '15 m', '-5m'])('throws on invalid duration "%s"', (input) => {
    expect(() => parseDurationToMs(input)).toThrow();
  });
});
