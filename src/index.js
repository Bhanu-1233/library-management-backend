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

app.use(
  cors({
    origin: "http://localhost:5173", // frontend origin
    credentials: true, // allow cookies
  })
);

import { userRouter } from "../routes/user.routes.js";
import { bookRouter } from "../routes/book.routes.js";
import { transactionRouter } from "../routes/transaction.routes.js";

app.use("/", userRouter);
app.use("/", bookRouter);
app.use("/", transactionRouter);
const port = process.env.PORT || 8001;

const startServer = async () => {
  try {
    // Wait for MongoDB to connect first
    await connectionDB;
    console.log("✅ MongoDB connected. Starting server...");

    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1); // stop the app if DB fails
  }
};

startServer();
