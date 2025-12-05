import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectionDB from "../config/connectDb.js";

dotenv.config();
console.log("Has OpenAI key?", !!process.env.OPENAI_API_KEY);
const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const port = process.env.PORT || 8000;

// ================================================================
// ⭐ FIXED CORS (WORKS WITH Axios + Credentials)
// ================================================================
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Required for cookies + axios
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", frontendUrl);
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// ================================================================
// Routes
// ================================================================
import { userRouter } from "../routes/user.routes.js";
import { bookRouter } from "../routes/book.routes.js";
import { transactionRouter } from "../routes/transaction.routes.js";
import paymentRouter from "../routes/payment.routes.js";

app.use("/", userRouter);
app.use("/", bookRouter);
app.use("/", transactionRouter);
app.use("/", paymentRouter);

// ================================================================
// Start Server
// ================================================================
const startServer = async () => {
  try {
    await connectionDB;

    console.log("✅ MongoDB connected. Starting server...");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`Frontend allowed: ${frontendUrl}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
