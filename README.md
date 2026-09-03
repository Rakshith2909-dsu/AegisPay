# AegisPay — Enterprise Payment Intelligence Platform

> A full-stack payment operations and fraud-intelligence platform designed to simulate the operational lifecycle of modern digital payments — from transaction creation and risk evaluation to investigation, incident management and recovery.

AegisPay combines **payment operations, deterministic fraud detection, AI-assisted analysis, real-time event streaming, incident management, recovery workflows and operational analytics** into a single enterprise-style console.

The project is built with **React, Node.js/Express and MongoDB**, with a REST API for transactional operations and **Server-Sent Events (SSE)** for real-time operational updates.

---

## Final release

This release combines payment-operations workflows with intelligence, security and enterprise operations.

### Payment operations

- New Payment with bank selection, amount and payment method
- Deterministic fraud scoring with risk levels
- Live Payments and transaction details
- Blocked-payment investigation and re-investigation
- Approve & Transfer / Block / Recover workflows
- Recovery history and investigation history
- Real-time Server-Sent Events (SSE)

### Phase 5 — Intelligence & Security

- Advanced operational analytics
- Customer and merchant risk profiles
- Risk distribution and payment-method performance
- Security posture and threat alerts
- Auditable transaction activity
- AI-assisted fraud architecture with deterministic guardrails

### Phase 6 — Enterprise Operations

- Executive analytics
- Exportable payment reports (CSV)
- System Health / runtime diagnostics
- Service matrix
- Administration control center
- Responsive enterprise operations UI

### Counterfactual Payment Intelligence

- Payment Time Machine for transaction replay
- Alternate fraud-policy decision scenarios
- Failure containment scenarios for timeouts, duplicates and recovery failures
- Protected-amount and customer-friction impact analysis
- Incident SLA state and operational timeline replay
- Idempotency-Key protection against duplicate payment creation

### Merchant Trust Intelligence

- Merchant Trust Passport calculated from live ledger data
- Transparent trust score from `0–100`
- Reliability, risk exposure and recovery performance signals
- Trusted, Watch and Review operating tiers

---

# Why AegisPay?

Payment systems do more than move money.

A production-grade payment platform also needs to answer:

- Is this transaction legitimate?
- Why was a transaction considered risky?
- What should happen when fraud is detected?
- How does an operations team investigate it?
- Can the transaction lifecycle be audited?
- How can operators respond to incidents in real time?
- What happens when a transaction needs to be recovered?
- How can risk and operational trends be monitored at scale?

AegisPay was built around this operational problem.

Instead of treating fraud detection as an isolated scoring function, the platform connects **payment processing → risk intelligence → incident response → investigation → recovery → analytics** into one workflow.

---

# Core Capabilities

### Payment Operations

- Create simulated payment transactions
- Bank selection
- Payment method selection
- Amount validation
- Persistent transaction ledger
- Live payment monitoring
- Transaction detail views
- Payment status management

### Fraud Intelligence

AegisPay uses a deterministic fraud engine that evaluates transaction behaviour and produces:

- Risk score from `0–100`
- Risk level
- Fraud decision
- Confidence score
- Explainable risk reasons
- Risk indicators

Risk levels:

| Score | Risk Level | Decision |
|------:|------------|----------|
| 0–34 | Low | APPROVE |
| 35–74 | Medium | REVIEW |
| 75–84 | High | HOLD |
| 85–100 | Critical | BLOCK |

This makes the fraud decision explainable instead of relying on an opaque binary prediction.

---

# AI-Assisted Fraud Architecture

AegisPay also includes an **optional external AI fraud-analysis layer**.

The architecture separates:

```text
Deterministic Fraud Engine
          ↓
     Risk Decision
          ↓
 Optional AI Second Opinion
          ↓
 Guardrails / Final Operational Decision
```

The deterministic engine acts as the safety layer.

The external AI component can provide additional contextual analysis, but it is not allowed to silently downgrade a transaction that has already crossed a deterministic high-risk threshold.

This design intentionally separates:

- deterministic controls
- explainability
- AI-assisted reasoning
- operational decisioning

The external AI integration is optional and can be disabled for local demonstrations.

---

# Real-Time Fraud Alerts

AegisPay uses **Server-Sent Events (SSE)** to push important backend events to the frontend.

For example:

```text
Payment Created
      ↓
Fraud Analysis
      ↓
High/Critical Risk
      ↓
Incident / Fraud Event
      ↓
SSE Event
      ↓
Operations Dashboard
      ↓
Real-Time Alert
```

This allows the operations console to react to backend events without relying on aggressive client-side polling.

---

# Incident Management

High-risk transactions can move into an operational incident workflow.

Operators can:

- View incidents
- Inspect transaction details
- Review fraud reasons
- Investigate transactions
- Re-investigate eligible transactions
- Approve transactions
- Block transactions
- Review investigation history
- Track incident state

The objective is to demonstrate the transition from **automated risk detection to human operational response**.

---

