import PubSub, { getNext, Sub } from "./pub-sub";

export default class WsSession {
	private ws: WebSocket | null = null;
	private _url: string;
	private _isClosed: boolean = false;
	private messages: string[] = [];
	private _messageEvents: PubSub<MessageEvent> = new PubSub();
	private _connectedEvents: PubSub<void> = new PubSub();
	private _disconnectionEvents: PubSub<void> = new PubSub();
	private _currentConnectionId: number = 0;

	constructor(url: string) {
		this._url = url;
		this.connect();
	}

	private disconnected() {
		this._currentConnectionId++;
		this.connect();
	}

	private connect() {
		if (this._isClosed) {
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
		this._isClosed = true;
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

	async getNextMessage(): Promise<MessageEvent> {
		const initialConnectionId = this._currentConnectionId;
		const message = getNext(this._messageEvents);
		if (initialConnectionId !== this._currentConnectionId) {
			throw new Error(
				"A disconnection happened before the next message could have been received"
			);
		}
		return message;
	}

	get messageEvents(): Sub<MessageEvent> {
		return this._messageEvents;
	}

	get connectionEvents(): Sub<void> {
		return this._connectedEvents;
	}

	get disconnectionEvents(): Sub<void> {
		return this._disconnectionEvents;
	}

	get isClosed(): boolean {
		return this._isClosed;
	}

	get currentConnectionId(): number {
		return this._currentConnectionId;
	}
}
