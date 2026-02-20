import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        "booking",
        "payment",
        "kyc",
        "route",
        "system"
      ],
      default: "system",
      index: true
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 400 },
    isRead: { type: Boolean, default: false, index: true },
    metadata: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
      kycId: { type: mongoose.Schema.Types.ObjectId, ref: "KycVerification", default: null },
      extra: { type: mongoose.Schema.Types.Mixed, default: null }
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
