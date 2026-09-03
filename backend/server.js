const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const Payment = require("./models/Payment");

const {
  calculateFraudRisk,
} = require("./fraudEngine");

const {
  analyzeWithExternalAI,
} = require("./externalFraudAI");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* =========================================================
   SSE REAL-TIME EVENT SYSTEM
========================================================= */

const sseClients = new Set();

function broadcastEvent(type, data = {}) {
  const payload = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of sseClients) {
    try {
      // Send as the default SSE message so the frontend
      // EventSource.onmessage handler receives every event.
      client.write(`data: ${payload}\n\n`);
    } catch (error) {
      sseClients.delete(client);
    }
  }

  console.log(
    `[SSE] ${type} -> ${sseClients.size} client(s)`
  );
}

app.get("/api/events", (req, res) => {
  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );
  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );
  res.setHeader(
    "Connection",
    "keep-alive"
  );
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(
    `data: ${JSON.stringify({
        type: "CONNECTED",
        message:
          "AegisPay real-time event stream connected",
        timestamp: new Date().toISOString(),
      })}\n\n`
  );

  sseClients.add(res);

  console.log(
    `[SSE] Client connected. Total clients: ${sseClients.size}`
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(
        `event: heartbeat\n` +
          `data: ${JSON.stringify({
            type: "heartbeat",
            timestamp:
              new Date().toISOString(),
          })}\n\n`
      );
    } catch (error) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);

    console.log(
      `[SSE] Client disconnected. Total clients: ${sseClients.size}`
    );
  });
});

/* =========================================================
   HELPERS
========================================================= */

function createPaymentId() {
  return (
    "PAY-" +
    Date.now().toString().slice(-7) +
    Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
  );
}

function createTransferReference() {
  return (
    "TRX-" +
    Date.now().toString().slice(-8) +
    Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")
  );
}

function createRecoveryReference() {
  return (
    "REC-" +
    Date.now().toString().slice(-8) +
    Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")
  );
}

function addHistory(
  payment,
  action,
  message,
  actor = "Aegis AI"
) {
  payment.history.push({
    action,
    message,
    actor,
    timestamp: new Date(),
  });
}

function addInvestigationHistory(
  payment,
  action,
  message,
  actor = "Aegis AI"
) {
  payment.investigationHistory.push({
    action,
    message,
    actor,
    timestamp: new Date(),
  });
}

/* =========================================================
   PAYMENT SNAPSHOT
========================================================= */

function paymentSnapshot(payment) {
  const p =
    typeof payment.toObject === "function"
      ? payment.toObject()
      : payment;

  return {
    id: p.id,
    customer: p.customer,
    merchant: p.merchant,
    amount: p.amount,
    bank: p.bank,
    method: p.method,
    paymentType: p.paymentType,

    status: p.status,

    risk: p.risk,
    fraudScore: p.fraudScore,
    fraudLevel: p.fraudLevel,
    fraudConfidence: p.fraudConfidence,
    fraudResult: p.fraudResult,

    fraudReasons:
      p.fraudReasons || [],

    fraudIndicators:
      p.fraudIndicators || [],

    investigationStatus:
      p.investigationStatus,

    incidentCreated:
      p.incidentCreated,

    incidentStatus:
      p.incidentStatus,

    analystAction:
      p.analystAction,

    transferStatus:
      p.transferStatus,

    transferred:
      p.transferred,

    transferReference:
      p.transferReference,

    transferAt:
      p.transferAt,

    recoveryEligible:
      p.recoveryEligible,

    recoveryStatus:
      p.recoveryStatus,

    recoveryAttempts:
      p.recoveryAttempts,

    recoveredAt:
      p.recoveredAt,

    failureReason:
      p.failureReason,

    externalAI:
      p.externalAI || null,

    history:
      p.history || [],

    investigationHistory:
      p.investigationHistory || [],

    metadata:
      p.metadata || {},

    createdAt:
      p.createdAt,

    updatedAt:
      p.updatedAt,
  };
}

/* =========================================================
   ANALYTICS
========================================================= */

function buildAnalytics(payments) {
  const totalPayments =
    payments.length;

  const totalVolume =
    payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  const successfulPayments =
    payments.filter(
      (payment) =>
        payment.status === "success" ||
        payment.status === "approved" ||
        payment.status === "recovered"
    );

  const blockedPayments =
    payments.filter(
      (payment) =>
        payment.status === "blocked"
    );

  const heldPayments =
    payments.filter(
      (payment) =>
        payment.status === "held" ||
        payment.status === "investigating"
    );

  const recoveredPayments =
    payments.filter(
      (payment) =>
        payment.status === "recovered"
    );

  const highRiskPayments =
    payments.filter(
      (payment) =>
        payment.fraudLevel === "high"
    );

  const criticalRiskPayments =
    payments.filter(
      (payment) =>
        payment.fraudLevel === "critical"
    );

  const mediumRiskPayments =
    payments.filter(
      (payment) =>
        payment.fraudLevel === "medium"
    );

  const failedPayments =
    payments.filter(
      (payment) =>
        payment.status === "failed"
    );

  const successRate =
    totalPayments === 0
      ? 0
      : Math.round(
          (successfulPayments.length /
            totalPayments) *
            100
        );

  const recoveryRate =
    totalPayments === 0
      ? 0
      : Math.round(
          (recoveredPayments.length /
            totalPayments) *
            100
        );

  const averageFraudScore =
    totalPayments === 0
      ? 0
      : Math.round(
          payments.reduce(
            (total, payment) =>
              total +
              Number(
                payment.fraudScore || 0
              ),
            0
          ) / totalPayments
        );

  return {
    totalPayments,
    totalVolume,

    successRate,
    recoveryRate,

    successfulPayments:
      successfulPayments.length,

    failedPayments:
      failedPayments.length,

    blockedPayments:
      blockedPayments.length,

    heldPayments:
      heldPayments.length,

    recoveredPayments:
      recoveredPayments.length,

    highRiskPayments:
      highRiskPayments.length,

    criticalRiskPayments:
      criticalRiskPayments.length,

    mediumRiskPayments:
      mediumRiskPayments.length,

    averageFraudScore,
  };
}

