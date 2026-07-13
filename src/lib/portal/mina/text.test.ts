import assert from "node:assert/strict";
import test from "node:test";

import { plainDescription } from "./text";

test("turns entity-encoded posting HTML into readable plain text", () => {
  const source =
    "&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;StackAdapt builds marketing tools &amp;amp; products.&lt;/p&gt;&lt;/div&gt;" +
    "&lt;div&gt;&lt;p&gt;The Senior HR Business Partner supports the people team.&lt;/p&gt;&lt;/div&gt;";

  assert.equal(
    plainDescription(source),
    "StackAdapt builds marketing tools & products.\n\nThe Senior HR Business Partner supports the people team.",
  );
});

test("removes executable and styling blocks instead of exposing their contents", () => {
  assert.equal(
    plainDescription("<p>Useful role detail.</p><script>alert('x')</script><style>.hidden{display:none}</style>"),
    "Useful role detail.",
  );
});
