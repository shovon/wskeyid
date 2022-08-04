import { PubSub } from "./pub-sub";

export default class WsSession {
	private ws: WebSocket | null = null;
	private _url: string;
	private closed: boolean = false;
	private _messageEvents: PubSub<MessageEvent> = new PubSub();
	private _openEvents: PubSub<void> = new PubSub();

	constructor(url: string) {
		this._url = url;
		this.connect();
	}

	connect() {
		if (this.closed) {
			return;
		}

		const connectionStateSet = new Set([WebSocket.CLOSED, WebSocket.CLOSED]);

		if (this.ws && connectionStateSet.has(this.ws.readyState)) {
			this.ws.close();
		}

		this.ws = new WebSocket(this._url);

		this.ws.addEventListener("close", () => {
			this.connect();
		});

		this.ws.addEventListener("error", () => {
			this.connect();
		});

		this.ws.addEventListener("open", () => {
			this._openEvents.emit();
		});

		this.ws.addEventListener("message", (event) => {
			this._messageEvents.emit(event);
		});
	}

	close() {
		this.closed = true;
		this.ws?.close();
	}

	get messageEvents(): PubSub<MessageEvent> {
		return this._messageEvents;
	}

	get openEvents(): PubSub<void> {
		return this._openEvents;
	}
}
