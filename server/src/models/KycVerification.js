import mongoose from "mongoose";

const kycVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    dateOfBirth: { type: Date, required: true },
    licenseNumber: { type: String, required: true, trim: true, maxlength: 40 },
    licenseExpiry: { type: Date, required: true },
    idType: {
      type: String,
      enum: ["aadhaar", "passport", "voter-id", "other"],
      required: true
    },
    idNumber: { type: String, required: true, trim: true, maxlength: 40 },
    address: { type: String, required: true, trim: true, maxlength: 240 },
    documentUrls: {
      licenseFront: { type: String, required: true, trim: true },
      licenseBack: { type: String, required: true, trim: true },
      idFront: { type: String, required: true, trim: true },
      selfie: { type: String, required: true, trim: true }
    },
    status: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    reviewNote: { type: String, trim: true, maxlength: 240, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("KycVerification", kycVerificationSchema);
