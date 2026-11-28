import { z } from "zod";

/**
 * Repairs stored settings: fills missing keys, drops unknown ones and replaces every top-level key
 * that fails validation with its default, so one broken value doesn't reset all other settings.
 * Returns undefined if the settings are valid as they are.
 */
export function fillWithDefaults<T extends z.ZodObject<z.ZodRawShape>>(
	schema: T,
	defaults: z.infer<T>,
	current: object,
): z.infer<T> | undefined {
	const check = schema.safeParse(current);
	const keys = Object.keys(current);
	const complete = keys.length === Object.keys(schema.shape).length && keys.every((key) => key in schema.shape);
	if (check.success && complete) return undefined;

	const merged: Record<string, unknown> = { ...defaults, ...current };
	for (const issue of check.error?.issues ?? []) {
		const key = issue.path[0];
		if (typeof key === "string" && key in defaults) merged[key] = defaults[key as keyof typeof defaults];
	}
	const repaired = schema.safeParse(merged);
	return repaired.success ? repaired.data : defaults;
}
