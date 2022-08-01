import { chain, Validator, transform, any } from "./validator";

export const json = <T>(validator: Validator<T> = any()) =>
	chain(transform(JSON.parse), validator);
