ARCHITECTURE PAPER
Conversational Banking on MCP
Exposing UK Credit Card Capabilities to ChatGPT and Claude

Scope     MCP Apps, Generative UI, trusted fragments, embedded auth
Audience  Architects, principal engineers, security and compliance leads
Context   UK retail credit cards · FCA / PRA regulated · GCP-native
Status    Draft for architecture review
Version   1.0 · 12 May 2026
Document control


Change log

Contents
Document control	3
Change log	3
Contents	4
1. Executive summary	11
This paper sets out a production-grade architecture for exposing UK credit card capabilities inside conversational AI surfaces — initially ChatGPT and Claude — using the Model Context Protocol (MCP), MCP Apps, generative UI and trusted UI fragments. It assumes a GCP-native estate, Apigee X as the external edge, GKE and Istio as the internal fabric, and a regulated UK retail banking context governed by the FCA Consumer Duty, PRA operational resilience expectations, PCI DSS v4 and PSR 2025 strong customer authentication rules.	11
The position is deliberately conservative. Large language models are powerful orchestrators but they are not authoritative actors. The architecture treats the AI runtime as a thin orchestration and rendering layer, and keeps every credit, fraud, eligibility, identity and payment decision inside bank-owned services with their existing controls, audit and ownership.	11
The model should never own credit decisions, fraud decisions, PCI data, customer identity, payment execution, eligibility logic, or vulnerability classifications. Where the model influences customer journeys it does so by selecting from a small, version-controlled set of human-authored UI fragments and by invoking scoped MCP tools that are themselves validated, rate-limited, and audited at the gateway.	12
The recommended delivery path begins with internal agent-assist on the colleague channel, expands to read-only customer servicing once authentication and audit are proven, and only then moves into low-risk write operations such as card freeze and travel notices. Higher-risk journeys (financial difficulty, complaints, credit limit changes) require additional governance described in §13.	12
2. Regulatory and risk framing	12
Conversational banking changes the surface, not the substance, of regulatory obligations. The bank remains accountable for every outcome regardless of which channel a customer used.	12
2.1 Obligations that materially shape the design	12
2.2 The non-negotiables	13
3. Core concepts	13
3.1 What MCP Apps actually are	14
An MCP App is a server that exposes four kinds of capability to an AI host: tools (callable functions), resources (read-only context), prompts (parameterised templates), and — newer — UI surfaces rendered as sandboxed components inside the host. The host (ChatGPT, Claude) is responsible for tool selection, sandboxed rendering, and mediating user consent. The bank is responsible for everything that matters: identity, policy, business logic, data, and audit.	14
A precise way to think about it: MCP gives the model a vocabulary for asking the bank to do things. It does not give the model authority to decide things.	14
3.2 Embedded apps and generative UI	14
Two ideas often get conflated and should be kept distinct.	14
4. Reference architecture	14
4.1 Logical view	14
4.2 Trust boundaries	15
Trust does not live inside the iframe and it does not live inside the AI host. The trust boundary is the MCP Gateway. Everything beyond it is bank-controlled. Everything before it is treated as a hostile, low-trust client — including the AI host itself.	16
5. GCP service mapping	16
This architecture is opinionated about its substrate. The credit card platform is GCP-native; the conversational channel should not introduce a parallel stack. Mapping each architectural concern onto an existing primitive is what makes this paper deliverable rather than aspirational.	16
6. Trusted UI fragment model	17
6.1 Principle	17
Fragments are versioned, human-authored React components, owned by the relevant business domain, and registered in a central catalogue. The model never authors UI. It selects an ID and supplies tokenised props.	17
6.2 Fragment registry	17
6.3 Model output contract	18
The model's job is to emit a structured selection. This is parsed, validated against the registry, and the bank renders the component server-side or hydrates the iframe with it.	18
6.4 Fragment manifest	18
Each fragment ships a manifest that the gateway and the audit pipeline consume. Manifests are signed; an unsigned or out-of-date manifest is rejected.	19
6.5 Why manifests matter	19
7. Interaction patterns	19
Not every interaction inside an embedded app should be exposed to the model. Visibility is a security and Consumer Duty decision, not a default.	19
7.1 The three patterns	19
7.2 Visibility classification	20
7.3 The redaction contract	20
Every event returned to the model passes through a redaction step at the gateway. Free text is stripped or replaced with a token. Numeric values above a configurable threshold are bucketed. Vulnerability and complaints flags are removed entirely; they continue down the bank's existing pipeline.	20
8. Authentication and authorisation	20
8.1 Three trust modes	20
8.2 OAuth flow	21
8.3 Step-up: intent-bound elevation	21
Step-up tokens are bound to a single intent and a single fragment instance. A token elevated to freeze card 1234 cannot be replayed to change an address. The binding is enforced at the gateway by verifying the intent claim against the tool invocation.	21
8.4 What lives where	22
9. MCP Gateway: the control plane	22
The gateway is the single point at which the bank takes ownership of a request. It sits behind Apigee X for edge concerns (TLS, WAF, baseline rate limits) and runs as a Quarkus or Go service on GKE with an Istio sidecar for internal mTLS.	22
9.1 Responsibilities	22
9.2 Tool descriptor	23
Every tool registered with the gateway carries a descriptor that drives validation, policy, and observability. The descriptor is the contract; the implementation is just an implementation.	23
9.3 Idempotency that actually works	23
Every write tool requires an Idempotency-Key generated by the iframe (not the model) and bound to a fragment instance. The gateway stores a request fingerprint in Firestore with TTL; duplicate keys return the original response without reaching the domain. This is the defence against the model retrying a write because it 'wasn't sure' the previous attempt succeeded.	24
10. Security architecture	24
10.1 First principle	24
10.2 Controls baseline	24
10.3 Threat model (abridged STRIDE)	25
10.4 Prompt injection: the specific banking framing	25
Retrieved content in a banking context is plentiful and adversarially controlled in places we don't fully appreciate: merchant descriptors set by acquirers, uploaded dispute evidence, CRM free-text notes, statement narratives. The architectural answer is unambiguous. None of this content may modify system prompts, tool selection logic, scopes, or authorisation. The model receives this content as data inside a structured envelope; the gateway strips control sequences and quote markers; and any model output that nonetheless references an unexpected tool or scope is rejected before it leaves the gateway.	25
11. State, observability and operational resilience	26
11.1 State types	26
11.2 Event sourcing for customer-affecting actions	26
Every write produces an immutable event with: correlation ID, customer ID, fragment ID and version, tool ID and version, idempotency key, SCA AMR claim, decision outcome, downstream system references, and Consumer Duty outcome tag. Replay is supported without invoking the model — the bank can reconstruct what happened from its own systems alone.	26
11.3 Observability	26
11.4 Operational resilience	26
12. Use cases	27
Each use case below names the fragments involved, the tools they call, the auth posture, and any Consumer Duty considerations that change the design.	27
12.1 Customer servicing (read)	27
12.2 Card controls	27
12.3 Disputes and chargebacks	27
12.4 Financial difficulty	27
12.5 Complaints	28
12.6 Agent assist (recommended starting point)	28
13. Delivery roadmap	28
14. Technology stack	29
15. Architectural principles	30
Or, condensed:	30
The iframe renders the button. The bank decides whether the button works.	30
16. Open questions and decisions to take	30
17. References	31
1. Executive summary
This paper sets out a production-grade architecture for exposing UK credit card capabilities inside conversational AI surfaces — initially ChatGPT and Claude — using the Model Context Protocol (MCP), MCP Apps, generative UI and trusted UI fragments. It assumes a GCP-native estate, Apigee X as the external edge, GKE and Istio as the internal fabric, and a regulated UK retail banking context governed by the FCA Consumer Duty, PRA operational resilience expectations, PCI DSS v4 and PSR 2025 strong customer authentication rules.
The position is deliberately conservative. Large language models are powerful orchestrators but they are not authoritative actors. The architecture treats the AI runtime as a thin orchestration and rendering layer, and keeps every credit, fraud, eligibility, identity and payment decision inside bank-owned services with their existing controls, audit and ownership.



