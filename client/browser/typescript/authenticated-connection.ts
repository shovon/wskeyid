import Once from "./once";
import { getNext, PubSub } from "./pub-sub";
import { getClientId } from "./utils";
import WsSession from "./ws-session";

/**
 * This is a class that maintains an authenticated connection.
 *
 * If a connection fails, then an entirely new auth connection will need to be
 * established.
 */
export default class AuthenticatedConnection {
	private _hasFailed: boolean = false;
	private _onFail: Once<void> = new Once();
	private session: WsSession | null = null;
	private _url: URL;

	private constructor(url: URL, private key: CryptoKeyPair) {
		this._url = url;

		this.session = new WsSession(this._url.toString());
		this.session.connectionEvents.addEventListener(() => {
			this.connect();
		});
	}

	private async connect() {
		if (!this.session) {
			throw new Error(
				"An attempt was made to connect to a session that does not exist!"
			);
		}
		if (this.session.isClosed) {
			return;
		}

		const { data: payload } = await getNext(this.session.messageEvents);

		try {
			const { type, data } = JSON.parse(payload);
		} catch (e) {
			console.error(e);
			this.fail();
		}
	}

	private fail() {
		this._hasFailed = true;
		this._onFail.emit();
		this.close();
	}

	close() {
		this.session?.close();
	}

	static async connect(
		url: string,
		key: CryptoKeyPair
	): Promise<AuthenticatedConnection> {
		const clientId = await getClientId(key.publicKey);
		const u = new URL(url);
		u.searchParams.set("client_id", clientId);

		return new AuthenticatedConnection(new URL(url), key);
	}
}
