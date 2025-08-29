export interface Measurement {
  id: string;
  date: string;
  type: MeasurementType;
  value: MeasurementValue;
}

export type MeasurementType = 'period' | 'bbt' | 'cramps' | 'sore_breasts';

export type MeasurementValue = 
  | { option: 'none' | 'light' | 'medium' | 'heavy' } // period
  | { celsius: number } // bbt
  | { severity: 'none' | 'mild' | 'moderate' | 'severe' } // cramps/sore_breasts

export interface PeriodValue {
  option: 'none' | 'light' | 'medium' | 'heavy';
}

export interface BBTValue {
  celsius: number;
}

export interface SymptomValue {
  severity: 'none' | 'mild' | 'moderate' | 'severe';
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