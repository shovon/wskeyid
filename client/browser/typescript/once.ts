type Listener<T> = (value: T) => void;

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

	addEventListener(listener: Listener<T>) {
		if (!this.value.resolved) {
			this.listeners.push(listener);
		} else {
			const value = this.value.value;
			setTimeout(() => {
				listener(value);
			});
		}
	}

	toPromise(): Promise<T> {
		return new Promise((resolve) => {
			this.addEventListener(resolve);
		});
	}
}
