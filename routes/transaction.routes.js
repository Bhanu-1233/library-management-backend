import express from "express";
import {
  borrowBook,
  returnBook,
  buyBook,
} from "../controllers/transactions.controllers.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";

const transactionRouter = express.Router();

transactionRouter.post("/borrow", verifyToken, borrowBook);
transactionRouter.post("/return", verifyToken, returnBook);

transactionRouter.post("/buybook", verifyToken, buyBook);
export { transactionRouter };
