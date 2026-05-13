const CREDIT_RANK = {
  poor: 0,
  fair: 1,
  good: 2,
  excellent: 3,
};

export const BRAND = {
  name: "Verdant Bank",
  label: "Embedded Sales Studio",
  tagline: "Partner-led card acquisition with instant eligibility and guided onboarding.",
  accent: "Emerald-led retail banking identity inspired by a high-trust UK banking aesthetic, but clearly branded as Verdant Bank.",
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
  { id: "self-employed", label: "Self employed" },
  { id: "student", label: "Student" },
];

export const CUSTOMER_TYPES = [
  { id: "new-to-bank", label: "New to bank" },
  { id: "existing-customer", label: "Existing customer" },
  { id: "pre-approved-partner", label: "Pre-approved partner lead" },
];

export const CARDS = [
  {
    id: "verdant-everyday",
    name: "Verdant Everyday Cashback",
    apr: "24.9% variable",
    annualFee: "£0",
    summary: "High-conversion cashback card for embedded checkout and wallet placements.",
    strengths: ["3% partner cashback", "Instant digital card", "Eligible for existing-customer fast track"],
    useCases: ["everyday-spend", "merchant-checkout", "digital-banking"],
    minCreditBand: "good",
    minIncome: 26000,
  },
  {
    id: "verdant-travel",
    name: "Verdant Horizon Rewards",
    apr: "29.9% variable",
    annualFee: "£30",
    summary: "Rewards-led card for customers with higher spend and travel intent.",
    strengths: ["Airport lounge voucher", "FX fee waiver", "Premium servicing journey"],
    useCases: ["travel", "marketplace", "digital-banking"],
    minCreditBand: "excellent",
    minIncome: 38000,
  },
  {
    id: "verdant-foundations",
    name: "Verdant Foundations",
    apr: "34.9% variable",
    annualFee: "£0",
    summary: "Low-friction onboarding path for thin-file or improving-credit customers.",
    strengths: ["Starter limit from £500", "Credit coaching nudges", "Flexible bureau waterfall"],
    useCases: ["credit-building", "merchant-checkout", "contact-centre"],
    minCreditBand: "fair",
    minIncome: 16000,
  },
];

export const ARCHITECTURE_PHASES = [
  {
    title: "Embedded acquisition edge",
    detail:
      "Partner widgets, SDK surfaces and event capture collect consent, cart context and campaign metadata at the point of sale.",
    bullets: ["Partner SDK and hosted card tray", "Lead enrichment and consent capture", "Real-time campaign and channel attribution"],
  },
  {
    title: "Eligibility-check orchestration",
    detail:
      "Rules, fraud, affordability and bureau services are orchestrated into a fast pre-decision that can be reused through application submission.",
    bullets: ["Identity and fraud pre-screen", "Credit bureau and affordability waterfall", "Policy, pricing and decline reason management"],
  },
  {
    title: "Onboarding and fulfilment",
    detail:
      "Selected offers flow into assisted or self-serve application journeys with KYC, e-sign, fulfilment and communications triggered automatically.",
    bullets: ["Progressive application capture", "KYC/KYB and document collection", "Card issuance, messaging and analytics feeds"],
  },
];

export const CAPABILITY_DOMAINS = [
  {
    name: "Card catalogue & pricing",
    summary: "Offer definitions, rewards, APR variants and partner-specific proposition controls.",
  },
  {
    name: "Acquisition orchestration",
    summary: "Decision routing, bureau orchestration, fraud checks and offer assembly.",
  },
  {
    name: "Onboarding & KYC",
    summary: "Identity verification, applicant capture, assisted journey branching and document workflows.",
  },
  {
    name: "Application servicing",
    summary: "Status tracking, fulfilment events, communications and case management.",
  },
  {
    name: "Partner enablement",
    summary: "Embeddable surfaces, event feeds, analytics exports and SLA monitoring.",
  },
  {
    name: "Insight & optimisation",
    summary: "Conversion analytics, attribution and journey experimentation by partner and card family.",
  },
];

