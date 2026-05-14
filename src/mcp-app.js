import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { createApplicationJourney, runEligibilityCheck } from "./demo-data.js";
import "./global.css";
import "./mcp-app.css";

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  mode: "full",
  entryMode: null,
  journeyPhase: null,
  showJourney: false,
  recommendations: null,
  eligibility: null,
  applicationJourney: null,
  selectedCardId: null,
  submitted: false,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const appRoot = document.getElementById("app-root");
const expandBtn = document.getElementById("expand-btn");

// ─── App instance ─────────────────────────────────────────────────────────────

const app = new App({ name: "Blackwell Bank Card Services", version: "1.0.0" });

// ─── Host context ─────────────────────────────────────────────────────────────

function applyHostContext(ctx) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets && appRoot) {
    appRoot.style.paddingTop    = `${ctx.safeAreaInsets.top + 24}px`;
    appRoot.style.paddingRight  = `${ctx.safeAreaInsets.right + 24}px`;
    appRoot.style.paddingBottom = `${ctx.safeAreaInsets.bottom + 24}px`;
    appRoot.style.paddingLeft   = `${ctx.safeAreaInsets.left + 24}px`;
  }
}

// ─── View switching ───────────────────────────────────────────────────────────

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(viewId)?.classList.remove("hidden");
}

const VIEW_BY_MODE = {
  full: "view-full",
  "card-detail": "view-card-detail",
  journey: "view-journey",
  eligibility: "view-journey",
  application: "view-journey",
};

function showViewForMode(mode) {
  showView(VIEW_BY_MODE[mode] ?? "view-full");
}

function notifyHostSize() {
  try {
    const height = Math.ceil(Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      appRoot?.scrollHeight ?? 0,
      280,
    ));
    const width = Math.ceil(Math.max(
      document.documentElement.offsetWidth,
      document.body.offsetWidth,
      360,
    ));
    app.sendSizeChanged({ width, height });
  } catch {
    // Host not ready yet
  }
}

function journeyTargets() {
  if (state.mode === "full") {
    return {
      progressId: "full-journey-progress",
      bodyId: "full-journey-body",
      titleId: "full-journey-title",
    };
  }
  return {
    progressId: "fragment-journey-progress",
    bodyId: "fragment-journey-body",
    titleId: "fragment-journey-title",
  };
}

function setJourneyTitle(label) {
  const { titleId } = journeyTargets();
  const el = document.getElementById(titleId);
  if (el) el.textContent = label;
}

function renderJourneyPhase() {
  const { progressId, bodyId } = journeyTargets();
  const progressEl = document.getElementById(progressId);
  if (!progressEl || !document.getElementById(bodyId)) return;

  switch (state.journeyPhase) {
    case "eligibility-form":
      progressEl.classList.add("hidden");
      setJourneyTitle("Eligibility");
      renderEligibilityForm(bodyId);
      break;
    case "eligibility-result":
      progressEl.classList.add("hidden");
      setJourneyTitle("Eligibility");
      renderEligibilityResult(bodyId);
      break;
    case "application":
      progressEl.classList.remove("hidden");
      setJourneyTitle("Application");
      renderJourney(progressId, bodyId);
      break;
    case "confirmation":
      progressEl.classList.add("hidden");
      setJourneyTitle("Application");
      renderConfirmation(document.getElementById(bodyId), state.applicationJourney?.card);
      break;
    default:
      break;
  }
  notifyHostSize();
}

function beginJourney(phase) {
  state.journeyPhase = phase;
  state.showJourney = true;
  if (state.mode === "full") {
    document.getElementById("full-journey-section")?.classList.remove("hidden");
    renderJourneyPhase();
    return;
  }
  state.mode = "journey";
  showViewForMode("journey");
  renderJourneyPhase();
}

// ─── Tool result routing ──────────────────────────────────────────────────────