The model should never own credit decisions, fraud decisions, PCI data, customer identity, payment execution, eligibility logic, or vulnerability classifications. Where the model influences customer journeys it does so by selecting from a small, version-controlled set of human-authored UI fragments and by invoking scoped MCP tools that are themselves validated, rate-limited, and audited at the gateway.
The recommended delivery path begins with internal agent-assist on the colleague channel, expands to read-only customer servicing once authentication and audit are proven, and only then moves into low-risk write operations such as card freeze and travel notices. Higher-risk journeys (financial difficulty, complaints, credit limit changes) require additional governance described in §13.

2. Regulatory and risk framing
Conversational banking changes the surface, not the substance, of regulatory obligations. The bank remains accountable for every outcome regardless of which channel a customer used.
2.1 Obligations that materially shape the design


2.2 The non-negotiables
The model is never the system of record for any decision.
The model never sees raw PAN, CVV, full DOB, full NI number, or full account number; tokenised references only.
Vulnerability indicators trigger a human path; they do not unlock automated remediation.
Every customer-affecting action is reproducible from an immutable audit log without replaying the LLM.
The conversational channel must degrade to existing journeys (app, web, IVR) without customer detriment.

3. Core concepts
3.1 What MCP Apps actually are
An MCP App is a server that exposes four kinds of capability to an AI host: tools (callable functions), resources (read-only context), prompts (parameterised templates), and — newer — UI surfaces rendered as sandboxed components inside the host. The host (ChatGPT, Claude) is responsible for tool selection, sandboxed rendering, and mediating user consent. The bank is responsible for everything that matters: identity, policy, business logic, data, and audit.
A precise way to think about it: MCP gives the model a vocabulary for asking the bank to do things. It does not give the model authority to decide things.
3.2 Embedded apps and generative UI
Two ideas often get conflated and should be kept distinct.
Embedded apps. A sandboxed iframe served by the bank, rendered inside the AI host. Communicates back via postMessage and the MCP bridge. Used for stateful, multi-step interactions (a dispute wizard, a balance and transaction explorer, a card-controls panel).
Generative UI. The model dynamically composes a banking experience from a small registry of trusted, human-authored fragments. The model picks fragment identifiers and supplies tokenised props; it does not author markup or behaviour.



