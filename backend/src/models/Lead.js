/* One shared Lead model for all 3 websites.
   websiteSource tells us which site the lead came from. */
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    websiteSource: {
      type: String,
      enum: ["website_1", "website_2", "website_3"],
      required: true,
    },

    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    age: { type: String, trim: true },
    city: { type: String, trim: true },

    programInterest: { type: String, trim: true },
    message: { type: String, trim: true },

    paymentStatus: {
      type: String,
      enum: ["not_required", "pending", "paid", "failed"],
      default: "not_required",
    },
    paymentAmount: { type: Number },
    paymentId: { type: String, trim: true },

    formType: { type: String, trim: true },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    // Dedicated collection for the 3 websites' leads — kept separate from any other
    // "leads" collection in the same database (avoids schema/index collisions).
    collection: "website_leads",
  }
);

module.exports = mongoose.model("Lead", leadSchema);