function calculateSystemRisk(payments) {
  if (!payments.length) {
    return 0;
  }

  const totalScore =
    payments.reduce(
      (total, payment) =>
        total +
        Number(
          payment.fraudScore || 0
        ),
      0
    );

  return Math.round(
    totalScore / payments.length
  );
}

function buildFraudSummary(payments) {
  const systemRiskScore =
    calculateSystemRisk(payments);

  let riskLevel = "low";

  if (systemRiskScore >= 85) {
    riskLevel = "critical";
  } else if (systemRiskScore >= 75) {
    riskLevel = "high";
  } else if (systemRiskScore >= 35) {
    riskLevel = "medium";
  }

  return {
    systemRiskScore,

    riskLevel,

    totalAnalyzed:
      payments.length,

    averageFraudScore:
      payments.length === 0
        ? 0
        : Math.round(
            payments.reduce(
              (total, payment) =>
                total +
                Number(
                  payment.fraudScore || 0
                ),
              0
            ) / payments.length
          ),

    lowRiskCount:
      payments.filter(
        (payment) =>
          payment.fraudLevel === "low"
      ).length,

    mediumRiskCount:
      payments.filter(
        (payment) =>
          payment.fraudLevel === "medium"
      ).length,

    highRiskCount:
      payments.filter(
        (payment) =>
          payment.fraudLevel === "high"
      ).length,

    criticalRiskCount:
      payments.filter(
        (payment) =>
          payment.fraudLevel === "critical"
      ).length,

    blockedCount:
      payments.filter(
        (payment) =>
          payment.status === "blocked"
      ).length,

    heldCount:
      payments.filter(
        (payment) =>
          payment.status === "held" ||
          payment.status ===
            "investigating"
      ).length,
  };
}

/* =========================================================
   EXTERNAL AI RESULT MERGING
========================================================= */

function mergeFraudAnalysis(
  deterministic,
  externalAI
) {
  const result = {
    ...deterministic,
    externalAI,
  };

  if (!externalAI?.available) {
    return result;
  }

  /*
   * Safety guardrail is already applied
   * inside externalFraudAI.js.
   *
   * It cannot silently downgrade
   * the deterministic risk signal.
   */

  result.fraudScore =
    Math.max(
      Number(
        deterministic.fraudScore || 0
      ),
      Number(
        externalAI.fraudScore || 0
      )
    );

  if (result.fraudScore >= 85) {
    result.fraudLevel = "critical";
    result.fraudResult = "fraud";
    result.decision = "BLOCK";
  } else if (
    result.fraudScore >= 60
  ) {
    result.fraudLevel = "high";
    result.fraudResult =
      externalAI.fraudResult ===
      "real"
        ? "suspicious"
        : externalAI.fraudResult ||
          "suspicious";
    result.decision = "HOLD";
  } else if (
    result.fraudScore >= 30
  ) {
    result.fraudLevel = "medium";
    result.fraudResult =
      externalAI.fraudResult ||
      "suspicious";
    result.decision = "REVIEW";
  } else {
    result.fraudLevel = "low";
    result.fraudResult = "real";
    result.decision = "APPROVE";
  }

  result.fraudConfidence =
    Math.max(
      Number(
        deterministic.fraudConfidence ||
          0
      ),
      Number(
        externalAI.fraudConfidence ||
          0
      )
    );

  result.reasons = [
    ...new Set([
      ...(deterministic.reasons || []),
      ...(externalAI.reasons || []),
    ]),
  ].slice(0, 10);

  result.indicators = [
    ...new Set([
      ...(deterministic.indicators || []),
      ...(externalAI.indicators || []),
    ]),
  ].slice(0, 15);

  result.externalAI = externalAI;

  return result;
}


/* =========================================================
   PHASE 5-6 ENTERPRISE INTELLIGENCE
   ========================================================= */

function riskLevelFromScore(score) {
  const value = Number(score || 0);
  if (value >= 85) return "critical";
  if (value >= 60) return "high";
  if (value >= 30) return "medium";
  return "low";
}

