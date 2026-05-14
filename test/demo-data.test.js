import test from "node:test";
import assert from "node:assert/strict";
import {
  createApplicationJourney,
  getCardRecommendations,
  getDemoPayload,
  runEligibilityCheck,
} from "../src/demo-data.js";

test("card recommendations put cashback first for everyday-spend need", () => {
  const result = getCardRecommendations({
    channel: "merchant-checkout",
    need: "everyday-spend",
    existingCustomer: true,
  });

  assert.equal(result.kind, "card-recommendations");
  assert.equal(result.cards[0].id, "blackwell-cashback");
  assert.ok(result.cards.length >= 2);
});

test("card recommendations put rewards first for travel need", () => {
  const result = getCardRecommendations({ channel: "marketplace", need: "travel" });
  assert.equal(result.cards[0].id, "blackwell-rewards");
});

test("eligibility check returns a referred path when profile is too weak", () => {
  const result = runEligibilityCheck({
    creditBand: "fair",
    annualIncome: 12000,
    employmentStatus: "student",
    existingCustomer: false,
  });

  assert.equal(result.decision, "refer");
  assert.equal(result.recommendedCard, null);
  assert.equal(result.creditLimit, null);
});

test("eligibility check includes credit limit for pre-qualified applicant", () => {
  const result = runEligibilityCheck({
    creditBand: "good",
    annualIncome: 42000,
    employmentStatus: "employed",
  });

  assert.equal(result.decision, "pre-qualified");
  assert.equal(result.creditLimit, "£4,000");
  assert.ok(result.recommendedCard !== null);
});

test("application journey has 5 steps and adapts for existing customers", () => {
  const result = createApplicationJourney({
    cardId: "blackwell-cashback",
    customerType: "existing-customer",
    leadSource: "digital-banking",
  });

  assert.equal(result.steps.length, 5);
  assert.equal(result.steps[0].status, "current");
  assert.match(result.steps[1].detail, /Pre-fill address/);
});

test("demo payload combines discovery, eligibility and journey for travel intent", () => {
  const result = getDemoPayload({
    channel: "marketplace",
    need: "travel",
    creditBand: "excellent",
    annualIncome: 70000,
    employmentStatus: "employed",
  });

  assert.equal(result.kind, "embedded-sales-demo");
  assert.equal(result.mode, "full");
  assert.equal(result.recommendations.cards[0].id, "blackwell-rewards");
  assert.ok(result.recommendations.cards.length >= 2);
});
