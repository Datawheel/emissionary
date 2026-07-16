'use client';

import { useId } from 'react';
import type { Lang, Unit } from '@/lib/types';
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
  eventNoun?: string;
}

export default function LogSlider({ min, max, value, onChange, unit, lang, disabled, eventNoun }: LogSliderProps) {
  const id = useId();
  const readout = unit === 'events' && eventNoun ? `${formatQty(value, unit, lang).replace('×', '')} ${eventNoun}` : formatQty(value, unit, lang);

  return (
    <div className="slider-block">
      <div className="readout" aria-hidden="true">
        {readout.split(' ')[0]}
        <span className="unit">{readout.split(' ').slice(1).join(' ')}</span>
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
        aria-label={lang === 'es' ? 'Tu respuesta' : 'Your guess'}
        onChange={(e) => onChange(positionToValue(Number(e.target.value), min, max))}
      />
      <div className="slider-labels" aria-hidden="true">
        <span>{formatQty(min, unit, lang)}</span>
        <span>{formatQty(max, unit, lang)}</span>
      </div>
    </div>
  );
}
