import { generateBookInsights } from "../utils/aiClient.js";
import { Book } from "../model/books.model.js";
import User from "../model/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Transaction } from "../model/transactions.model.js";

//********author*********
const createBook = async (req, res) => {
  try {
    const { name, description, genre, availableCopies, price } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      // upload file to cloudinary
      const cloudinaryResponse = await uploadOnCloudinary(file.path);
      fileUrl = cloudinaryResponse.url;
    }

    const authorName = await User.findById(req.user.id);

    const book = await Book.create({
      name,
      description,
      genre,
      availableCopies,
      price,
      thumbnailphoto: fileUrl,
      author: req.user.id || null,
      authorName: authorName.name || "Unknown",
    });

    await book.save();
    res.status(201).json({
      message: "Book created successfully",
      book,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🔹 Author-only: get books created by this author (dashboard)
const getBooks = async (req, res) => {
  try {
    if (req.user.role !== "author") {
      return res.status(403).json({ message: "Access denied. Authors only." });
    }

    const books = await Book.find({ author: req.user._id });

    const borrowedCount = await Transaction.countDocuments({
      book_id: { $in: books.map((b) => b._id) },
      returned: false,
    });

    const author = await User.findById(req.user._id).select("earnings");

    const totalBooks = books.length;
    const availableBooks = books.filter((b) => b.availableCopies > 0).length;

    res.status(200).json({
      message: "Books fetched successfully 📚",
      books,
      totalBooks,
      availableBooks,
      borrowedBooks: borrowedCount,
      earnings: author?.earnings || 0,
    });
  } catch (error) {
    console.error("❌ Error fetching author books:", error);
    res.status(500).json({ message: "Server error while fetching books" });
  }
};

// 🔹 Public: get ALL books with pagination (for Home page)
const getAllBooksPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "8", 10);

    const skip = (page - 1) * limit;

    const [books, totalCount] = await Promise.all([
      Book.find()
        .populate("author", "fullname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      message: "All books fetched successfully",
      books,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("❌ Error fetching all books:", error);
    res.status(500).json({ message: "Server error while fetching books" });
  }
};

const bookdetails = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId).populate(
      "author",
      "fullname email"
    );
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.status(200).json({ book });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json("Book not Found");
    }

    if (
      req.user.role === "author" &&
      book.author.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json("Unauthorized Not your book");
    }

    const updatableFields = [
      "name",
      "genre",
      "description",
      "price",
      "availableCopies",
      "author",
    ];
    updatableFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        book[f] = req.body[f];
      }
    });

    if (req.file) {
      const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
      if (cloudinaryResponse && cloudinaryResponse.url) {
        book.thumbnailphoto = cloudinaryResponse.url;
      } else {
        return res.status(500).json("Failed to upload thumbnail");
      }
    }

    await book.save();
    res.status(201).json({ message: "Updated successfully", book: book });
  } catch (error) {
    console.log("updateBook error:", error);
    res.status(500).json("Server error");
  }
};

const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findByIdAndDelete(bookId);

    if (!book) {
      return res.status(404).json("Book not found");
    }
    res.status(200).json("Book deleted successfully");
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const searchBook = async (req, res) => {
  try {
    const query = req.query.query;
    const regex = new RegExp(query, "i");

    const books = await Book.find({
      $or: [{ name: regex }, { genre: regex }, { description: regex }],
    }).populate("author", "fullname");

    res.status(200).json({ message: "Search results", books });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBookAiInsights = async (req, res) => {
  try {
    console.log("🔹 [AI] /book/:id/ai-insights hit. ID:", req.params.id);

    const bookId = req.params.id;

    const book = await Book.findById(bookId).populate("author", "fullname");

    if (!book) {
      console.log("❌ [AI] Book not found for ID:", bookId);
      return res.status(404).json({ message: "Book not found" });
    }

    console.log("🔹 [AI] Generating insights for book:", book.name);

    const insights = await generateBookInsights({
      title: book.name,
      description: book.description,
      genre: book.genre,
      author: book.author?.fullname,
    });

    console.log("✅ [AI] Insights generated");

    return res.status(200).json({
      message: "AI insights generated successfully",
      insights,
    });
  } catch (error) {
    console.error("❌ [AI] getBookAiInsights error:");
    console.error("Message:", error?.message);
    if (error?.response?.data) {
      console.error("Response data:", error.response.data);
    }

    return res.status(500).json({
      message: "Failed to generate AI insights",
      error: error?.response?.data || error?.message || "Unknown error",
    });
  }
};

export {
  createBook,
  getBooks,
  getAllBooksPaginated,
  updateBook,
  deleteBook,
  bookdetails,
  searchBook,
  getBookAiInsights,
};
