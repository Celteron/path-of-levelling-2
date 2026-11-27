/** Effective area levels above 70 used by the experience penalty (Path of Exile wiki) */
const EFFECTIVE_AREA_LEVEL: Readonly<Record<number, number>> = {
	71: 70.94,
	72: 71.82,
	73: 72.64,
	74: 73.4,
	75: 74.1,
	76: 74.74,
	77: 75.32,
	78: 75.84,
	79: 76.3,
	80: 76.7,
	81: 77.04,
	82: 77.32,
	83: 77.54,
	84: 77.7,
};

/**
 * Experience multiplier of a character in an area. No penalty within a safe range of
 * 3 + level / 16 levels; beyond it the penalty grows with the fifth power of the excess
 * difference, and from level 95 on every level costs another 10%. Rounded to two decimals and
 * never below 1%.
 */
export function experienceMultiplier(playerLevel: number, areaLevel: number): number {
	const safeRange = Math.floor(3 + playerLevel / 16);
	const effectiveAreaLevel = EFFECTIVE_AREA_LEVEL[areaLevel] ?? areaLevel;
	const excessDifference = Math.abs(playerLevel - effectiveAreaLevel) - safeRange;
	if (excessDifference < 0) return 1;

	let multiplier = Math.sqrt(((playerLevel + 5) / (playerLevel + 5 + Math.sqrt(excessDifference ** 5))) ** 3);
	if (playerLevel >= 95) multiplier *= 1 / (1 + 0.1 * (playerLevel - 94));

	return Math.round(Math.max(multiplier, 0.01) * 100) / 100;
}
