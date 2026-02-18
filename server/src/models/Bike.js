import mongoose from "mongoose";

const bikeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["commuter", "touring", "adventure", "sports", "cruiser", "scooter"],
      required: true
    },
    location: {
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true }
    },
    pricePerDay: { type: Number, required: true, min: 100 },
    specs: {
      engineCC: { type: Number, required: true },
      mileageKmpl: { type: Number, required: true },
      fuelType: { type: String, enum: ["petrol", "electric"], required: true },
      abs: { type: Boolean, default: true },
      weightKg: { type: Number, default: 150 }
    },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    images: [{ type: String }],
    availabilityStatus: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
      index: true
    },
    nextAvailableDate: { type: Date, default: null }
  },
  { timestamps: true }
);

bikeSchema.index({ "location.city": 1, "location.state": 1, pricePerDay: 1 });
bikeSchema.index({ type: 1, pricePerDay: 1 });

export default mongoose.model("Bike", bikeSchema);

