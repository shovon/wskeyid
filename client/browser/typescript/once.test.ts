import Once from "./once";
import { assertArrayEquals } from "./assert";

const preEmit = new Once<number>();

const events1: number[] = [];
const events2: number[] = [];

preEmit.emit(42);

preEmit.addEventListener((event) => {
	events1.push(event);
});

preEmit.emit(24);
preEmit.emit(1);

preEmit.addEventListener((event) => {
	events2.push(event);
});

preEmit.emit(0);

const expected1: number[] = [42];
const expected2: number[] = [42];

setTimeout(() => {
	assertArrayEquals(events1, expected1);
	assertArrayEquals(events2, expected2);

	console.log("'Once' test passed");
}, 100);

export {};
