import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./mcp-app.css";

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  mode: "full",
  recommendations: null,
  eligibility: null,
  applicationJourney: null,
  selectedCardId: null,
  submitted: false,
  eligibilityChecked: false,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const appRoot = document.getElementById("app-root");
const eligibilityForm = document.getElementById("eligibility-form");
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

// ─── Tool result routing ──────────────────────────────────────────────────────

function handleToolResult(result) {
  const payload = result?.structuredContent ?? {};

  // State updates
  if (payload.kind === "embedded-sales-demo") {
    state.recommendations = payload.recommendations;
    state.eligibility     = payload.eligibility;
    state.applicationJourney = payload.applicationJourney;
    state.eligibilityChecked = false;
    state.submitted = false;
    if (!state.selectedCardId) {
      state.selectedCardId = payload.recommendations?.cards?.[0]?.id ?? null;
    }
  }

  if (payload.kind === "card-recommendations") {
    state.recommendations = payload;
    if (!state.selectedCardId) state.selectedCardId = payload.cards?.[0]?.id ?? null;
  }

  if (payload.kind === "card-selected") {
    state.recommendations = payload.recommendations ?? state.recommendations;
    state.selectedCardId  = payload.selectedCardId ?? state.selectedCardId;
  }

  if (payload.kind === "eligibility-check") {
    state.eligibility = payload;
    state.eligibilityChecked = true;
  }

  if (payload.kind === "application-journey") {
    state.applicationJourney = payload;
    state.submitted = false;
  }

  if (payload.kind === "application-submitted") {
    state.submitted = true;
  }

  // Mode switching: stay in "full" for in-view interactions; switch for fragment tool calls
  const incomingMode = payload.mode;
  if (incomingMode) {
    const stayInFull = state.mode === "full" && incomingMode !== "full";
    if (!stayInFull) state.mode = incomingMode;
  }

  showView(`view-${state.mode}`);
  render();
}

// ─── Render orchestrator ──────────────────────────────────────────────────────

function render() {
  switch (state.mode) {
    case "full":
      renderCards();
      renderCardDetail("full-card-detail-body");
      if (state.eligibilityChecked) renderEligibilityResult("eligibility-result");
      renderJourney("step-progress", "application-form-body");
      break;
    case "card-detail":
      renderCardDetail("fragment-card-detail-body");
      break;
    case "eligibility":
      renderEligibilityResult("fragment-eligibility-result");
      break;
    case "application":
      renderJourney("fragment-step-progress", "fragment-application-form-body");
      break;
  }
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
    const handler = async () => {
      const cardId = item.dataset.cardId;
      if (cardId === state.selectedCardId) return;
      const result = await app.callServerTool({
        name: "blackwell-select-card",
        arguments: { cardId },
      });
      handleToolResult(result);
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
    if (state.mode === "full") {
      document.getElementById("application-section")?.scrollIntoView({ behavior: "smooth" });
    } else {
      // From a fragment, open the eligibility check tool
      app.callServerTool({
        name: "blackwell-check-eligibility",
        arguments: {
          creditBand: "good",
          annualIncome: 42000,
          employmentStatus: "employed",
          cardId: card.id,
        },
      }).then(handleToolResult).catch(console.error);
    }
  });
}

// ─── renderEligibilityResult ─────────────────────────────────────────────────

function renderEligibilityResult(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !state.eligibility) return;

  const { decision, creditLimit, recommendedCard } = state.eligibility;
  const isPreQualified = decision === "pre-qualified";

  const successBoxHtml = isPreQualified ? `
    <div class="eligibility-success-box">
      <div class="eligibility-check-circle">✓</div>
      <div>
        <h3 class="eligibility-success-title">You're likely to be eligible</h3>
        <p class="eligibility-success-desc">Congratulations! Based on the information you've entered, you're likely to be approved for the ${recommendedCard?.name ?? "card"}.</p>
      </div>
    </div>
  ` : `<div class="eligibility-badge refer">⚠ Manual review required</div>`;

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

  container.querySelector("[data-action='continue-application']")?.addEventListener("click", async () => {
    const result = await app.callServerTool({
      name: "blackwell-apply",
      arguments: { cardId: recommendedCard?.id ?? "blackwell-rewards" },
    });
    handleToolResult(result);
  });

  container.querySelector("[data-action='check-different']")?.addEventListener("click", () => {
    if (state.mode === "eligibility") {
      // Return to full browse view
      app.callServerTool({ name: "blackwell-browse-cards", arguments: {} })
        .then(handleToolResult).catch(console.error);
    } else {
      container.innerHTML = "";
      state.eligibilityChecked = false;
    }
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
    const cardId = card?.id ?? "blackwell-rewards";

    const result = await app.callServerTool({
      name: "blackwell-submit-application",
      arguments: { cardId, applicantName },
    });
    handleToolResult(result);

    // Inform the model that the application was submitted
    app.sendMessage({
      role: "user",
      content: [{ type: "text", text: `My application for the ${card?.name ?? "card"} has been submitted.` }],
    }).catch(() => {});
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
    renderJourney(
      state.mode === "full" ? "step-progress" : "fragment-step-progress",
      state.mode === "full" ? "application-form-body" : "fragment-application-form-body",
    );
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

// Eligibility form (full view)
eligibilityForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const result = await app.callServerTool({
    name: "blackwell-check-eligibility",
    arguments: {
      creditBand:       fd.get("creditBand"),
      annualIncome:     Number(fd.get("annualIncome")),
      employmentStatus: fd.get("employmentStatus"),
      cardId:           state.selectedCardId ?? "blackwell-rewards",
    },
  });
  handleToolResult(result);

  // After eligibility shown, update model context so it knows the result
  if (result?.structuredContent?.decision) {
    const { decision, creditLimit, recommendedCard } = result.structuredContent;
    app.updateModelContext({
      content: [
        {
          type: "text",
          text: decision === "pre-qualified"
            ? `Customer pre-qualified for ${recommendedCard?.name ?? "card"}, credit limit ${creditLimit ?? "£4,000"}.`
            : "Customer referred for manual review — no instant offer.",
        },
      ],
    }).catch(() => {});
  }
});

// Expand to fullscreen button
expandBtn?.addEventListener("click", async () => {
  await app.requestDisplayMode({ mode: "fullscreen" }).catch(() => {});
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Register handlers before connect
app.onhostcontextchanged = applyHostContext;
app.ontoolresult         = handleToolResult;
app.onerror              = console.error;
app.onteardown           = async () => ({});

app.connect().then(async () => {
  const ctx = app.getHostContext();
  if (ctx) applyHostContext(ctx);

  const result = await app.callServerTool({
    name: "blackwell-browse-cards",
    arguments: {},
  });
  handleToolResult(result);
});