function extractPayload(result) {
  if (!result || typeof result !== "object") return {};
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent;
  }
  if (result.params?.structuredContent && typeof result.params.structuredContent === "object") {
    return result.params.structuredContent;
  }
  if (result.kind) return result;
  return {};
}

function hasRenderableData(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.kind === "embedded-sales-demo") return Boolean(payload.recommendations?.cards?.length);
  if (payload.kind === "card-recommendations") return Boolean(payload.cards?.length);
  if (payload.kind === "eligibility-check") return true;
  if (payload.kind === "application-journey") return Boolean(payload.steps?.length || payload.card);
  return Boolean(payload.recommendations?.cards?.length || payload.cards?.length);
}

function showBootstrapError(message) {
  showView("view-loading");
  const text = document.querySelector("#view-loading .loading-text");
  if (text) text.textContent = message;
  notifyHostSize();
}

// Returns true when the UI was updated with real content.
function handleToolResult(result) {
  const payload = extractPayload(result);

  // App-only tool echoes — merge data but never change view/mode
  if (payload.kind === "card-selected") {
    if (payload.selectedCardId) state.selectedCardId = payload.selectedCardId;
    if (payload.recommendations) state.recommendations = payload.recommendations;
    render();
    return true;
  }
  if (payload.kind === "application-submitted") {
    state.submitted = true;
    render();
    return true;
  }

  if (!hasRenderableData(payload)) return false;

  if (payload.kind === "embedded-sales-demo") {
    state.recommendations    = payload.recommendations;
    state.applicationJourney = payload.applicationJourney;
    state.submitted          = false;
    state.selectedCardId     = payload.recommendations?.cards?.[0]?.id ?? null;
    state.showJourney        = false;
    state.journeyPhase       = null;
    state.eligibility        = null;
  }

  if (payload.kind === "card-recommendations") {
    state.recommendations = payload;
    state.selectedCardId = payload.selectedCardId ?? payload.cards?.[0]?.id ?? state.selectedCardId;
  }

  if (payload.kind === "eligibility-check") {
    state.eligibility = payload;
  }

  if (payload.kind === "application-journey") {
    state.applicationJourney = payload;
    state.submitted          = false;
  }

  const incomingMode = payload.mode;

  // Started in full view — fold fragment tools into the same panel
  if (state.entryMode === "full" && incomingMode && incomingMode !== "full") {
    if (incomingMode === "eligibility") {
      state.journeyPhase = state.eligibility ? "eligibility-result" : "eligibility-form";
      state.showJourney = true;
    }
    if (incomingMode === "application") {
      state.journeyPhase = "application";
      state.showJourney = true;
    }
    state.mode = "full";
    showViewForMode("full");
    render();
    return true;
  }

  if (incomingMode === "eligibility") {
    state.mode = "journey";
    state.journeyPhase = state.eligibility ? "eligibility-result" : "eligibility-form";
    if (!state.entryMode) state.entryMode = "journey";
    showViewForMode("journey");
    render();
    return true;
  }

  if (incomingMode === "application") {
    state.mode = "journey";
    state.journeyPhase = "application";
    if (!state.entryMode) state.entryMode = "journey";
    showViewForMode("journey");
    render();
    return true;
  }

  if (incomingMode) {
    state.mode = incomingMode === "eligibility" || incomingMode === "application"
      ? "journey"
      : incomingMode;
    if (!state.entryMode) state.entryMode = state.mode;
  }

  showViewForMode(state.mode);
  render();
  return true;
}

// ─── Render orchestrator ──────────────────────────────────────────────────────

function render() {
  switch (state.mode) {
    case "full":
      renderCards();
      renderCardDetail("full-card-detail-body");
      if (state.showJourney && state.journeyPhase) {
        document.getElementById("full-journey-section")?.classList.remove("hidden");
        renderJourneyPhase();
      }
      break;
    case "card-detail":
      renderCardDetail("fragment-card-detail-body");
      break;
    case "journey":
    case "eligibility":
    case "application":
      if (state.mode !== "journey") {
        state.journeyPhase ??= state.mode === "application" ? "application" : "eligibility-form";
        state.mode = "journey";
      }
      renderJourneyPhase();
      break;
  }
  notifyHostSize();
}

