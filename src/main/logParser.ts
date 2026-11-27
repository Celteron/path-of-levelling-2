// Pure Client.txt parsing without Electron imports, so it can be unit tested.

export interface LogChunkData {
	/** 0 if no level up was found */
	playerLevel: number;
	/** 0 if no zone change was found */
	monsterLevel: number;
	/** "" if no zone change was found */
	zoneCode: string;
	/** true at the login/character select screen, false in the game world, undefined if unknown */
	atLoginScreen?: boolean;
}

const newZoneRegex = /Generating level (\d+) area "(.*)" with seed/;
const levelUpRegex = /is now level (\d+)/;
// Same signals as Exile UI: the client connects to the login server when logging in and when
// returning to character select, and writes a "*****" banner when the game starts.
const loginScreenRegex = /connected to .*\.login\.|\*\*\*\*\*/i;

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
			data.atLoginScreen = false;
			continue;
		}

		if (loginScreenRegex.test(line)) data.atLoginScreen = true;
	}

	return data;
}

/**
 * Whether the game was in the game world at the end of the given log text. Used at startup,
 * before any new lines arrive; without a login or zone line the overlay stays visible.
 */
export function inGameWorldFromLogTail(logTail: string): boolean {
	return parseLogChunk(logTail).atLoginScreen !== true;
}
