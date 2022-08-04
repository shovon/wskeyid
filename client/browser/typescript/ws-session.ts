import { PubSub } from "./pub-sub";

export default class WsSession {
	private ws: WebSocket | null = null;
	private _url: string;
	private closed: boolean = false;
	private messages: string[] = [];
	private _messageEvents: PubSub<MessageEvent> = new PubSub();
	private _connectedEvents: PubSub<void> = new PubSub();
	private _disconnectionEvents: PubSub<void> = new PubSub();

	constructor(url: string) {
		this._url = url;
		this.connect();
	}

	private disconnected() {
		this.connect();
	}

	private connect() {
		if (this.closed) {
			return;
		}

		const connectionStateSet = new Set([WebSocket.CLOSED, WebSocket.CLOSED]);

		if (this.ws && connectionStateSet.has(this.ws.readyState)) {
			this.ws.close();
		}

		this.ws = new WebSocket(this._url);

		this.ws.addEventListener("close", () => {
			this.disconnected();
		});

		this.ws.addEventListener("error", () => {
			this.disconnected();
		});

		this.ws.addEventListener("open", () => {
			this._connectedEvents.emit();
		});

		this.ws.addEventListener("message", (event) => {
			this._messageEvents.emit(event);
		});
	}

	close() {
		this.closed = true;
		this.ws?.close();
	}

	private get socketReady(): boolean {
		return !!this.ws && this.ws.readyState === WebSocket.OPEN;
	}

	send(message: string) {
		if (!this.socketReady) {
			this.messages.push(message);
		} else {
			if (!this.ws) {
				throw new Error("An unknown error occurred");
			}
			this.ws?.send(message);
		}
	}

	get messageEvents(): PubSub<MessageEvent> {
		return this._messageEvents;
	}

	get connectionEvents(): PubSub<void> {
		return this._connectedEvents;
	}

	get disconnectionEvents(): PubSub<void> {
		return this._disconnectionEvents;
	}
}
