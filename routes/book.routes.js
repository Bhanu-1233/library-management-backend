import express from "express";
import {
  createBook,
  getBooks,
  getAllBooksPaginated,
  updateBook,
  deleteBook,
  bookdetails,
  searchBook,
  getBookAiInsights,
} from "../controllers/book.controllers.js";

import { verifyToken } from "../middlewares/auth.middlewares.js";
import isAuthor from "../middlewares/isauthor.middlewares.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middlewares.js";

const bookRouter = express.Router();

bookRouter.post(
  "/createbook",
  verifyToken,
  isAuthor,
  upload.single("thumbnail"),
  createBook
);

// Author-only books (for author dashboard)
bookRouter.get("/books", verifyToken, getBooks);

// 🔹 Public all-books endpoint (for Home page with pagination)
bookRouter.get("/allbooks", getAllBooksPaginated);

bookRouter.get("/book/:id", verifyToken, bookdetails);

// AI insights for a book
bookRouter.get("/book/:id/ai-insights", verifyToken, getBookAiInsights);

bookRouter.put(
  "/updatebook/:id",
  verifyToken,
  isAuthor,
  upload.single("file"),
  updateBook
);
bookRouter.delete("/deletebook/:id", verifyToken, isAuthor, deleteBook);
bookRouter.get("/searchbooks", searchBook);

export { bookRouter };
