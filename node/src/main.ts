import { subtle } from "crypto";
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

type Socket = {
	onMessage(
		listener: (data: string | Buffer | ArrayBuffer | Buffer[]) => void
	): () => void;
	sendMessage(value: string): void;
};

async function handleConnection(socket: Socket, path: string) {
	const wrapper = new StreamAsyncIterable();

	for await (const message of wrapper) {
	}
}
