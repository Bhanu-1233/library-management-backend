import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../controllers/payment.controllers.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", verifyToken, createOrder);
paymentRouter.post("/verify-payment", verifyToken, verifyPayment);

export default paymentRouter;
