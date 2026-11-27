// Pure Client.txt parsing without Electron imports, so it can be unit tested.

export interface LogChunkData {
	/** 0 if no level up was found */
	playerLevel: number;
	/** 0 if no zone change was found */
	monsterLevel: number;
	/** "" if no zone change was found */
	zoneCode: string;
}

const newZoneRegex = /Generating level (\d+) area "(.*)" with seed/;
const levelUpRegex = /is now level (\d+)/;

/**
 * Parses the lines appended to Client.txt since the last read. The file is polled, so one chunk
 * can contain several zone changes or level ups; the latest one is the current state.
 */
export function parseLogChunk(newLines: string): LogChunkData {
	const data: LogChunkData = { playerLevel: 0, monsterLevel: 0, zoneCode: "" };

	for (const line of newLines.split(/\r?\n/)) {
		const levelUp = line.match(levelUpRegex);
		if (levelUp) {
			data.playerLevel = parseInt(levelUp[1]);
			continue;
		}

		const newZone = line.match(newZoneRegex);
		if (newZone) {
			data.monsterLevel = parseInt(newZone[1]);
			data.zoneCode = newZone[2];
		}
	}

	return data;
}
