import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      required: true,
      index: true
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    pickupLocation: { type: String, required: true, trim: true },
    dropLocation: { type: String, required: true, trim: true },
    totalDays: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "ongoing", "completed", "cancelled"],
      default: "confirmed",
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    payment: {
      provider: { type: String, enum: ["razorpay", "mock"], default: "mock" },
      currency: { type: String, default: "INR" },
      amount: { type: Number, default: 0 },
      orderId: { type: String, trim: true, default: "" },
      paymentId: { type: String, trim: true, default: "" },
      signature: { type: String, trim: true, default: "" },
      paidAt: { type: Date, default: null }
    },
    notes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

bookingSchema.index({ bike: 1, startDate: 1, endDate: 1 });

export default mongoose.model("Booking", bookingSchema);
