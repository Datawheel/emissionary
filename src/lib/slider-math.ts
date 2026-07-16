export const SLIDER_STEPS = 1000;

/** Map slider position (0..SLIDER_STEPS) to a value on the log scale. */
export function positionToValue(pos: number, min: number, max: number): number {
  return min * (max / min) ** (pos / SLIDER_STEPS);
}

/** Inverse of positionToValue. */
export function valueToPosition(value: number, min: number, max: number): number {
  return Math.round((SLIDER_STEPS * Math.log(value / min)) / Math.log(max / min));
}