4. Reference architecture
4.1 Logical view


4.2 Trust boundaries
Trust does not live inside the iframe and it does not live inside the AI host. The trust boundary is the MCP Gateway. Everything beyond it is bank-controlled. Everything before it is treated as a hostile, low-trust client — including the AI host itself.


5. GCP service mapping
This architecture is opinionated about its substrate. The credit card platform is GCP-native; the conversational channel should not introduce a parallel stack. Mapping each architectural concern onto an existing primitive is what makes this paper deliverable rather than aspirational.


6. Trusted UI fragment model
6.1 Principle
Fragments are versioned, human-authored React components, owned by the relevant business domain, and registered in a central catalogue. The model never authors UI. It selects an ID and supplies tokenised props.
6.2 Fragment registry

6.3 Model output contract
The model's job is to emit a structured selection. This is parsed, validated against the registry, and the bank renders the component server-side or hydrates the iframe with it.

6.4 Fragment manifest
Each fragment ships a manifest that the gateway and the audit pipeline consume. Manifests are signed; an unsigned or out-of-date manifest is rejected.

6.5 Why manifests matter
They make change governance enforceable: an unsigned manifest cannot be rendered.
They give Consumer Duty MI a stable join key from rendered fragment to outcome.
They make kill switches first-class — every fragment can be disabled without a deploy.
They constrain the model: it can only emit IDs that exist in a manifest the gateway will accept.

7. Interaction patterns
Not every interaction inside an embedded app should be exposed to the model. Visibility is a security and Consumer Duty decision, not a default.
7.1 The three patterns


7.2 Visibility classification

7.3 The redaction contract
Every event returned to the model passes through a redaction step at the gateway. Free text is stripped or replaced with a token. Numeric values above a configurable threshold are bucketed. Vulnerability and complaints flags are removed entirely; they continue down the bank's existing pipeline.

8. Authentication and authorisation
8.1 Three trust modes


8.2 OAuth flow

8.3 Step-up: intent-bound elevation
Step-up tokens are bound to a single intent and a single fragment instance. A token elevated to freeze card 1234 cannot be replayed to change an address. The binding is enforced at the gateway by verifying the intent claim against the tool invocation.

8.4 What lives where
Identity, SCA decisions, and exemption logic: bank IdP. Not the AI host.
Refresh tokens: server-side at the gateway, never returned to the AI host.
Access tokens: short-lived (5–10 minutes), audience-pinned, scope-pinned.
Consent receipts: stored against the customer record, surfaced in DSAR responses.

