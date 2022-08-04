import { getClientId } from "./utils";
import WsSession from "./ws-session";

export default class AuthenticatedConnection {
	private _hasFailed: boolean = false;
	private session: WsSession | null = null;
	private _url: URL;

	private constructor(url: URL, private key: CryptoKeyPair) {
		this._url = url;

		this.session = new WsSession(this._url.toString());

		this.session.connectionEvents.addEventListener(() => {
			this.connect();
		});
	}

	private connect() {
		if (this.session && this.session.isClosed) {
			return;
		}
	}

	private fail() {
		this._hasFailed = true;
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