function buildEnterpriseOverview(payments) {
  const total = payments.length;
  const successful = payments.filter((p) =>
    ["success", "approved", "recovered"].includes(p.status)
  );
  const blocked = payments.filter((p) => p.status === "blocked");
  const held = payments.filter((p) =>
    ["held", "investigating"].includes(p.status)
  );
  const recovered = payments.filter((p) => p.status === "recovered");

  const totalVolume = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const analytics = {
    totalPayments: total,
    totalVolume,
    successRate: total ? Math.round((successful.length / total) * 100) : 0,
    recoveryRate: total ? Math.round((recovered.length / total) * 100) : 0,
    blockedPayments: blocked.length,
    heldPayments: held.length,
    recoveredPayments: recovered.length,
    failedPayments: payments.filter((p) => p.status === "failed").length,
  };

  const now = new Date();
  const trends = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);

    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    const count = payments.filter((p) => {
      const created = new Date(p.createdAt || p.updatedAt || 0);
      return created >= day && created < next;
    }).length;

    trends.push({
      label: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count,
    });
  }

  const riskCounts = ["low", "medium", "high", "critical"].map((level) => ({
    level,
    count: payments.filter((p) => p.fraudLevel === level).length,
  }));
  const riskDistribution = riskCounts.map((item) => ({
    ...item,
    percent: total ? Math.round((item.count / total) * 100) : 0,
  }));

  const methodMap = new Map();
  payments.forEach((p) => {
    const key = p.method || "Unknown";
    const current = methodMap.get(key) || { method: key, count: 0, volume: 0, successful: 0 };
    current.count += 1;
    current.volume += Number(p.amount || 0);
    if (["success", "approved", "recovered"].includes(p.status)) current.successful += 1;
    methodMap.set(key, current);
  });
  const paymentMethods = Array.from(methodMap.values())
    .map((item) => ({
      ...item,
      successRate: item.count ? Math.round((item.successful / item.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const bankMap = new Map();
  payments.forEach((p) => {
    const key = p.bank || "Unknown";
    const current = bankMap.get(key) || {
      bank: key, count: 0, volume: 0, riskScore: 0, highRisk: 0,
    };
    current.count += 1;
    current.volume += Number(p.amount || 0);
    current.riskScore += Number(p.fraudScore || 0);
    if (["high", "critical"].includes(p.fraudLevel)) current.highRisk += 1;
    bankMap.set(key, current);
  });
  const bankPerformance = Array.from(bankMap.values())
    .map((item) => {
      const avgScore = item.count ? Math.round(item.riskScore / item.count) : 0;
      return { ...item, avgScore, riskLevel: riskLevelFromScore(avgScore) };
    })
    .sort((a, b) => b.volume - a.volume);

  function profileMap(field) {
    const map = new Map();
    payments.forEach((p) => {
      const name = p[field] || "Unknown";
      const current = map.get(name) || {
        name, transactions: 0, volume: 0, score: 0, highRisk: 0, failed: 0,
      };
      current.transactions += 1;
      current.volume += Number(p.amount || 0);
      current.score += Number(p.fraudScore || 0);
      if (["high", "critical"].includes(p.fraudLevel)) current.highRisk += 1;
      if (p.status === "failed") current.failed += 1;
      map.set(name, current);
    });
    return Array.from(map.values())
      .map((item) => {
        const avgScore = item.transactions ? Math.round(item.score / item.transactions) : 0;
        return { ...item, avgScore, riskLevel: riskLevelFromScore(avgScore) };
      })
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 15);
  }

  const customerProfiles = profileMap("customer");
  const merchantProfiles = profileMap("merchant");

  const alerts = [];
  if (blocked.length) {
    alerts.push({
      id: "blocked-payments",
      level: "critical",
      title: "Blocked payment activity",
      message: "Fraud controls prevented funds from being transferred.",
      count: blocked.length,
    });
  }
  if (held.length) {
    alerts.push({
      id: "held-payments",
      level: "high",
      title: "Manual review queue",
      message: "Transactions are awaiting investigation or analyst action.",
      count: held.length,
    });
  }
  const critical = payments.filter((p) => p.fraudLevel === "critical");
  if (critical.length) {
    alerts.push({
      id: "critical-risk",
      level: "critical",
      title: "Critical risk signals",
      message: "Critical-risk transactions require immediate review.",
      count: critical.length,
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: "clear",
      level: "low",
      title: "No active threats",
      message: "AegisPay has no transactions requiring immediate intervention.",
      count: 0,
    });
  }

  const avgScore = total
    ? Math.round(payments.reduce((sum, p) => sum + Number(p.fraudScore || 0), 0) / total)
    : 0;
  const threatPenalty = Math.min(
    35,
    blocked.length * 8 + critical.length * 6 + held.length * 2
  );
  const postureScore = Math.max(0, Math.min(100, 100 - Math.round(avgScore * 0.55) - threatPenalty));
  const postureLevel =
    postureScore < 40 ? "critical" :
    postureScore < 60 ? "high" :
    postureScore < 80 ? "medium" : "low";

  const auditLog = [];
  payments.forEach((payment) => {
    (payment.history || []).forEach((event, index) => {
      auditLog.push({
        id: `${payment.id}-${index}-${new Date(event.timestamp || payment.updatedAt || Date.now()).getTime()}`,
        paymentId: payment.id,
        action: event.action || "SYSTEM_EVENT",
        message: event.message || event.description || "",
        actor: event.actor || "Aegis AI",
        timestamp: event.timestamp || payment.updatedAt,
        fraudLevel: payment.fraudLevel,
        fraudScore: payment.fraudScore,
      });
    });
  });
  auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    generatedAt: new Date(),
    analytics,
    trends,
    riskDistribution,
    paymentMethods,
    bankPerformance,
    customerProfiles,
    merchantProfiles,
    alerts,
    securityPosture: {
      score: postureScore,
      level: postureLevel,
      summary:
        postureLevel === "low"
          ? "Controls are operating within a healthy risk envelope."
          : "Elevated transaction risk is being actively monitored.",
    },
    auditLog: auditLog.slice(0, 80),
  };
}

app.get("/api/enterprise/overview", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: buildEnterpriseOverview(payments),
    });
  } catch (error) {
    console.error("GET /api/enterprise/overview:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/enterprise/health", (req, res) => {
  const memory = process.memoryUsage();
  const dbConnected = mongoose.connection.readyState === 1;

  function humanUptime(seconds) {
    const value = Math.floor(seconds);
    const days = Math.floor(value / 86400);
    const hours = Math.floor((value % 86400) / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  res.json({
    success: true,
    data: {
      version: "6.0.0",
      environment: process.env.NODE_ENV || "development",
      status: dbConnected ? "operational" : "degraded",
      uptimeSeconds: process.uptime(),
      uptimeHuman: humanUptime(process.uptime()),
      database: {
        status: dbConnected ? "Connected" : "Disconnected",
        latencyMs: null,
      },
      realtime: {
        status: "Connected",
        type: "SSE",
        connectedClients: sseClients.size,
      },
      fraudEngine: "Active",
      api: {
        status: "Operational",
      },
      runtime: {
        node: process.version,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      },
      services: [
        { name: "Payment API", status: "Operational", detail: "REST transaction gateway" },
        { name: "Fraud Intelligence", status: "Operational", detail: "Deterministic risk engine" },
        { name: "MongoDB", status: dbConnected ? "Operational" : "Degraded", detail: "Persistent payment ledger" },
        { name: "Real-time Events", status: "Operational", detail: `${sseClients.size} SSE client(s)` },
        { name: "Recovery Engine", status: "Operational", detail: "Transaction recovery workflow" },
        { name: "Audit Trail", status: "Operational", detail: "Payment lifecycle history" },
      ],
    },
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "AegisPay Enterprise API is running",
    version: "6.0.0",
    realtime: "SSE",
    externalFraudAI:
      process.env.OPENAI_FRAUD_AI_ENABLED ===
      "true"
        ? "enabled"
        : "disabled",
    database:
      mongoose.connection.readyState ===
      1
        ? "connected"
        : "disconnected",
  });
});

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      service: "AegisPay",
      phase: "Phase 6",
      status: "operational",

      realtime: {
        type: "SSE",
        endpoint: "/api/events",
        connectedClients:
          sseClients.size,
      },

      externalFraudAI: {
        enabled:
          process.env.OPENAI_FRAUD_AI_ENABLED ===
          "true",

        provider: "OpenAI",

        model:
          process.env.OPENAI_FRAUD_MODEL ||
          "gpt-4o-mini",
      },

      database:
        mongoose.connection.readyState ===
        1
          ? "connected"
          : "disconnected",

      timestamp:
        new Date(),
    });
  }
);

