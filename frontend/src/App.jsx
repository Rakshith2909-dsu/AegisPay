import React from "react";
import "./App.css";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Shield,
  FileText,
  Settings,
  ActivitySquare,
  Database,
  Server,
  Download,
  SearchCheck,
  LockKeyhole,
  Gauge,
  CircleDollarSign,
  Network,
  ClipboardCheck,
  BellRing,
  X,
  XCircle,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

const BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Yes Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Federal Bank",
  "IDFC FIRST Bank",
  "AU Small Finance Bank",
  "Other Bank",
];

/* =========================================================
   HELPERS
   ========================================================= */

function money(value, compact = false) {
  const amount = Number(value || 0);
  if (compact && Math.abs(amount) >= 1_000_000_000) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function riskClass(level) {
  return (level || "low").toString().toLowerCase();
}

function statusClass(status) {
  return (status || "unknown")
    .toString()
    .toLowerCase()
    .replaceAll(" ", "-");
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [page, setPage] = useState("Dashboard");

  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fraud, setFraud] = useState(null);
  const [activity, setActivity] = useState([]);
  const [enterprise, setEnterprise] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [adminConfig, setAdminConfig] = useState({
    realtimeMonitoring: true,
    aiGuardrails: true,
    automaticIncidentCreation: true,
    auditLogging: true,
  });

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [timeMachinePayment, setTimeMachinePayment] = useState("");
  const [timeMachineData, setTimeMachineData] = useState(null);
  const [timeMachineLoading, setTimeMachineLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const [showNewPayment, setShowNewPayment] = useState(false);
  const [notice, setNotice] = useState("");
  const [fraudUnread, setFraudUnread] = useState(0);
  const [fraudAlert, setFraudAlert] = useState(null);

  /* REAL-TIME SSE STATE */

  const [realtimeStatus, setRealtimeStatus] =
    useState("connected");

  const [lastRealtimeEvent, setLastRealtimeEvent] =
    useState(null);

  const [form, setForm] = useState({
    customer: "",
    merchant: "",
    amount: "",
    bank: "",
    method: "UPI",
    paymentType: "real",
  });

  /* =========================================================
     API REQUEST
     ========================================================= */

  async function request(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, options);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  /* =========================================================
     LOAD ALL DATA
     ========================================================= */

  async function loadAll(showLoading = true, allowStartupRetry = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const [
        paymentsResponse,
        fraudResponse,
        activityResponse,
      ] = await Promise.all([
        request("/payments"),
        request("/fraud"),
        request("/activity"),
      ]);

      setPayments(
        paymentsResponse.data?.transactions || []
      );

      setAnalytics(
        paymentsResponse.data?.analytics || null
      );

      setFraud(fraudResponse.data || null);

      setActivity(activityResponse.data || []);
      setRealtimeStatus("connected");
    } catch (error) {
      console.error(error);

      setNotice(
        `Backend error: ${error.message}`
      );

      if (allowStartupRetry) {
        window.setTimeout(() => loadAll(false, false), 1200);
      }
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     ENTERPRISE / PHASE 5-6 DATA
     ========================================================= */

  async function loadEnterprise() {
    try {
      const [overviewResponse, healthResponse] =
        await Promise.all([
          request("/enterprise/overview"),
          request("/enterprise/health"),
        ]);

      setEnterprise(overviewResponse.data || null);
      setSystemHealth(healthResponse.data || null);
    } catch (error) {
      console.error("[Enterprise] Load failed:", error);
    }
  }

  async function refreshData() {
    if (refreshing) return;

    setRefreshing(true);
    setSearch("");
    setStatusFilter("all");
    setRiskFilter("all");

    try {
      await Promise.all([
        loadAll(),
        loadEnterprise(),
      ]);
      setNotice("Dashboard data refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function runTimeMachine(paymentId = timeMachinePayment) {
    if (!paymentId) return;

    setTimeMachinePayment(paymentId);
    setTimeMachineLoading(true);

    try {
      const response = await request(`/payments/${paymentId}/time-machine`);
      setTimeMachineData(response.data || null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setTimeMachineLoading(false);
    }
  }

  async function simulateScenario(scenario) {
    if (!timeMachinePayment) return;

    try {
      const response = await request(`/payments/${timeMachinePayment}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      setNotice(response.message);
      await loadAll(false);
      await runTimeMachine(timeMachinePayment);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function simulateWebhook(eventType) {
    if (!timeMachinePayment) return;

    try {
      const response = await request("/webhooks/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: timeMachinePayment, eventType }),
      });
      setNotice(response.message);
      await runTimeMachine(timeMachinePayment);
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    loadAll();
    loadEnterprise();

    const startupRetry = window.setTimeout(() => {
      loadAll(false, false);
      loadEnterprise();
    }, 1500);

    return () => window.clearTimeout(startupRetry);
  }, []);

  /* =========================================================
     REAL-TIME SERVER-SENT EVENTS
     
     IMPORTANT:
     NO 5-SECOND POLLING HERE.
     The backend pushes events through /api/events.
     ========================================================= */

  useEffect(() => {
    console.log(
      "[SSE] Connecting to:",
      `${API}/events`
    );

    const eventSource = new EventSource(
      `${API}/events`
    );

    const handleEvent = (event) => {
      try {
        if (!event.data) return;

        const payload = JSON.parse(event.data);

        console.log(
          "[SSE] Event received:",
          payload
        );

        if (payload.type === "CONNECTED") {
          setRealtimeStatus("connected");
        }

        setLastRealtimeEvent(payload);

        // Surface newly detected elevated fraud immediately.
        // Reuses the existing SSE stream; no polling is introduced.
        if (payload.type === "FRAUD_ANALYZED") {
          const eventData = payload.data || {};
          const level = String(eventData.fraudLevel || "low").toLowerCase();
          const score = Number(eventData.fraudScore || 0);
          const isFraud = eventData.fraudResult === "fraud";
          const isElevated = ["high", "critical"].includes(level) || isFraud || score >= 60;

          if (isElevated) {
            setFraudAlert({
              id: eventData.paymentId || "Payment",
              level,
              score,
              message:
                level === "critical" || score >= 85
                  ? "Critical fraud detected — payment blocked"
                  : "Fraud detected — payment requires review",
            });

            if (page !== "Fraud AI") {
              setFraudUnread((count) => count + 1);
            }
          }
        }

        loadAll(false);
        loadEnterprise();
      } catch (error) {
        console.error(
          "[SSE] Failed to process event:",
          error
        );
      }
    };

    eventSource.onopen = () => {
      console.log("[SSE] Frontend connected");
      setRealtimeStatus("connected");
    };

    // Supports both default SSE messages and named events.
    eventSource.onmessage = handleEvent;
    [
      "PAYMENT_CREATED",
      "FRAUD_ANALYZED",
      "EXTERNAL_AI_ANALYZED",
      "INCIDENT_CREATED",
      "INVESTIGATION_STARTED",
      "PAYMENT_APPROVED",
      "PAYMENT_BLOCKED",
      "PAYMENT_RECOVERED",
      "AMOUNT_TRANSFERRED",
      "PAYMENT_DELETED",
    ].forEach((type) => {
      eventSource.addEventListener(type, handleEvent);
    });

    eventSource.onerror = (error) => {
      console.warn(
        "[SSE] Connection lost/reconnecting",
        error
      );
      setRealtimeStatus("reconnecting");
    };

    const connectionCheck = window.setTimeout(() => {
      if (eventSource.readyState === EventSource.OPEN) {
        setRealtimeStatus("connected");
      }
    }, 1000);

    return () => {
      console.log("[SSE] Frontend disconnected");
      window.clearTimeout(connectionCheck);
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (page === "Fraud AI") setFraudUnread(0);
  }, [page]);

  useEffect(() => {
    if (!fraudAlert) return;
    const timer = window.setTimeout(() => setFraudAlert(null), 6500);
    return () => window.clearTimeout(timer);
  }, [fraudAlert]);

  /* =========================================================
     CREATE PAYMENT
     ========================================================= */

  async function createPayment(event) {
    event.preventDefault();

    try {
      await request("/payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      setShowNewPayment(false);

      setForm({
        customer: "",
        merchant: "",
        amount: "",
        bank: "",
        method: "UPI",
        paymentType: "real",
      });

      setNotice(
        "Payment created successfully"
      );

      await loadAll(false);
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     OPEN PAYMENT
     ========================================================= */

  async function openPayment(id) {
    try {
      const response = await request(
        `/payments/${id}`
      );

      setSelectedPayment(response.data);
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     PAYMENT ACTION
     ========================================================= */

  async function paymentAction(id, action) {
    try {
      const response = await request(
        `/payments/${id}/${action}`,
        {
          method: "POST",
        }
      );

      setSelectedPayment(response.data);

      setNotice(response.message);

      await loadAll(false);
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     RECOVER PAYMENT
     ========================================================= */

  async function recoverPayment(id) {
    try {
      const response = await request(
        `/payments/${id}/recover`,
        {
          method: "POST",
        }
      );

      setSelectedPayment(response.data);

      setNotice(response.message);

      await loadAll(false);
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     DELETE PAYMENT
     ========================================================= */

  async function deletePayment(id) {
    const confirmed = window.confirm(
      "Delete this payment?"
    );

    if (!confirmed) return;

    try {
      await request(`/payments/${id}`, {
        method: "DELETE",
      });

      setSelectedPayment(null);

      await loadAll(false);

      setNotice("Payment deleted");
    } catch (error) {
      setNotice(error.message);
    }
  }

  /* =========================================================
     FILTERS
     ========================================================= */

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchable =
        `${payment.id} ${payment.customer} ${payment.merchant} ${payment.bank}`
          .toLowerCase();

      const matchesSearch =
        searchable.includes(
          search.toLowerCase()
        );

      const matchesStatus =
        statusFilter === "all" ||
        payment.status === statusFilter;

      const matchesRisk =
        riskFilter === "all" ||
        payment.fraudLevel === riskFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRisk
      );
    });
  }, [
    payments,
    search,
    statusFilter,
    riskFilter,
  ]);

  /* =========================================================
     QUEUES
     ========================================================= */

  const incidents = payments.filter((payment) => {
    const activeStatus = ["held", "blocked", "investigating", "failed", "pending"].includes(payment.status);
    const elevatedRisk = ["medium", "high", "critical"].includes(payment.fraudLevel);
    return (payment.incidentCreated || elevatedRisk || activeStatus) && !["approved", "recovered", "success"].includes(payment.status);
  });

  const highRisk = payments.filter(
    (payment) =>
      payment.fraudLevel === "high" ||
      payment.fraudLevel === "critical"
  );

  const fraudQueue = payments.filter(
    (payment) =>
      payment.fraudLevel === "medium" ||
      payment.fraudLevel === "high" ||
      payment.fraudLevel === "critical"
  );

  const failed = payments.filter(
    (payment) =>
      payment.status === "failed"
  );

  const pending = payments.filter(
    (payment) =>
      payment.status === "pending" ||
      payment.status === "held" ||
      payment.status === "investigating"
  );

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const nav = [
    {
      name: "Dashboard",
      icon: BarChart3,
    },
    {
      name: "Live Payments",
      icon: Activity,
    },
    {
      name: "Incidents",
      icon: AlertTriangle,
    },
    {
      name: "Fraud AI",
      icon: ShieldAlert,
    },
    {
      name: "Payment Time Machine",
      icon: Gauge,
    },
    {
      name: "Recovery Engine",
      icon: RefreshCw,
    },
    {
      name: "Merchants",
      icon: Building2,
    },
    {
      name: "Analytics",
      icon: TrendingUp,
    },
    {
      name: "Risk Profiles",
      icon: Users,
    },
    {
      name: "Security Center",
      icon: Shield,
    },
    {
      name: "Reports",
      icon: FileText,
    },
    {
      name: "System Health",
      icon: ActivitySquare,
    },
    {
      name: "Admin Center",
      icon: Settings,
    },
  ];

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="app-shell">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>

          <div>
            <strong>AegisPay</strong>

            <span>
              Payment Intelligence
            </span>
          </div>

        </div>

        <nav className="sidebar-nav">

          {nav.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  page === item.name
                    ? "nav-button active"
                    : "nav-button"
                }
                onClick={() => {
                  setPage(item.name);
                  if (item.name === "Fraud AI") setFraudUnread(0);
                }}
              >

                <Icon size={18} />

                <span>
                  {item.name}
                </span>

                {item.name === "Incidents" &&
                  highRisk.length > 0 && (
                    <b>
                      {highRisk.length}
                    </b>
                  )}

                {item.name === "Fraud AI" &&
                  fraudUnread > 0 && (
                    <b className="fraud-nav-badge">
                      {fraudUnread > 99 ? "99+" : fraudUnread}
                    </b>
                  )}

              </button>
            );
          })}

        </nav>

        <div className="system-card">

          <span className="online-dot" />

          <div>
            <strong>
              Systems Operational
            </strong>

            <small>
              MongoDB connected
            </small>
          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="main-content">

        <header className="topbar">

          <div className="topbar-context">

            <div className="topbar-brand-dot">
              <ShieldCheck size={16} />
            </div>

            <div>
              <p className="eyebrow">AEGISPAY / OPERATIONS</p>
              <strong>Payment intelligence console</strong>
            </div>

          </div>

          <div className="header-actions">

            {/* REAL-TIME STATUS */}

            <div
              className={`realtime-indicator ${realtimeStatus}`}
              title={
                lastRealtimeEvent
                  ? `Last event: ${
                      lastRealtimeEvent.type ||
                      "EVENT"
                    }`
                  : "AegisPay real-time connection"
              }
            >

              <span className="realtime-dot" />

              <span>
                {realtimeStatus ===
                "connected"
                  ? "Live"
                  : realtimeStatus ===
                    "reconnecting"
                  ? "Reconnecting"
                  : "Connecting"}
              </span>

            </div>

            <button
              className="secondary-button"
              onClick={refreshData}
              disabled={refreshing}
              aria-busy={refreshing}
            >

              <RefreshCw
                size={17}
                className={refreshing ? "refresh-icon spinning" : "refresh-icon"}
              />

              {refreshing ? "Refreshing..." : "Refresh"}

            </button>

            <button
              className="primary-button"
              onClick={() =>
                setShowNewPayment(true)
              }
            >
              + New Payment
            </button>

          </div>

        </header>

        {/* ===================================================
            NOTICE
            =================================================== */}

        {notice && (
          <div className="notice">

            <span>
              {notice}
            </span>

            <button
              onClick={() =>
                setNotice("")
              }
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}

        {fraudAlert && (
          <div
            className={`fraud-alert-toast ${
              fraudAlert.level === "critical" || fraudAlert.score >= 85
                ? "critical"
                : "high"
            }`}
            role="alert"
          >
            <div className="fraud-alert-icon">
              <ShieldAlert size={18} />
            </div>
            <div className="fraud-alert-copy">
              <strong>{fraudAlert.message}</strong>
              <span>{fraudAlert.id} · Risk score {fraudAlert.score}/100</span>
            </div>
            <button
              className="fraud-alert-close"
              onClick={() => setFraudAlert(null)}
              aria-label="Dismiss fraud alert"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="page-content">

          {page === "Dashboard" && (
            <Dashboard
              analytics={analytics}
              fraud={fraud}
              payments={payments}
              onSelect={openPayment}
              onNavigate={setPage}
            />
          )}

          {page === "Live Payments" && (
            <LivePayments
              payments={filteredPayments}
              total={payments.length}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={
                setStatusFilter
              }
              riskFilter={riskFilter}
              setRiskFilter={
                setRiskFilter
              }
              onSelect={openPayment}
              onDelete={deletePayment}
              onNew={() =>
                setShowNewPayment(true)
              }
            />
          )}

          {page === "Incidents" && (
            <Incidents
              payments={incidents}
              onSelect={openPayment}
              onInvestigate={(id) =>
                paymentAction(
                  id,
                  "investigate"
                )
              }
            />
          )}

          {page === "Fraud AI" && (
            <FraudAI
              payments={fraudQueue}
              fraud={fraud}
              onSelect={openPayment}
              onBlock={(id) =>
                paymentAction(
                  id,
                  "block"
                )
              }
              onApprove={(id) =>
                paymentAction(
                  id,
                  "approve"
                )
              }
            />
          )}

          {page === "Payment Time Machine" && (
            <PaymentTimeMachine
              payments={payments}
              selectedPayment={timeMachinePayment}
              data={timeMachineData}
              loading={timeMachineLoading}
              onSelect={setTimeMachinePayment}
              onRun={runTimeMachine}
              onSimulate={simulateScenario}
              onWebhook={simulateWebhook}
            />
          )}

          {page === "Recovery Engine" && (
            <Recovery
              payments={
                failed.length
                  ? failed
                  : pending
              }
              onSelect={openPayment}
              onRecover={
                recoverPayment
              }
            />
          )}

          {page === "Merchants" && (
            <Merchants
              payments={payments}
            />
          )}

          {page === "Analytics" && (
            <AnalyticsPage
              enterprise={enterprise}
              payments={payments}
            />
          )}

          {page === "Risk Profiles" && (
            <RiskProfiles
              enterprise={enterprise}
            />
          )}

          {page === "Security Center" && (
            <SecurityCenter
              enterprise={enterprise}
              activity={activity}
              onSelect={openPayment}
            />
          )}

          {page === "Reports" && (
            <ReportsPage
              enterprise={enterprise}
              payments={payments}
            />
          )}

          {page === "System Health" && (
            <SystemHealth
              health={systemHealth}
              onRefresh={loadEnterprise}
            />
          )}

          {page === "Admin Center" && (
            <AdminCenter
              config={adminConfig}
              setConfig={setAdminConfig}
              onSaved={() => setNotice("Enterprise configuration saved")}
            />
          )}

        </div>

      </main>

      {/* =====================================================
          PAYMENT DETAILS
          ===================================================== */}

      {selectedPayment && (
        <PaymentDetails
          payment={selectedPayment}
          onClose={() =>
            setSelectedPayment(null)
          }
          onInvestigate={() =>
            paymentAction(
              selectedPayment.id,
              "investigate"
            )
          }
          onApprove={() =>
            paymentAction(
              selectedPayment.id,
              "approve"
            )
          }
          onBlock={() =>
            paymentAction(
              selectedPayment.id,
              "block"
            )
          }
          onRecover={() =>
            recoverPayment(
              selectedPayment.id
            )
          }
          onDelete={() =>
            deletePayment(
              selectedPayment.id
            )
          }
        />
      )}

      {/* =====================================================
          NEW PAYMENT
          ===================================================== */}

      {showNewPayment && (
        <PaymentModal
          form={form}
          setForm={setForm}
          onSubmit={createPayment}
          onClose={() =>
            setShowNewPayment(false)
          }
        />
      )}

    </div>
  );
}

/* =========================================================
   PAYMENT TIME MACHINE
   ========================================================= */

function PaymentTimeMachine({
  payments,
  selectedPayment,
  data,
  loading,
  onSelect,
  onRun,
  onSimulate,
  onWebhook,
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">COUNTERFACTUAL INTELLIGENCE</p>
          <h2>Payment Time Machine</h2>
          <p>Replay a payment, test alternate risk policies and inspect failure controls.</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedPayment}
            onChange={(event) => onSelect(event.target.value)}
            aria-label="Select payment for time machine"
          >
            <option value="">Select a payment</option>
            {payments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.id} · {payment.customer} · {payment.fraudScore}/100
              </option>
            ))}
          </select>
          <button className="primary-button" onClick={() => onRun()} disabled={!selectedPayment || loading}>
            <Gauge size={16} />
            {loading ? "Analyzing..." : "Run analysis"}
          </button>
        </div>
      </div>

      {!data && (
        <section className="panel time-machine-empty">
          <Gauge size={28} />
          <h3>Select a transaction to begin</h3>
          <p>See what actually happened, what alternate policies would do and how failures are contained.</p>
        </section>
      )}

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon"><ShieldAlert size={19} /></div><span>Actual risk</span><strong>{data.actual.score}/100</strong><small>{data.actual.level} · {data.actual.decision}</small></div>
            <div className="stat-card"><div className="stat-icon"><Gauge size={19} /></div><span>Selected policy</span><strong>{data.selectedDecision}</strong><small>Threshold {data.selectedThreshold}</small></div>
            <div className="stat-card"><div className="stat-icon"><ShieldCheck size={19} /></div><span>Protected amount</span><strong>{money(data.impact.protectedAmount, true)}</strong><small>{data.impact.estimatedCustomerFriction}</small></div>
            <div className="stat-card"><div className="stat-icon"><ClipboardCheck size={19} /></div><span>Incident SLA</span><strong>{data.sla.status}</strong><small>{data.sla.target}</small></div>
          </div>

          <div className="time-machine-grid">
            <section className="panel">
              <PanelTitle eyebrow="POLICY LAB" title="Alternate decisions" icon={<Gauge size={19} />} />
              <div className="table-wrap"><table className="data-table"><thead><tr><th>Threshold</th><th>Decision</th><th>Customer friction</th><th>Fraud exposure</th></tr></thead><tbody>{data.policyScenarios.map((scenario) => <tr key={scenario.threshold}><td>{scenario.threshold}</td><td><span className={`status-pill ${scenario.decision.toLowerCase()}`}>{scenario.decision}</span></td><td>{scenario.customerFriction}</td><td>{scenario.fraudExposure}</td></tr>)}</tbody></table></div>
            </section>

            <section className="panel">
              <PanelTitle eyebrow="RESILIENCE LAB" title="Failure containment" icon={<ShieldCheck size={19} />} />
              <div className="scenario-list">{data.failureScenarios.map((scenario) => <div className="scenario-item" key={scenario.name}><div><strong>{scenario.name}</strong><p>{scenario.result}</p></div><span className={`status-pill ${scenario.severity}`}>{scenario.control}</span></div>)}</div>
              <div className="simulator-actions">
                <button className="secondary-button" onClick={() => onSimulate("timeout")}><RefreshCw size={15} /> Simulate timeout</button>
                <button className="secondary-button" onClick={() => onSimulate("recovery_failure")}><AlertTriangle size={15} /> Simulate recovery failure</button>
              </div>
            </section>
          </div>

          <section className="panel">
            <PanelTitle eyebrow="EVENT INGESTION" title="Webhook simulator" icon={<Network size={19} />} />
            <p className="panel-description">Inject a payment lifecycle event and watch it appear in the audit replay.</p>
            <div className="webhook-actions">{["payment.authorized", "payment.failed", "payment.captured", "refund.processed"].map((eventType) => <button key={eventType} className="outline-button webhook-button" onClick={() => onWebhook(eventType)}><BellRing size={14} /> {eventType}</button>)}</div>
          </section>

          <section className="panel">
            <PanelTitle eyebrow="ROUTE INTELLIGENCE" title="Recommended payment route" icon={<Network size={19} />} />
            <p className="panel-description">Compare reliability, latency and fraud exposure before selecting a fallback route.</p>
            <div className="route-recommendation"><div><span>Recommended route</span><strong>{data.recommendedRoute.route}</strong><small>Best reliability-risk balance for this transaction</small></div><CheckCircle2 size={22} /></div>
            <div className="route-grid">{data.routeScenarios.map((route) => <div className={`route-card ${route.route === data.recommendedRoute.route ? "recommended" : ""}`} key={route.route}><div className="route-card-title"><strong>{route.route}</strong>{route.route === data.recommendedRoute.route && <span>Recommended</span>}</div><div className="route-metrics"><div><b>{route.successRate}%</b><small>success</small></div><div><b>{route.latencyMs}ms</b><small>latency</small></div><div><b>{route.fraudExposure}</b><small>fraud exposure</small></div></div><p>{route.customerImpact}</p></div>)}</div>
          </section>

          <section className="panel">
            <PanelTitle eyebrow="AUDIT REPLAY" title={`Timeline · ${data.payment.id}`} icon={<ActivitySquare size={19} />} />
            <div className="timeline-list">{data.timeline.length ? data.timeline.map((event, index) => <div className="timeline-item" key={`${event.action}-${event.timestamp}-${index}`}><span className="timeline-dot" /><div><strong>{event.action}</strong><p>{event.message}</p><small>{event.actor} · {formatDate(event.timestamp)}</small></div></div>) : <p className="empty-state">No recorded events for this payment.</p>}</div>
          </section>
        </>
      )}
    </>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
  analytics,
  fraud,
  payments,
  onSelect,
  onNavigate,
}) {
  const stats = [
    {
      label: "Total Payments",
      value:
        analytics?.totalPayments || 0,
      icon: CreditCard,
      detail: "All transactions",
    },

    {
      label: "Total Volume",
      value: money(
        analytics?.totalVolume,
        true
      ),
      icon: DollarSign,
      detail: "Processed volume",
    },

    {
      label: "Success Rate",
      value: `${
        analytics?.successRate || 0
      }%`,
      icon: CheckCircle2,
      detail: "Payment reliability",
    },

    {
      label: "Fraud Risk",
      value:
        fraud?.systemRiskScore ?? 0,
      icon: ShieldAlert,
      detail: `${
        fraud?.riskLevel || "low"
      } system risk`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONS / OVERVIEW"
        title="Dashboard"
        subtitle="Monitor payment performance, risk exposure and recovery activity in real time."
        right={<span className="live"><Gauge size={14} /> Operations online</span>}
      />
      <div className="stats-grid">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className="stat-card"
              key={stat.label}
            >

              <div className="stat-icon">
                <Icon size={20} />
              </div>

              <div>

                <span>
                  {stat.label}
                </span>

                <strong>
                  {stat.value}
                </strong>

                <small>
                  {stat.detail}
                </small>

              </div>

            </div>
          );
        })}

      </div>

      <div className="dashboard-two">

        <section className="panel chart-panel">

          <PanelTitle
            eyebrow="TRANSACTION VOLUME"
            title="Payment Activity"
            icon={
              <TrendingUp size={20} />
            }
          />

          <ActivityChart
            payments={payments}
          />

        </section>

        <section className="panel risk-panel">

          <PanelTitle
            eyebrow="FRAUD INTELLIGENCE"
            title="System Risk"
            icon={
              <ShieldAlert size={20} />
            }
          />

          <div className="big-risk">
            {fraud?.systemRiskScore ||
              0}
          </div>

          <div
            className={`risk-label ${riskClass(
              fraud?.riskLevel
            )}`}
          >
            {fraud?.riskLevel ||
              "Low"}{" "}
            Risk
          </div>

          <p className="muted">
            Average fraud score:{" "}
            {fraud?.averageFraudScore ||
              0}
          </p>

          <div className="risk-grid">

            <div>
              <span>
                Critical
              </span>

              <strong>
                {fraud?.criticalRiskCount ||
                  0}
              </strong>
            </div>

            <div>
              <span>
                High
              </span>

              <strong>
                {fraud?.highRiskCount ||
                  0}
              </strong>
            </div>

            <div>
              <span>
                Medium
              </span>

              <strong>
                {fraud?.mediumRiskCount ||
                  0}
              </strong>
            </div>

          </div>

          <button
            className="outline-button"
            onClick={() =>
              onNavigate("Fraud AI")
            }
          >
            Open Fraud Intelligence

            <ChevronRight size={16} />
          </button>

        </section>

      </div>

      <section className="panel">

        <PanelTitle
          eyebrow="RECENT ACTIVITY"
          title="Latest Payments"
          icon={
            <Activity size={20} />
          }
        />

        <TransactionTable
          payments={payments.slice(0, 7)}
          onSelect={onSelect}
        />

      </section>
    </>
  );
}

/* =========================================================
   LIVE PAYMENTS
   ========================================================= */

function LivePayments({
  payments,
  total,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  riskFilter,
  setRiskFilter,
  onSelect,
  onDelete,
  onNew,
}) {
  return (
    <>
      <PageHeader
        eyebrow="PAYMENT OPERATIONS"
        title="Live Payments"
        subtitle={`${total} transactions currently monitored`}
        right={
          <button
            className="primary-button"
            onClick={onNew}
          >
            + New Payment
          </button>
        }
      />

      <div className="filter-grid">

        <div className="search-field">

          <Search size={17} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search ID, customer, merchant or bank..."
          />

        </div>

        <div className="select-field">

          <Filter size={17} />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Statuses
            </option>

            <option value="success">
              Success
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="held">
              Held
            </option>

            <option value="investigating">
              Investigating
            </option>

            <option value="blocked">
              Blocked
            </option>

            <option value="recovered">
              Recovered
            </option>

            <option value="failed">
              Failed
            </option>

          </select>

        </div>

        <div className="select-field">

          <ShieldAlert size={17} />

          <select
            value={riskFilter}
            onChange={(event) =>
              setRiskFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All Risk Levels
            </option>

            <option value="critical">
              Critical
            </option>

            <option value="high">
              High
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="low">
              Low
            </option>

          </select>

        </div>

      </div>

      <section className="panel">

        <TransactionTable
          payments={payments}
          onSelect={onSelect}
          onDelete={onDelete}
          showDelete
        />

      </section>
    </>
  );
}

/* =========================================================
   TRANSACTION TABLE
   ========================================================= */

function TransactionTable({
  payments,
  onSelect,
  onDelete,
  showDelete = false,
}) {
  if (!payments || payments.length === 0) {
    return (
      <div className="empty-state">

        <CreditCard size={30} />

        <h3>
          No transactions
        </h3>

        <p>
          No payments match the
          current filters.
        </p>

      </div>
    );
  }

  return (
    <div className="table-container">

      <table>

        <thead>

          <tr>
            <th>PAYMENT</th>
            <th>CUSTOMER</th>
            <th>MERCHANT</th>
            <th>AMOUNT</th>
            <th>RISK</th>
            <th>STATUS</th>
            <th />
          </tr>

        </thead>

        <tbody>

          {payments.map(
            (payment) => (
              <tr
                key={payment.id}
                onClick={() =>
                  onSelect(
                    payment.id
                  )
                }
                className="clickable-row"
              >

                <td>

                  <strong className="payment-id">
                    {payment.id}
                  </strong>

                  <small>
                    {formatDate(
                      payment.createdAt
                    )}
                  </small>

                </td>

                <td>
                  {payment.customer}
                </td>

                <td>
                  {payment.merchant}
                </td>

                <td className="amount-cell">
                  {money(
                    payment.amount
                  )}
                </td>

                <td>
                  <RiskBadge
                    level={
                      payment.fraudLevel
                    }
                    score={
                      payment.fraudScore
                    }
                  />
                </td>

                <td>
                  <StatusBadge
                    status={
                      payment.status
                    }
                  />
                </td>

                <td>

                  <div className="row-actions">

                    <button
                      className="icon-button"
                      title="View details"
                      onClick={(event) => {
                        event.stopPropagation();

                        onSelect(
                          payment.id
                        );
                      }}
                    >
                      <Eye size={16} />
                    </button>

                    {showDelete &&
                      onDelete && (
                        <button
                          className="icon-button danger"
                          title="Delete"
                          onClick={(event) => {
                            event.stopPropagation();

                            onDelete(
                              payment.id
                            );
                          }}
                        >
                          <XCircle
                            size={16}
                          />
                        </button>
                      )}

                  </div>

                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  );
}

/* =========================================================
   PAYMENT DETAILS
   ========================================================= */

function PaymentDetails({
  payment,
  onClose,
  onInvestigate,
  onApprove,
  onBlock,
  onRecover,
  onDelete,
}) {
  const canInvestigate =
    payment.status !== "approved" &&
    payment.status !== "recovered";

  const canApprove =
    payment.status === "held" ||
    payment.status ===
      "investigating";

  const canBlock =
    payment.status !== "blocked" &&
    payment.status !== "recovered";

  const canRecover =
    payment.recoveryEligible ||
    payment.status === "failed" ||
    payment.status === "held";

  const history = [
    ...(payment.history || []),
  ].sort(
    (a, b) =>
      new Date(b.timestamp) -
      new Date(a.timestamp)
  );

  return (
    <div className="drawer-overlay">

      <div className="details-drawer">

        <div className="drawer-header">

          <div>

            <p className="eyebrow">
              PAYMENT INVESTIGATION
            </p>

            <h2>
              {payment.id}
            </h2>

            <span className="drawer-subtitle">
              {formatDate(
                payment.createdAt
              )}
            </span>

          </div>

          <button
            className="close-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>

        </div>

        <div className="drawer-body">

          <div className="detail-status-row">

            <StatusBadge
              status={
                payment.status
              }
            />

            <RiskBadge
              level={
                payment.fraudLevel
              }
              score={
                payment.fraudScore
              }
            />

          </div>

          <section className="detail-hero">

            <span>
              Transaction Amount
            </span>

            <strong>
              {money(
                payment.amount
              )}
            </strong>

            <small>
              {payment.method} •{" "}
              {payment.bank}
            </small>

          </section>

          <section className="detail-section">

            <DetailTitle>
              Transaction
            </DetailTitle>

            <div className="detail-grid">

              <Detail
                label="Customer"
                value={
                  payment.customer
                }
              />

              <Detail
                label="Merchant"
                value={
                  payment.merchant
                }
              />

              <Detail
                label="Bank"
                value={
                  payment.bank
                }
              />

              <Detail
                label="Payment Method"
                value={
                  payment.method
                }
              />

              <Detail
                label="Route"
                value={
                  payment.route ||
                  "Primary"
                }
              />

              <Detail
                label="Created"
                value={formatDate(
                  payment.createdAt
                )}
              />

            </div>

          </section>

          <section className="detail-section">

            <DetailTitle>
              Fraud Intelligence
            </DetailTitle>

            <div className="fraud-score-box">

              <div>

                <span>
                  Risk Score
                </span>

                <strong>
                  {payment.fraudScore ||
                    0}
                  /100
                </strong>

              </div>

              <div>

                <span>
                  Confidence
                </span>

                <strong>
                  {payment.fraudConfidence ||
                    0}
                  %
                </strong>

              </div>

            </div>

            {payment.fraudReasons?.length >
              0 && (
              <div className="reason-list">

                <h4>
                  Detection Reasons
                </h4>

                {payment.fraudReasons.map(
                  (
                    reason,
                    index
                  ) => (
                    <div key={index}>

                      <AlertTriangle
                        size={15}
                      />

                      <span>
                        {reason}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

            {payment.fraudIndicators?.length >
              0 && (
              <div className="indicator-list">

                <h4>
                  Risk Indicators
                </h4>

                <div>

                  {payment.fraudIndicators.map(
                    (
                      indicator,
                      index
                    ) => (
                      <span
                        className="indicator"
                        key={index}
                      >
                        {indicator}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

          </section>

          <section className="detail-section">

            <DetailTitle>
              Investigation
            </DetailTitle>

            <div className="detail-grid">

              <Detail
                label="Investigation"
                value={
                  payment.investigationStatus ||
                  "Not Required"
                }
              />

              <Detail
                label="Analyst Action"
                value={
                  payment.analystAction ||
                  "None"
                }
              />

              <Detail
                label="Transfer Status"
                value={
                  payment.transferStatus ||
                  "Not Started"
                }
              />

              <Detail
                label="Transfer Reference"
                value={
                  payment.transferReference ||
                  "—"
                }
              />

            </div>

          </section>

          <section className="detail-section">

            <DetailTitle>
              Investigation Timeline
            </DetailTitle>

            <div className="timeline">

              {history.length === 0 ? (
                <div className="empty-timeline">
                  No investigation
                  events yet.
                </div>
              ) : (
                history.map(
                  (
                    event,
                    index
                  ) => (
                    <div
                      className="timeline-item"
                      key={`${event.action}-${index}`}
                    >

                      <div className="timeline-dot" />

                      <div>

                        <strong>
                          {event.action}
                        </strong>

                        <p>
                          {event.message ||
                            event.description}
                        </p>

                        <small>
                          {event.actor} •{" "}
                          {formatDate(
                            event.timestamp
                          )}
                        </small>

                      </div>

                    </div>
                  )
                )
              )}

            </div>

          </section>

          {payment.recoveryHistory?.length >
            0 && (
            <section className="detail-section">

              <DetailTitle>
                Recovery History
              </DetailTitle>

              <div className="recovery-history">

                {payment.recoveryHistory.map(
                  (
                    attempt,
                    index
                  ) => (
                    <div key={index}>

                      <RefreshCw
                        size={16}
                      />

                      <div>

                        <strong>
                          Recovery Attempt{" "}
                          {index + 1}
                        </strong>

                        <p>
                          {attempt.message}
                        </p>

                        <small>
                          {attempt.route} •{" "}
                          {formatDate(
                            attempt.attemptedAt
                          )}
                        </small>

                      </div>

                    </div>
                  )
                )}

              </div>

            </section>
          )}

          <div className="drawer-actions">

            {canInvestigate && (
              <button
                className="secondary-button full"
                onClick={
                  onInvestigate
                }
              >
                <ShieldAlert size={16} />
                {payment.status === "blocked"
                  ? "Re-investigate"
                  : "Investigate"}
              </button>
            )}

            {canApprove && (
              <button
                className="primary-button full"
                onClick={onApprove}
              >
                <CheckCircle2
                  size={16}
                />
                Approve & Transfer
              </button>
            )}

            {canBlock && (
              <button
                className="danger-button full"
                onClick={onBlock}
              >
                <XCircle size={16} />
                Block Payment
              </button>
            )}

            {canRecover && (
              <button
                className="secondary-button full"
                onClick={onRecover}
              >
                <RefreshCw
                  size={16}
                />
                Recover Payment
              </button>
            )}

            <button
              className="delete-wide-button"
              onClick={onDelete}
            >
              Delete Transaction
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   FRAUD AI
   ========================================================= */

function FraudAI({
  payments,
  fraud,
  onSelect,
  onBlock,
  onApprove,
}) {
  return (
    <>
      <PageHeader
        eyebrow="AI SECURITY"
        title="Fraud Intelligence"
        subtitle="AI-assisted transaction risk analysis and intervention."
      />

      <div className="ai-summary">

        <div>
          <span>
            System Risk Score
          </span>

          <strong>
            {fraud?.systemRiskScore ||
              0}
          </strong>
        </div>

        <div>
          <span>
            Transactions Analyzed
          </span>

          <strong>
            {fraud?.totalAnalyzed ||
              0}
          </strong>
        </div>

        <div>
          <span>
            High Risk
          </span>

          <strong>
            {fraud?.highRiskCount ||
              0}
          </strong>
        </div>

        <div>
          <span>
            Critical
          </span>

          <strong>
            {fraud?.criticalRiskCount ||
              0}
          </strong>
        </div>

      </div>

      <section className="panel">

        <PanelTitle
          eyebrow="DETECTIONS"
          title="Risk Queue"
          icon={
            <ShieldAlert size={20} />
          }
        />

        {payments.length === 0 ? (
          <div className="empty-state">

            <ShieldCheck size={32} />

            <h3>
              No Elevated-Risk Transactions
            </h3>

            <p>
              Aegis AI has no medium,
              high, or critical
              transactions requiring
              review.
            </p>

          </div>
        ) : (
          <div className="risk-list">

            {payments.map(
              (payment) => (
                <div
                  className="risk-card"
                  key={payment.id}
                >

                  <div className="risk-card-main">

                    <div>

                      <strong>
                        {payment.id}
                      </strong>

                      <span>
                        {payment.customer} →{" "}
                        {payment.merchant}
                      </span>

                    </div>

                    <RiskBadge
                      level={
                        payment.fraudLevel
                      }
                      score={
                        payment.fraudScore
                      }
                    />

                    <strong>
                      {money(
                        payment.amount
                      )}
                    </strong>

                  </div>

                  <div className="risk-card-reasons">

                    {(payment.fraudReasons ||
                      [])
                      .slice(0, 3)
                      .map(
                        (
                          reason,
                          index
                        ) => (
                          <span
                            key={index}
                          >
                            <AlertTriangle
                              size={14}
                            />

                            {reason}
                          </span>
                        )
                      )}

                  </div>

                  <div className="risk-card-actions">

                    <button
                      className="secondary-button"
                      onClick={() =>
                        onSelect(
                          payment.id
                        )
                      }
                    >
                      <Eye size={15} />
                      Details
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        onBlock(
                          payment.id
                        )
                      }
                    >
                      Block
                    </button>

                    <button
                      className="primary-button"
                      onClick={() =>
                        onApprove(
                          payment.id
                        )
                      }
                    >
                      Approve
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>
    </>
  );
}

/* =========================================================
   INCIDENTS
   ========================================================= */

function Incidents({
  payments,
  onSelect,
  onInvestigate,
}) {
  return (
    <>
      <PageHeader
        eyebrow="RISK OPERATIONS"
        title="Incidents"
        subtitle="Monitor and manage payment infrastructure in real time."
      />

      <div className="incident-grid">

        {payments.length === 0 ? (
          <div className="empty-state panel">

            <CheckCircle2 size={32} />

            <h3>
              No Active Incidents
            </h3>

            <p>
              Everything is operating
              normally.
            </p>

          </div>
        ) : (
          payments.map(
            (payment) => (
              <div
                className="incident-card"
                key={payment.id}
              >

                <div className="incident-top">

                  <div className="incident-icon">
                    <AlertTriangle
                      size={20}
                    />
                  </div>

                  <RiskBadge
                    level={
                      payment.fraudLevel
                    }
                    score={
                      payment.fraudScore
                    }
                  />

                </div>

                <strong>
                  {payment.id}
                </strong>

                <p>
                  {payment.customer} →{" "}
                  {payment.merchant}
                </p>

                <div className="incident-amount">
                  {money(
                    payment.amount
                  )}
                </div>

                <small>
                  Investigation:{" "}
                  {payment.investigationStatus ||
                    "Open"}
                </small>

                <div className="incident-actions">

                  <button
                    className="secondary-button"
                    onClick={() =>
                      onSelect(
                        payment.id
                      )
                    }
                  >
                    View
                  </button>

                  <button
                    className="primary-button"
                    onClick={() =>
                      onInvestigate(
                        payment.id
                      )
                    }
                  >
                    {payment.status === "blocked"
                      ? "Re-investigate"
                      : "Investigate"}
                  </button>

                </div>

              </div>
            )
          )
        )}

      </div>
    </>
  );
}

/* =========================================================
   RECOVERY ENGINE
   ========================================================= */

function Recovery({
  payments,
  onSelect,
  onRecover,
}) {
  return (
    <>
      <PageHeader
        eyebrow="PAYMENT RECOVERY"
        title="Recovery Engine"
        subtitle="Recover eligible failed or held transactions."
      />

      <section className="panel">

        <PanelTitle
          eyebrow="RECOVERY QUEUE"
          title="Eligible Transactions"
          icon={
            <RefreshCw size={20} />
          }
        />

        {payments.length === 0 ? (
          <div className="empty-state">

            <CheckCircle2 size={32} />

            <h3>
              Recovery Queue Empty
            </h3>

            <p>
              There are no payments
              waiting for recovery.
            </p>

          </div>
        ) : (
          <div className="recovery-list">

            {payments.map(
              (payment) => (
                <div
                  className="recovery-card"
                  key={payment.id}
                >

                  <div>

                    <strong>
                      {payment.id}
                    </strong>

                    <span>
                      {payment.customer} →{" "}
                      {payment.merchant}
                    </span>

                    <small>
                      {money(
                        payment.amount
                      )}{" "}
                      •{" "}
                      {payment.bank}
                    </small>

                  </div>

                  <div className="recovery-meta">

                    <StatusBadge
                      status={
                        payment.status
                      }
                    />

                    <span>
                      Attempts:{" "}
                      {payment.recoveryAttempts ||
                        0}
                    </span>

                  </div>

                  <div className="recovery-actions">

                    <button
                      className="secondary-button"
                      onClick={() =>
                        onSelect(
                          payment.id
                        )
                      }
                    >
                      Details
                    </button>

                    <button
                      className="primary-button"
                      onClick={() =>
                        onRecover(
                          payment.id
                        )
                      }
                    >
                      <RefreshCw
                        size={15}
                      />

                      Recover
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>
    </>
  );
}

/* =========================================================
   MERCHANTS
   ========================================================= */

function Merchants({
  payments,
}) {
  const merchants = {};

  payments.forEach(
    (payment) => {
      if (!merchants[payment.merchant]) {
        merchants[payment.merchant] = {
          count: 0,
          volume: 0,
          failed: 0,
          risk: 0,
          successful: 0,
          recovered: 0,
        };
      }

      merchants[
        payment.merchant
      ].count += 1;

      merchants[
        payment.merchant
      ].volume += Number(
        payment.amount || 0
      );

      if (
        payment.status ===
        "failed"
      ) {
        merchants[
          payment.merchant
        ].failed += 1;
      }

      if (
        payment.fraudLevel ===
          "high" ||
        payment.fraudLevel ===
          "critical"
      ) {
        merchants[
          payment.merchant
        ].risk += 1;
      }

      if (["success", "approved", "recovered"].includes(payment.status)) {
        merchants[payment.merchant].successful += 1;
      }

      if (payment.status === "recovered") {
        merchants[payment.merchant].recovered += 1;
      }
    }
  );

  const entries =
    Object.entries(merchants);

  return (
    <>
      <PageHeader
        eyebrow="MERCHANT OPERATIONS"
        title="Merchants"
        subtitle="Transaction volume, reliability and risk by merchant."
      />

      {entries.length === 0 ? (
        <div className="empty-state panel">

          <Building2 size={32} />

          <h3>
            No Merchants
          </h3>

          <p>
            Create payments to
            populate merchant
            analytics.
          </p>

        </div>
      ) : (
        <div className="merchant-grid">

          {entries.map(
            ([merchant, data]) => (
              (() => {
                const reliability = data.count ? Math.round((data.successful / data.count) * 100) : 0;
                const riskExposure = data.count ? Math.round((data.risk / data.count) * 100) : 0;
                const trustScore = Math.max(0, Math.min(100, Math.round(reliability - riskExposure * 0.35 + Math.min(data.count, 10))));
                const trustLevel = trustScore >= 85 ? "Trusted" : trustScore >= 65 ? "Watch" : "Review";

                return (
              <div
                className="merchant-card"
                key={merchant}
              >

                <div className="merchant-icon">
                  <Building2 size={20} />
                </div>

                <h3>
                  {merchant}
                </h3>

                <div className="merchant-volume">
                  {money(
                    data.volume
                  )}
                </div>

                <div className="trust-passport">
                  <div><span>Merchant Trust Passport</span><strong>{trustScore}<small>/100</small></strong></div>
                  <b className={`trust-level ${trustLevel.toLowerCase()}`}>{trustLevel}</b>
                </div>

                <div className="trust-meter"><span style={{ width: `${trustScore}%` }} /></div>

                <div className="merchant-stats">

                  <span>
                    <strong>
                      {data.count}
                    </strong>

                    Transactions
                  </span>

                  <span>
                    <strong>
                      {data.failed}
                    </strong>

                    Failed
                  </span>

                  <span>
                    <strong>
                      {reliability}%
                    </strong>

                    Reliability
                  </span>

                  <span>
                    <strong>{riskExposure}%</strong>
                    Risk exposure
                  </span>

                  <span>
                    <strong>{data.recovered}</strong>
                    Recovered
                  </span>

                </div>

              </div>
                );
              })()
            )
          )}

        </div>
      )}
    </>
  );
}

/* =========================================================
   PHASE 5 — ADVANCED ANALYTICS
   ========================================================= */

function AnalyticsPage({ enterprise, payments }) {
  const overview = enterprise || {};
  const analytics = overview.analytics || {};
  const trends = overview.trends || [];
  const methods = overview.paymentMethods || [];
  const banks = overview.bankPerformance || [];
  const risk = overview.riskDistribution || [];

  const maxTrend = Math.max(...trends.map((item) => item.count || 0), 1);

  return (
    <>
      <PageHeader
        eyebrow="PHASE 5 / INTELLIGENCE"
        title="Advanced Analytics"
        subtitle="Executive view of payment performance, fraud exposure and operational trends."
        right={
          <span className="live"><Gauge size={14} /> Intelligence online</span>
        }
      />

      <div className="stats-grid enterprise-stats">
        <EnterpriseStat label="Gross Payment Volume" value={money(analytics.totalVolume || 0, true)} icon={<CircleDollarSign size={18} />} />
        <EnterpriseStat label="Success Rate" value={`${analytics.successRate || 0}%`} icon={<TrendingUp size={18} />} />
        <EnterpriseStat label="Fraud Interventions" value={(analytics.blockedPayments || 0) + (analytics.heldPayments || 0)} icon={<Shield size={18} />} />
        <EnterpriseStat label="Recovery Rate" value={`${analytics.recoveryRate || 0}%`} icon={<RefreshCw size={18} />} />
      </div>

      <div className="enterprise-grid two">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="TRANSACTION VELOCITY" title="14-day activity" icon={<ActivitySquare size={19} />} />
          <EnterpriseTrendChart trends={trends} />

        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="RISK POSTURE" title="Exposure distribution" icon={<Shield size={19} />} />
          <div className="distribution-list">
            {risk.map((item) => (
              <div className="distribution-row" key={item.level}>
                <div className="distribution-label">
                  <span className={`risk-dot ${riskClass(item.level)}`} />
                  <strong>{item.level}</strong>
                </div>
                <div className="distribution-track">
                  <span style={{ width: `${item.percent}%` }} />
                </div>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="enterprise-grid two">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="PAYMENT METHODS" title="Method performance" icon={<CreditCard size={19} />} />
          <div className="enterprise-table">
            <div className="enterprise-table-head"><span>Method</span><span>Transactions</span><span>Volume</span><span>Success</span></div>
            {methods.map((item) => (
              <div className="enterprise-table-row" key={item.method}>
                <strong>{item.method}</strong>
                <span>{item.count}</span>
                <span>{money(item.volume, true)}</span>
                <span className={item.successRate >= 90 ? "text-success" : "text-warning"}>{item.successRate}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="BANK ROUTING" title="Bank performance" icon={<Database size={19} />} />
          <div className="enterprise-table">
            <div className="enterprise-table-head"><span>Bank</span><span>Payments</span><span>Volume</span><span>Risk</span></div>
            {banks.slice(0, 7).map((item) => (
              <div className="enterprise-table-row" key={item.bank}>
                <strong className="truncate">{item.bank}</strong>
                <span>{item.count}</span>
                <span>{money(item.volume, true)}</span>
                <span className={`risk-text ${riskClass(item.riskLevel)}`}>{item.riskLevel}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="enterprise-footnote">
        Analytics are calculated from the live transaction ledger ({payments.length} records) and update through the AegisPay event stream.
      </div>
    </>
  );
}

function EnterpriseTrendChart({ trends = [] }) {
  const safe = trends.length ? trends : [];
  const values = safe.map((item) => Number(item.count || 0));
  const max = Math.max(...values, 1);
  const width = 760;
  const height = 245;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const innerW = width - left - right;
  const innerH = height - top - bottom;

  const points = safe.map((item, index) => {
    const x = safe.length === 1
      ? left + innerW / 2
      : left + (index / (safe.length - 1)) * innerW;
    const y = top + innerH - (Number(item.count || 0) / max) * innerH;
    return { ...item, x, y, value: Number(item.count || 0) };
  });

  const line = points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${top + innerH} L ${points[0].x.toFixed(1)} ${top + innerH} Z`
    : "";

  const yTicks = [0, .25, .5, .75, 1].map((ratio) => ({
    value: Math.round(max * ratio),
    y: top + innerH - innerH * ratio,
  }));

  return (
    <div className="trend-chart-wrap">
      {points.length ? (
        <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fourteen day payment activity">
          <defs>
            <linearGradient id="aegisTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity=".20" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={left} x2={width - right} y1={tick.y} y2={tick.y} className="trend-gridline" />
              <text x={left - 10} y={tick.y + 3} textAnchor="end" className="trend-axis-label">{tick.value}</text>
            </g>
          ))}

          <path d={area} className="trend-area" />
          <path d={line} className="trend-line" />

          {points.map((p, i) => (
            <g key={`${p.label}-${i}`}>
              <circle cx={p.x} cy={p.y} r="4" className="trend-point" />
              {(i === 0 || i === points.length - 1 || i % Math.max(1, Math.ceil(points.length / 6)) === 0) && (
                <text x={p.x} y={height - 15} textAnchor="middle" className="trend-date-label">
                  {formatTrendDate(p.label)}
                </text>
              )}
            </g>
          ))}
        </svg>
      ) : (
        <div className="chart-empty">No transaction activity available for this period.</div>
      )}
    </div>
  );
}

function formatTrendDate(label) {
  if (!label) return "—";
  const raw = String(label).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  const match = raw.match(/(\d{1,2})\s+([A-Za-z]{3,})/);
  return match ? `${match[1]} ${match[2].slice(0, 3)}` : raw;
}

function EnterpriseStat({ label, value, icon }) {
  return (
    <div className="stat-card enterprise-stat">
      <div className="enterprise-stat-icon">{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}

/* =========================================================
   PHASE 5 — RISK PROFILES
   ========================================================= */

function RiskProfiles({ enterprise }) {
  const customers = enterprise?.customerProfiles || [];
  const merchants = enterprise?.merchantProfiles || [];

  return (
    <>
      <PageHeader
        eyebrow="PHASE 5 / RISK GRAPH"
        title="Risk Profiles"
        subtitle="Behavioral exposure across customers and merchants."
      />

      <div className="profile-grid">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="CUSTOMER INTELLIGENCE" title="Customer risk profiles" icon={<Users size={19} />} />
          <div className="profile-list">
            {customers.length ? customers.map((profile) => (
              <div className="profile-card" key={profile.name}>
                <div className="profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</div>
                <div className="profile-main">
                  <strong>{profile.name}</strong>
                  <span>{profile.transactions} transactions · {money(profile.volume, true)}</span>
                  <small>{profile.highRisk} elevated-risk events · avg score {profile.avgScore}</small>
                </div>
                <RiskBadge level={profile.riskLevel} score={profile.avgScore} />
              </div>
            )) : <div className="empty-state">No customer profiles available.</div>}
          </div>
        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="MERCHANT INTELLIGENCE" title="Merchant risk profiles" icon={<Building2 size={19} />} />
          <div className="profile-list">
            {merchants.length ? merchants.map((profile) => (
              <div className="profile-card" key={profile.name}>
                <div className="profile-avatar merchant-avatar"><Building2 size={16} /></div>
                <div className="profile-main">
                  <strong>{profile.name}</strong>
                  <span>{profile.transactions} transactions · {money(profile.volume, true)}</span>
                  <small>{profile.failed} failed · {profile.highRisk} elevated-risk events</small>
                </div>
                <RiskBadge level={profile.riskLevel} score={profile.avgScore} />
              </div>
            )) : <div className="empty-state">No merchant profiles available.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   PHASE 5 — SECURITY CENTER
   ========================================================= */

function SecurityCenter({ enterprise, activity, onSelect }) {
  const alerts = enterprise?.alerts || [];
  const posture = enterprise?.securityPosture || {};
  const audit = (enterprise?.auditLog || activity || []).slice(0, 12);

  return (
    <>
      <PageHeader
        eyebrow="PHASE 5 / SECURITY"
        title="Security Center"
        subtitle="Threat posture, alerts and auditable payment decisions."
        right={<span className={`risk-badge ${riskClass(posture.level)}`}>{posture.level || "low"} posture</span>}
      />

      <div className="security-hero">
        <div>
          <span>Security posture</span>
          <strong>{posture.score ?? 0}<small>/100</small></strong>
          <p>{posture.summary || "No elevated threats detected."}</p>
        </div>
        <div className="security-ring" style={{ "--score": `${posture.score ?? 0}%` }}>
          <span>{posture.score ?? 0}</span>
        </div>
      </div>

      <div className="enterprise-grid two">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="ACTIVE THREATS" title="Security alerts" icon={<BellRing size={19} />} />
          <div className="alert-list">
            {alerts.length ? alerts.map((alert) => (
              <div className={`security-alert ${riskClass(alert.level)}`} key={alert.id}>
                <div className="alert-icon"><AlertTriangle size={16} /></div>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                  <small>{alert.count} affected transaction{alert.count === 1 ? "" : "s"}</small>
                </div>
              </div>
            )) : <div className="empty-state"><ShieldCheck size={30} /><h3>Security posture clear</h3><p>No active threats require intervention.</p></div>}
          </div>
        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="AUDIT TRAIL" title="Recent security activity" icon={<ClipboardCheck size={19} />} />
          <div className="audit-list">
            {audit.length ? audit.map((event, index) => (
              <button className="audit-row" key={event.id || `${event.paymentId}-${index}`} onClick={() => event.paymentId && onSelect(event.paymentId)}>
                <span className="audit-dot" />
                <div>
                  <strong>{event.action || "SYSTEM_EVENT"}</strong>
                  <p>{event.message || event.description || "Payment activity recorded."}</p>
                  <small>{event.actor || "Aegis AI"} · {formatDate(event.timestamp)}</small>
                </div>
                {event.fraudLevel && <RiskBadge level={event.fraudLevel} score={event.fraudScore} />}
              </button>
            )) : <div className="empty-state">No audit activity recorded.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   PHASE 6 — REPORTING
   ========================================================= */

function ReportsPage({ enterprise, payments }) {
  const [query, setQuery] = useState("");

  const rows = payments.filter((payment) => {
    const text = `${payment.id} ${payment.customer} ${payment.merchant} ${payment.bank}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  function exportCsv() {
    const headers = ["Payment ID", "Customer", "Merchant", "Bank", "Amount", "Method", "Status", "Risk", "Fraud Score", "Created"];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const body = rows.map((payment) => [
      payment.id,
      payment.customer,
      payment.merchant,
      payment.bank,
      payment.amount,
      payment.method,
      payment.status,
      payment.fraudLevel,
      payment.fraudScore,
      payment.createdAt,
    ].map(escape).join(","));
    const blob = new Blob([[headers.map(escape).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aegispay-payment-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const report = enterprise?.analytics || {};

  return (
    <>
      <PageHeader
        eyebrow="PHASE 6 / REPORTING"
        title="Reports"
        subtitle="Exportable operational intelligence for payment and risk teams."
        right={
          <button className="primary-button" onClick={exportCsv}><Download size={16} /> Export CSV</button>
        }
      />

      <div className="report-kpis">
        <EnterpriseStat label="Transactions" value={report.totalPayments || 0} icon={<Activity size={18} />} />
        <EnterpriseStat label="Volume" value={money(report.totalVolume || 0, true)} icon={<CircleDollarSign size={18} />} />
        <EnterpriseStat label="Blocked" value={report.blockedPayments || 0} icon={<LockKeyhole size={18} />} />
        <EnterpriseStat label="Recovered" value={report.recoveredPayments || 0} icon={<RefreshCw size={18} />} />
      </div>

      <section className="panel enterprise-panel">
        <div className="report-toolbar">
          <div>
            <p className="eyebrow">TRANSACTION REPORT</p>
            <h2>Payment ledger</h2>
            <span>{rows.length} of {payments.length} records</span>
          </div>
          <div className="search-field enterprise-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions..." />
          </div>
        </div>
        <div className="enterprise-table report-table">
          <div className="enterprise-table-head"><span>Payment</span><span>Merchant</span><span>Amount</span><span>Status</span><span>Risk</span></div>
          {rows.slice(0, 50).map((payment) => (
            <div className="enterprise-table-row" key={payment.id}>
              <strong>{payment.id}</strong>
              <span className="truncate">{payment.merchant}</span>
              <span>{money(payment.amount)}</span>
              <StatusBadge status={payment.status} />
              <RiskBadge level={payment.fraudLevel} score={payment.fraudScore} />
            </div>
          ))}
          {!rows.length && <div className="empty-state">No transactions match the report filter.</div>}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   PHASE 6 — SYSTEM HEALTH
   ========================================================= */

function SystemHealth({ health, onRefresh }) {
  const services = health?.services || [];
  return (
    <>
      <PageHeader
        eyebrow="PHASE 6 / RELIABILITY"
        title="System Health"
        subtitle="Production readiness, service health and real-time infrastructure."
        right={<button className="secondary-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh health</button>}
      />

      <div className="health-grid">
        <HealthCard icon={<Database size={18} />} label="MongoDB" value={health?.database?.status || "Unknown"} detail={health?.database?.latencyMs != null ? `${health.database.latencyMs} ms latency` : "Database connection"} ok={health?.database?.status === "Connected"} />
        <HealthCard icon={<ActivitySquare size={18} />} label="SSE Stream" value={health?.realtime?.status || "Unknown"} detail={`${health?.realtime?.connectedClients ?? 0} connected client(s)`} ok={health?.realtime?.status === "Connected"} />
        <HealthCard icon={<Server size={18} />} label="API Service" value={health?.api?.status || "Operational"} detail={`Uptime ${health?.uptimeHuman || "—"}`} ok />
        <HealthCard icon={<Shield size={18} />} label="Fraud Engine" value={health?.fraudEngine || "Active"} detail="Deterministic risk controls" ok />
      </div>

      <div className="enterprise-grid two">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="SERVICE MATRIX" title="Operational services" icon={<Network size={19} />} />
          <div className="service-list">
            {services.map((service) => (
              <div className="service-row" key={service.name}>
                <div className="service-name"><span className="service-dot" /><strong>{service.name}</strong></div>
                <span>{service.detail}</span>
                <b className="service-ok">{service.status}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="RUNTIME" title="Runtime diagnostics" icon={<Gauge size={19} />} />
          <div className="runtime-grid">
            <Detail label="Node runtime" value={health?.runtime?.node || "—"} />
            <Detail label="Process uptime" value={health?.uptimeHuman || "—"} />
            <Detail label="Heap used" value={health?.runtime?.heapUsed || "—"} />
            <Detail label="RSS memory" value={health?.runtime?.rss || "—"} />
            <Detail label="Environment" value={health?.environment || "Development"} />
            <Detail label="API version" value={health?.version || "6.0.0"} />
          </div>
        </section>
      </div>
    </>
  );
}

function HealthCard({ icon, label, value, detail, ok }) {
  return (
    <div className="health-card">
      <div className="health-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small><span className={ok ? "health-dot" : "health-dot warning"} />{detail}</small>
    </div>
  );
}

/* =========================================================
   PHASE 6 — ADMIN CENTER
   ========================================================= */

function AdminCenter({ config, setConfig, onSaved }) {
  function toggle(key) {
    setConfig({ ...config, [key]: !config[key] });
  }

  const controls = [
    ["realtimeMonitoring", "Real-time monitoring", "Stream payment events to operations in real time.", ActivitySquare],
    ["aiGuardrails", "AI safety guardrails", "Prevent risk decisions from silently downgrading deterministic signals.", ShieldCheck],
    ["automaticIncidentCreation", "Automatic incidents", "Create incidents for elevated-risk transactions.", BellRing],
    ["auditLogging", "Audit logging", "Record payment decisions and analyst actions in the audit trail.", ClipboardCheck],
  ];

  return (
    <>
      <PageHeader
        eyebrow="PHASE 6 / ADMINISTRATION"
        title="Admin Center"
        subtitle="Operational controls for AegisPay intelligence and governance."
      />

      <div className="admin-layout">
        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="CONTROL PLANE" title="Platform controls" icon={<Settings size={19} />} />
          <div className="control-list">
            {controls.map(([key, title, description, Icon]) => (
              <div className="control-row" key={key}>
                <div className="control-icon"><Icon size={17} /></div>
                <div className="control-copy"><strong>{title}</strong><p>{description}</p></div>
                <button className={`toggle ${config[key] ? "on" : ""}`} onClick={() => toggle(key)} aria-label={`Toggle ${title}`}>
                  <span />
                </button>
              </div>
            ))}
          </div>
          <div className="admin-actions">
            <button className="primary-button" onClick={onSaved}><CheckCircle2 size={16} /> Save configuration</button>
          </div>
        </section>

        <section className="panel enterprise-panel">
          <PanelTitle eyebrow="GOVERNANCE" title="Security principles" icon={<LockKeyhole size={19} />} />
          <div className="principle-list">
            <div><ShieldCheck size={17} /><span><strong>Risk-first decisions</strong><small>Deterministic fraud controls remain authoritative.</small></span></div>
            <div><ClipboardCheck size={17} /><span><strong>Auditable actions</strong><small>Payment decisions are recorded with actor and timestamp.</small></span></div>
            <div><Database size={17} /><span><strong>Persistent ledger</strong><small>Operational state is backed by MongoDB.</small></span></div>
            <div><ActivitySquare size={17} /><span><strong>Real-time visibility</strong><small>Operations receives payment lifecycle events over SSE.</small></span></div>
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   ACTIVITY CHART
   ========================================================= */

function ActivityChart({
  payments,
}) {
  const buckets = Array.from(
    { length: 7 },
    () => 0
  );

  payments.forEach(
    (payment) => {
      const date = new Date(
        payment.createdAt ||
          Date.now()
      );

      const day =
        date.getDay();

      buckets[day] += 1;
    }
  );

  const max = Math.max(
    ...buckets,
    1
  );

  const labels = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  return (
    <div className="activity-chart">

      <div className="chart-bars">

        {buckets.map(
          (value, index) => (
            <div
              className="chart-column"
              key={index}
            >

              <span>
                {value}
              </span>

              <div className="chart-track">

                <div
                  className="chart-bar"
                  style={{
                    height: `${Math.max(
                      8,
                      (value / max) *
                        100
                    )}%`,
                  }}
                />

              </div>

              <small>
                {labels[index]}
              </small>

            </div>
          )
        )}

      </div>

    </div>
  );
}

/* =========================================================
   PAYMENT MODAL
   ========================================================= */

function PaymentModal({
  form,
  setForm,
  onSubmit,
  onClose,
}) {
  function update(
    field,
    value
  ) {
    setForm({
      ...form,
      [field]: value,
    });
  }

  return (
    <div className="modal-overlay">

      <form
        className="payment-modal"
        onSubmit={onSubmit}
      >

        <div className="modal-header">

          <div>

            <p className="eyebrow">
              PAYMENT GATEWAY
            </p>

            <h2>
              Create Payment
            </h2>

            <p>
              Simulate a transaction
              through AegisPay.
            </p>

          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>

        </div>

        <div className="form-grid">

          <label>
            Customer

            <input
              required
              value={form.customer}
              onChange={(event) =>
                update(
                  "customer",
                  event.target.value
                )
              }
              placeholder="Customer name"
            />
          </label>

          <label>
            Merchant

            <input
              required
              value={form.merchant}
              onChange={(event) =>
                update(
                  "merchant",
                  event.target.value
                )
              }
              placeholder="Merchant name"
            />
          </label>

          <label>
            Amount

            <input
              required
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) =>
                update(
                  "amount",
                  event.target.value
                )
              }
              placeholder="10000"
            />
          </label>

          <label>
            Bank

            <select
              required
              value={form.bank}
              onChange={(event) =>
                update("bank", event.target.value)
              }
            >
              <option value="" disabled>
                Select bank
              </option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>

          <label>
            Payment Method

            <select
              value={form.method}
              onChange={(event) =>
                update(
                  "method",
                  event.target.value
                )
              }
            >

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Net Banking">
                Net Banking
              </option>

              <option value="Wallet">
                Wallet
              </option>

              <option value="Crypto">
                Crypto
              </option>

            </select>
          </label>

          <label>
            Simulation Type

            <select
              value={
                form.paymentType
              }
              onChange={(event) =>
                update(
                  "paymentType",
                  event.target.value
                )
              }
            >

              <option value="real">
                Real / Low Risk
              </option>

              <option value="suspicious">
                Suspicious
              </option>

              <option value="fake">
                Fraud / Fake
              </option>

            </select>
          </label>

        </div>

        <div className="simulation-info">

          <ShieldCheck size={17} />

          <span>
            Aegis AI will analyze
            this transaction
            automatically.
          </span>

        </div>

        <div className="modal-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
          >
            Create Payment
          </button>

        </div>

      </form>

    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}) {
  return (
    <div className="page-header">

      <div>

        <p className="eyebrow">
          {eyebrow}
        </p>

        <h2>
          {title}
        </h2>

        <p>
          {subtitle}
        </p>

      </div>

      {right && (
        <div>
          {right}
        </div>
      )}

    </div>
  );
}

function PanelTitle({
  eyebrow,
  title,
  icon,
  children,
}) {
  return (
    <div className="panel-title">

      <div>

        {eyebrow && (
          <p className="eyebrow">
            {eyebrow}
          </p>
        )}

        <h2>
          {title}
        </h2>

      </div>

      {icon}

      {children}

    </div>
  );
}

function DetailTitle({
  children,
}) {
  return (
    <h3 className="detail-title">
      {children}
    </h3>
  );
}

function Detail({
  label,
  value,
}) {
  return (
    <div className="detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

function RiskBadge({
  level,
  score,
}) {
  const safe = level || "low";

  return (
    <span
      className={`risk-badge ${riskClass(
        safe
      )}`}
    >

      {safe}

      {score !== undefined && (
        <b>
          {score}
        </b>
      )}

    </span>
  );
}

function StatusBadge({
  status,
}) {
  return (
    <span
      className={`status-badge ${statusClass(
        status
      )}`}
    >
      {status || "unknown"}
    </span>
  );
}
