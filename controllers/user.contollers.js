// import User from "../../model/users.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import crypto from "crypto";

import User from "../model/users.model.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";

import { Book } from "../model/books.model.js";
import { Transaction } from "../model/transactions.model.js";
import { Payment } from "../model/Payment.model.js";

const register = async (req, res) => {
  try {
    const { fullname, username, password, gender, role, email } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      return res.status(401).json("User already exist");
    }
    let profilephotoUrl = null;
    if (req.file?.path) {
      const response = await uploadOnCloudinary(req.file.path);
      console.log(response);
      profilephotoUrl = response?.url;
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullname: fullname,
      username: username,
      email: email,
      password: hashpassword,
      gender: gender,
      profilephoto: profilephotoUrl,
      role,
    });

    await newUser.save();

    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);
    newUser.Refreshtoken = refreshToken;

    await newUser.save();

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("AccessToken", accessToken, options);
    res.cookie("RefreshToken", refreshToken, options);

    console.log("response ", newUser);

    res.status(200).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        gender: newUser.gender,
        profilephoto: newUser.profilephotoUrl,
        role: newUser.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json("error", error);
    console.log(error);
  }
};

// *****Login******
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found please register" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Username or Password" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.Refreshtoken = refreshToken;
    await user.save();
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("AccessToken", accessToken, options);
    res.cookie("RefreshToken", refreshToken, options);
    const userData = await User.findOne({ email }).select(
      "-password -Refreshtoken "
    );
    res.status(201).json({
      message: "login successfully",
      userData,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: error.message });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    let incomingToken;
    if (req.headers.authorization) {
      incomingToken = req.headers.authorization?.split(" ")[1];
    }
    if (!incomingToken) {
      return res.status(401).json({ message: "Token is required" });
    }

    const user = await User.findOne({ Refreshtoken: incomingToken });
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.Refreshtoken = refreshToken;
    await user.save();
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie("AccessToken", accessToken, options);
    res.cookie("RefreshToken", refreshToken, options);
    res
      .status(201)
      .json({ message: "Login Successfully", user, accessToken, refreshToken });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal serer error" });
  }
};

