const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateFraudRisk,
  classifyRisk,
} = require("../fraudEngine");

test("classifies risk at documented boundaries", () => {
  assert.equal(classifyRisk(0), "low");
  assert.equal(classifyRisk(34), "low");
  assert.equal(classifyRisk(35), "medium");
  assert.equal(classifyRisk(74), "medium");
  assert.equal(classifyRisk(75), "high");
  assert.equal(classifyRisk(84), "high");
  assert.equal(classifyRisk(85), "critical");
});

test("keeps normal payments low risk and transferable", () => {
  const result = calculateFraudRisk({
    amount: 1000,
    paymentType: "real",
    method: "UPI",
    metadata: { channel: "Web", device: "Known", location: "India" },
  });

  assert.equal(result.fraudLevel, "low");
  assert.equal(result.decision, "APPROVE");
  assert.equal(result.transferred, true);
});

test("forces simulated fraud into a critical decision", () => {
  const result = calculateFraudRisk({
    amount: 1000,
    paymentType: "fraud",
    method: "UPI",
  });

  assert.ok(result.fraudScore >= 96);
  assert.equal(result.fraudLevel, "critical");
  assert.equal(result.decision, "HOLD");
  assert.equal(result.incidentCreated, true);
  assert.equal(result.transferred, false);
});
