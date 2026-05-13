import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./mcp-app.css";

const state = {
  demo: null,
  recommendations: null,
  eligibility: null,
  applicationJourney: null,
};

const shell = document.querySelector(".app-shell");
const heroTitle = document.getElementById("hero-title");
const heroDescription = document.getElementById("hero-description");
const architectureLanes = document.getElementById("architecture-lanes");
const capabilityDomains = document.getElementById("capability-domains");
const discoveryHeadline = document.getElementById("discovery-headline");
const cardGrid = document.getElementById("card-grid");
const eligibilitySummary = document.getElementById("eligibility-summary");
const eligibilityRationale = document.getElementById("eligibility-rationale");
const journeyCard = document.getElementById("journey-card");
const journeySteps = document.getElementById("journey-steps");
const journeyHandoffs = document.getElementById("journey-handoffs");

const discoveryForm = document.getElementById("discovery-form");
const eligibilityForm = document.getElementById("eligibility-form");
const journeyForm = document.getElementById("journey-form");

const app = new App({
  name: "Verdant Bank Embedded Sales Demo",
  version: "1.0.0",
});

function applyHostContext(context) {
  if (context.theme) {
    applyDocumentTheme(context.theme);
  }
  if (context.styles?.variables) {
    applyHostStyleVariables(context.styles.variables);
  }
  if (context.styles?.css?.fonts) {
    applyHostFonts(context.styles.css.fonts);
  }
  if (context.safeAreaInsets) {
    shell.style.paddingTop = `${context.safeAreaInsets.top + 24}px`;
    shell.style.paddingRight = `${context.safeAreaInsets.right + 24}px`;
    shell.style.paddingBottom = `${context.safeAreaInsets.bottom + 24}px`;
    shell.style.paddingLeft = `${context.safeAreaInsets.left + 24}px`;
  }
}

function renderArchitecture(phases) {
  architectureLanes.innerHTML = phases
    .map(
      (phase) => `
        <article class="lane">
          <p class="chip">${phase.title}</p>
          <p>${phase.detail}</p>
          <ul>${phase.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
        </article>
      `,
    )
    .join("");
}

function renderCapabilityDomains(domains) {
  capabilityDomains.innerHTML = domains
    .map(
      (domain) => `
        <article class="domain-card">
          <h3>${domain.name}</h3>
          <p>${domain.summary}</p>
        </article>
      `,
    )
    .join("");
}

function renderCards(recommendations) {
  discoveryHeadline.textContent = recommendations.headline;
  cardGrid.innerHTML = recommendations.cards
    .map(
      (card) => `
        <article class="product-card">
          <div>
            <p class="chip">${card.name}</p>
            <h3>${card.summary}</h3>
          </div>
          <div class="product-meta">
            <span>${card.apr}</span>
            <span>${card.annualFee} annual fee</span>
          </div>
          <div class="pill-row">
            ${card.strengths.map((strength) => `<span>${strength}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");

  const currentValue = journeyCard.value;
  journeyCard.innerHTML = recommendations.cards
    .map((card) => `<option value="${card.id}">${card.name}</option>`)
    .join("");
  if (currentValue) {
    journeyCard.value = currentValue;
  }
}

function renderEligibility(eligibility) {
  const decisionClass = eligibility.decision === "refer" ? "decision-status refer" : "decision-status";
  eligibilitySummary.innerHTML = `
    <div class="${decisionClass}">${eligibility.decision}</div>
    <h3>${eligibility.recommendedCard?.name ?? "Assisted review route"}</h3>
    <p>
      ${eligibility.recommendedCard
        ? `Best matched proposition for the current applicant profile.`
        : "No instant card offer was returned, so the journey should branch into manual review or a lower-risk proposition."}
    </p>
  `;
  eligibilityRationale.innerHTML = `
    <ul>
      ${eligibility.rationale.map((item) => `<li>${item}</li>`).join("")}
      ${eligibility.orchestration.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderJourney(journey) {
  journeySteps.innerHTML = journey.steps
    .map(
      (step) => `
        <article class="journey-step ${step.status === "current" ? "current" : ""}">
          <div class="step-state">${step.status}</div>
          <h3>${step.title}</h3>
          <p>${step.detail}</p>
        </article>
      `,
    )
    .join("");

  journeyHandoffs.innerHTML = journey.handoffs
    .map((handoff) => `<li>${handoff}</li>`)
    .join("");
}

function render() {
  if (!state.demo) {
    return;
  }

  heroTitle.textContent = state.demo.hero.title;
  heroDescription.textContent = state.demo.hero.description;
  renderArchitecture(state.demo.architecturePhases);
  renderCapabilityDomains(state.demo.capabilityDomains);
  renderCards(state.recommendations ?? state.demo.recommendations);
  renderEligibility(state.eligibility ?? state.demo.eligibility);
  renderJourney(state.applicationJourney ?? state.demo.applicationJourney);
}

function handleToolResult(result) {
  const payload = result.structuredContent ?? {};

  if (payload.kind === "embedded-sales-demo") {
    state.demo = payload;
    state.recommendations = payload.recommendations;
    state.eligibility = payload.eligibility;
    state.applicationJourney = payload.applicationJourney;
  }

  if (payload.kind === "card-recommendations") {
    state.recommendations = payload;
  }

  if (payload.kind === "eligibility-check") {
    state.eligibility = payload;
  }

  if (payload.kind === "application-journey") {
    state.applicationJourney = payload;
  }

  render();
}

app.ontoolresult = handleToolResult;
app.onerror = console.error;
app.onhostcontextchanged = applyHostContext;

discoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(discoveryForm);
  const result = await app.callServerTool({
    name: "recommend-embedded-card",
    arguments: {
      channel: formData.get("channel"),
      need: formData.get("need"),
      existingCustomer: formData.get("existingCustomer") === "on",
    },
  });
  handleToolResult(result);
});

eligibilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(eligibilityForm);
  const result = await app.callServerTool({
    name: "run-eligibility-check",
    arguments: {
      creditBand: formData.get("creditBand"),
      annualIncome: Number(formData.get("annualIncome")),
      employmentStatus: formData.get("employmentStatus"),
      existingCustomer: formData.get("existingCustomer") === "on",
    },
  });
  handleToolResult(result);
});

journeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(journeyForm);
  const result = await app.callServerTool({
    name: "prepare-application-journey",
    arguments: {
      cardId: formData.get("cardId"),
      customerType: formData.get("customerType"),
      leadSource: formData.get("leadSource"),
    },
  });
  handleToolResult(result);
});

app.connect().then(async () => {
  const context = app.getHostContext();
  if (context) {
    applyHostContext(context);
  }

  const result = await app.callServerTool({
    name: "embedded-sales-demo",
    arguments: {},
  });
  handleToolResult(result);
});
