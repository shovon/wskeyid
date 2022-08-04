type Listener<T> = (event: T) => void;

export class PubSub<T> {
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

	getNext(): Promise<T> {
		return new Promise((resolve) => {
			const unsubscribe = this.addEventListener((event) => {
				unsubscribe();
				resolve(event);
			});
		});
	}

	async *toAsyncIterable(): AsyncIterable<T> {
		while (true) {
			yield this.getNext();
		}
	}
}
