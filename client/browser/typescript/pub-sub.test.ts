import PubSub from "./pub-sub";
import { assertArrayEquals } from "./assert";

const events1: any[] = [];
const events2: any[] = [];

const pubSub = new PubSub<string>();

const unsubscribe = pubSub.addEventListener((event) => {
	events1.push(event);
});

pubSub.emit("hello");
pubSub.emit("world");
pubSub.emit("foo");
pubSub.emit("bar");

pubSub.addEventListener((event) => {
	events2.push(event);
});

pubSub.emit("baz");

unsubscribe();

pubSub.emit("haha");
pubSub.emit("woot!");

const expected1 = ["hello", "world", "foo", "bar", "baz"];
const expected2 = ["baz", "haha", "woot!"];

assertArrayEquals(events1, expected1);
assertArrayEquals(events2, expected2);

export {};

console.log("'PubSub' test passed");
