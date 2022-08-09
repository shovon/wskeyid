type Listener<T> = (event: T) => void;

export interface Sub<T> {
	addEventListener(listener: Listener<T>): () => void;
}

export default class PubSub<T> implements Sub<T> {
	private listeners: Set<Listener<T>> = new Set();

	emit(event: T) {
		for (const listener of this.listeners) {
			listener(event);
		}
	}

	addEventListener(listener: Listener<T>): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
}

export function getNext<T>(stream: Sub<T>): Promise<T> {
	return new Promise((resolve) => {
		const unsubscribe = stream.addEventListener((event) => {
			unsubscribe();
			resolve(event);
		});
	});
}

export async function* toAsyncIterable<T>(stream: Sub<T>): AsyncIterable<T> {
	while (true) {
		yield getNext(stream);
	}
}
