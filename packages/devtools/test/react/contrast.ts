/**
 * WCAG 2.2 contrast, computed from the dock's own tokens.
 *
 * The dock paints its own surface over a host page it does not control, so a
 * ratio is only as true as the colours it is computed from. A test reads `colors`
 * and `withAlpha` through these three functions rather than restating a measured
 * number beside a hex it copied, so a palette change moves the measurement.
 *
 * Parsing accepts exactly `#rrggbb` and `withAlpha`'s `rgba(r,g,b,a)`; anything
 * else throws, because a colour this file cannot read is one it would mis-measure.
 */

type Rgba = readonly [number, number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\d+,\d+,\d+,[\d.]+\)$/;

const parse = (value: string): Rgba => {
  if (HEX.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
      1,
    ];
  }
  if (RGBA.test(value)) {
    const [r = 0, g = 0, b = 0, a = 1] = value.slice(5, -1).split(",").map(Number);
    return [r, g, b, a];
  }
  throw new Error(`not a dock colour: ${value}`);
};

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const hexOf = (rgb: readonly [number, number, number]): string =>
  `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** The relative luminance of an opaque `#rrggbb` colour. */
export const luminance = (hex: string): number => {
  const [r, g, b, a] = parse(hex);
  if (a !== 1) throw new Error(`not an opaque dock colour: ${hex}`);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** A `#rrggbb` or `rgba(r,g,b,a)` colour composited over a `#rrggbb` background, each channel rounded. */
export const over = (colour: string, background: string): string => {
  const [r, g, b, a] = parse(colour);
  const [br, bg, bb] = parse(background);
  const mix = (top: number, under: number): number => Math.round(top * a + under * (1 - a));
  return hexOf([mix(r, br), mix(g, bg), mix(b, bb)]);
};

/** The contrast ratio of two opaque colours, from 1 to 21. */
export const contrast = (a: string, b: string): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
