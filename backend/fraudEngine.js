/*
 * AegisPay Phase 4
 * Fraud Intelligence Engine
 *
 * Explainable, deterministic risk engine.
 * Designed so a future ML/AI model can replace
 * calculateFraudRisk() without changing the API layer.
 */

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizePayment(payment = {}) {
  return {
    amount: Number(payment.amount || 0),
    paymentType: String(payment.paymentType || "real").toLowerCase(),
    method: String(payment.method || "UPI").toUpperCase(),
    bank: String(payment.bank || "Unknown"),
    merchant: String(payment.merchant || "Unknown"),
    customer: String(payment.customer || "Unknown"),
    channel: String(payment.metadata?.channel || "Web"),
    device: String(payment.metadata?.device || "Unknown"),
    location: String(payment.metadata?.location || "Unknown"),
  };
}

function calculateRiskFeatures(payment) {
  const p = normalizePayment(payment);
  const features = [];

  if (p.paymentType === "fake" || p.paymentType === "fraud") {
    features.push({
      name: "Fraud simulation profile",
      score: 55,
      severity: "critical",
    });
  }

  if (p.paymentType === "suspicious") {
    features.push({
      name: "Suspicious payment profile",
      score: 28,
      severity: "medium",
    });
  }

  if (p.amount >= 1000000) {
    features.push({
      name: "Very high transaction amount",
      score: 18,
      severity: "high",
    });
  } else if (p.amount >= 100000) {
    features.push({
      name: "High transaction amount",
      score: 10,
      severity: "medium",
    });
  } else if (p.amount >= 50000) {
    features.push({
      name: "Elevated transaction amount",
      score: 5,
      severity: "low",
    });
  }

  if (p.location === "Unknown" || p.device === "Unknown") {
    features.push({
      name: "Limited device/location intelligence",
      score: 2,
      severity: "low",
    });
  }

  if (p.channel === "Web") {
    features.push({
      name: "Web payment channel",
      score: 0,
      severity: "low",
    });
  }

  return features;
}

function classifyRisk(score) {
  if (score >= 85) return "critical";
  if (score >= 75) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function determineDecision(level) {
  switch (level) {
    case "critical":
      return {
        result: "fraud",
        status: "held",
        transferred: false,
        investigationStatus: "Open",
        incidentCreated: true,
        incidentStatus: "open",
        recoveryEligible: false,
        recoveryStatus: "Not Eligible",
        decision: "HOLD",
      };
    case "high":
      return {
        result: "fraud",
        status: "held",
        transferred: false,
        investigationStatus: "Open",
        incidentCreated: true,
        incidentStatus: "open",
        recoveryEligible: false,
        recoveryStatus: "Not Eligible",
        decision: "HOLD",
      };
    case "medium":
      return {
        result: "suspicious",
        status: "held",
        transferred: false,
        investigationStatus: "Open",
        incidentCreated: true,
        incidentStatus: "open",
        recoveryEligible: true,
        recoveryStatus: "Eligible",
        decision: "REVIEW",
      };
    default:
      return {
        result: "real",
        status: "success",
        transferred: true,
        investigationStatus: "Not Required",
        incidentCreated: false,
        incidentStatus: "none",
        recoveryEligible: false,
        recoveryStatus: "Not Eligible",
        decision: "APPROVE",
      };
  }
}

function calculateConfidence(score, level) {
  if (level === "critical") return Math.min(99, 92 + Math.round(score / 20));
  if (level === "high") return Math.min(98, 88 + Math.round(score / 20));
  if (level === "medium") return Math.min(94, 80 + Math.round(score / 25));
  return Math.min(99, 94 + Math.round((35 - score) / 10));
}

function calculateFraudRisk(payment = {}) {
  const p = normalizePayment(payment);
  const features = calculateRiskFeatures(p);

  let score = 8;
  for (const feature of features) score += feature.score;

  if (p.paymentType === "real") score = Math.min(score, 20);
  if (p.paymentType === "suspicious") score = Math.max(score, 67);
  if (p.paymentType === "fake" || p.paymentType === "fraud") score = Math.max(score, 96);

  score = clamp(Math.round(score));

  const fraudLevel = classifyRisk(score);
  const decision = determineDecision(fraudLevel);
  const confidence = calculateConfidence(score, fraudLevel);

  const reasons = features
    .filter((feature) => feature.score > 0)
    .map((feature) => feature.name);

  if (fraudLevel === "low") {
    reasons.push("No significant fraud indicators detected");
  } else if (fraudLevel === "medium") {
    reasons.push("Transaction requires manual review");
  } else {
    reasons.push("High-risk transaction requires investigation");
  }

  const indicators = features.map(
    (feature) => `${feature.name} (+${feature.score})`
  );

  if (!indicators.length) indicators.push("Normal transaction pattern");

  return {
    fraudScore: score,
    fraudLevel,
    fraudConfidence: confidence,
    fraudResult: decision.result,
    status: decision.status,
    transferred: decision.transferred,
    investigationStatus: decision.investigationStatus,
    incidentCreated: decision.incidentCreated,
    incidentStatus: decision.incidentStatus,
    recoveryEligible: decision.recoveryEligible,
    recoveryStatus: decision.recoveryStatus,
    reasons,
    indicators,
    features,
    decision: decision.decision,
  };
}

module.exports = {
  calculateFraudRisk,
  calculateRiskFeatures,
  classifyRisk,
};
