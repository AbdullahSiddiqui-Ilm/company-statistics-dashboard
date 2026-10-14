import test from "node:test";
import assert from "node:assert/strict";
import { demoRows, summarize } from "./statistics.js";
test("totals reconcile with monthly and department data", () => {
  const data = summarize(demoRows);
  assert.equal(data.monthly.length, 12);
  assert.equal(
    data.totals.revenue,
    data.breakdown.reduce((s, r) => s + r.value, 0),
  );
  assert.equal(data.totals.profit, data.totals.revenue - data.totals.expenses);
  assert.equal(data.totals.employees, 140);
});
test("period and department filters change all series and latest headcount", () => {
  const data = summarize(demoRows, 3, "Sales");
  assert.deepEqual(
    data.monthly.map((r) => r.month),
    ["2026-10", "2026-11", "2026-12"],
  );
  assert.deepEqual(
    data.breakdown.map((r) => r.name),
    ["Sales"],
  );
  assert.equal(data.totals.employees, 35);
  assert.equal(
    data.totals.revenue,
    demoRows
      .filter((r) => r.department === "Sales" && r.month >= "2026-10-01")
      .reduce((s, r) => s + r.revenue, 0),
  );
});
test("empty database returns zero totals without fabricated data", () => {
  const data = summarize([]);
  assert.deepEqual(data.monthly, []);
  assert.equal(data.totals.revenue, 0);
  assert.equal(data.period.start, null);
});