9. MCP Gateway: the control plane
The gateway is the single point at which the bank takes ownership of a request. It sits behind Apigee X for edge concerns (TLS, WAF, baseline rate limits) and runs as a Quarkus or Go service on GKE with an Istio sidecar for internal mTLS.
9.1 Responsibilities
Validate OAuth bearer; introspect; verify audience, scope, intent, expiry.
Validate inbound JSON-RPC payloads against the registered tool schema (Zod or equivalent).
Apply prompt-injection filters to free-text inputs that originate from the model side.
Enforce per-tool rate limits, per-customer quotas, and concurrency caps.
Enforce idempotency via Idempotency-Key header; deduplicate writes within a configurable window.
Emit structured audit events to Pub/Sub for every invocation, with redaction applied.
Honour kill switches for individual tools, fragments and customer cohorts.
Bind sessions to the existing X-LBG-Session header so that conversational and app channels share stickiness without Envoy cookie collisions.
9.2 Tool descriptor
Every tool registered with the gateway carries a descriptor that drives validation, policy, and observability. The descriptor is the contract; the implementation is just an implementation.

9.3 Idempotency that actually works
Every write tool requires an Idempotency-Key generated by the iframe (not the model) and bound to a fragment instance. The gateway stores a request fingerprint in Firestore with TTL; duplicate keys return the original response without reaching the domain. This is the defence against the model retrying a write because it 'wasn't sure' the previous attempt succeeded.

10. Security architecture
10.1 First principle


10.2 Controls baseline


10.3 Threat model (abridged STRIDE)

10.4 Prompt injection: the specific banking framing
Retrieved content in a banking context is plentiful and adversarially controlled in places we don't fully appreciate: merchant descriptors set by acquirers, uploaded dispute evidence, CRM free-text notes, statement narratives. The architectural answer is unambiguous. None of this content may modify system prompts, tool selection logic, scopes, or authorisation. The model receives this content as data inside a structured envelope; the gateway strips control sequences and quote markers; and any model output that nonetheless references an unexpected tool or scope is rejected before it leaves the gateway.

11. State, observability and operational resilience
11.1 State types


11.2 Event sourcing for customer-affecting actions
Every write produces an immutable event with: correlation ID, customer ID, fragment ID and version, tool ID and version, idempotency key, SCA AMR claim, decision outcome, downstream system references, and Consumer Duty outcome tag. Replay is supported without invoking the model — the bank can reconstruct what happened from its own systems alone.
11.3 Observability
End-to-end trace from MCP tool invocation through gateway, domain service, and core systems via OpenTelemetry.
Per-tool SLOs declared in the tool descriptor and tracked in Cloud Monitoring; error budgets feed change governance.
Conversation-level success metrics (intent resolved, drop-off, fragment completion) joined with Consumer Duty outcome MI in BigQuery.
Anomaly detection on tool invocation patterns — sudden spikes, unusual scope combinations, low-confidence model rationales — exported to Chronicle SIEM.
11.4 Operational resilience
The conversational channel is not, in itself, an Important Business Service. It is a channel that fronts existing IBSs (servicing, disputes, payments).
Graceful degradation: if the AI host or MCP gateway is unavailable, the customer is steered to the app or contact centre; the gateway returns a structured 'degraded' response that the model surfaces clearly.
Severe-but-plausible scenarios documented and tested: AI host outage, identity provider partial outage, fragment registry unavailable, mass prompt-injection attempt.
Concentration risk on the AI host is treated as ICT third-party risk; the architecture supports multiple hosts (ChatGPT, Claude, others) with the same MCP surface.

12. Use cases
Each use case below names the fragments involved, the tools they call, the auth posture, and any Consumer Duty considerations that change the design.
12.1 Customer servicing (read)
Fragments: statement.viewer, txn.list, card.status
Tools: transactions.read, statements.read, cards.read
Auth: OAuth read scopes; no step-up
Consumer Duty: consumer understanding — generative explanations must be tested and traceable to source content
12.2 Card controls
Fragments: card.freeze, card.travel
Tools: cards.freeze, cards.travel-notice
Auth: step-up via WebAuthn for freeze; risk-based for travel notice
Consumer Duty: foreseeable harm — unfreeze flow must be equally accessible to avoid stranding
12.3 Disputes and chargebacks
Fragments: txn.dispute, evidence.upload
Tools: disputes.create, disputes.append-evidence, disputes.status
Auth: step-up for create; read scopes for status
Consumer Duty: customer support — clear next steps and timelines; no false reassurance about likely outcome
12.4 Financial difficulty
Fragments: payment.support, affordability.capture, repayment.plan
Tools: affordability.start, repayment.options.list, support.case.create
Auth: full SCA; vulnerability triage handled by colleagues, not the model
Consumer Duty: this is the highest-stakes category. The model should orient, not decide. Any indicator of vulnerability silently routes to a human; the model is told only that 'a colleague will help', without seeing the indicator itself.



