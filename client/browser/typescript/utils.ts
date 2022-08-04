import { encodeBase64 } from "./base64";

export async function signMessage(privateKey: CryptoKey, message: ArrayBuffer) {
	return await crypto.subtle.sign(
		{
			name: "ECDSA",
			hash: { name: "SHA-256" },
		},
		privateKey,
		message
	);
}

export async function generateKeys() {
	return await crypto.subtle.generateKey(
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign", "verify"]
	);
}

export async function getClientId(publicKey: CryptoKey) {
	const raw = await crypto.subtle.exportKey("raw", publicKey);
	const encodedRaw = encodeBase64(raw);
	return `WebCrypto-raw.EC.P-256${encodedRaw}`;
}
