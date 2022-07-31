import { subtle, randomBytes } from "crypto";
import { createClientError } from "./server-messages";
import StreamAsyncIterable from "./stream-wrapper/main";

export class BadClientIDFormatError extends Error {
	constructor() {
		super(
			"the client ID is of a bad format. Expected a string of format <format>$<base64-encoded buffer>, e.g. WebCrypto-raw.EC.P-256$JsxA+HaVosJsyVC/S"
		);
	}
}

export class UnknownNISTKeyFormatError extends Error {
	constructor() {
		super();
	}
}

function parseKeyFromClientId(clientId: string): Promise<CryptoKey> {
	const [format, content] = clientId.split("$");
	if (!format || !content) {
		throw new BadClientIDFormatError();
	}

	if (format !== "WebCrypto-raw.EC.P-256") {
		throw new BadClientIDFormatError();
	}

	return subtle.importKey(
		"raw",
		Buffer.from(content, "base64"),
		{ name: "ECDSA", namedCurve: "P-256" },
		true,
		["verify"]
	);
}

type Data = string | Buffer | ArrayBuffer | Buffer[];

type Socket = {
	close(): void;
	onMessage(listener: (data: Data) => void): () => void;
	sendMessage(value: string): void;
};

async function handleConnection(socket: Socket, path: string) {
	const url = new URL(`no-matter://no-matter${path}`);

	const clientId = url.searchParams.get("client_id");

	if (!clientId) {
		// TOOD: send a message
		socket.close();
		return;
	}

	const key = await parseKeyFromClientId(clientId);

	const wrapper = new StreamAsyncIterable<Data>();

	wrapper.addOnExcessListener(() => {
		socket.sendMessage(
			JSON.stringify(
				createClientError({
					title: "Too many message received",
					details:
						"The server did not even have the chance to complete the authentication process, but the client still sent too many messages. The connection will therefore close",
				})
			)
		);
		socket.close();
	});

	const payload = randomBytes(128);
	socket.sendMessage(
		JSON.stringify({
			type: "CHALLENGE",
			data: {
				payload,
			},
		})
	);

	for await (const message of wrapper) {
	}
}
