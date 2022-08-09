import PubSub from "./pub-sub";

function assert(assertion: boolean, message: string = "Failed") {
	if (!assertion) {
		throw new Error(message);
	}
}

function assertEquals(a: any, b: any, message?: string) {
	assert(a === b, message ?? `${a} !== ${b}`);
}

function assertArrayEquals(a: any[], b: any[]) {
	assertEquals(
		a.length,
		b.length,
		`Expected ${JSON.stringify(a)} to have ${b.length} elements in it`
	);

	for (const [index] of a.entries()) {
		assert(a[index], b[index]);
	}
}

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

console.log("PubSub test passed");
