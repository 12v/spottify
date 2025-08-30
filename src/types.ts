export interface Measurement {
  id: string;
  date: string;
  type: 'period' | 'bbt' | 'cramps' | 'sore_breasts';
  value: any;
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