const logout = async (req, res) => {
  try {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };
    res.clearCookie("AccessToken", options);
    res.clearCookie("RefreshToken", options);

    if (req.user) {
      const user = req.user;
      user.Refreshtoken = null;
      await user.save();
    }
    res.status(200).json({ message: "Logout successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

//****get all users*****
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -Refreshtoken");
    res.status(200).json({ message: "Users fetched successfully", users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//****get one user****
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -Refreshtoken"
    );
    if (!user) {
      return res.status(400).json("User not found");
    }
    res.status(200).json({ message: "User fetched successfuly", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In your user.contollers.js

const updateUser = async (req, res) => {
  try {
    // req.user is set by the verifyToken middleware
    const { id } = req.user;
    const { ...updateData } = req.body;

    // Handle profile photo upload
    if (req.file?.path) {
      const response = await uploadOnCloudinary(req.file.path);

      if (!response || !response.url) {
        return res
          .status(500)
          .json({ message: "Failed to upload new profile photo" });
      }

      // Update the profilephoto field in the updateData object
      updateData.profilephoto = response.url;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-password -Refreshtoken",
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.body;
    const deleteuser = await User.findByIdAndDelete(id);
    if (!deleteuser) {
      return res.status(400).json("User not found");
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllBooks = async (req, res) => {
  try {
    // ✅ Pagination (default: page 1, 8 per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    // ✅ Optional search (case-insensitive)
    const search = req.query.search?.trim() || "";
    const searchRegex = new RegExp(search, "i");

    // ✅ Filter by search query
    const filter = {
      $or: [
        { name: searchRegex },
        { genre: searchRegex },
        { description: searchRegex },
      ],
    };

    // ✅ Fetch filtered books with pagination
    const [books, totalBooks] = await Promise.all([
      Book.find(filter)
        .populate("author", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalBooks / limit);
    const hasMore = page < totalPages; // ✅ Easy flag for frontend

    console.log("books", books);

    res.status(200).json({
      message: "Books fetched successfully 📚",
      books,
      totalBooks,
      totalPages,
      currentPage: page,
      hasMore, // 👈 Added for simpler frontend logic
    });
  } catch (error) {
    console.error("❌ Error fetching books:", error);
    res.status(500).json({ message: "Server error while fetching books" });
  }
};

const listOfBorrwedBooks = async (req, res) => {
  try {
    const userId = req.user._id;
    const borrowed = await Transaction.find({
      user_id: userId,
      returned: false,
    })
      .populate({
        path: "book_id",
        select: "name genre price author thumbnailphoto description",
        populate: {
          path: "author", // author is also a User reference
          select: "fullname email",
        },
      })
      .populate("user_id", "fullname email"); // borrower details
    const numberOfBooks = borrowed.length;
    // console.log("borrowed books", borrowed);

    res.status(200).json({
      message: "Your Borrowed Books",
      numberOfBooks,
      borrowedBooks: borrowed,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
};

const listOfReturnedBooks = async (req, res) => {
  try {
    const userId = req.user._id;
    const returned = await Transaction.find({
      user_id: userId,
      returned: true,
    })
      .populate({
        path: "book_id",
        select: "name genre price author, thumbnailphoto",
        populate: {
          path: "author", // author is also a User reference
          select: "fullname email",
        },
      })
      .populate("user_id", "fullname email"); // borrower details

    res
      .status(200)
      .json({ message: "You Returned Books", returnedBooks: returned });
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
};

// const transporter = nodemailer.createTransport({
//   host: process.env.BREVO_HOST || "smtp-relay.brevo.com",
//   port: process.env.BREVO_PORT || 587,
//   secure: false, // IMPORTANT: always false for port 587
//   auth: {
//     user: process.env.BREVO_LOGIN, // your Brevo SMTP login
//     pass: process.env.BREVO_SMTP_KEY, // your SMTP key
//   },
//   connectionTimeout: 10000,
//   greetingTimeout: 5000,
// });

// transporter.verify((error, success) => {
//   if (error) console.log("Brevo mail transport error ❌:", error);
//   else console.log("Brevo mail server ready ✅");
// });

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate secure password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetpasswordOTP = resetToken;
    user.resetpasswordOTPexpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // Send token back to frontend (no email)
    res.status(200).json({
      message: "Reset link generated",
      token: resetToken,
    });
  } catch (error) {
    console.error("Error creating reset token:", error);
    res.status(500).json({ message: "Failed to generate reset link" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetpasswordOTP: token,
      resetpasswordOTPexpiry: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetpasswordOTP = null;
    user.resetpasswordOTPexpiry = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successful 🎉",
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(201).json({
      message: "Password updated successfully",
      name: user.fullname,
      email: user.email,
      role: user.role,
      gender: user.gender,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user._id;

    const purchases = await Payment.find({ user: userId })
      .populate({
        path: "book",
        select: "name price genre thumbnailphoto author",
        populate: { path: "author", select: "fullname" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Your purchased books fetched successfully 🛍️",
      purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Server error fetching purchases" });
  }
};
const getAuthorSales = async (req, res) => {
  try {
    if (req.user.role !== "author")
      return res.status(403).json({ message: "Access denied" });

    const sales = await Payment.find({ author: req.user._id })
      .populate({
        path: "book",
        select: "name price thumbnailphoto",
      })
      .populate({
        path: "user",
        select: "fullname email",
      })
      .sort({ createdAt: -1 });

    const totalSales = sales.length;
    const totalEarnings = sales.reduce((sum, s) => sum + s.amount, 0);

    res.status(200).json({
      message: "Sales data fetched successfully 💸",
      totalSales,
      totalEarnings,
      sales,
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Server error fetching sales" });
  }
};

export {
  register,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  refreshAccessToken,
  logout,
  getAllBooks,
  listOfBorrwedBooks,
  listOfReturnedBooks,
  forgotPassword,
  resetPassword,
  changePassword,
  getUserPurchases,
  getAuthorSales,
};
