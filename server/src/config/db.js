import mongoose from "mongoose";

export async function connectDB(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 10000
  });
  console.log("MongoDB connected.");
}
