type Listener<T> = (event: T) => void;

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

  [Symbol.asyncIterator]() {
    const self = this;
    return {
      next(): Promise<{ done: boolean; value?: T }> {
        if (self.buffer.length <= 0 && self._done) {
          return Promise.resolve({ done: true });
        }
        if (self.buffer.length) {
          return Promise.resolve({ value: self.buffer.pop(), done: false });
        }
        const p = new Promise<{ done: boolean; value: T }>((resolve) => {
          self.shortTermListener = (value) => {
            self.shortTermListener = null;
            resolve({ value, done: false });
          };
        });
        return p;
      },
      return() {
        return { done: true };
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
