type Listener<T> = (value: T) => void;

export interface SubOnce<T> {
	addEventListener(listener: Listener<T>): () => void;
	toPromise(): Promise<T>;
}

export default class Once<T> {
	private value:
		| {
				resolved: false;
		  }
		| {
				resolved: true;
				value: T;
		  } = { resolved: false };

	private listeners: Listener<T>[] = [];

	emit(value: T) {
		if (!this.value.resolved) {
			this.value = {
				resolved: true,
				value,
			};

			for (const listener of this.listeners) {
				listener(value);
			}
		}
	}

	addEventListener(listener: Listener<T>): () => void {
		let cancelled = false;

		let timeout: number | undefined;

		if (!this.value.resolved) {
			this.listeners.push(listener);
		} else {
			const value = this.value.value;
			timeout = setTimeout(() => {
				if (!cancelled) {
					listener(value);
				}
			});
		}

		return () => {
			cancelled = true;
			this.listeners = this.listeners.filter((l) => l !== listener);
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}

	toPromise(): Promise<T> {
		return new Promise((resolve) => {
			this.addEventListener(resolve);
		});
	}
}
