export interface Measurement {
  id: string;
  date: string;
  type: 'period' | 'bbt' | 'cramps' | 'sore_breasts';
  value: PeriodValue | BbtValue | SeverityValue;
}

export interface PeriodValue {
  option: string;
}

export interface BbtValue {
  temperature: number;
}

export interface SeverityValue {
  severity: string;
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

