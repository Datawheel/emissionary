'use client';

import { useId } from 'react';
import type { Lang, LocalizedPlural, Unit } from '@/lib/types';
import { t } from '@/lib/i18n';
import { formatQty } from '@/lib/format';
import { positionToValue, SLIDER_STEPS as STEPS, valueToPosition } from '@/lib/slider-math';

export interface LogSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit: Unit;
  lang: Lang;
  disabled?: boolean;
  eventNoun?: LocalizedPlural;
}

export default function LogSlider({ min, max, value, onChange, unit, lang, disabled, eventNoun }: LogSliderProps) {
  const id = useId();
  const readout = formatQty(value, unit, lang, eventNoun);
  const space = readout.indexOf(' ');

  return (
    <div className="slider-inner">
      <div className="readout" aria-hidden="true">
        {space > 0 ? readout.slice(0, space) : readout}
        <span className="unit">{space > 0 ? readout.slice(space + 1) : ''}</span>
      </div>
      <input
        id={id}
        type="range"
        className="log-slider"
        min={0}
        max={STEPS}
        step={1}
        disabled={disabled}
        value={valueToPosition(value, min, max)}
        aria-valuetext={readout}
        aria-label={t('your_guess', lang)}
        onChange={(e) => onChange(positionToValue(Number(e.target.value), min, max))}
      />
      <div className="slider-labels" aria-hidden="true">
        <span>{formatQty(min, unit, lang, eventNoun)}</span>
        <span>{formatQty(max, unit, lang, eventNoun)}</span>
      </div>
    </div>
  );
}
