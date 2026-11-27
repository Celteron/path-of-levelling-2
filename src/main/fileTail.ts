import fs from "fs";

/** Last maxBytes of a file as UTF-8; "" if it cannot be read (e.g. no Client.txt yet) */
export function readFileTail(filePath: string, maxBytes: number): string {
	let fd: number | undefined;
	try {
		fd = fs.openSync(filePath, "r");
		const size = fs.fstatSync(fd).size;
		const length = Math.min(size, maxBytes);
		const buffer = Buffer.alloc(length);
		fs.readSync(fd, buffer, 0, length, size - length);
		return buffer.toString("utf-8");
	} catch {
		return "";
	} finally {
		if (fd !== undefined) fs.closeSync(fd);
	}
}
