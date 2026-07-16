import assert from "node:assert/strict";
import test from "node:test";

import { isMinaJobCurrent, type MinaJob, type MinaJobStatus } from "./jobs";

function job({ active, freshnessBucket, status }: {
  active: boolean;
  freshnessBucket: MinaJob["freshnessBucket"];
  status: MinaJobStatus;
}) {
  return {
    active,
    freshnessBucket,
    state: { status },
  } as MinaJob;
}

test("keeps the active queue current while retaining jobs Mina is working on", () => {
  assert.equal(isMinaJobCurrent(job({ active: true, freshnessBucket: "fresh", status: "new" })), true);
  assert.equal(isMinaJobCurrent(job({ active: false, freshnessBucket: "archive", status: "new" })), false);
  assert.equal(isMinaJobCurrent(job({ active: false, freshnessBucket: "archive", status: "saved" })), true);
  assert.equal(isMinaJobCurrent(job({ active: true, freshnessBucket: "fresh", status: "rejected" })), false);
});
