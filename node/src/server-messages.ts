type ErrorPayload = {
	title?: string;
	details?: string;
	meta?: any;
};

type ClientError = {
	type: "CLIENT_ERROR";
	data: ErrorPayload;
};

type ServerError = {
	type: "SERVER_ERROR";
	data: ErrorPayload;
};

type ChallengeRequest = {
	type: "CHALLENGE";
	data: {
		payload: string;
	};
};

type ConnectedResponse = {
	type: "CONNECTED";
};

export type ClientMessage = ClientError | ServerError | ChallengeRequest;

export function createClientError(payload: ErrorPayload): ClientError {
	return { type: "CLIENT_ERROR", data: payload };
}

export function createServerError(payload: ErrorPayload): ServerError {
	return { type: "SERVER_ERROR", data: payload };
}

export function createChallengeRequest(payload: string): ChallengeRequest {
	return {
		type: "CHALLENGE",
		data: { payload },
	};
}

export function createConnectedResponse(): ConnectedResponse {
	return {
		type: "CONNECTED",
	};
}