/* =========================================================
   GET PAYMENTS
========================================================= */

app.get(
  "/api/payments",
  async (req, res) => {
    try {
      const payments =
        await Payment.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      const analytics =
        buildAnalytics(payments);

      res.json({
        success: true,

        data: {
          transactions:
            payments,

          analytics,
        },
      });
    } catch (error) {
      console.error(
        "GET /api/payments:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   CREATE PAYMENT
   LOCAL FRAUD ENGINE + EXTERNAL OPENAI AI
========================================================= */

app.post(
  "/api/payments",
  async (req, res) => {
    try {
      const {
        customer,
        merchant,
        amount,
        bank,
        method,
        paymentType,
        metadata,
      } = req.body;

      const idempotencyKey = req.get("Idempotency-Key")?.trim();

      if (idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey });

        if (existingPayment) {
          return res.status(200).json({
            success: true,
            idempotent: true,
            message: "Existing payment returned for this idempotency key",
            data: {
              payment: paymentSnapshot(existingPayment),
            },
          });
        }
      }

      if (
        !customer ||
        !merchant ||
        !amount ||
        !bank
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all required fields",
        });
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be greater than zero",
        });
      }

      const type =
        String(
          paymentType || "real"
        ).toLowerCase();

      const normalizedMetadata = {
        device:
          metadata?.device ||
          "Web Browser",

        ipAddress:
          metadata?.ipAddress ||
          "Localhost",

        location:
          metadata?.location ||
          "India",

        channel:
          metadata?.channel ||
          "Web",
      };

      const route =
        method === "UPI"
          ? "UPI Primary"
          : "Primary Payment Route";

      /* -----------------------------------------------------
         STEP 1: DETERMINISTIC FRAUD ENGINE
      ----------------------------------------------------- */

      const deterministicAnalysis =
        calculateFraudRisk({
          customer,
          merchant,
          amount:
            numericAmount,
          bank,
          method:
            method || "UPI",
          paymentType:
            type,
          metadata:
            normalizedMetadata,
        });

      /* -----------------------------------------------------
         STEP 2: EXTERNAL OPENAI FRAUD AI
      ----------------------------------------------------- */

      const externalAI =
        await analyzeWithExternalAI(
          {
            customer,
            merchant,
            amount:
              numericAmount,
            bank,
            method:
              method || "UPI",
            paymentType:
              type,
            route,
            metadata:
              normalizedMetadata,
          },
          deterministicAnalysis
        );

      /* -----------------------------------------------------
         STEP 3: MERGE RESULTS
      ----------------------------------------------------- */

      const analysis =
        mergeFraudAnalysis(
          deterministicAnalysis,
          externalAI
        );

      /* -----------------------------------------------------
         STEP 4: FINAL PAYMENT DECISION
      ----------------------------------------------------- */

      let finalStatus = "success";
      let transferred = true;
      let incidentCreated = false;
      let incidentStatus = "none";
      let investigationStatus =
        "Not Required";
      let recoveryEligible = false;
      let recoveryStatus =
        "Not Eligible";

      if (
        analysis.decision === "BLOCK"
      ) {
        finalStatus = "blocked";
        transferred = false;
        incidentCreated = true;
        incidentStatus =
          "fraud_confirmed";
        investigationStatus =
          "Fraud Confirmed";
        recoveryEligible = false;
        recoveryStatus =
          "Not Eligible";
      } else if (
        analysis.decision === "HOLD"
      ) {
        finalStatus = "held";
        transferred = false;
        incidentCreated = true;
        incidentStatus = "open";
        investigationStatus = "Open";

        recoveryEligible =
          analysis.fraudResult ===
            "suspicious" &&
          analysis.fraudLevel !==
            "critical";

        recoveryStatus =
          recoveryEligible
            ? "Eligible"
            : "Not Eligible";
      } else if (
        analysis.decision === "REVIEW"
      ) {
        finalStatus = "held";
        transferred = false;
        incidentCreated = true;
        incidentStatus = "open";
        investigationStatus = "Open";

        recoveryEligible = true;
        recoveryStatus =
          "Eligible";
      } else {
        finalStatus = "success";
        transferred = true;
        incidentCreated = false;
        incidentStatus = "none";
        investigationStatus =
          "Not Required";
        recoveryEligible = false;
        recoveryStatus =
          "Not Eligible";
      }

      const transferReference =
        transferred
          ? createTransferReference()
          : "";

      /* -----------------------------------------------------
         STEP 5: CREATE DATABASE PAYMENT
      ----------------------------------------------------- */

      const payment =
        await Payment.create({
          id: createPaymentId(),
          idempotencyKey: idempotencyKey || null,

          customer,

          merchant,

          amount:
            numericAmount,

          bank,

          route,

          status:
            finalStatus,

          method:
            method || "UPI",

          paymentType:
            type,

          time: "Just now",

          risk:
            analysis.fraudLevel,

          fraudScore:
            analysis.fraudScore,

          fraudLevel:
            analysis.fraudLevel,

          fraudConfidence:
            analysis.fraudConfidence,

          fraudResult:
            analysis.fraudResult,

          fraudReasons:
            analysis.reasons,

          fraudIndicators:
            analysis.indicators,

          investigationStatus,

          incidentCreated,

          incidentStatus,

          analystAction:
            "None",

          transferStatus:
            transferred
              ? "Transferred"
              : "Not Transferred",

          transferred,

          transferReference,

          transferAt:
            transferred
              ? new Date()
              : null,

          recoveryEligible,

          recoveryStatus,

          recoveryAttempts: 0,

          failureReason:
            transferred
              ? ""
              : "Payment held pending fraud review",

          metadata:
            normalizedMetadata,

          externalAI,

          history: [
            {
              action:
                "PAYMENT_CREATED",

              message:
                "Payment created successfully",

              actor:
                "AegisPay Gateway",

              timestamp:
                new Date(),
            },

            {
              action:
                "FRAUD_ENGINE_ANALYSIS",

              message:
                `Deterministic Fraud Engine completed analysis: ${deterministicAnalysis.fraudResult.toUpperCase()} - Risk score ${deterministicAnalysis.fraudScore}/100`,

              actor:
                "Aegis AI",

              timestamp:
                new Date(),
            },

            {
              action:
                "EXTERNAL_AI_ANALYSIS",

              message:
                externalAI.available
                  ? `OpenAI external fraud analysis completed. Model: ${externalAI.model}. AI score: ${externalAI.aiScore}/100. Final score: ${analysis.fraudScore}/100.`
                  : `External AI unavailable. Deterministic engine retained. ${externalAI.message || ""}`,

              actor:
                externalAI.available
                  ? "OpenAI Fraud AI"
                  : "Aegis AI",

              timestamp:
                new Date(),
            },

            {
              action:
                transferred
                  ? "AMOUNT_TRANSFERRED"
                  : finalStatus ===
                    "blocked"
                  ? "PAYMENT_BLOCKED"
                  : "PAYMENT_HELD",

              message:
                transferred
                  ? "Payment approved and amount transferred"
                  : finalStatus ===
                    "blocked"
                  ? "Payment blocked. Amount was NOT transferred."
                  : "Payment held pending fraud investigation",

              actor:
                transferred
                  ? "Payment Gateway"
                  : "Aegis AI",

              timestamp:
                new Date(),
            },
          ],

          investigationHistory:
            incidentCreated
              ? [
                  {
                    action:
                      "INVESTIGATION_OPENED",

                    message:
                      "Fraud investigation opened automatically from combined risk analysis",

                    actor:
                      externalAI.available
                        ? "OpenAI Fraud AI"
                        : "Aegis AI",

                    timestamp:
                      new Date(),
                  },
                ]
              : [],
        });

      /* -----------------------------------------------------
         STEP 6: REAL-TIME SSE EVENTS
      ----------------------------------------------------- */

      const snapshot =
        paymentSnapshot(
          payment
        );

      broadcastEvent(
        "PAYMENT_CREATED",
        snapshot
      );

      broadcastEvent(
        "FRAUD_ANALYZED",
        {
          paymentId:
            payment.id,

          fraudScore:
            payment.fraudScore,

          fraudLevel:
            payment.fraudLevel,

          fraudConfidence:
            payment.fraudConfidence,

          fraudResult:
            payment.fraudResult,

          decision:
            analysis.decision,

          reasons:
            payment.fraudReasons,

          indicators:
            payment.fraudIndicators,

          externalAI: {
            available:
              externalAI.available,

            provider:
              externalAI.provider,

            model:
              externalAI.model,

            aiScore:
              externalAI.aiScore,

            aiLevel:
              externalAI.aiLevel,

            aiDecision:
              externalAI.aiDecision,

            requestId:
              externalAI.requestId,

            analyzedAt:
              externalAI.analyzedAt,
          },
        }
      );

      if (externalAI.available) {
        broadcastEvent(
          "EXTERNAL_AI_ANALYZED",
          {
            paymentId:
              payment.id,

            provider:
              externalAI.provider,

            model:
              externalAI.model,

            aiScore:
              externalAI.aiScore,

            finalScore:
              analysis.fraudScore,

            aiDecision:
              externalAI.aiDecision,

            finalDecision:
              analysis.decision,

            summary:
              externalAI.summary,

            requestId:
              externalAI.requestId,
          }
        );
      }

      if (
        payment.incidentCreated
      ) {
        broadcastEvent(
          "INCIDENT_CREATED",
          snapshot
        );
      }

      if (
        payment.transferred
      ) {
        broadcastEvent(
          "AMOUNT_TRANSFERRED",
          snapshot
        );

        broadcastEvent(
          "PAYMENT_APPROVED",
          snapshot
        );
      }

      if (
        payment.status ===
        "blocked"
      ) {
        broadcastEvent(
          "PAYMENT_BLOCKED",
          snapshot
        );
      }

      /* -----------------------------------------------------
         STEP 7: RESPONSE
      ----------------------------------------------------- */

      res.status(201).json({
        success: true,

        message:
          transferred
            ? "Payment approved and transferred"
            : finalStatus ===
              "blocked"
            ? "Payment blocked by fraud controls"
            : "Payment held for fraud investigation",

        data: {
          payment,

          analysis: {
            fraudScore:
              analysis.fraudScore,

            fraudLevel:
              analysis.fraudLevel,

            fraudConfidence:
              analysis.fraudConfidence,

            fraudResult:
              analysis.fraudResult,

            reasons:
              analysis.reasons,

            indicators:
              analysis.indicators,

            status:
              finalStatus,

            transferred,

            decision:
              analysis.decision,

            externalAI: {
              available:
                externalAI.available,

              provider:
                externalAI.provider,

              model:
                externalAI.model,

              aiScore:
                externalAI.aiScore,

              aiLevel:
                externalAI.aiLevel,

              aiDecision:
                externalAI.aiDecision,

              summary:
                externalAI.summary,

              requestId:
                externalAI.requestId,

              analyzedAt:
                externalAI.analyzedAt,

              guardrailApplied:
                externalAI.guardrailApplied,

              error:
                externalAI.error || null,
            },
          },
        },
      });
    } catch (error) {
      if (error?.code === 11000 && idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey });

        if (existingPayment) {
          return res.status(200).json({
            success: true,
            idempotent: true,
            message: "Existing payment returned for this idempotency key",
            data: {
              payment: paymentSnapshot(existingPayment),
            },
          });
        }
      }

      console.error(
        "POST /api/payments:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   PAYMENT DETAILS
========================================================= */

app.get(
  "/api/payments/:id/time-machine",
  async (req, res) => {
    try {
      const payment = await Payment.findOne({ id: req.params.id }).lean();

      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }

      const score = Number(payment.fraudScore || 0);
      const thresholds = [30, 60, 75, 85];
      const selectedThreshold = Number(req.query.threshold || 60);
      const decisionFor = (value) => {
        if (score >= 85) return "BLOCK";
        if (score >= value) return value >= 75 ? "HOLD" : "REVIEW";
        return "APPROVE";
      };

      const policyScenarios = thresholds.map((threshold) => ({
        threshold,
        decision: decisionFor(threshold),
        customerFriction: threshold <= 30 ? "High" : threshold <= 60 ? "Medium" : "Low",
        fraudExposure: score >= threshold ? "Reduced" : "Elevated",
      }));

      const failureScenarios = [
        { name: "Bank timeout", result: "Payment remains pending; retry safely", control: "Idempotent retry", severity: "medium" },
        { name: "Duplicate request", result: "Return the original payment", control: "Idempotency-Key", severity: "high" },
        { name: "Recovery failure", result: "Keep the incident open and record another attempt", control: "Audited recovery history", severity: "medium" },
      ];

      const timeline = [
        ...(payment.history || []),
        ...(payment.investigationHistory || []),
      ]
        .map((item) => ({
          action: item.action,
          message: item.message || item.description || "Operational event",
          actor: item.actor || "Aegis AI",
          timestamp: item.timestamp,
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const amount = Number(payment.amount || 0);

      res.json({
        success: true,
        data: {
          payment: paymentSnapshot(payment),
          actual: {
            score,
            level: payment.fraudLevel,
            decision: payment.status === "blocked" ? "BLOCK" : payment.status === "held" ? "HOLD" : "APPROVE",
          },
          selectedThreshold,
          selectedDecision: decisionFor(selectedThreshold),
          impact: {
            amountAtRisk: amount,
            protectedAmount: score >= selectedThreshold ? amount : 0,
            estimatedCustomerFriction: score >= selectedThreshold ? "Review required" : "Low friction",
          },
          policyScenarios,
          failureScenarios,
          timeline,
          sla: {
            status: payment.incidentCreated && payment.incidentStatus === "open" ? "Needs attention" : "Within control",
            target: "24h investigation target",
          },
        },
      });
    } catch (error) {
      console.error("GET /api/payments/:id/time-machine:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

app.get(
  "/api/payments/:id",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOne({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error(
        "GET /api/payments/:id:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   FRAUD INTELLIGENCE
========================================================= */

app.get(
  "/api/fraud",
  async (req, res) => {
    try {
      const payments =
        await Payment.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      const summary =
        buildFraudSummary(
          payments
        );

      const queue =
        payments
          .filter(
            (payment) =>
              payment.fraudLevel ===
                "medium" ||
              payment.fraudLevel ===
                "high" ||
              payment.fraudLevel ===
                "critical"
          )
          .slice(0, 50);

      res.json({
        success: true,

        data: {
          ...summary,

          externalAI: {
            enabled:
              process.env.OPENAI_FRAUD_AI_ENABLED ===
              "true",

            provider: "OpenAI",

            model:
              process.env.OPENAI_FRAUD_MODEL ||
              "gpt-4o-mini",
          },

          queue,
        },
      });
    } catch (error) {
      console.error(
        "GET /api/fraud:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   ACTIVITY FEED
========================================================= */

app.get(
  "/api/activity",
  async (req, res) => {
    try {
      const payments =
        await Payment.find()
          .sort({
            updatedAt: -1,
          })
          .limit(100)
          .lean();

      const activity = [];

      payments.forEach(
        (payment) => {
          if (
            payment.history &&
            payment.history.length
          ) {
            payment.history.forEach(
              (event, index) => {
                activity.push({
                  id:
                    `${payment._id}-${index}-${new Date(event.timestamp).getTime()}`,

                  paymentId:
                    payment.id,

                  customer:
                    payment.customer,

                  merchant:
                    payment.merchant,

                  amount:
                    payment.amount,

                  action:
                    event.action,

                  message:
                    event.message ||
                    event.description ||
                    "",

                  actor:
                    event.actor ||
                    "Aegis AI",

                  timestamp:
                    event.timestamp,

                  status:
                    payment.status,

                  fraudLevel:
                    payment.fraudLevel,

                  fraudScore:
                    payment.fraudScore,
                });
              }
            );
          }
        }
      );

      activity.sort(
        (a, b) =>
          new Date(
            b.timestamp
          ) -
          new Date(
            a.timestamp
          )
      );

      res.json({
        success: true,

        data:
          activity.slice(
            0,
            100
          ),
      });
    } catch (error) {
      console.error(
        "GET /api/activity:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   INCIDENTS
========================================================= */

app.get(
  "/api/incidents",
  async (req, res) => {
    try {
      const incidents =
        await Payment.find({
          incidentCreated: true,
        }).sort({
          updatedAt: -1,
        });

      res.json({
        success: true,

        data: incidents,
      });
    } catch (error) {
      console.error(
        "GET /api/incidents:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   INVESTIGATION
========================================================= */

app.post(
  "/api/payments/:id/investigate",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOne({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      const wasBlocked =
        payment.status === "blocked";

      if (
        payment.status ===
          "approved" ||
        payment.status ===
          "recovered" ||
        payment.status ===
          "success"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This payment is already resolved",
        });
      }

      payment.status =
        "investigating";

      payment.incidentCreated =
        true;

      payment.incidentStatus =
        "investigating";

      payment.investigationStatus =
        "Investigating";

      payment.analystAction =
        wasBlocked
          ? "Re-investigation requested"
          : "Sent to Fraud AI";

      addHistory(
        payment,
        wasBlocked
          ? "BLOCKED_PAYMENT_REOPENED"
          : "INCIDENT_INVESTIGATION",
        wasBlocked
          ? "Blocked payment reopened for detailed fraud investigation. No amount was transferred."
          : "Incident sent to Aegis AI Fraud Detection for analysis",
        "Fraud Analyst"
      );

      addInvestigationHistory(
        payment,
        wasBlocked
          ? "BLOCKED_PAYMENT_REINVESTIGATION"
          : "INVESTIGATION_STARTED",
        wasBlocked
          ? "Previously blocked payment reopened for detailed investigation"
          : "Fraud investigation started",
        "Fraud Analyst"
      );

      await payment.save();

      const snapshot =
        paymentSnapshot(
          payment
        );

      broadcastEvent(
        "INVESTIGATION_STARTED",
        snapshot
      );

      res.json({
        success: true,

        message:
          wasBlocked
            ? "Blocked payment reopened for detailed fraud investigation"
            : "Payment sent to Fraud AI",

        data: payment,
      });
    } catch (error) {
      console.error(
        "POST /investigate:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   APPROVE
========================================================= */

app.post(
  "/api/payments/:id/approve",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOne({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      if (
        payment.status ===
        "blocked"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A blocked payment cannot be approved",
        });
      }

      payment.status =
        "approved";

      payment.transferred =
        true;

      payment.fraudResult =
        "real";

      payment.fraudLevel =
        "low";

      payment.risk =
        "low";

      payment.fraudScore =
        Math.min(
          Number(
            payment.fraudScore || 0
          ),
          20
        );

      payment.fraudConfidence =
        Math.max(
          Number(
            payment.fraudConfidence ||
              0
          ),
          95
        );

      payment.fraudReasons = [
        "Payment reviewed and determined legitimate",
        "No confirmed fraudulent activity",
        "Analyst approval completed",
      ];

      payment.fraudIndicators = [
        "Manual review completed",
        "Legitimate payment confirmed",
      ];

      payment.incidentStatus =
        "resolved";

      payment.investigationStatus =
        "Resolved";

      payment.analystAction =
        "Approved";

      payment.transferStatus =
        "Transferred";

      payment.transferReference =
        payment.transferReference ||
        createTransferReference();

      payment.transferAt =
        new Date();

      payment.recoveryEligible =
        false;

      payment.recoveryStatus =
        "Not Eligible";

      payment.failureReason =
        "";

      addHistory(
        payment,
        "PAYMENT_APPROVED",
        "Payment marked as legitimate. Amount transferred successfully.",
        "Fraud Analyst"
      );

      addInvestigationHistory(
        payment,
        "INVESTIGATION_RESOLVED",
        "Payment approved after fraud review",
        "Fraud Analyst"
      );

      await payment.save();

      const snapshot =
        paymentSnapshot(
          payment
        );

      broadcastEvent(
        "PAYMENT_APPROVED",
        snapshot
      );

      broadcastEvent(
        "AMOUNT_TRANSFERRED",
        snapshot
      );

      res.json({
        success: true,

        message:
          "Payment approved and amount transferred",

        data: payment,
      });
    } catch (error) {
      console.error(
        "POST /approve:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   BLOCK
========================================================= */

app.post(
  "/api/payments/:id/block",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOne({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      if (
        payment.status ===
        "recovered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A recovered payment cannot be blocked",
        });
      }

      payment.status =
        "blocked";

      payment.transferred =
        false;

      payment.fraudResult =
        "blocked";

      payment.fraudLevel =
        "high";

      payment.risk =
        "high";

      payment.fraudScore =
        Math.max(
          Number(
            payment.fraudScore || 0
          ),
          90
        );

      payment.fraudConfidence =
        Math.max(
          Number(
            payment.fraudConfidence ||
              0
          ),
          97
        );

      payment.fraudReasons = [
        "Fraud confirmed after investigation",
        "Payment blocked by fraud controls",
        "Transaction identified as high risk",
      ];

      payment.fraudIndicators = [
        "Fraud confirmed",
        "High-risk transaction",
        "Amount not transferred",
      ];

      payment.incidentCreated =
        true;

      payment.incidentStatus =
        "fraud_confirmed";

      payment.investigationStatus =
        "Fraud Confirmed";

      payment.analystAction =
        "Blocked";

      payment.transferStatus =
        "Not Transferred";

      payment.transferReference =
        "";

      payment.transferAt =
        null;

      payment.recoveryEligible =
        false;

      payment.recoveryStatus =
        "Not Eligible";

      payment.failureReason =
        "Fraud confirmed. Payment blocked before transfer.";

      addHistory(
        payment,
        "PAYMENT_BLOCKED",
        "Fraud confirmed. Payment blocked. Amount was NOT transferred.",
        "Fraud Analyst"
      );

      addInvestigationHistory(
        payment,
        "FRAUD_CONFIRMED",
        "Fraud confirmed and payment blocked",
        "Fraud Analyst"
      );

      await payment.save();

      const snapshot =
        paymentSnapshot(
          payment
        );

      broadcastEvent(
        "PAYMENT_BLOCKED",
        snapshot
      );

      res.json({
        success: true,

        message:
          "Payment blocked. Amount was not transferred.",

        data: payment,
      });
    } catch (error) {
      console.error(
        "POST /block:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   RECOVERY ENGINE
========================================================= */

app.post(
  "/api/payments/:id/recover",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOne({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      if (
        payment.status ===
        "blocked"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Blocked fraudulent payments cannot be recovered",
        });
      }

      if (
        payment.status ===
        "recovered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment has already been recovered",
        });
      }

      if (
        payment.status !==
          "failed" &&
        payment.status !==
          "held" &&
        payment.status !==
          "investigating"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment is not currently eligible for recovery",
        });
      }

      if (
        payment.recoveryEligible ===
        false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This payment is not marked as recovery eligible",
        });
      }

      payment.recoveryAttempts =
        Number(
          payment.recoveryAttempts ||
            0
        ) + 1;

      const route =
        payment.route ||
        "Recovery Payment Route";

      const reference =
        createRecoveryReference();

      payment.recoveryHistory.push({
        attemptedAt:
          new Date(),

        route,

        status:
          "successful",

        message:
          `Recovery successful. Reference ${reference}.`,
      });

      payment.status =
        "recovered";

      payment.transferred =
        true;

      payment.transferStatus =
        "Recovered & Transferred";

      payment.transferReference =
        reference;

      payment.transferAt =
        new Date();

      payment.recoveredAt =
        new Date();

      payment.recoveryEligible =
        false;

      payment.recoveryStatus =
        "Recovered";

      payment.incidentStatus =
        "resolved";

      payment.investigationStatus =
        "Resolved";

      payment.analystAction =
        "Recovered";

      payment.failureReason =
        "";

      addHistory(
        payment,
        "PAYMENT_RECOVERED",
        `Recovery completed successfully. Amount transferred using ${route}. Reference: ${reference}`,
        "Recovery Engine"
      );

      addInvestigationHistory(
        payment,
        "RECOVERY_COMPLETED",
        "Payment recovery completed successfully",
        "Recovery Engine"
      );

      await payment.save();

      const snapshot =
        paymentSnapshot(
          payment
        );

      broadcastEvent(
        "PAYMENT_RECOVERED",
        snapshot
      );

      broadcastEvent(
        "AMOUNT_TRANSFERRED",
        snapshot
      );

      res.json({
        success: true,

        message:
          "Payment recovered successfully",

        data: payment,
      });
    } catch (error) {
      console.error(
        "POST /recover:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   FAILURE AND WEBHOOK SIMULATORS
========================================================= */

app.post("/api/payments/:id/simulate", async (req, res) => {
  try {
    const payment = await Payment.findOne({ id: req.params.id });
    const scenario = String(req.body?.scenario || "").toLowerCase();

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (!["timeout", "recovery_failure"].includes(scenario)) {
      return res.status(400).json({ success: false, message: "Unsupported simulation scenario" });
    }

    if (scenario === "timeout") {
      payment.status = "pending";
      payment.transferred = false;
      payment.transferStatus = "Awaiting bank response";
      payment.failureReason = "Simulated bank timeout";
      addHistory(payment, "PAYMENT_TIMEOUT", "Bank response timed out; payment is safe to retry with the same idempotency key", "Failure Simulator");
      broadcastEvent("PAYMENT_TIMEOUT", paymentSnapshot(payment));
    }

    if (scenario === "recovery_failure") {
      payment.recoveryAttempts = Number(payment.recoveryAttempts || 0) + 1;
      payment.recoveryEligible = true;
      payment.recoveryStatus = "Retry Required";
      payment.failureReason = "Simulated recovery route failure";
      payment.status = "held";
      payment.incidentCreated = true;
      payment.incidentStatus = "open";
      payment.recoveryHistory.push({
        attemptedAt: new Date(),
        route: payment.route || "Recovery Payment Route",
        status: "failed",
        message: "Simulated recovery failure; operator retry required",
      });
      addHistory(payment, "RECOVERY_FAILED", "Recovery route failed; incident remains open for retry", "Failure Simulator");
      broadcastEvent("PAYMENT_RECOVERY_FAILED", paymentSnapshot(payment));
    }

    await payment.save();
    res.json({ success: true, message: `Simulation completed: ${scenario}`, data: paymentSnapshot(payment) });
  } catch (error) {
    console.error("POST /api/payments/:id/simulate:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/webhooks/simulate", async (req, res) => {
  try {
    const { paymentId, eventType } = req.body || {};
    const payment = await Payment.findOne({ id: paymentId });
    const allowedEvents = ["payment.authorized", "payment.failed", "payment.captured", "refund.processed"];

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (!allowedEvents.includes(eventType)) {
      return res.status(400).json({ success: false, message: "Unsupported webhook event" });
    }

    addHistory(payment, "WEBHOOK_RECEIVED", `Simulated webhook received: ${eventType}`, "Webhook Simulator");
    await payment.save();
    const snapshot = paymentSnapshot(payment);
    broadcastEvent("WEBHOOK_RECEIVED", { paymentId, eventType, payment: snapshot });

    res.json({ success: true, message: `Webhook simulated: ${eventType}`, data: snapshot });
  } catch (error) {
    console.error("POST /api/webhooks/simulate:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* =========================================================
   DELETE
========================================================= */

app.delete(
  "/api/payments/:id",
  async (req, res) => {
    try {
      const payment =
        await Payment.findOneAndDelete({
          id: req.params.id,
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found",
        });
      }

      broadcastEvent(
        "PAYMENT_DELETED",
        {
          paymentId:
            payment.id,

          customer:
            payment.customer,

          merchant:
            payment.merchant,

          amount:
            payment.amount,
        }
      );

      res.json({
        success: true,

        message:
          "Payment deleted",
      });
    } catch (error) {
      console.error(
        "DELETE /api/payments/:id:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from .env"
      );
    }

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      "MongoDB connected successfully"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `AegisPay Enterprise backend running on http://localhost:${PORT}`
        );

        console.log(
          "Fraud Intelligence Engine: ACTIVE"
        );

        console.log(
          `External Fraud AI: ${
            process.env.OPENAI_FRAUD_AI_ENABLED ===
            "true"
              ? "ACTIVE"
              : "DISABLED"
          }`
        );

        if (
          process.env.OPENAI_FRAUD_AI_ENABLED ===
          "true"
        ) {
          console.log(
            `External AI Provider: OpenAI`
          );

          console.log(
            `External AI Model: ${
              process.env.OPENAI_FRAUD_MODEL ||
              "gpt-4o-mini"
            }`
          );
        }

        console.log(
          "Real-time SSE: ACTIVE at /api/events"
        );

        console.log(
          "Enterprise APIs: /api/payments /api/fraud /api/activity /api/incidents /api/enterprise/*"
        );
      }
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();