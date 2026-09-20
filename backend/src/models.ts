import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
});

const KitDocSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  status: {
    type: String,
    enum: ["queued", "researching", "generating", "ready", "failed"],
    default: "queued",
  },
  steps: [{ name: String, status: String, detail: String, at: Date }],
  input: { jd: String, company_url: String, days: Number, hash: String },
  kit: { type: mongoose.Schema.Types.Mixed },
  error: { code: String, message: String },
  practice: {
    type: Map,
    of: { confidence: Number, seen: Boolean, at: Date },
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const KitDoc = mongoose.models.KitDoc || mongoose.model("KitDoc", KitDocSchema);
