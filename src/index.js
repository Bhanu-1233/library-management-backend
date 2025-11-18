import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectionDB from "../config/connectDb.js";
dotenv.config();

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL;
const port = process.env.PORT;

app.use(
  cors({
    origin: frontendUrl, // frontend origin
    credentials: true, // allow cookies
  })
);

import { userRouter } from "../routes/user.routes.js";
import { bookRouter } from "../routes/book.routes.js";
import { transactionRouter } from "../routes/transaction.routes.js";
import paymentRouter from "../routes/payment.routes.js";

app.use("/", userRouter);
app.use("/", bookRouter);
app.use("/", transactionRouter);
app.use("/", paymentRouter);

const startServer = async () => {
  try {
    // Wait for MongoDB to connect first
    await connectionDB;
    console.log("✅ MongoDB connected. Starting server...");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1); // stop the app if DB fails
  }
};

startServer();