# Recovery Engine

AegisPay also models the post-detection recovery lifecycle.

Operators can:

- Identify eligible transactions
- Review recovery information
- Initiate recovery
- Track recovery attempts
- Record recovery history
- Track transfer/recovery status
- Receive recovery-related real-time events

This extends the project beyond simple fraud scoring into a broader payment-operations workflow.

---

# Enterprise Operations Console

| Module | Purpose |
|--------|---------|
| Dashboard | Executive payment and fraud overview |
| Live Payments | Real-time transaction monitoring |
| Incidents | Fraud and operational incident management |
| Fraud AI | Fraud analysis and risk intelligence |
| Recovery Engine | Transaction recovery workflows |
| Merchants | Merchant-oriented operational views |
| Analytics | Payment and risk analytics |
| Risk Profiles | Customer and merchant risk intelligence |
| Security Center | Security posture and threat monitoring |
| Reports | Operational reporting and CSV export |
| System Health | Runtime and service diagnostics |
| Admin Center | Operational governance controls |

---

# Architecture

```text
                         ┌─────────────────────┐
                         │      React UI       │
                         │   Vite Frontend     │
                         └──────────┬──────────┘
                                    │
                         REST API + SSE
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Node.js / Express │
                         │     API Server      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌────────────────┐  ┌───────────────┐  ┌────────────────┐
        │ Payment        │  │ Fraud Engine  │  │ Enterprise     │
        │ Operations     │  │               │  │ Operations     │
        └────────────────┘  └───────┬───────┘  └────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Optional External   │
                         │ AI Analysis Layer   │
                         └─────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      MongoDB        │
                         │ Persistent Ledger   │
                         └─────────────────────┘
```

---

# Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Server-Sent Events client

### Backend

- Node.js
- Express
- REST APIs
- Server-Sent Events
- Mongoose

### Database

- MongoDB
- Persistent payment ledger
- Investigation history
- Incident state
- Recovery state
- Transaction analytics

### AI

- Optional external AI integration
- Deterministic fraud engine as the primary guardrail

---

# Payment Lifecycle

A typical AegisPay transaction follows this lifecycle:

```text
Create Payment
      │
      ▼
Persist Transaction
      │
      ▼
Fraud Analysis
      │
      ├──────── Low Risk ────────► APPROVE
      │
      ├────── Medium Risk ───────► REVIEW
      │
      ├──────── High Risk ───────► HOLD
      │
      └───── Critical Risk ──────► BLOCK
                                      │
                                      ▼
                                  INCIDENT
                                      │
                              ┌───────┴────────┐
                              ▼                ▼
                         Investigate       Re-investigate
                              │                │
                              └───────┬────────┘
                                      ▼
                             Operational Decision
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                     APPROVE                    BLOCK
                         │
                         ▼
                      TRANSFER
                         │
                         ▼
                     RECOVERY
```

---

# API Architecture

The backend exposes REST APIs for payment and operational workflows.

### Enterprise APIs

```text
GET /api/enterprise/overview
GET /api/enterprise/health
```

### Payment Operations

```text
GET  /api/payments
GET  /api/payments/:id
POST /api/payments
POST /api/payments/:id/investigate
POST /api/payments/:id/approve
POST /api/payments/:id/block
POST /api/payments/:id/recover
GET  /api/payments/:id/time-machine
POST /api/payments/:id/simulate
POST /api/webhooks/simulate
```

`POST /api/payments` accepts an optional `Idempotency-Key` header. Reusing the same key returns the original payment instead of creating a duplicate.

The simulator endpoints support `timeout` and `recovery_failure` scenarios, plus webhook events such as `payment.authorized`, `payment.failed`, `payment.captured` and `refund.processed`. Each simulation is recorded in payment history and broadcast through SSE.

The Time Machine also includes Route Intelligence: it compares simulated payment routes by success rate, latency, fraud exposure and customer impact, then recommends the best reliability-risk balance for the transaction.

### Operational Data

```text
GET /api/fraud
GET /api/activity
GET /api/incidents
```

### Real-Time Events

```text
GET /api/events
```

The SSE endpoint is used for real-time operational events such as fraud analysis, payment recovery and transfer events.

---

# Data & Persistence

MongoDB is used as the persistent transaction ledger.

The payment model maintains operational information including:

- Payment details
- Amount
- Bank
- Payment method
- Fraud score
- Fraud level
- Fraud decision
- Confidence
- Risk reasons
- Investigation state
- Investigation history
- Incident state
- Recovery state
- Recovery attempts
- Transfer state

This allows the application to reconstruct the operational history of a transaction instead of treating each request as an isolated event.

---

# Security Considerations

AegisPay is designed as a **safe simulated payment-operations environment**.

It does not process real customer funds.

Security-related design considerations include:

- Environment variables for credentials
- `.env` excluded from source control
- `.env.example` templates
- Deterministic fraud guardrails
- Auditable investigation history
- Operational activity tracking
- Security Center
- System health monitoring
- No production payment credentials stored in the repository

