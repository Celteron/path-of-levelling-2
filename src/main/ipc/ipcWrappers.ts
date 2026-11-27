import { IpcMainInvokeEvent, ipcMain, WebContents } from "electron";

type ChannelRequest<K> = K extends keyof channelRequestTypeMapping ? channelRequestTypeMapping[K] : undefined;

/** Type safe wrapper for post requests from Renderer->Main->Renderer that expect a response */
export function ipcMainHandle<K extends keyof channelReturnTypeMapping>(
	channel: K,
	handler: (
		event: IpcMainInvokeEvent,
		request: ChannelRequest<K>,
	) => channelReturnTypeMapping[K] | Promise<channelReturnTypeMapping[K]>,
) {
	ipcMain.handle(channel as string, (event, request) => {
		// Renderer input arrives untyped; handlers validate it where it matters (zod)
		return handler(event, request as ChannelRequest<K>);
	});
}

/** Type safe wrapper for Renderer->Main subscriptions */
export function ipcWebContentsSend<K extends keyof channelReturnTypeMapping>(
	channel: K,
	webContents: WebContents,
	payload: channelReturnTypeMapping[K],
) {
	webContents.send(channel, payload);
}
