export const CYCLE_CONSTANTS = {
  DAYS_BEFORE_PERIOD_FOR_OVULATION: 14,
  FERTILE_WINDOW_START_DAYS_BEFORE_OVULATION: 5,
  FERTILE_WINDOW_END_DAYS_AFTER_OVULATION: 1,
  MINIMUM_GAP_BETWEEN_PERIODS_DAYS: 7,
  MINIMUM_CYCLES_FOR_PREDICTIONS: 2,
} as const;

export const TIME_CONSTANTS = {
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

export const PERIOD_OPTIONS = {
  NONE: 'none',
  SPOTTING: 'spotting',
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;

export const SYMPTOM_SEVERITY = {
  NONE: 'none',
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
} as const;

export const LH_SURGE_STATUS = {
  NOT_TESTED: 'not_tested',
  NEGATIVE: 'negative',
  POSITIVE: 'positive',
} as const;