> **Never commit a real `.env` file, database credential or API key to GitHub.**

---

# Running Locally

## Prerequisites

- Node.js
- npm
- MongoDB instance
- Git

---

## 1. Clone the repository

```text
git clone https://github.com/Rakshith2909-dsu/AegisPay.git
cd AegisPay
```

---

## 2. Configure the backend

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Add your own MongoDB connection string and any optional AI configuration.

Example:

```text
MONGODB_URI=your_mongodb_connection_string
OPENAI_FRAUD_AI_ENABLED=false
OPENAI_API_KEY=your_api_key_if_enabled
```

Do not commit this file.

---

## 3. Start the backend

```text
cd backend
npm install
npm start
```

The backend normally runs on:

```text
http://localhost:5000
```

To run the backend fraud-engine tests:

```text
cd backend
npm test
```

---

## 4. Start the frontend

Open another terminal:

```text
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open the Vite URL, normally:

```text
http://localhost:5173
```

During local development, Vite proxies `/api` requests to the backend on port `5000`, so the frontend and backend can run together without browser cross-origin issues.

If the backend is hosted somewhere else, configure:

```text
VITE_API_URL=http://localhost:5000
```

---

# Suggested Demo Flow

### 1. Dashboard

Show:

- Transaction volume
- Success rate
- Fraud risk
- Operational activity
- Real-time status

### 2. Create a Payment

- Select a bank
- Select payment method
- Enter amount
- Create transaction

### 3. Demonstrate Fraud Intelligence

Create a suspicious transaction and show:

- Risk score
- Risk level
- Decision
- Confidence
- Explainable fraud reasons

### 4. Demonstrate Incident Management

Open:

```text
Incidents → View
```

Then demonstrate:

- Investigation
- Re-investigation
- Operational decision

### 5. Demonstrate Real-Time Alerts

Trigger a high-risk transaction and show the fraud alert appearing in the operations console.

### 6. Demonstrate Recovery

Open:

```text
Recovery Engine
```

Select an eligible transaction and demonstrate the recovery workflow.

### 7. Demonstrate Enterprise Modules

Show:

- Analytics
- Risk Profiles
- Security Center
- Reports
- System Health
- Admin Center

### 8. Demonstrate Merchant Trust Intelligence

Open **Merchants** and explain how the Merchant Trust Passport turns raw payment history into an interpretable operating signal using reliability, risk exposure and recovery outcomes.

---

# Engineering Decisions

## Why deterministic fraud scoring?

For an operational payment system, explainability and predictable behaviour are important.

A deterministic scoring layer provides:

- Consistent decisions
- Explainable risk factors
- Reproducible demonstrations
- Safety guardrails
- Easier debugging

AI can then act as an additional analysis layer rather than becoming the only decision-maker.

## Why Server-Sent Events?

The application primarily requires **server → client event delivery**.

SSE is therefore a natural fit for:

- Fraud alerts
- Payment events
- Recovery events
- Operational activity

REST remains responsible for commands and data retrieval.

This keeps the architecture simple while providing real-time behaviour.

## Why MongoDB?

Payment operations generate evolving operational state.

MongoDB provides a flexible document model suitable for storing:

- Transaction information
- Fraud analysis
- Investigation history
- Incident state
- Recovery information
- Operational metadata

---

# Current Scope

AegisPay is a **payment-operations and fraud-intelligence prototype**, not a production payment gateway.

The application simulates payment workflows and demonstrates the engineering patterns surrounding payment operations.

It does not connect to banking rails or move real customer funds.

---

# Roadmap

Potential future improvements include:

- Role-based access control
- Authentication and SSO
- Multi-tenant merchant isolation
- Webhook ingestion
- Idempotency keys
- Distributed event processing
- Redis-backed real-time infrastructure
- Queue-based fraud processing
- Model evaluation pipelines
- Feature-store integration
- Production observability
- OpenTelemetry tracing
- Automated test coverage
- CI/CD pipelines
- Kubernetes deployment
- Cloud-native infrastructure
- Advanced ML fraud models

---

# Project Structure

```text
AegisPay/
│
├── backend/
│   ├── models/
│   │   └── Payment.js
│   ├── test/
│   │   └── fraudEngine.test.js
│   ├── externalFraudAI.js
│   ├── fraudEngine.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── .env.example
│
├── README.md
├── FINAL_RELEASE.md
└── .gitignore
```

---

# Final Note

AegisPay was designed around a simple principle:

> **A payment platform should not stop at transaction processing — it should understand risk, explain decisions and give operations teams the tools to respond.**

The project brings those capabilities together into one full-stack operational workflow:

```text
Payment
   ↓
Risk Intelligence
   ↓
Fraud Decision
   ↓
Real-Time Alert
   ↓
Incident
   ↓
Investigation
   ↓
Operational Action
   ↓
Recovery
   ↓
Analytics & Audit
```

**AegisPay — Payment operations with intelligence built into the workflow.**
