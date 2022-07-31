type Listener<T> = (event: T) => void;

export class ReadingFromClosedStreamError extends Error {
	constructor() {
		super("An attempt was made to read from a closed port");
	}
}

/**
 * An async iterable class that allows you to stream events in, and convert
 * those events into an async iterable, with an optional event handler for
 * events when they have exceeded a waterline (default 200).
 */
export default class StreamAsyncIterable<T> {
	private buffer: T[] = [];
	private shortTermListener: Listener<T> | null = null;
	private onExcessListeners: Listener<T>[] = [];
	private _done: boolean = false;

	/**
	 * Creates a new instance of StreamAsyncIterable
	 * @param waterline A number representing a maximum number of events to take
	 *   in, before subsequent events are simply passed onto event listeners as
	 *   opposed to the iterator
	 */
	constructor(private waterline: number = 200) {}

	/**
	 * Emits an event that will then be picked up by the iterator, or, if the
	 * waterline has exceeded, emit the event to a regular callback.
	 * @param event The event to emit
	 */
	emitEvent(event: T) {
		if (this._done) {
			return;
		}
		if (this.shortTermListener) {
			this.shortTermListener(event);
		} else {
			if (this.buffer.length < this.waterline) {
				this.buffer.unshift(event);
			} else {
				for (const listener of this.onExcessListeners) {
					listener(event);
				}
			}
		}
	}

	/**
	 * Ends the event stream.
	 */
	end() {
		this._done = true;
	}

	/**
	 * Adds an on-excess listener.
	 * @param listener The listener that will be listening on excess events
	 */
	addOnExcessListener(listener: (event: T) => void) {
		this.onExcessListeners.push(listener);
	}

	read(): Promise<T> {
		const self = this;

		if (self.buffer.length <= 0 && self._done) {
			throw new ReadingFromClosedStreamError();
		}
		if (self.buffer.length) {
			const result = self.buffer.pop();
			if (!result) {
				throw new Error("An unknown error occurred");
			}
			return Promise.resolve(result);
		}

		return new Promise<T>((resolve) => {
			self.shortTermListener = (value) => {
				self.shortTermListener = null;
				resolve(value);
			};
		});
	}

	[Symbol.asyncIterator]() {
		const self = this;
		return {
			async next(): Promise<{ done: boolean; value?: T }> {
				try {
				} catch (e) {
					if (e instanceof ReadingFromClosedStreamError) {
						return { done: true };
					}
					throw e;
				}
				return { value: await self.read(), done: false };
			},
			return(): Promise<{ done: boolean; value?: T }> {
				return Promise.resolve({ done: true });
			},
		};
	}

	/**
	 * A boolean that represents whether or not the stream is done.
	 */
	get done(): boolean {
		return this._done;
	}
}