12.5 Complaints
Fragments: complaint.capture, complaint.timeline
Tools: complaints.create, complaints.status
Auth: authenticated; step-up not required for capture
Consumer Duty: timeliness and clarity; FCA DISP rules apply unchanged
12.6 Agent assist (recommended starting point)
Fragments: customer.summary, next.best.action, policy.lookup, response.draft
Tools: read scopes against operational systems; no customer-facing writes
Auth: colleague SSO; full audit
Why first: colleague channel has lower regulatory exposure, faster feedback loops, and provides the evidence base needed to expand into customer-facing journeys.

13. Delivery roadmap


14. Technology stack


15. Architectural principles


Or, condensed:
The iframe renders the button. The bank decides whether the button works.

16. Open questions and decisions to take
Which AI hosts are in scope for phase 2, and what is the procurement / DPIA position on each?
Where is the canonical fragment registry hosted — Cloud Storage with signed manifests, or a dedicated service?
How is consent for the AI channel captured and surfaced in DSARs? Is a new consent receipt schema needed, or does the existing channel-consent model extend?
What is the comprehension-testing methodology for generative explanations, and which Consumer Duty MI joins them to outcomes?
Do we want a single MCP Gateway service, or one per domain with a thin façade? (Recommendation: single gateway, domain routing internal.)
How do we keep prompt-injection telemetry useful without overwhelming Chronicle? What is the triage runbook?
What is the rollback plan if a fragment manifest is found to be miscertified for accessibility after deployment?

17. References
OpenAI Apps SDK — https://developers.openai.com/apps-sdk/
OpenAI MCP Apps in ChatGPT — https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
OpenAI Apps SDK Auth — https://developers.openai.com/apps-sdk/build/auth
OpenAI ChatGPT UI Components — https://developers.openai.com/apps-sdk/build/chatgpt-ui
Model Context Protocol specification — https://modelcontextprotocol.io/
MCP Authorization specification — https://modelcontextprotocol.io/specification/draft/basic/authorization
MCP Apps blog post — https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
PCI DSS v4.0 — https://www.pcisecuritystandards.org/standards/pci-dss/
FCA Consumer Duty (PRIN 12) — https://www.fca.org.uk/firms/consumer-duty
FCA / PRA Operational Resilience — https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience
PRA SS1/21 Operational Resilience — https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-ss
FCA DISP (complaints handling) — https://www.handbook.fca.org.uk/handbook/DISP/
ICO guidance on AI and data protection — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/
Architecture Review Updates — v1.2
This revision updates the architecture around a domain-oriented Card Hub model using embedded MCP Apps, trusted iframe shells, composable capability domains, and adaptive conversational orchestration.
Updated Architectural Direction
The platform should be treated as an AI-hosted composable banking application platform rather than a generic assistant with tools.
Preferred domain structure:
• Rewards Hub
• Spend Insights Hub
• Merchant Offers Hub
• Travel Hub
• Statements Hub
• Disputes Hub
• Card Controls Hub
Embedded Card Hub Architecture

The sandboxed iframe acts as a governed banking micro-frontend shell containing trusted fragments and workflows.
Interaction Visibility Model

Interaction visibility is explicitly segmented between iframe-local state, host-visible orchestration events, and model-visible conversational context.
Domain Capability Runtime
The MCP Gateway routes requests into domain capability runtimes rather than a single monolithic orchestration layer. Each domain owns its own policies, fragments, audit controls, observability, and capability scopes.
Conversation Memory Boundaries
Conversation memory is segmented into global memory, domain memory, workflow memory, and ephemeral session memory to minimise unnecessary data exposure between banking domains.
Partner Integration Isolation
External travel, loyalty, and merchant partners are isolated behind partner integration boundaries with scoped tokens, consent enforcement, rate limiting, and outage containment.
Updated Strategic Position
The conversational layer is not a chatbot attached to banking APIs. It is a governed composable application platform hosted inside AI-native runtimes.