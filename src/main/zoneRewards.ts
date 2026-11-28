/**
 * Permanent rewards per PoE2 campaign zone code, shown in the leveling guide while in that zone.
 * Taken from PoL2's own default act notes, which listed them before the guide existed.
 */
const ZONE_REWARDS: Record<string, readonly string[]> = {
	G1_2: ["Beira: +10% Cold Res"],
	G1_11: ["Crowbell: 2 Passive Points"],
	G1_12: ["King in the Mists: 30 Spirit + Lvl 4 Spirit Gem"],
	G1_13_1: ["Una's Lute: 2 Passive Points"],
	G1_15: ["Candlemass: +20 Life"],
	G2_2: ["Balbala: Ascendancy"],
	G2_4_1: ["Kabala: 2 Passive Points"],
	G2_6: ["Ancient Vows: choose a bonus"],
	G2_8: ["Final Letter: 2 Passive Points"],
	G2_9_2: ["Sisters of Garukhan: +10% Lightning Res"],
	G3_1: ["Orok Campfire: Lesser Jeweller's Orb"],
	G3_3: ["Mighty Silverfist: 2 Passive Points"],
	G3_4: ["Venom Draught: choose a bonus"],
	G3_6_1: ["Blackjaw: +10% Fire Res"],
	G3_7: ["Ignagduk: 30 Spirit + Lvl 10 Spirit Gem"],
	G3_16: ["Blood Sacrifice: 2 Passive Points"],
	G4_2_2: ["2 Passive Points"],
	G4_4_2: ["+5 for each Res or Stat", "5% increased Max Mana"],
	G4_4_3: ["2 Passive Points"],
	G4_5_1: ["Life/Mana Flask Recovery"],
	G4_8b: ["Evening Bell: 3 Exalted Orbs"],
};

const NO_REWARDS: readonly string[] = [];

/** The same array for every zone without rewards, so callers can compare by reference */
export function zoneRewards(zoneCode: string): readonly string[] {
	return ZONE_REWARDS[zoneCode] ?? NO_REWARDS;
}
