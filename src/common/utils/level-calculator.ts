/**
 * Level calculation based on total XP
 * Uses exponential formula for progression
 */

/**
 * Configuration for level progression
 * Each level requires exponentially more XP
 */
export const LEVEL_CONFIG = {
  baseXp: 100,
  multiplier: 1.15,
  maxLevel: 100,
};

/**
 * Calculate user level from total XP
 */
export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  let cumulativeXp = 0;

  for (let i = 1; i <= LEVEL_CONFIG.maxLevel; i++) {
    const xpRequired = Math.floor(
      LEVEL_CONFIG.baseXp * Math.pow(LEVEL_CONFIG.multiplier, i - 1),
    );
    if (cumulativeXp + xpRequired > totalXp) {
      return i;
    }
    cumulativeXp += xpRequired;
    level = i + 1;
  }

  return LEVEL_CONFIG.maxLevel;
}

/**
 * Get XP required to reach next level
 */
export function getXpForNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  return getXpRequiredForLevel(currentLevel + 1) - totalXp;
}

/**
 * Get total cumulative XP required to reach a specific level
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;

  let cumulativeXp = 0;

  for (let i = 1; i < level; i++) {
    const xpRequired = Math.floor(
      LEVEL_CONFIG.baseXp * Math.pow(LEVEL_CONFIG.multiplier, i - 1),
    );
    cumulativeXp += xpRequired;
  }

  return cumulativeXp;
}

/**
 * Get detailed level info
 */
export function getLevelInfo(totalXp: number) {
  const currentLevel = calculateLevel(totalXp);
  const xpForCurrentLevel = getXpRequiredForLevel(currentLevel);
  const xpForNextLevel = getXpRequiredForLevel(currentLevel + 1);
  const xpIntoCurrentLevel = totalXp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - totalXp;
  const progressPercent = Math.floor(
    (xpIntoCurrentLevel / (xpForNextLevel - xpForCurrentLevel)) * 100,
  );

  return {
    level: currentLevel,
    totalXp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpIntoCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    maxLevel: LEVEL_CONFIG.maxLevel,
    isMaxLevel: currentLevel >= LEVEL_CONFIG.maxLevel,
  };
}
