export function assert(assertion: boolean, message: string = "Failed") {
	if (!assertion) {
		throw new Error(message);
	}
}

export function assertEquals(a: any, b: any, message?: string) {
	assert(a === b, message ?? `${a} !== ${b}`);
}

export function assertArrayEquals(a: any[], b: any[]) {
	assertEquals(
		a.length,
		b.length,
		`Expected ${JSON.stringify(a)} to have ${b.length} elements in it`
	);

	for (const [index] of a.entries()) {
		assert(a[index], b[index]);
	}
}
