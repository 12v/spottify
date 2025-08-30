import { PERIOD_OPTIONS, SYMPTOM_SEVERITY } from './utils/constants';

export interface Measurement {
  id: string;
  date: string;
  type: MeasurementType;
  value: MeasurementValue;
}

export type MeasurementType = 'period' | 'bbt' | 'cramps' | 'sore_breasts';

export type MeasurementValue = 
  | { option: typeof PERIOD_OPTIONS[keyof typeof PERIOD_OPTIONS] } // period
  | { celsius: number } // bbt
  | { severity: typeof SYMPTOM_SEVERITY[keyof typeof SYMPTOM_SEVERITY] } // cramps/sore_breasts

export interface PeriodValue {
  option: typeof PERIOD_OPTIONS[keyof typeof PERIOD_OPTIONS];
}

export interface BBTValue {
  celsius: number;
}

export interface SymptomValue {
  severity: typeof SYMPTOM_SEVERITY[keyof typeof SYMPTOM_SEVERITY];
}

export interface CycleStats {
  averageCycleLength: number;
  cycleVariation: number;
  averagePeriodLength: number;
}

export interface Prediction {
  nextPeriod: string;
  ovulation: string;
  fertileWindow: {
    start: string;
    end: string;
  };
}

