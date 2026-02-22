// src/features/eye/engine/staircase.ts
// 2-down-1-up adaptive staircase for forced-choice visual acuity
// Calibrated for ~40cm viewing distance on iPhone (153 logical PPI)

export interface LogMarLevel {
  logMAR: number;
  sizePt: number; // letter height in logical points
  label: string;  // Snellen equivalent
}

// sizePt formula: 5 * 10^logMAR * 0.701  (0.701 pts/arcmin at 40cm, 153 PPI)
export const LOGMAR_LEVELS: LogMarLevel[] = [
  { logMAR: 1.5,  sizePt: 110, label: '20/630' },
  { logMAR: 1.3,  sizePt: 70,  label: '20/400' },
  { logMAR: 1.1,  sizePt: 44,  label: '20/250' },
  { logMAR: 1.0,  sizePt: 35,  label: '20/200' },
  { logMAR: 0.9,  sizePt: 28,  label: '20/160' },
  { logMAR: 0.8,  sizePt: 22,  label: '20/125' },
  { logMAR: 0.7,  sizePt: 18,  label: '20/100' },
  { logMAR: 0.6,  sizePt: 14,  label: '20/80'  },
  { logMAR: 0.5,  sizePt: 11,  label: '20/63'  },
  { logMAR: 0.4,  sizePt: 9,   label: '20/50'  },
  { logMAR: 0.3,  sizePt: 7,   label: '20/40'  },
  { logMAR: 0.2,  sizePt: 6,   label: '20/32'  },
  { logMAR: 0.1,  sizePt: 5,   label: '20/25'  },
  { logMAR: 0.0,  sizePt: 4,   label: '20/20'  },
];

const START_LEVEL_IDX = 6;   // logMAR 0.7 — visible to most people
const TARGET_REVERSALS = 6;
const MAX_TRIALS = 30;

export interface StaircaseTrial {
  levelIdx: number;
  logMAR: number;
  correct: boolean;
  responseTimeMs: number;
}

export interface StaircaseState {
  trials: StaircaseTrial[];
  currentLevelIdx: number;
  consecutiveCorrect: number;
  direction: 'down' | 'up' | null;
  reversalLevels: number[];   // logMAR value at each reversal point
  done: boolean;
  threshold: number | null;  // logMAR threshold after completion
}

export function createStaircaseState(): StaircaseState {
  return {
    trials: [],
    currentLevelIdx: START_LEVEL_IDX,
    consecutiveCorrect: 0,
    direction: null,
    reversalLevels: [],
    done: false,
    threshold: null,
  };
}

export function updateStaircase(
  state: StaircaseState,
  correct: boolean,
  responseTimeMs: number,
): StaircaseState {
  if (state.done) return state;

  const trial: StaircaseTrial = {
    levelIdx: state.currentLevelIdx,
    logMAR: LOGMAR_LEVELS[state.currentLevelIdx].logMAR,
    correct,
    responseTimeMs,
  };

  const trials = [...state.trials, trial];
  let { currentLevelIdx, consecutiveCorrect, direction, reversalLevels } = state;

  if (correct) {
    consecutiveCorrect++;
    if (consecutiveCorrect >= 2) {
      // 2 consecutive correct → step down (harder), record reversal if direction changed
      if (direction === 'up') {
        reversalLevels = [...reversalLevels, LOGMAR_LEVELS[currentLevelIdx].logMAR];
      }
      currentLevelIdx = Math.max(0, currentLevelIdx - 1);
      direction = 'down';
      consecutiveCorrect = 0;
    }
  } else {
    // 1 incorrect → step up (easier), record reversal if direction changed
    if (direction === 'down') {
      reversalLevels = [...reversalLevels, LOGMAR_LEVELS[currentLevelIdx].logMAR];
    }
    currentLevelIdx = Math.min(LOGMAR_LEVELS.length - 1, currentLevelIdx + 1);
    direction = 'up';
    consecutiveCorrect = 0;
  }

  const done = reversalLevels.length >= TARGET_REVERSALS || trials.length >= MAX_TRIALS;

  let threshold: number | null = null;
  if (done) {
    const useLast = Math.min(4, reversalLevels.length);
    const recent = reversalLevels.slice(-useLast);
    threshold = recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : LOGMAR_LEVELS[currentLevelIdx].logMAR;
  }

  return { trials, currentLevelIdx, consecutiveCorrect, direction, reversalLevels, done, threshold };
}

export function getAccuracy(state: StaircaseState): number {
  if (state.trials.length === 0) return 0;
  return state.trials.filter(t => t.correct).length / state.trials.length;
}

export function getMedianRT(state: StaircaseState): number {
  if (state.trials.length === 0) return 0;
  const times = [...state.trials.map(t => t.responseTimeMs)].sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  return times.length % 2 === 0 ? (times[mid - 1] + times[mid]) / 2 : times[mid];
}

// Too-fast responses (< 150ms) indicate guessing
export function getTooFastRate(state: StaircaseState): number {
  if (state.trials.length === 0) return 0;
  return state.trials.filter(t => t.responseTimeMs < 150).length / state.trials.length;
}