function bandAllows(card, creditBand) {
  return CREDIT_RANK[creditBand] >= CREDIT_RANK[card.minCreditBand];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getCardRecommendations({
  channel = "merchant-checkout",
  need = "everyday-spend",
  existingCustomer = false,
} = {}) {
  const prioritized = CARDS.filter((card) => {
    const supportsNeed = card.useCases.includes(need);
    const supportsChannel = card.useCases.includes(channel);
    return supportsNeed || supportsChannel;
  }).sort((left, right) => {
    if (existingCustomer && left.id === "verdant-everyday") {
      return -1;
    }
    if (existingCustomer && right.id === "verdant-everyday") {
      return 1;
    }
    return left.minIncome - right.minIncome;
  });

  return {
    kind: "card-recommendations",
    filters: { channel, need, existingCustomer },
    headline:
      channel === "merchant-checkout"
        ? "Checkout-led acquisition puts the cashback card first, with a credit-builder fallback."
        : "Recommendations are balanced for richer acquisition context and higher-value onboarding.",
    cards: clone(prioritized.length ? prioritized : CARDS),
  };
}

export function runEligibilityCheck({
  creditBand = "good",
  annualIncome = 42000,
  employmentStatus = "employed",
  existingCustomer = false,
} = {}) {
  const normalizedIncome = Number(annualIncome);
  const eligibleCards = CARDS.filter(
    (card) => bandAllows(card, creditBand) && normalizedIncome >= card.minIncome,
  );

  const decision = eligibleCards.length ? "pre-qualified" : "refer";
  const recommendedCard =
    eligibleCards.find((card) => existingCustomer && card.id === "verdant-everyday") ??
    eligibleCards[0] ??
    null;

  return {
    kind: "eligibility-check",
    applicant: {
      creditBand,
      annualIncome: normalizedIncome,
      employmentStatus,
      existingCustomer,
    },
    decision,
    recommendedCard: clone(recommendedCard),
    eligibleCards: clone(eligibleCards),
    rationale: eligibleCards.length
      ? [
          "Identity, fraud and affordability checks completed within the orchestration layer.",
          "Reuse the pre-qualified offer through application capture to reduce form abandonment.",
          existingCustomer
            ? "Existing-customer data can shorten the application journey by one step."
            : "New-to-bank customers will complete the full KYC and consent flow.",
        ]
      : [
          "Initial checks indicate the applicant should be referred for a manual review or an alternative product.",
          "Offer a lower-friction Foundations journey or route into assisted servicing.",
        ],
    orchestration: [
      "Lead context captured from embedded acquisition surface",
      "Bureau and affordability waterfall executed",
      "Fraud and policy decision returned with offer packaging",
    ],
  };
}

export function createApplicationJourney({
  cardId = "verdant-everyday",
  customerType = "new-to-bank",
  leadSource = "merchant-checkout",
} = {}) {
  const card = CARDS.find((item) => item.id === cardId) ?? CARDS[0];
  const isExistingCustomer = customerType === "existing-customer";

  return {
    kind: "application-journey",
    card: clone(card),
    customerType,
    leadSource,
    steps: [
      {
        title: "Offer confirmation",
        status: "done",
        detail: "Persist the eligible proposition, partner metadata and consent state.",
      },
      {
        title: "Applicant capture",
        status: "current",
        detail: isExistingCustomer
          ? "Pre-fill contact and address details from the customer profile."
          : "Capture applicant profile, address history and marketing preferences.",
      },
      {
        title: "KYC and fraud checks",
        status: "up-next",
        detail: "Run identity checks, sanctions screening and device-risk controls.",
      },
      {
        title: "Decision and fulfilment",
        status: "up-next",
        detail: "Issue the decision, set up digital card access and trigger communications.",
      },
    ],
    handoffs: [
      "Partner platform receives application status via embedded event webhooks.",
      "Operations queues receive only referred or exception cases.",
      "Analytics domain tracks funnel progression by partner, card and channel.",
    ],
  };
}

export function getDemoPayload({
  channel = "merchant-checkout",
  need = "everyday-spend",
  creditBand = "good",
  annualIncome = 42000,
  employmentStatus = "employed",
  existingCustomer = false,
  customerType,
} = {}) {
  const recommendations = getCardRecommendations({ channel, need, existingCustomer });
  const eligibility = runEligibilityCheck({
    creditBand,
    annualIncome,
    employmentStatus,
    existingCustomer,
  });
  const applicationJourney = createApplicationJourney({
    cardId: eligibility.recommendedCard?.id ?? recommendations.cards[0]?.id,
    customerType:
      customerType ??
      (existingCustomer ? "existing-customer" : "new-to-bank"),
    leadSource: channel,
  });

  return {
    kind: "embedded-sales-demo",
    brand: BRAND,
    hero: {
      eyebrow: "Primary production use case",
      title: "Embedded Sales for card acquisition",
      description:
        "A working MCP App demo showing how an embedded sales front end can discover cards, orchestrate eligibility and guide customers into onboarding.",
    },
    architecturePhases: clone(ARCHITECTURE_PHASES),
    capabilityDomains: clone(CAPABILITY_DOMAINS),
    recommendations,
    eligibility,
    applicationJourney,
    notes: [
      "Use the card discovery controls to pivot by partner channel and proposition need.",
      "Run the eligibility form to simulate orchestration outcomes that update the mockup.",
      "Refresh the application journey to see how new-to-bank and existing-customer onboarding differ.",
    ],
  };
}
