'use strict';
// Consume Node's structured event stream, not the human-readable TAP output.
// The final cumulative summary is distinct from each per-file summary.
module.exports = async function* unitReporter(source) {
  let summary = null;
  let cumulativeSummaries = 0;
  for await (const event of source) {
    if (event.type === 'test:summary' && event.data?.file === undefined) {
      summary = event.data;
      cumulativeSummaries++;
    }
  }
  yield JSON.stringify({schema_version: 1, kind: 'node-test-summary',
    complete: cumulativeSummaries === 1, success: summary?.success === true,
    counts: summary?.counts || null, node: process.version}) + '\n';
};
