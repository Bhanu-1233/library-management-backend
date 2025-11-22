import { Transaction } from "../model/transactions.model.js";
import User from "../model/users.model.js";
import { Book } from "../model/books.model.js";

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ================================================================
// 📧 FIXED — Gmail App Password Working on Render
// ================================================================
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST || "smtp-relay.brevo.com",
  port: process.env.BREVO_PORT || 587,
  secure: false, // IMPORTANT: always false for port 587
  auth: {
    user: process.env.BREVO_LOGIN, // your Brevo SMTP login
    pass: process.env.BREVO_SMTP_KEY, // your SMTP key
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
});

transporter.verify((error, success) => {
  if (error) console.log("Brevo mail transport error ❌:", error);
  else console.log("Brevo mail server ready ✅");
});

// ================================================================
// 📘 Borrow Book Controller
// ================================================================
const borrowBook = async (req, res) => {
  try {
    const { user_id, book_id } = req.body;
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const book = await Book.findById(book_id).populate("author", "fullname");
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.availableCopies < 1)
      return res.status(400).json({ message: "No copies available" });

    const existing = await Transaction.findOne({
      user_id,
      book_id,
      returned: false,
    });
    if (existing)
      return res
        .status(409)
        .json({ message: "You already borrowed this book." });

    const issuedAt = new Date();
    const returnAt = new Date();
    returnAt.setDate(issuedAt.getDate() + 15);

    const transaction = await Transaction.create({
      user_id,
      book_id,
      issuedAt,
      returnAt,
      returned: false,
    });

    book.availableCopies -= 1;
    await book.save();

    const populated = await Transaction.findById(transaction._id)
      .populate("user_id", "fullname email")
      .populate({
        path: "book_id",
        select: "name genre price author description",
        populate: { path: "author", select: "fullname" },
      });

    // 📧 Send Borrow Email
    await transporter.sendMail({
      from: `"Libraverse" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `You Borrowed "${book.name}"`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#2563eb;">Hello ${user.fullname},</h2>
          <p>You have successfully borrowed <strong>${book.name}</strong> by ${
        book.author.fullname
      }.</p>
          <p><strong>Issued On:</strong> ${issuedAt.toDateString()}<br/>
             <strong>Return By:</strong> ${returnAt.toDateString()}</p>
          <p>Happy reading! Remember to return the book on time 😊</p>
          <br/>
          <p>– Team <strong>Libraverse.</strong></p>
        </div>
      `,
    });

    res.status(201).json({
      message: "Book borrowed successfully 📚",
      transaction: populated,
    });
  } catch (error) {
    console.log("Borrow mail error ❌:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================================================
// 📗 Return Book Controller
// ================================================================
const returnBook = async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const transaction = await Transaction.findById(transaction_id)
      .populate("user_id", "fullname email")
      .populate("book_id", "name");

    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });
    if (transaction.returned)
      return res.status(400).json({ message: "Book already returned" });

    transaction.returned = true;
    transaction.returnedAt = new Date();
    await transaction.save();

    const book = await Book.findById(transaction.book_id._id);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    // 📧 Send Return Email
    await transporter.sendMail({
      from: `"Libraverse" <${process.env.EMAIL_USER}>`,
      to: transaction.user_id.email,
      subject: `Book Returned: "${book.name}"`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#15803d;">Hi ${transaction.user_id.fullname},</h2>
          <p>Thank you for returning <strong>${book.name}</strong>.</p>
          <p><strong>Returned On:</strong> ${transaction.returnedAt.toDateString()}</p>
          <p>We hope you enjoyed reading. Feel free to borrow again anytime!</p>
          <br/>
          <p>– Team <strong>Libraverse.</strong></p>
        </div>
      `,
    });

    res.status(200).json({
      message: "Book returned successfully ✅",
      transaction,
    });
  } catch (error) {
    console.error("Return mail error ❌:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================================================
// 💰 Buy Book Controller (no email here)
// ================================================================
const buyBook = async (req, res) => {
  try {
    const { user_id, book_id } = req.body;

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const book = await Book.findById(book_id).populate("author");
    if (!book) return res.status(404).json({ message: "Book not found" });

    const author = await User.findById(book.author._id);
    if (!author) return res.status(404).json({ message: "Author not found" });

    author.earnings += book.price;
    await author.save();

    if (book.availableCopies > 0) {
      book.availableCopies -= 1;
      await book.save();
    }

    res.status(200).json({
      message: `Book purchased successfully ✅`,
      purchasedBook: {
        name: book.name,
        price: book.price,
        author: author.fullname,
      },
      authorEarnings: author.earnings,
    });
  } catch (error) {
    console.error("Error processing book purchase:", error);
    res.status(500).json({ message: "Something went wrong while buying book" });
  }
};

export { borrowBook, returnBook, buyBook };