// ─── renderCards ─────────────────────────────────────────────────────────────

function renderCards() {
  const container = document.getElementById("card-list-items");
  if (!container || !state.recommendations) return;

  const { cards } = state.recommendations;
  container.innerHTML = cards
    .map(
      (card) => `
      <div class="card-list-item ${card.id === state.selectedCardId ? "active" : ""}"
           data-card-id="${card.id}" role="button" tabindex="0"
           aria-label="Select ${card.name}">
        <h3>${card.name}</h3>
        <p class="card-list-summary">${card.summary}</p>
        <p class="card-list-benefit">${card.strengths[0]}</p>
        <p class="card-list-benefit">${card.strengths[1] ?? ""}</p>
        <span class="card-list-view-link">View details</span>
        <div class="card-list-mini-visual" aria-hidden="true">
          <div class="mini-card-top"><div class="mini-card-chip"></div></div>
          <div class="mini-card-crest">♞</div>
          <div class="mini-card-bottom">
            <span class="mini-card-bank">BLACKWELL</span>
            <span class="mini-card-network">${card.network}</span>
          </div>
        </div>
      </div>`,
    )
    .join("");

  container.querySelectorAll(".card-list-item").forEach((item) => {
    const handler = () => {
      const cardId = item.dataset.cardId;
      if (cardId === state.selectedCardId) return;
      state.selectedCardId = cardId;
      renderCards();
      renderCardDetail("full-card-detail-body");
    };
    item.addEventListener("click", handler);
    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") handler(); });
  });
}

// ─── renderCardDetail ─────────────────────────────────────────────────────────

