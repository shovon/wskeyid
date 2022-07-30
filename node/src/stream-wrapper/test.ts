import assert = require("assert");
import StreamAsyncIterable from "./main";

const expectedInvocations = 500;
const waterline = 200;

const iterable = new StreamAsyncIterable<number>(waterline);

const values = new Set();
let totalInvocations = 0;

let excessInvocations = 0;
iterable.addOnExcessListener((value) => {
  assert(!values.has(value));
  values.add(value);
  excessInvocations++;
  totalInvocations++;
});

let count = 0;
function loop() {
  setTimeout(() => {
    if (count < expectedInvocations) {
      iterable.emitEvent(count);
      count++;
      loop();
    } else {
      iterable.end();
    }
  }, 1);
}

loop();

(async function () {
  for await (const value of iterable) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    values.add(value);
    totalInvocations++;
  }

  assert(iterable.done);
  assert(excessInvocations >= waterline);
  assert.equal(values.size, expectedInvocations);
  assert.equal(
    totalInvocations,
    expectedInvocations,
    `There should have been 500 total invocations, but instead got ${totalInvocations}`
  );
})().catch(console.error);
