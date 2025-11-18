import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, "fullname must contain atleast 5 characters"],
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
      trim: true,
      enum: ["male", "female"],
    },

    profilephoto: {
      type: String,
      default: null,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      enum: ["user", "author"],
      default: "user",
    },
    Refreshtoken: {
      type: String,
    },
    resetpasswordOTP: {
      type: String,
    },
    resetpasswordOTPexpiry: {
      type: Date,
    },
    earnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;

// Users[icon:user]{
//   _id string
//   fullname string
//   username string
//   email string
//   password string

// }
