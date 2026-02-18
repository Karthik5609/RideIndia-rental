import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing. Check your .env file.");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing. Check your .env file.");
    }
    if (process.env.JWT_SECRET.length < 24) {
      throw new Error("JWT_SECRET must be at least 24 characters for production safety.");
    }

    await connectDB(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
