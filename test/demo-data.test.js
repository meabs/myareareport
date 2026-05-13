import test from "node:test";
import assert from "node:assert/strict";
import {
  createApplicationJourney,
  getCardRecommendations,
  getDemoPayload,
  runEligibilityCheck,
} from "../src/demo-data.js";

test("card recommendations prioritize everyday proposition for checkout discovery", () => {
  const result = getCardRecommendations({
    channel: "merchant-checkout",
    need: "everyday-spend",
    existingCustomer: true,
  });

  assert.equal(result.kind, "card-recommendations");
  assert.equal(result.cards[0].id, "verdant-everyday");
  assert.ok(result.cards.length >= 2);
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
});

test("application journey adapts for existing customers", () => {
  const result = createApplicationJourney({
    cardId: "verdant-everyday",
    customerType: "existing-customer",
    leadSource: "digital-banking",
  });

  assert.match(result.steps[1].detail, /Pre-fill contact and address details/);
});

test("demo payload combines architecture, discovery, eligibility and journey state", () => {
  const result = getDemoPayload({
    channel: "marketplace",
    need: "travel",
    creditBand: "excellent",
    annualIncome: 70000,
    employmentStatus: "employed",
  });

  assert.equal(result.kind, "embedded-sales-demo");
  assert.equal(result.architecturePhases.length, 3);
  assert.ok(result.capabilityDomains.length >= 4);
  assert.equal(result.recommendations.cards[0].id, "verdant-travel");
});
