type ErrorPayload = {
	title?: string;
	details?: string;
};

type ClientError = {
	type: "CLIENT_ERROR";
	data: ErrorPayload;
};

export function createClientError(payload: ErrorPayload): ClientError {
	return { type: "CLIENT_ERROR", data: payload };
}
