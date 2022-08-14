import { decodeBase64, encodeBase64 } from "./base64";
import Once, { SubOnce } from "./once";
import { getClientId, signMessage } from "./utils";
import WsSession from "./ws-session";

class HasFailed implements SubOnce<void> {
	private _hasFailed: boolean = false;
	private once: Once<void> = new Once<void>();

	fail() {
		this._hasFailed = true;
		this.once.emit();
	}

	addEventListener(listener: (value: void) => void): () => void {
		return this.once.addEventListener(listener);
	}

	toPromise(): Promise<void> {
		return this.once.toPromise();
	}

	get hasFailed() {
		return this._hasFailed;
	}
}

/**
 * This is a class that maintains an authenticated connection.
 *
 * If a connection fails, then an entirely new auth connection will need to be
 * established.
 */
export default class AuthenticatedConnection {
	private failed: HasFailed = new HasFailed();
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

		try {
			{
				const { data: payload } = await this.session.getNextMessage();

				const { type, data } = JSON.parse(payload);

				if (type === "CHALLENGE" && data && typeof data.payload === "string") {
					const messageToSign = decodeBase64(data.payload);
					const signature = await signMessage(
						this.key.privateKey,
						messageToSign
					);

					this.session.send(
						JSON.stringify({
							type: "CHALLENGE_RESPONSE",
							data: {
								payload: data.payload,
								signature: encodeBase64(signature),
							},
						})
					);
				} else {
					throw new Error("Got a bad challenge request from the server");
				}
			}

			{
				const { data: response } = await this.session.getNextMessage();

				const { type } = JSON.parse(response);

				if (type !== "CONNECTED") {
					throw new Error("Failed to connect");
				}
			}
		} catch (e) {
			console.error(e);
			this.failed.fail();
			return;
		}
	}

	close() {
		this.session?.close();
	}

	get hasFailed(): boolean {
		return this.failed.hasFailed;
	}

	get onFail(): SubOnce<void> {
		return this.failed;
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
