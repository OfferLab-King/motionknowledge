export interface LoudnessPlan {
  targetLufs: number;
  normalizeArgs: string[];
}

export function loudnormPlan(targetLufs = -16): LoudnessPlan {
  return {
    targetLufs,
    normalizeArgs: ['-af', `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:print_format=summary`],
  };
}

export function isWithinLoudnessRange(
  measured: {inputI: number | null; inputTp: number | null; inputLra: number | null},
  targetLufs = -16,
): boolean {
  if (measured.inputI === null) return true;
  return Math.abs(measured.inputI - targetLufs) <= 4;
}
