const OpenAI = require("openai");

let client = null;

/* =========================================================
   OPENAI CLIENT
========================================================= */

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

/* =========================================================
   STRUCTURED OUTPUT SCHEMA
========================================================= */

const FRAUD_SCHEMA = {
  type: "object",
  additionalProperties: false,

  properties: {
    fraudScore: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },

    fraudLevel: {
      type: "string",
      enum: [
        "low",
        "medium",
        "high",
        "critical",
      ],
    },

    fraudConfidence: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },

    fraudResult: {
      type: "string",
      enum: [
        "real",
        "suspicious",
        "fraud",
      ],
    },

    decision: {
      type: "string",
      enum: [
        "APPROVE",
        "REVIEW",
        "HOLD",
        "BLOCK",
      ],
    },

    reasons: {
      type: "array",
      items: {
        type: "string",
      },
    },

    indicators: {
      type: "array",
      items: {
        type: "string",
      },
    },

    summary: {
      type: "string",
    },

    recommendedAction: {
      type: "string",
      enum: [
        "ALLOW",
        "MANUAL_REVIEW",
        "HOLD",
        "BLOCK",
      ],
    },
  },

  required: [
    "fraudScore",
    "fraudLevel",
    "fraudConfidence",
    "fraudResult",
    "decision",
    "reasons",
    "indicators",
    "summary",
    "recommendedAction",
  ],
};

/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

