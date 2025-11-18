import crypto from "crypto";
import { razorpay } from "../utils/razorpay.js";
import User from "../model/users.model.js";
import { Book } from "../model/books.model.js";
import { Payment } from "../model/Payment.model.js";

// ✅ Create a Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { user_id, book_id } = req.body;

    // ✅ 1. Validate inputs
    if (!user_id || !book_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user or book ID" });
    }

    const book = await Book.findById(book_id).populate("author");
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // ✅ 2. Generate short unique receipt (always < 40 chars)
    // Format: LBR_<6-char-bookId>_<5-char-timestamp>
    const shortReceipt = `LBR_${book._id.toString().slice(-6)}_${Date.now()
      .toString()
      .slice(-5)}`;

    // ✅ 3. Razorpay order options
    const options = {
      amount: book.price * 100, // Convert to paise
      currency: "INR",
      receipt: shortReceipt, // guaranteed < 40
      notes: {
        book: book.name,
        author: book.author.fullname,
      },
    };

    // ✅ 4. Create order
    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay Order Created:", {
      id: order.id,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
    });

    res.status(200).json({
      success: true,
      order,
      book: {
        _id: book._id,
        name: book.name,
        price: book.price,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating Razorpay order",
    });
  }
};
// ✅ Verify payment signature and update author earnings
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      book_id,
      user_id,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature ❌" });
    }

    const book = await Book.findById(book_id).populate(
      "author",
      "_id fullname"
    );
    if (!book) return res.status(404).json({ message: "Book not found" });

    const author = await User.findById(book.author._id);
    if (!author) return res.status(404).json({ message: "Author not found" });

    // ✅ Increase author’s earnings
    author.earnings = (author.earnings || 0) + book.price;
    await author.save();

    // ✅ Reduce available book copies
    if (book.availableCopies > 0) {
      book.availableCopies -= 1;
      await book.save();
    }

    // ✅ Record payment in DB
    await Payment.create({
      user: user_id,
      author: author._id,
      book: book._id,
      amount: book.price,
      currency: "INR",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "paid",
    });

    res.status(200).json({
      success: true,
      message: "Payment verified & saved successfully ✅",
    });
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
