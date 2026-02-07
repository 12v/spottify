export interface Measurement {
  id: string;
  date: string;
  type: 'period' | 'bbt' | 'cramps' | 'sore_breasts' | 'lh_surge';
  value: PeriodValue | BbtValue | SeverityValue | LhSurgeValue;
  excludeCycle?: boolean;
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

export interface LhSurgeValue {
  status: string;
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

export interface CycleInfo {
  cycleNumber: number;
  cycleLength: number;
  periodLength: number;
  startDate: string;
  endDate: string;
  year: number;
  isExcluded: boolean;
  firstMeasurementId: string;
}