function renderCardDetail(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !state.recommendations) return;

  const cards = state.recommendations.cards ?? [];
  const card  = cards.find((c) => c.id === state.selectedCardId) ?? cards[0];
  if (!card) return;

  container.innerHTML = `
    <h2 class="card-detail-name">${card.name}</h2>
    <p class="card-detail-desc">${card.summary}</p>
    <div class="card-detail-columns">
      <div class="card-detail-left">
        <ul class="card-features">
          ${card.strengths.map((s) => `<li>${s}</li>`).join("")}
        </ul>
        <div class="apr-banner">
          <strong>Representative ${card.apr} APR (variable)</strong>
          <small>Credit subject to status. T&amp;Cs apply.</small>
        </div>
        <button class="btn-primary" data-action="check-eligibility">Check your eligibility</button>
        <button class="btn-secondary" data-action="key-info">View key information</button>
      </div>
      <div class="card-detail-right">
        <div class="card-visual" aria-label="${card.name} card image" role="img">
          <div class="card-visual-top">
            <div class="card-chip"></div>
            <span class="card-bank-name">BLACKWELL<br>BANK</span>
          </div>
          <div class="card-visual-crest">♞</div>
          <div class="card-visual-bottom">
            <span></span>
            <span class="card-network">${card.network ?? "VISA"}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("[data-action='check-eligibility']")?.addEventListener("click", () => {
    state.eligibility = null;
    beginJourney("eligibility-form");
  });
}

// ─── renderEligibilityForm ────────────────────────────────────────────────────

function renderEligibilityForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cardName = state.recommendations?.cards?.find((c) => c.id === state.selectedCardId)?.name
    ?? "this card";

  container.innerHTML = `
    <h2 class="eligibility-heading">Check your eligibility</h2>
    <p class="eligibility-subtitle">Tell us a little about yourself to see if you're likely to be approved for ${cardName}.</p>
    <form class="app-form" id="frag-eligibility-form">
      <div class="form-field">
        <label for="frag-creditBand">Credit band</label>
        <select id="frag-creditBand" name="creditBand">
          <option value="fair">Fair</option>
          <option value="good" selected>Good</option>
          <option value="excellent">Excellent</option>
        </select>
      </div>
      <div class="form-field">
        <label for="frag-annualIncome">Annual income (£)</label>
        <input type="number" id="frag-annualIncome" name="annualIncome" value="42000" min="0" step="1000" />
      </div>
      <div class="form-field">
        <label for="frag-employmentStatus">Employment status</label>
        <select id="frag-employmentStatus" name="employmentStatus">
          <option value="employed">Employed</option>
          <option value="self-employed">Self-employed</option>
          <option value="student">Student</option>
        </select>
      </div>
      <button type="submit" class="btn-primary">Check my eligibility</button>
    </form>
  `;

  document.getElementById("frag-eligibility-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Checking…"; }

    const payload = runEligibilityCheck({
      creditBand:       fd.get("creditBand"),
      annualIncome:     Number(fd.get("annualIncome")),
      employmentStatus: fd.get("employmentStatus"),
      cardId:           state.selectedCardId ?? "blackwell-rewards",
    });
    state.eligibility = payload;
    state.journeyPhase = "eligibility-result";
    renderEligibilityResult(containerId);
  });
}

// ─── renderEligibilityResult ─────────────────────────────────────────────────

function renderEligibilityResult(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !state.eligibility) return;

  const { decision, creditLimit, recommendedCard } = state.eligibility;
  const isPreQualified = decision === "pre-qualified";

  const successBoxHtml = `
    <h2 class="eligibility-heading">Your eligibility result</h2>
    <p class="eligibility-subtitle">Based on the information you've provided</p>
    ${isPreQualified ? `
    <div class="eligibility-success-box">
      <div class="eligibility-check-circle">✓</div>
      <div>
        <h3 class="eligibility-success-title">You're likely to be eligible</h3>
        <p class="eligibility-success-desc">Congratulations! Based on the information you've entered, you're likely to be approved for the ${recommendedCard?.name ?? "card"}.</p>
      </div>
    </div>
  ` : `<div class="eligibility-badge refer">⚠ Manual review required</div>`}`;

  const statsHtml = isPreQualified && recommendedCard ? `
    <div class="eligibility-stats">
      <div class="stat-cell">
        <p class="stat-label">Credit limit</p>
        <p class="stat-value">${creditLimit ?? "£4,000"}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-label">Purchase rate</p>
        <p class="stat-value">${recommendedCard.apr}</p>
        <p class="stat-sub">(variable)</p>
      </div>
      <div class="stat-cell">
        <p class="stat-label">Representative</p>
        <p class="stat-value">${recommendedCard.apr}</p>
        <p class="stat-sub">(variable)</p>
      </div>
    </div>
    <div class="eligibility-notice">
      ℹ This is not a guarantee. Your application is subject to full credit checks and status.
    </div>
    <button class="btn-primary" data-action="continue-application">Continue to application</button>
    <button class="btn-secondary" data-action="check-different">Check a different card</button>
  ` : `
    <p style="color:var(--bw-muted);font-size:0.85rem;margin-bottom:16px;">
      Please contact us to explore your options or visit a branch for assistance.
    </p>
    <button class="btn-secondary" data-action="check-different">Try different details</button>
  `;

  container.innerHTML = `
    ${successBoxHtml}
    ${statsHtml}
  `;

  container.querySelector("[data-action='continue-application']")?.addEventListener("click", () => {
    state.applicationJourney = createApplicationJourney({
      cardId: recommendedCard?.id ?? "blackwell-rewards",
    });
    state.submitted = false;
    state.journeyPhase = "application";
    renderJourneyPhase();
  });

  container.querySelector("[data-action='check-different']")?.addEventListener("click", () => {
    state.eligibility = null;
    state.journeyPhase = "eligibility-form";
    renderEligibilityForm(containerId);
  });
}

// ─── renderJourney ────────────────────────────────────────────────────────────

function renderJourney(progressId, formId) {
  const progressContainer = document.getElementById(progressId);
  const formContainer     = document.getElementById(formId);
  if (!progressContainer || !formContainer || !state.applicationJourney) return;

  const { steps, card } = state.applicationJourney;

  // Step progress bar
  const progressItems = [];
  steps.forEach((step, i) => {
    progressItems.push(`
      <div class="step-node ${step.status}" aria-label="${step.title}, ${step.status}">
        <div class="step-dot">${step.status === "done" ? "✓" : i + 1}</div>
        <span class="step-label">${step.title}</span>
      </div>
    `);
    if (i < steps.length - 1) {
      progressItems.push(`<div class="step-line ${step.status === "done" ? "done" : ""}"></div>`);
    }
  });
  progressContainer.innerHTML = progressItems.join("");

  // Form body or confirmation
  if (state.submitted) {
    renderConfirmation(formContainer, card);
    return;
  }

  const currentStep = steps.find((s) => s.status === "current") ?? steps[0];
  formContainer.innerHTML = `
    <form class="app-form" id="${formId}-form" novalidate>
      <h3 style="margin:0 0 4px;font-size:1rem;font-weight:700;color:var(--bw-text);">
        Let's start with your ${currentStep.title.toLowerCase()}
      </h3>
      <p style="margin:0 0 14px;font-size:0.82rem;color:var(--bw-muted);">
        We'll use this to find your application and do a credit check.
      </p>
      ${getFormFieldsForStep(currentStep.title)}
      <div class="form-actions">
        <button type="button" class="btn-link" id="${formId}-save">Save and exit</button>
        <button type="submit" class="btn-primary form-continue-btn">Continue</button>
      </div>
    </form>
  `;

  document.getElementById(`${formId}-form`)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const applicantName = (fd.get("fullName") || "Alex").toString().trim();
    state.submitted = true;
    state.journeyPhase = "confirmation";
    renderConfirmation(formContainer, card);
  });
}

// ─── renderConfirmation ───────────────────────────────────────────────────────

function renderConfirmation(container, card) {
  container.innerHTML = `
    <div class="confirmation-panel">
      <div class="confirmation-sparkle-wrap" aria-hidden="true">
        <div class="sparkle sparkle-1"></div>
        <div class="sparkle sparkle-2"></div>
        <div class="sparkle sparkle-3"></div>
        <div class="sparkle sparkle-4"></div>
        <div class="confirmation-icon">✓</div>
      </div>
      <h2 class="confirmation-title">Your application has been submitted</h2>
      <p class="confirmation-subtitle">
        Thanks, Alex. We'll let you know our decision within a few minutes.
      </p>
      <p class="next-steps-heading">What happens next?</p>
      <ul class="next-steps">
        <li>We're reviewing your application</li>
        <li>You'll receive a decision notification here</li>
        <li>If approved, your card will be on its way</li>
      </ul>
      <button class="btn-secondary" id="return-to-card-btn">Return to card details</button>
    </div>
  `;

  document.getElementById("return-to-card-btn")?.addEventListener("click", () => {
    state.submitted = false;
    state.showJourney = false;
    state.journeyPhase = null;
    state.eligibility = null;
    document.getElementById("full-journey-section")?.classList.add("hidden");
    if (state.entryMode === "full" || state.mode === "full") {
      state.mode = "full";
      showViewForMode("full");
    } else {
      state.mode = "journey";
      state.journeyPhase = "eligibility-result";
      showViewForMode("journey");
    }
    render();
  });
}

// ─── getFormFieldsForStep ─────────────────────────────────────────────────────

function getFormFieldsForStep(stepTitle) {
  const fieldMap = {
    "Personal details": `
      <div class="form-row">
        <div class="form-field"><label>Full name</label><input type="text" name="fullName" placeholder="Alex Morgan" autocomplete="name" /></div>
        <div class="form-field"><label>Date of birth</label><input type="text" name="dob" placeholder="DD / MM / YYYY" /></div>
      </div>
      <div class="form-field"><label>Email address</label><input type="email" name="email" placeholder="alex.morgan@email.com" autocomplete="email" /></div>
      <div class="form-field"><label>Mobile number</label><input type="tel" name="mobile" placeholder="+44 7700 900123" autocomplete="tel" /></div>
    `,
    "Address": `
      <div class="form-field"><label>Address line 1</label><input type="text" name="address1" placeholder="12 Example Street" autocomplete="address-line1" /></div>
      <div class="form-field"><label>Town / City</label><input type="text" name="city" placeholder="London" autocomplete="address-level2" /></div>
      <div class="form-row">
        <div class="form-field"><label>Postcode</label><input type="text" name="postcode" placeholder="EC4N 1HQ" autocomplete="postal-code" /></div>
        <div class="form-field"><label>Years at address</label><input type="number" name="yearsAtAddress" placeholder="3" min="0" max="99" /></div>
      </div>
    `,
    "Employment": `
      <div class="form-field">
        <label>Employment status</label>
        <select name="employmentStatus">
          <option value="employed">Employed</option>
          <option value="self-employed">Self-employed</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <div class="form-field"><label>Annual income (£)</label><input type="number" name="annualIncome" placeholder="42000" min="0" step="1000" /></div>
      <div class="form-field"><label>Employer name</label><input type="text" name="employer" placeholder="Company name" /></div>
    `,
    "Review": `
      <div style="background:var(--bw-sage-bg);border:1px solid var(--bw-sage-border);border-radius:12px;padding:14px;font-size:0.84rem;color:var(--bw-muted);margin-bottom:4px;">
        Please review the details you've provided. By submitting you confirm they are accurate and
        you consent to a credit check being performed.
      </div>
    `,
  };
  return fieldMap[stepTitle] ?? fieldMap["Personal details"];
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.getElementById("journey-back")?.addEventListener("click", () => {
  if (state.journeyPhase === "application" || state.journeyPhase === "confirmation") {
    state.journeyPhase = "eligibility-result";
    state.submitted = false;
    renderJourneyPhase();
    return;
  }
  state.journeyPhase = null;
  state.showJourney = false;
  state.eligibility = null;
  if (state.entryMode === "full") {
    state.mode = "full";
    showViewForMode("full");
  } else {
    state.mode = "card-detail";
    showViewForMode("card-detail");
  }
  render();
});

// Expand to fullscreen button
expandBtn?.addEventListener("click", async () => {
  await app.requestDisplayMode({ mode: "fullscreen" }).catch(() => {});
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

let bootstrapped = false;

async function bootstrapFromFallback() {
  if (bootstrapped) return true;

  const candidates = [
    "https://garry-demo.meaburn.com/api/demo",
    "http://localhost:3001/api/demo",
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const payload = await res.json();
      if (handleToolResult({ structuredContent: payload })) {
        bootstrapped = true;
        return true;
      }
    } catch {
      // try next candidate
    }
  }
  return false;
}

app.onhostcontextchanged = (ctx) => {
  applyHostContext(ctx);
};
app.ontoolresult = (result) => {
  if (handleToolResult(result)) bootstrapped = true;
};
app.onerror = console.error;
app.onteardown = async () => ({});

app.connect().catch(console.error).then(async () => {
  const ctx = app.getHostContext();
  if (ctx) applyHostContext(ctx);

  // ChatGPT may fire ontoolresult before structuredContent is populated — retry.
  for (const delay of [400, 1200, 2500]) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (bootstrapped) return;
    await bootstrapFromFallback();
  }

  if (!bootstrapped) {
    showBootstrapError("Unable to load cards. Try: Show me Blackwell Bank credit cards");
  }
});
