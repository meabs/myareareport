const CREDIT_RANK = {
  poor: 0,
  fair: 1,
  good: 2,
  excellent: 3,
};

export const BRAND = {
  name: "Blackwell Bank",
  tagline: "Built around you",
};

export const CHANNELS = [
  { id: "merchant-checkout", label: "Merchant checkout" },
  { id: "marketplace", label: "Marketplace wallet" },
  { id: "digital-banking", label: "Digital banking cross-sell" },
  { id: "contact-centre", label: "Contact centre assisted journey" },
];

export const NEEDS = [
  { id: "everyday-spend", label: "Everyday spend" },
  { id: "travel", label: "Travel rewards" },
  { id: "credit-building", label: "Credit building" },
];

export const EMPLOYMENT_STATUSES = [
  { id: "employed", label: "Employed" },
  { id: "self-employed", label: "Self-employed" },
  { id: "student", label: "Student" },
];

export const CUSTOMER_TYPES = [
  { id: "new-to-bank", label: "New to bank" },
  { id: "existing-customer", label: "Existing customer" },
  { id: "pre-approved-partner", label: "Pre-approved partner lead" },
];

export const CARDS = [
  {
    id: "blackwell-rewards",
    name: "Blackwell Rewards Card",
    apr: "24.9% variable",
    annualFee: "£0",
    network: "VISA",
    summary: "Travel rewards. No annual fee.",
    strengths: [
      "Earn up to 1.5 points per £1 on travel and everyday spend",
      "No annual fee",
      "0% on purchases for 9 months",
      "Contactless payments",
      "Apple Pay & Google Pay",
    ],
    minCreditBand: "good",
    minIncome: 26000,
  },
  {
    id: "blackwell-cashback",
    name: "Blackwell Cashback Card",
    apr: "24.9% variable",
    annualFee: "£0",
    network: "Mastercard",
    summary: "Earn up to 1% cashback on everyday spending.",
    strengths: [
      "Earn up to 1% cashback on everyday spending",
      "No annual fee",
      "Contactless payments",
      "Apple Pay & Google Pay",
    ],
    minCreditBand: "fair",
    minIncome: 16000,
  },
];

function bandAllows(card, creditBand) {
  return CREDIT_RANK[creditBand] >= CREDIT_RANK[card.minCreditBand];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getCardRecommendations({
  channel = "digital-banking",
  need = "everyday-spend",
  existingCustomer = false,
} = {}) {
  const cards = [...CARDS];

  // Rewards card first for travel intent; cashback first for everyday/credit-building
  if (need !== "travel") {
    cards.sort((a) => (a.id === "blackwell-cashback" ? -1 : 1));
  }

  return {
    kind: "card-recommendations",
    mode: "card-detail",
    filters: { channel, need, existingCustomer },
    headline: "Recommended for you",
    cards: clone(cards),
  };
}

export function runEligibilityCheck({
  creditBand = "good",
  annualIncome = 42000,
  employmentStatus = "employed",
  existingCustomer = false,
  cardId = null,
} = {}) {
  const normalizedIncome = Number(annualIncome);
  const eligibleCards = CARDS.filter(
    (card) => bandAllows(card, creditBand) && normalizedIncome >= card.minIncome,
  );

  const decision = eligibleCards.length ? "pre-qualified" : "refer";
  const targetCard = cardId ? CARDS.find((c) => c.id === cardId) : null;
  const recommendedCard =
    targetCard ??
    eligibleCards.find((card) => existingCustomer && card.id === "blackwell-cashback") ??
    eligibleCards[0] ??
    null;

  return {
    kind: "eligibility-check",
    mode: "eligibility",
    applicant: { creditBand, annualIncome: normalizedIncome, employmentStatus, existingCustomer },
    decision,
    creditLimit: eligibleCards.length ? "£4,000" : null,
    recommendedCard: clone(recommendedCard),
    eligibleCards: clone(eligibleCards),
  };
}

export function createApplicationJourney({
  cardId = "blackwell-cashback",
  customerType = "new-to-bank",
  leadSource = "digital-banking",
} = {}) {
  const card = CARDS.find((item) => item.id === cardId) ?? CARDS[0];
  const isExistingCustomer = customerType === "existing-customer";

  return {
    kind: "application-journey",
    mode: "application",
    card: clone(card),
    customerType,
    leadSource,
    steps: [
      {
        title: "Personal details",
        status: "done",
        detail: "Name, date of birth, email and mobile number.",
      },
      {
        title: "Address",
        status: "done",
        detail: isExistingCustomer
          ? "Pre-fill address details from your profile."
          : "Your current and previous addresses.",
      },
      {
        title: "Employment",
        status: "current",
        detail: "Employment status and annual income.",
      },
      {
        title: "Review",
        status: "up-next",
        detail: "Check your application before submitting.",
      },
      {
        title: "Decision",
        status: "up-next",
        detail: "Instant decision in most cases.",
      },
    ],
  };
}

export function getDemoPayload({
  channel = "digital-banking",
  need = "everyday-spend",
  creditBand = "good",
  annualIncome = 42000,
  employmentStatus = "employed",
  existingCustomer = false,
  customerType,
} = {}) {
  const recommendations = getCardRecommendations({ channel, need, existingCustomer });
  const eligibility = runEligibilityCheck({ creditBand, annualIncome, employmentStatus, existingCustomer });
  const applicationJourney = createApplicationJourney({
    cardId: eligibility.recommendedCard?.id ?? recommendations.cards[0]?.id,
    customerType: customerType ?? (existingCustomer ? "existing-customer" : "new-to-bank"),
    leadSource: channel,
  });

  return {
    kind: "embedded-sales-demo",
    mode: "full",
    brand: BRAND,
    recommendations,
    eligibility,
    applicationJourney,
  };
}
