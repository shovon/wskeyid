import { subtle, randomBytes, webcrypto } from "crypto";
import {
	ClientMessage,
	createChallengeRequest,
	createClientError,
	createServerError,
} from "./server-messages";
import StreamAsyncIterable from "./stream-wrapper/main";
import { challengeResponseSchema } from "./client-messages";

/**
 * An error representing that the client ID is of a bad format
 */
export class BadClientIDFormatError extends Error {
	constructor() {
		super(
			"The client ID is of a bad format. Expected a string of format <format>$<base64-encoded buffer>, e.g. WebCrypto-raw.EC.P-256$JsxA+HaVosJsyVC/S"
		);
	}
}

/**
 * An error representing that the key is not a recognizable format, according to
 * the NIST elliptic curve key format specification
 */
export class UnknownNISTKeyFormatError extends Error {
	constructor() {
		super("The supplied key is not of a recognizable NIST format.");
	}
}

async function parseKeyFromClientId(
	clientId: string
): Promise<webcrypto.CryptoKey> {
	const [format, content] = clientId.split("$");
	if (!format || !content) {
		throw new BadClientIDFormatError();
	}

	if (format !== "WebCrypto-raw.EC.P-256") {
		throw new BadClientIDFormatError();
	}

	const key = await subtle.importKey(
		"raw",
		Buffer.from(content, "base64"),
		{ name: "ECDSA", namedCurve: "P-256" },
		true,
		["verify"]
	);

	return key;
}

type Data = string | Buffer | ArrayBuffer | Buffer[];

type Socket = {
	close(): void;
	onMessage(listener: (data: Data) => void): () => void;
	sendMessage(value: string): void;
};

async function handleConnection(socket: Socket, path: string) {
	const sendMessage = (message: ClientMessage) => {
		socket.sendMessage(JSON.stringify(message));
	};

	const url = new URL(`no-matter://no-matter${path}`);

	const clientId = url.searchParams.get("client_id");

	if (!clientId) {
		sendMessage(
			createClientError({
				title: "No client ID supplied",
			})
		);
		socket.close();
		return;
	}

	let key: CryptoKey;

	{
		try {
			key = await parseKeyFromClientId(clientId);
		} catch (e) {
			if (e instanceof BadClientIDFormatError) {
				sendMessage(
					createClientError({
						title: "Bad client ID format",
					})
				);
			} else {
				sendMessage(
					createServerError({
						title: "An unknown error occurred",
						meta: e,
					})
				);
			}
			socket.close();
			return;
		}
	}

	const wrapper = new StreamAsyncIterable<Data>();

	wrapper.addOnExcessListener(() => {
		sendMessage(
			createClientError({
				title: "Too many message received",
				details:
					"The server did not even have the chance to complete the authentication process, but the client still sent too many messages. The connection will therefore close",
			})
		);
		socket.close();
	});

	const payload = randomBytes(128);
	sendMessage(createChallengeRequest(payload.toString("base64")));

	for await (const message of wrapper) {
		const result = challengeResponseSchema.validate(message);
		if (!result.isValid) {
			JSON.stringify(
				createClientError({
					title: "Not a challenge response",
					details: "The response received is not a valid challenge response",
				})
			);
			continue;
		}

		let verified = false;
		try {
			verified = await webcrypto.subtle.verify(
				{ name: "ECDSA", hash: { name: "SHA-256" } },
				key,
				Buffer.from(result.value.data.signature, "base64"),
				Buffer.from(result.value.data.payload, "base64")
			);
		} catch {}

		if (!verified) {
			JSON.stringify(
				createClientError({
					title: "Signature did not match the challenge response",
				})
			);
			socket.close();
			return;
		}
	}
}
