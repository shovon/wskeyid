import WsSession from "./ws-session";

export default class AuthenticatedConnection {
	private session: WsSession;
	// private messages:

	constructor(url: string, key: CryptoKey) {
		this.session = new WsSession(url);

		this.session.connectionEvents.addEventListener(() => {});

		this.session.disconnectionEvents.addEventListener(() => {});
	}
}
