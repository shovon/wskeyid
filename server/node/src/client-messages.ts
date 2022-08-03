import { exact, object, string } from "./validator";
import { json } from "./custom-validators";

export const challengeResponseSchema = json(
	object({
		type: exact("CHALLENGE_RESPONSE"),
		data: object({
			signature: string(),
			payload: string(),
		}),
	})
);
