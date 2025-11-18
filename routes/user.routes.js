import express from "express";
import {
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
  verifyOTP,
  resetPassword,
  changePassword,
  getUserPurchases,
  getAuthorSales,
} from "../controllers/user.contollers.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";
const userRouter = express.Router();

userRouter.post("/register", upload.single("profilePhoto"), register);
userRouter.post("/login", loginUser);
userRouter.get("/users", getAllUsers);
userRouter.post("/refresh", refreshAccessToken);
userRouter.post("/logout", verifyToken, logout);
userRouter.get("/userdata/:id", getUserById);
userRouter.put(
  "/update",
  upload.single("profilePhoto"),
  verifyToken,
  updateUser
);
userRouter.delete("/delete", deleteUser);
userRouter.get("/allbooks", getAllBooks);
userRouter.get("/user/borrowed/books", verifyToken, listOfBorrwedBooks);
userRouter.get("/user/returned/books", verifyToken, listOfReturnedBooks);

userRouter.put("/change-password", verifyToken, changePassword);
userRouter.post("/auth/forgot-password", forgotPassword);
userRouter.post("/auth/verify-otp", verifyOTP);
userRouter.post("/auth/reset-password", resetPassword);
userRouter.get("/mypurchases", verifyToken, getUserPurchases);
userRouter.get("/mysales", verifyToken, getAuthorSales);

export { userRouter };
