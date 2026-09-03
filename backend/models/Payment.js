const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    actor: {
      type: String,
      default: "Aegis AI",
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const recoverySchema = new mongoose.Schema(
  {
    attemptedAt: {
      type: Date,
      default: Date.now,
    },

    route: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "attempted",
        "successful",
        "failed",
      ],
      default: "attempted",
    },

    message: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const paymentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    idempotencyKey: {
      type: String,
      default: null,
      sparse: true,
      unique: true,
    },

    customer: {
      type: String,
      required: true,
      trim: true,
    },

    merchant: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    bank: {
      type: String,
      required: true,
      trim: true,
    },

    route: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "success",
    },

    method: {
      type: String,
      default: "UPI",
    },

    paymentType: {
      type: String,
      default: "real",
    },

    time: {
      type: String,
      default: "Just now",
    },

    risk: {
      type: String,
      default: "low",
    },

    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    fraudLevel: {
      type: String,
      default: "low",
    },

    fraudConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    fraudResult: {
      type: String,
      default: "real",
    },

    fraudReasons: {
      type: [String],
      default: [],
    },

    fraudIndicators: {
      type: [String],
      default: [],
    },

    investigationStatus: {
      type: String,
      default: "Not Required",
    },

    incidentCreated: {
      type: Boolean,
      default: false,
    },

    incidentStatus: {
      type: String,
      default: "none",
    },

    analystAction: {
      type: String,
      default: "None",
    },

    transferStatus: {
      type: String,
      default: "Not Started",
    },

    transferred: {
      type: Boolean,
      default: false,
    },

    transferReference: {
      type: String,
      default: "",
    },

    transferAt: {
      type: Date,
      default: null,
    },

    recoveryEligible: {
      type: Boolean,
      default: false,
    },

    recoveryStatus: {
      type: String,
      default: "Not Eligible",
    },

    recoveryAttempts: {
      type: Number,
      default: 0,
    },

    recoveryHistory: {
      type: [recoverySchema],
      default: [],
    },

    recoveredAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
    },

    history: {
      type: [historySchema],
      default: [],
    },

    investigationHistory: {
      type: [historySchema],
      default: [],
    },

    externalAI: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    metadata: {
      device: {
        type: String,
        default: "Unknown",
      },

      ipAddress: {
        type: String,
        default: "Unknown",
      },

      location: {
        type: String,
        default: "Unknown",
      },

      channel: {
        type: String,
        default: "Web",
      },
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({
  merchant: 1,
  createdAt: -1,
});

paymentSchema.index({
  fraudLevel: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
  createdAt: -1,
});

const Payment =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);

module.exports = Payment;