function normalizeLevel(score) {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function normalizeDecision(score) {
  if (score >= 85) return "BLOCK";
  if (score >= 60) return "HOLD";
  if (score >= 30) return "REVIEW";
  return "APPROVE";
}

function normalizeResult(score) {
  if (score >= 60) return "fraud";
  if (score >= 30) return "suspicious";
  return "real";
}

function normalizeRecommendedAction(score) {
  if (score >= 85) return "BLOCK";
  if (score >= 60) return "HOLD";
  if (score >= 30) return "MANUAL_REVIEW";
  return "ALLOW";
}

function safeScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

/* =========================================================
   BUILD SAFE AI INPUT
========================================================= */

function buildInput(transaction, ruleAnalysis) {
  return {
    transaction: {
      amount: Number(transaction.amount || 0),

      merchant:
        transaction.merchant ||
        "Unknown",

      method:
        transaction.method ||
        "Unknown",

      paymentType:
        transaction.paymentType ||
        "real",

      route:
        transaction.route ||
        "Primary",

      channel:
        transaction.metadata?.channel ||
        "Web",

      device:
        transaction.metadata?.device ||
        "Unknown",

      location:
        transaction.metadata?.location ||
        "Unknown",
    },

    deterministicEngine: {
      fraudScore:
        Number(
          ruleAnalysis?.fraudScore || 0
        ),

      fraudLevel:
        ruleAnalysis?.fraudLevel ||
        "low",

      decision:
        ruleAnalysis?.decision ||
        "APPROVE",

      reasons:
        ruleAnalysis?.reasons ||
        [],

      indicators:
        ruleAnalysis?.indicators ||
        [],

      features:
        ruleAnalysis?.features ||
        [],
    },
  };
}

/* =========================================================
   DEMO EXTERNAL AI
   ---------------------------------------------------------
   Used ONLY when live OpenAI is unavailable.

   This does NOT claim to be OpenAI.
========================================================= */

function analyzeWithDemoAI(
  transaction,
  ruleAnalysis,
  reason = "Live OpenAI API unavailable"
) {
  const ruleScore = safeScore(
    ruleAnalysis?.fraudScore
  );

  let score = ruleScore;

  const reasons = [];
  const indicators = [];

  const paymentType = String(
    transaction.paymentType || "real"
  ).toLowerCase();

  const amount = Number(
    transaction.amount || 0
  );

  const method = String(
    transaction.method || "Unknown"
  ).toLowerCase();

  const channel = String(
    transaction.metadata?.channel ||
      "Web"
  );

  /*
   * Demo AI considers the existing
   * deterministic analysis and adds
   * explainable demo intelligence.
   */

  if (
    paymentType === "fake" ||
    paymentType === "fraud"
  ) {
    score = Math.max(score, 92);

    reasons.push(
      "Demo AI detected a simulated fraud profile"
    );

    indicators.push(
      "Simulated fraud profile"
    );
  } else if (
    paymentType === "suspicious"
  ) {
    score = Math.max(score, 65);

    reasons.push(
      "Demo AI detected suspicious payment characteristics"
    );

    indicators.push(
      "Suspicious payment profile"
    );
  } else {
    reasons.push(
      "Demo AI found no strong fraudulent characteristics"
    );

    indicators.push(
      "No strong fraud indicator detected"
    );
  }

  if (amount >= 100000) {
    score = Math.min(
      100,
      score + 8
    );

    reasons.push(
      "High transaction amount increases review priority"
    );

    indicators.push(
      "High transaction amount"
    );
  }

  if (
    method === "upi" &&
    channel.toLowerCase() ===
      "web"
  ) {
    indicators.push(
      "UPI web payment channel"
    );
  }

  /*
   * Never allow demo AI to downgrade
   * deterministic risk.
   */

  score = Math.max(
    ruleScore,
    score
  );

  const fraudLevel =
    normalizeLevel(score);

  const decision =
    normalizeDecision(score);

  const fraudResult =
    normalizeResult(score);

  const recommendedAction =
    normalizeRecommendedAction(
      score
    );

  const deterministicConfidence =
    Number(
      ruleAnalysis?.fraudConfidence ||
        80
    );

  const fraudConfidence =
    Math.max(
      70,
      Math.min(
        95,
        deterministicConfidence
      )
    );

  return {
    available: true,

    demo: true,

    live: false,

    provider:
      "AegisPay Demo External AI",

    providerType:
      "demo-fallback",

    model:
      "aegispay-demo-fraud-ai-v1",

    message:
      "Demo external AI analysis used because live OpenAI API access is unavailable.",

    fallbackReason:
      reason,

    aiScore: score,

    aiLevel:
      fraudLevel,

    aiDecision:
      decision,

    fraudScore:
      score,

    fraudLevel,

    fraudConfidence,

    fraudResult,

    decision,

    recommendedAction,

    reasons:
      Array.from(
        new Set(
          reasons.concat(
            ruleAnalysis?.reasons ||
              []
          )
        )
      ).slice(0, 8),

    indicators:
      Array.from(
        new Set(
          indicators.concat(
            ruleAnalysis?.indicators ||
              []
          )
        )
      ).slice(0, 12),

    summary:
      `Demo external AI analysis completed. Risk assessment: ${fraudResult.toUpperCase()} with score ${score}/100.`,

    deterministicScore:
      ruleScore,

    guardrailApplied:
      score !== ruleScore,

    analyzedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   LIVE OPENAI ANALYSIS
========================================================= */

async function analyzeWithOpenAI(
  transaction,
  ruleAnalysis
) {
  const ai = getClient();

  if (!ai) {
    throw new Error(
      "OPENAI_API_KEY is not configured"
    );
  }

  const model =
    process.env.OPENAI_FRAUD_MODEL ||
    "gpt-4o-mini";

  const input = buildInput(
    transaction,
    ruleAnalysis
  );

  const response =
    await ai.responses.create({
      model,

      instructions: `
You are the external fraud-analysis layer for AegisPay.

Analyze payment risk conservatively.

Use only the supplied transaction information.

Never invent customer information.

Never request or infer passwords, PINs,
CVVs, card numbers, authentication secrets,
or other confidential credentials.

The deterministic AegisPay fraud engine is
a safety guardrail and must not be weakened.

You may identify additional risk signals,
but you must not silently downgrade a
deterministic risk score.

Return only the requested structured result.

Give concise, evidence-based reasons.

High-risk decisions require stronger evidence.

This analysis supports a payment fraud workflow
and is not a legal determination.
      `,

      input:
        JSON.stringify(input),

      text: {
        format: {
          type: "json_schema",

          name:
            "aegispay_fraud_analysis",

          strict: true,

          schema:
            FRAUD_SCHEMA,
        },
      },
    });

  if (
    !response.output_text
  ) {
    throw new Error(
      "External AI returned empty output"
    );
  }

  const parsed =
    JSON.parse(
      response.output_text
    );

  const aiScore =
    safeScore(
      parsed.fraudScore
    );

  const ruleScore =
    safeScore(
      ruleAnalysis?.fraudScore
    );

  /*
   * SAFETY GUARDRAIL
   *
   * Live external AI may increase
   * risk but cannot downgrade the
   * deterministic engine's score.
   */

  const finalScore =
    Math.max(
      ruleScore,
      aiScore
    );

  const finalLevel =
    normalizeLevel(
      finalScore
    );

  const finalDecision =
    normalizeDecision(
      finalScore
    );

  const finalResult =
    normalizeResult(
      finalScore
    );

  const finalRecommendedAction =
    normalizeRecommendedAction(
      finalScore
    );

  const finalConfidence =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          parsed.fraudConfidence ||
            0
        )
      )
    );

  const reasons =
    Array.isArray(
      parsed.reasons
    )
      ? parsed.reasons.slice(
          0,
          8
        )
      : [];

  const indicators =
    Array.isArray(
      parsed.indicators
    )
      ? parsed.indicators.slice(
          0,
          12
        )
      : [];

  return {
    available: true,

    demo: false,

    live: true,

    provider: "OpenAI",

    providerType:
      "live-api",

    model,

    message:
      "Live external OpenAI fraud analysis completed successfully.",

    aiScore,

    aiLevel:
      parsed.fraudLevel ||
      normalizeLevel(
        aiScore
      ),

    aiDecision:
      parsed.decision ||
      normalizeDecision(
        aiScore
      ),

    fraudScore:
      finalScore,

    fraudLevel:
      finalLevel,

    fraudConfidence:
      finalConfidence,

    fraudResult:
      finalResult,

    decision:
      finalDecision,

    recommendedAction:
      finalRecommendedAction,

    reasons,

    indicators,

    summary:
      parsed.summary ||
      "Live external AI analysis completed.",

    deterministicScore:
      ruleScore,

    guardrailApplied:
      finalScore !== aiScore,

    requestId:
      response.id ||
      null,

    analyzedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   MAIN EXTERNAL AI FUNCTION
========================================================= */

async function analyzeWithExternalAI(
  transaction,
  ruleAnalysis
) {
  const aiEnabled =
    process.env.OPENAI_FRAUD_AI_ENABLED ===
    "true";

  /*
   * If external AI is disabled,
   * use the transparent demo layer.
   */

  if (!aiEnabled) {
    return analyzeWithDemoAI(
      transaction,
      ruleAnalysis,
      "OPENAI_FRAUD_AI_ENABLED is not set to true"
    );
  }

  /*
   * If there is no API key,
   * use demo mode.
   */

  if (
    !process.env.OPENAI_API_KEY
  ) {
    return analyzeWithDemoAI(
      transaction,
      ruleAnalysis,
      "OPENAI_API_KEY is not configured"
    );
  }

  /*
   * Try the REAL OpenAI API.
   */

  try {
    const result =
      await analyzeWithOpenAI(
        transaction,
        ruleAnalysis
      );

    console.log(
      `[External Fraud AI] Live OpenAI analysis completed. Score=${result.fraudScore}, Decision=${result.decision}`
    );

    return result;
  } catch (error) {
    const errorMessage =
      error?.message ||
      "Unknown external AI error";

    console.error(
      `[External Fraud AI] Live OpenAI request failed: ${errorMessage}`
    );

    /*
     * IMPORTANT:
     *
     * We do NOT pretend that OpenAI
     * completed the analysis.
     *
     * Instead we transparently switch
     * to AegisPay Demo External AI.
     */

    return analyzeWithDemoAI(
      transaction,
      ruleAnalysis,
      errorMessage
    );
  }
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  analyzeWithExternalAI,
  analyzeWithDemoAI,
};